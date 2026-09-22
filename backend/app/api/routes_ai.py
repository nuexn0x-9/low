import json
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.schemas.ai import (
    AIGenerateRequest,
    AIGenerateResponse,
    AIGenerateValidation,
    AIValidateRequest,
    AIValidateResponse,
    AIApplyRequest,
    AIProvidersResponse,
    AIProviderInfo,
    AIDraftListItem,
    AIDraftDetailResponse,
)
from app.services.ai import get_ai_provider, validate_and_guard_ai_patch
from app.services.document_service import (
    get_or_create_document,
    create_document_version,
)
from app.models.project import Project
from app.models.ai_draft import AIImportDraft
from app.api.deps import get_current_user_optional
from app.api.routes_documents import _get_project_or_404
from app.models.user import User
from app.models.base import utc_now


router = APIRouter(prefix="/ai/import", tags=["ai-import"])


@router.get("/providers", response_model=AIProvidersResponse)
async def get_ai_providers_info():
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else ""
    active = (settings.AI_PROVIDER or "mock").lower().strip()
    if active != "openai":
        active = "mock"

    providers_list = [
        AIProviderInfo(
            name="mock",
            active=(active == "mock"),
            configured=True,
            model="mock-deterministic",
            description="Self-hosted, deterministic mock provider for offline zero-cost usage.",
        ),
        AIProviderInfo(
            name="openai",
            active=(active == "openai"),
            configured=bool(api_key),
            model=settings.AI_MODEL,
            description="OpenAI GPT Models using JSON Mode with retry and backoff.",
        ),
    ]

    return AIProvidersResponse(
        active_provider=active,
        providers=providers_list,
    )


@router.get("/history", response_model=List[AIDraftListItem])
async def get_ai_draft_history(
    project_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AIImportDraft).where(AIImportDraft.owner_id == user.id)
    if project_id:
        stmt = stmt.where(AIImportDraft.project_id == project_id)
    stmt = stmt.order_by(AIImportDraft.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    drafts = result.scalars().all()

    out = []
    for d in drafts:
        token_usage = json.loads(d.token_usage_json) if d.token_usage_json else None
        out.append(
            AIDraftListItem(
                id=d.id,
                project_id=d.project_id,
                provider=d.provider,
                model=d.model,
                result_type=d.result_type,
                prompt=d.prompt,
                status=d.status,
                duration_ms=d.duration_ms,
                token_usage=token_usage,
                created_at=d.created_at,
                applied_at=d.applied_at,
            )
        )
    return out


@router.get("/history/{draft_id}", response_model=AIDraftDetailResponse)
async def get_ai_draft_by_id(
    draft_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AIImportDraft).where(
        AIImportDraft.id == draft_id,
        AIImportDraft.owner_id == user.id,
    )
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI draft not found",
        )

    token_usage = json.loads(draft.token_usage_json) if draft.token_usage_json else None
    return AIDraftDetailResponse(
        id=draft.id,
        project_id=draft.project_id,
        provider=draft.provider,
        model=draft.model,
        result_type=draft.result_type,
        prompt=draft.prompt,
        status=draft.status,
        duration_ms=draft.duration_ms,
        token_usage=token_usage,
        created_at=draft.created_at,
        applied_at=draft.applied_at,
        draft_json=json.loads(draft.draft_json),
        validation_json=json.loads(draft.validation_json),
    )


@router.post("/generate", response_model=AIGenerateResponse)
async def generate_ai_import(
    req: AIGenerateRequest,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    provider = get_ai_provider()
    provider_name = getattr(provider, "provider_name", settings.AI_PROVIDER)
    model_name = getattr(provider, "model_name", settings.AI_MODEL)
    start_t = time.perf_counter()

    try:
        raw_patch, usage_info = await provider.generate_low_patch(
            prompt=req.prompt,
            result_type=req.type,
            frame_preset=req.framePreset,
        )
    except Exception as e:
        duration_ms = int((time.perf_counter() - start_t) * 1000)
        safe_error = str(e)
        if settings.OPENAI_API_KEY:
            safe_error = safe_error.replace(settings.OPENAI_API_KEY, "[REDACTED]")

        draft = AIImportDraft(
            owner_id=user.id,
            project_id=req.projectId,
            provider=provider_name,
            model=model_name,
            result_type=req.type,
            prompt=req.prompt,
            draft_json=json.dumps({"frames": []}),
            validation_json=json.dumps({"valid": False, "errors": [safe_error], "warnings": []}),
            status="failed",
            duration_ms=duration_ms,
            token_usage_json=None,
        )
        db.add(draft)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI provider error: {safe_error}",
        )

    duration_ms = int((time.perf_counter() - start_t) * 1000)
    is_valid, guarded_patch, errors, warnings = validate_and_guard_ai_patch(
        raw_patch, result_type=req.type
    )

    draft_status = "generated" if is_valid else "invalid"
    validation_dict = {"valid": is_valid, "errors": errors, "warnings": warnings}

    draft = AIImportDraft(
        owner_id=user.id,
        project_id=req.projectId,
        provider=provider_name,
        model=model_name,
        result_type=req.type,
        prompt=req.prompt,
        draft_json=json.dumps(guarded_patch if is_valid else raw_patch),
        validation_json=json.dumps(validation_dict),
        status=draft_status,
        duration_ms=duration_ms,
        token_usage_json=json.dumps(usage_info) if usage_info else None,
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)

    return AIGenerateResponse(
        draftId=draft.id,
        status="draft",
        lowVersion="1.1.0",
        resultType=req.type,
        documentPatch=guarded_patch if is_valid else {"frames": []},
        validation=AIGenerateValidation(
            valid=is_valid,
            errors=errors,
            warnings=warnings,
        ),
        provider=provider_name,
        model=model_name,
        durationMs=duration_ms,
        tokenUsage=usage_info,
    )


@router.post("/validate", response_model=AIValidateResponse)
async def validate_ai_import(
    req: AIValidateRequest,
):
    is_valid, _, errors, warnings = validate_and_guard_ai_patch(
        req.documentPatch,
        result_type=req.resultType or "screen",
    )
    return AIValidateResponse(
        valid=is_valid,
        errors=errors,
        warnings=warnings,
    )


@router.post("/history/{draft_id}/apply")
async def apply_draft_by_id(
    draft_id: str,
    req: Optional[AIApplyRequest] = None,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AIImportDraft).where(
        AIImportDraft.id == draft_id,
        AIImportDraft.owner_id == user.id,
    )
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI draft not found",
        )

    proj_id = draft.project_id
    if not proj_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft does not have an associated project",
        )

    proj = await _get_project_or_404(proj_id, user, db)
    doc = await get_or_create_document(db, proj)

    if req and req.expected_revision is not None and doc.revision != req.expected_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Document revision conflict. Please reload.",
                "current_revision": doc.revision,
                "expected_revision": req.expected_revision,
            },
        )

    patch = req.documentPatch if (req and req.documentPatch) else json.loads(draft.draft_json)
    result_type = req.resultType if (req and req.resultType) else draft.result_type

    is_valid, guarded_patch, errors, _ = validate_and_guard_ai_patch(
        patch, result_type=result_type
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid ai patch", "errors": errors},
        )

    await create_document_version(db, doc, reason="pre-ai-import")

    current_content = json.loads(doc.content_json)
    existing_frames = current_content.get("frames", [])
    new_frames = guarded_patch.get("frames", [])

    if result_type == "component" and existing_frames:
        for f in new_frames:
            existing_frames[0]["nodes"].extend(f.get("nodes", []))
    else:
        existing_frames.extend(new_frames)

    current_content["frames"] = existing_frames
    doc.content_json = json.dumps(current_content)
    doc.revision += 1

    draft.status = "applied"
    draft.applied_at = utc_now()

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "applied": True,
        "project_id": proj.id,
        "revision": doc.revision,
        "new_revision": doc.revision,
        "frames": existing_frames,
        "document": {"frames": existing_frames},
        "applied_draft_id": draft.id,
    }


@router.post("/history/{draft_id}/regenerate", response_model=AIGenerateResponse)
async def regenerate_draft_by_id(
    draft_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AIImportDraft).where(
        AIImportDraft.id == draft_id,
        AIImportDraft.owner_id == user.id,
    )
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI draft not found",
        )

    req = AIGenerateRequest(
        type=draft.result_type,
        prompt=draft.prompt,
        projectId=draft.project_id,
    )
    return await generate_ai_import(req=req, user=user, db=db)


@router.post("/projects/{project_id}/ai/import/apply")
async def apply_ai_import_to_project(
    project_id: str,
    req: AIApplyRequest,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    proj = await _get_project_or_404(project_id, user, db)
    doc = await get_or_create_document(db, proj)

    if req.expected_revision is not None and doc.revision != req.expected_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Document revision conflict. Please reload.",
                "current_revision": doc.revision,
                "expected_revision": req.expected_revision,
            },
        )

    is_valid, guarded_patch, errors, _ = validate_and_guard_ai_patch(
        req.documentPatch,
        result_type=req.resultType,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid ai patch", "errors": errors},
        )

    await create_document_version(db, doc, reason="pre-ai-import")

    current_content = json.loads(doc.content_json)
    existing_frames = current_content.get("frames", [])
    new_frames = guarded_patch.get("frames", [])

    if req.resultType == "component" and existing_frames:
        for f in new_frames:
            existing_frames[0]["nodes"].extend(f.get("nodes", []))
    else:
        existing_frames.extend(new_frames)

    current_content["frames"] = existing_frames
    doc.content_json = json.dumps(current_content)
    doc.revision += 1

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "applied": True,
        "project_id": proj.id,
        "revision": doc.revision,
        "new_revision": doc.revision,
        "frames": existing_frames,
        "document": {"frames": existing_frames},
    }

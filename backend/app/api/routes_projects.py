import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, generate_project_id
from app.models.document import Document
from app.models.base import utc_now
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.api.deps import get_current_user_optional
from app.services.document_service import get_default_document_content

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
async def list_projects(
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Project)
        .where(Project.owner_id == user.id, Project.deleted_at.is_(None))
        .order_by(Project.updated_at.desc())
    )
    result = await db.execute(stmt)
    projects = result.scalars().all()

    out = []
    for p in projects:
        # Check screens count
        doc_stmt = select(Document.content_json).where(Document.project_id == p.id)
        doc_res = await db.execute(doc_stmt)
        content_raw = doc_res.scalar_one_or_none()
        screens_count = 1
        if content_raw:
            try:
                c = json.loads(content_raw)
                screens_count = len(c.get("frames", []))
            except Exception:
                pass

        p_dict = {
            "id": p.id,
            "owner_id": p.owner_id,
            "name": p.name,
            "description": p.description,
            "thumbnail_asset_id": p.thumbnail_asset_id,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "screens_count": screens_count,
        }
        out.append(ProjectOut(**p_dict))
    return out


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project_id = payload.id if payload.id else generate_project_id()

    # Check if project with this ID already exists
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    existing_project = res.scalar_one_or_none()
    if existing_project:
        if payload.name:
            existing_project.name = payload.name
        if payload.description:
            existing_project.description = payload.description
        existing_project.deleted_at = None
        existing_project.updated_at = utc_now()
        await db.commit()
        await db.refresh(existing_project)
        return ProjectOut(
            id=existing_project.id,
            owner_id=existing_project.owner_id,
            name=existing_project.name,
            description=existing_project.description,
            thumbnail_asset_id=existing_project.thumbnail_asset_id,
            created_at=existing_project.created_at,
            updated_at=existing_project.updated_at,
            screens_count=1,
        )

    project = Project(
        id=project_id,
        owner_id=user.id,
        name=payload.name or "Untitled",
        description=payload.description,
    )
    db.add(project)

    # Initialize associated document
    if payload.frames and len(payload.frames) > 0:
        doc_content = {
            "id": project_id,
            "name": project.name,
            "frames": payload.frames,
        }
    else:
        doc_content = get_default_document_content(project_id, project.name)

    doc = Document(
        project_id=project_id,
        low_version="1.0.0",
        revision=1,
        content_json=json.dumps(doc_content),
    )
    db.add(doc)

    await db.commit()
    await db.refresh(project)

    return ProjectOut(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        thumbnail_asset_id=project.thumbnail_asset_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        screens_count=len(doc_content.get("frames", [])),
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc_stmt = select(Document.content_json).where(Document.project_id == project.id)
    doc_res = await db.execute(doc_stmt)
    content_raw = doc_res.scalar_one_or_none()
    screens_count = 1
    if content_raw:
        try:
            c = json.loads(content_raw)
            screens_count = len(c.get("frames", []))
        except Exception:
            pass

    return ProjectOut(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        thumbnail_asset_id=project.thumbnail_asset_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        screens_count=screens_count,
    )


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.thumbnail_asset_id is not None:
        project.thumbnail_asset_id = payload.thumbnail_asset_id

    project.updated_at = utc_now()
    await db.commit()
    await db.refresh(project)

    return ProjectOut(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        thumbnail_asset_id=project.thumbnail_asset_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        screens_count=1,
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.deleted_at = utc_now()
    await db.commit()
    return {"status": "ok", "message": "Project deleted"}


@router.get("/{project_id}/thumbnail")
async def get_project_thumbnail(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document.content_json).where(Document.project_id == project_id)
    res = await db.execute(stmt)
    content_raw = res.scalar_one_or_none()

    nodes = []
    if content_raw:
        try:
            doc = json.loads(content_raw)
            frames = doc.get("frames", [])
            if frames and len(frames) > 0:
                nodes = frames[0].get("nodes", [])
        except Exception:
            pass

    svg_elements = []
    for n in nodes[:25]:
        ntype = n.get("type", "rectangle")
        x = n.get("x", 0)
        y = n.get("y", 0)
        w = n.get("width", 50)
        h = n.get("height", 20)
        style = n.get("style", {}) or {}
        fill = style.get("fill", "#e4e4e7" if ntype == "rectangle" else "#18181b")
        radius = style.get("radius", 4)
        if ntype == "text":
            text = str(n.get("text", ""))[:18].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            color = style.get("color", "#18181b")
            svg_elements.append(f'<text x="{x}" y="{y+14}" fill="{color}" font-size="12" font-family="sans-serif">{text}</text>')
        else:
            stroke = style.get("stroke", "none")
            sw = style.get("strokeWidth", 0)
            svg_elements.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" />')

    from fastapi import Response
    svg_str = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" width="195" height="422">
  <rect width="390" height="844" rx="16" fill="#ffffff" stroke="#d4d4d8" stroke-width="2" />
  <circle cx="195" cy="18" r="4" fill="#a1a1aa" />
  {''.join(svg_elements)}
</svg>'''

    return Response(content=svg_str, media_type="image/svg+xml")


@router.post("/{project_id}/ai/import/apply")
async def apply_ai_import_to_project_route(
    project_id: str,
    req: dict,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    from app.services.ai import validate_and_guard_ai_patch
    from app.services.document_service import get_or_create_document, create_document_version
    from app.api.routes_documents import _get_project_or_404

    proj = await _get_project_or_404(project_id, user, db)
    doc = await get_or_create_document(db, proj)

    expected_rev = req.get("expected_revision")
    if expected_rev is not None and doc.revision != expected_rev:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Document revision conflict. Please reload.",
                "current_revision": doc.revision,
                "expected_revision": expected_rev,
            },
        )

    patch = req.get("documentPatch", {})
    result_type = req.get("resultType", "screen")
    is_valid, guarded_patch, errors, _ = validate_and_guard_ai_patch(
        patch, result_type=result_type
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid ai patch", "errors": errors},
        )

    # Pre-ai-import snapshot
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

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "project_id": proj.id,
        "revision": doc.revision,
        "frames": existing_frames,
    }


DEFAULT_DESIGN_TOKENS = {
    "colors": {
        "background": "#ffffff",
        "foreground": "#18181b",
        "muted": "#71717a",
        "border": "#d4d4d8",
        "surface": "#f4f4f5",
    },
    "radius": {
        "sm": 4,
        "md": 8,
        "lg": 12,
        "xl": 16,
    },
    "spacing": {
        "xs": 4,
        "sm": 8,
        "md": 16,
        "lg": 24,
        "xl": 32,
    },
}


@router.get("/{project_id}/design-tokens")
async def get_project_design_tokens(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    res = await db.execute(stmt)
    proj = res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    doc_stmt = select(Document).where(Document.project_id == project_id)
    doc_res = await db.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    tokens = DEFAULT_DESIGN_TOKENS
    if doc and doc.content_json:
        try:
            content = json.loads(doc.content_json)
            if "designTokens" in content and isinstance(content["designTokens"], dict):
                tokens = content["designTokens"]
        except Exception:
            pass
    return {"project_id": project_id, "designTokens": tokens}


@router.put("/{project_id}/design-tokens")
async def update_project_design_tokens(
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    res = await db.execute(stmt)
    proj = res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    tokens = payload.get("designTokens", payload)
    if not isinstance(tokens, dict):
        raise HTTPException(status_code=400, detail="designTokens must be an object")

    doc_stmt = select(Document).where(Document.project_id == project_id)
    doc_res = await db.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    content = {}
    if doc.content_json:
        try:
            content = json.loads(doc.content_json)
        except Exception:
            pass
    content["designTokens"] = tokens
    doc.content_json = json.dumps(content)
    doc.revision += 1
    await db.commit()
    await db.refresh(doc)
    return {"status": "success", "project_id": project_id, "designTokens": tokens}


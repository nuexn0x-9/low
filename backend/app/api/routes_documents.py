import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.document import DocumentSave, DocumentAutosave, DocumentOut, VersionCreate, VersionOut
from app.api.deps import get_current_user_optional
from app.services.document_service import (
    get_or_create_document,
    save_document,
    create_document_version,
    list_document_versions,
)

router = APIRouter(prefix="/projects/{project_id}/document", tags=["documents"])


async def _get_project_or_404(project_id: str, user: User, db: AsyncSession) -> Project:
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        from app.core.config import settings
        if settings.ALLOW_DEV_LOCAL_USER:
            project = Project(
                id=project_id,
                owner_id=user.id,
                name="Project",
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)
            return project
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=DocumentOut)
async def get_document(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, user, db)
    doc = await get_or_create_document(db, project)
    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        low_version=doc.low_version,
        revision=doc.revision,
        content=json.loads(doc.content_json),
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.put("", response_model=DocumentOut)
async def update_document(
    project_id: str,
    payload: DocumentSave,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, user, db)
    doc = await save_document(db, project, payload.model_dump(exclude_unset=True), is_autosave=False)
    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        low_version=doc.low_version,
        revision=doc.revision,
        content=json.loads(doc.content_json),
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/autosave", response_model=DocumentOut)
async def autosave_document(
    project_id: str,
    payload: DocumentAutosave,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, user, db)
    doc = await save_document(db, project, payload.model_dump(exclude_unset=True), is_autosave=True)
    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        low_version=doc.low_version,
        revision=doc.revision,
        content=json.loads(doc.content_json),
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/versions", response_model=VersionOut, status_code=status.HTTP_201_CREATED)
async def create_version(
    project_id: str,
    payload: VersionCreate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, user, db)
    doc = await get_or_create_document(db, project)
    version = await create_document_version(db, doc, reason=payload.reason)
    return VersionOut.model_validate(version)


@router.get("/versions", response_model=List[VersionOut])
async def get_versions(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, user, db)
    doc = await get_or_create_document(db, project)
    versions = await list_document_versions(db, doc)
    return [VersionOut.model_validate(v) for v in versions]

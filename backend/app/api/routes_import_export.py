from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.document import ValidateImportRequest, ValidateImportResponse
from app.api.deps import get_current_user_optional
from app.services.import_service import (
    validate_and_normalize_low_data,
    import_low_json,
    export_low_json,
)

router = APIRouter(tags=["import-export"])


@router.post("/import/low-json/validate", response_model=ValidateImportResponse)
async def validate_import(payload: ValidateImportRequest):
    data = payload.data if payload.data is not None else payload.json_string
    if data is None:
        raise HTTPException(status_code=400, detail="Missing data or json_string")

    valid, low_ver, frames, errors, warnings = validate_and_normalize_low_data(data)

    total_nodes = sum(len(f.get("nodes", [])) for f in frames) if valid else 0
    return ValidateImportResponse(
        valid=valid,
        low_version=low_ver,
        screens_count=len(frames),
        total_nodes=total_nodes,
        errors=errors,
        warnings=warnings,
    )


@router.post("/projects/{project_id}/import/low-json")
async def import_into_project(
    project_id: str,
    request: Request,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    body = await request.json()
    doc = await import_low_json(db, project, body)
    return {
        "status": "ok",
        "message": "Document imported successfully",
        "revision": doc.revision,
        "low_version": doc.low_version,
    }


@router.get("/projects/{project_id}/export/low-json")
async def export_project(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_data = await export_low_json(db, project)
    return export_data

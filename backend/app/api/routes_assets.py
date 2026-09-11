import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.asset import Asset
from app.schemas.asset import AssetOut
from app.api.deps import get_current_user_optional
from app.services.asset_service import (
    save_asset,
    get_asset_by_id,
    list_project_assets,
    delete_asset,
)

router = APIRouter(tags=["assets"])


@router.post("/projects/{project_id}/assets", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    project_id: str,
    file: UploadFile = File(...),
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

    asset = await save_asset(db, user, file, project_id=project.id)
    return AssetOut(
        id=asset.id,
        owner_id=asset.owner_id,
        project_id=asset.project_id,
        file_name=asset.file_name,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        url=f"/api/assets/{asset.id}",
        created_at=asset.created_at,
    )


@router.get("/projects/{project_id}/assets", response_model=List[AssetOut])
async def get_project_assets(
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

    assets = await list_project_assets(db, project.id)
    return [
        AssetOut(
            id=a.id,
            owner_id=a.owner_id,
            project_id=a.project_id,
            file_name=a.file_name,
            mime_type=a.mime_type,
            size_bytes=a.size_bytes,
            url=f"/api/assets/{a.id}",
            created_at=a.created_at,
        )
        for a in assets
    ]


@router.get("/assets/{asset_id}")
async def download_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
):
    asset = await get_asset_by_id(db, asset_id)
    if not os.path.exists(asset.storage_path):
        raise HTTPException(status_code=404, detail="Asset file not found on disk")

    return FileResponse(
        path=asset.storage_path,
        media_type=asset.mime_type,
        filename=asset.file_name,
    )


@router.delete("/assets/{asset_id}")
async def remove_asset(
    asset_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    asset = await get_asset_by_id(db, asset_id)
    if asset.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this asset")

    await delete_asset(db, asset)
    return {"status": "ok", "message": "Asset deleted"}


@router.post("/projects/{project_id}/assets/cleanup-orphans")
async def cleanup_project_orphan_assets(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    from app.models.document import Document
    from app.services.asset_service import cleanup_orphan_assets

    stmt = select(Document.content_json).where(Document.project_id == project_id)
    res = await db.execute(stmt)
    doc_content = res.scalar_one_or_none()

    cleaned = await cleanup_orphan_assets(db, project_id, doc_content)
    return {
        "status": "ok",
        "message": f"Cleaned up {len(cleaned)} orphan assets",
        "cleaned_count": len(cleaned),
        "cleaned_asset_ids": cleaned,
    }

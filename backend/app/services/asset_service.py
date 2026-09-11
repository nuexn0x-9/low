import os
import re
from pathlib import Path
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.asset import Asset, generate_asset_id
from app.models.user import User


def sanitize_filename(filename: str) -> str:
    # Keep alphanumeric, dot, dash, underscore
    clean = re.sub(r"[^\w\.-]", "_", filename)
    return clean[:100]


async def save_asset(
    session: AsyncSession,
    owner: User,
    file: UploadFile,
    project_id: Optional[str] = None,
) -> Asset:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    storage_dir = Path(settings.ASSET_STORAGE_PATH) / (project_id or "global")
    storage_dir.mkdir(parents=True, exist_ok=True)

    asset_id = generate_asset_id()
    safe_name = sanitize_filename(file.filename)
    stored_name = f"{asset_id}_{safe_name}"
    target_path = storage_dir / stored_name

    content = await file.read()
    size_bytes = len(content)

    if size_bytes > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=400, detail="Asset file size exceeds 20MB limit")

    with open(target_path, "wb") as f:
        f.write(content)

    mime_type = file.content_type or "application/octet-stream"

    asset = Asset(
        id=asset_id,
        owner_id=owner.id,
        project_id=project_id,
        file_name=file.filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        storage_path=str(target_path),
    )
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset


async def get_asset_by_id(session: AsyncSession, asset_id: str) -> Asset:
    stmt = select(Asset).where(Asset.id == asset_id)
    result = await session.execute(stmt)
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


async def list_project_assets(session: AsyncSession, project_id: str) -> List[Asset]:
    stmt = select(Asset).where(Asset.project_id == project_id).order_by(Asset.created_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_asset(session: AsyncSession, asset: Asset) -> None:
    try:
        if os.path.exists(asset.storage_path):
            os.remove(asset.storage_path)
    except Exception:
        pass

    await session.delete(asset)
    await session.commit()


async def cleanup_orphan_assets(
    session: AsyncSession, project_id: str, document_content_raw: Optional[str]
) -> List[str]:
    assets = await list_project_assets(session, project_id)
    doc_str = document_content_raw or ""

    cleaned_ids = []
    for a in assets:
        if a.id not in doc_str and a.file_name not in doc_str:
            cleaned_ids.append(a.id)
            await delete_asset(session, a)

    return cleaned_ids

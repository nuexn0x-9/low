import json
import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException
from app.models.document import Document, DocumentVersion
from app.models.project import Project


def get_default_nodes() -> List[Dict[str, Any]]:
    return [
        {"id": "n_title", "type": "text", "name": "Title", "x": 24, "y": 96, "width": 300, "height": 40, "text": "Welcome back", "style": {"color": "#18181b", "fontSize": 26, "fontWeight": 700, "align": "left", "opacity": 100}},
        {"id": "n_sub", "type": "text", "name": "Subtitle", "x": 24, "y": 140, "width": 320, "height": 22, "text": "Sign in to continue to LOW", "style": {"color": "#71717a", "fontSize": 14, "fontWeight": 400, "align": "left", "opacity": 100}},
        {"id": "n_phone", "type": "input", "name": "Phone Input", "x": 24, "y": 204, "width": 342, "height": 48, "text": "Phone number", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
        {"id": "n_pass", "type": "input", "name": "Password Input", "x": 24, "y": 264, "width": 342, "height": 48, "text": "Password", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
        {"id": "n_link", "type": "link", "name": "Forgot Link", "x": 24, "y": 322, "width": 160, "height": 20, "text": "Forgot password?", "style": {"color": "#3f3f46", "fontSize": 13, "fontWeight": 500, "align": "left", "opacity": 100}},
        {"id": "n_btn", "type": "button", "name": "Login Button", "x": 24, "y": 376, "width": 342, "height": 50, "text": "Sign In", "style": {"fill": "#18181b", "radius": 10, "color": "#ffffff", "fontSize": 15, "fontWeight": 600, "align": "center", "opacity": 100}, "prototype": {"trigger": "tap", "action": "navigate", "target": "Home", "transition": "slide"}},
        {"id": "n_nav", "type": "bottomnav", "name": "Bottom Navigation", "x": 0, "y": 780, "width": 390, "height": 64, "text": "", "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "opacity": 100}},
    ]


def get_default_document_content(project_id: str, project_name: str) -> Dict[str, Any]:
    return {
        "id": project_id,
        "name": project_name,
        "frames": [
            {
                "id": "frame_login",
                "name": "Login",
                "nodes": get_default_nodes(),
            }
        ],
    }


async def get_or_create_document(session: AsyncSession, project: Project) -> Document:
    stmt = select(Document).where(Document.project_id == project.id)
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        content = get_default_document_content(project.id, project.name)
        doc = Document(
            project_id=project.id,
            low_version="1.0.0",
            revision=1,
            content_json=json.dumps(content),
        )
        session.add(doc)
        await session.commit()
        await session.refresh(doc)

    return doc


def extract_content_payload(data: Dict[str, Any], project_id: str, project_name: str) -> Dict[str, Any]:
    # Extract frames from incoming structure
    frames = None
    if "frames" in data and isinstance(data["frames"], list):
        frames = data["frames"]
    elif "document" in data and isinstance(data["document"], dict) and "frames" in data["document"]:
        frames = data["document"]["frames"]

    if frames is None:
        raise HTTPException(status_code=400, detail="Document must contain frames")

    # Keep compatibility with frontend format
    content = {
        "id": project_id,
        "name": project_name,
        "frames": frames,
    }
    # Preserve metadata or extra fields if present
    if "document" in data and isinstance(data["document"], dict):
        for k, v in data["document"].items():
            if k not in ("id", "name", "frames"):
                content[k] = v

    return content


async def save_document(
    session: AsyncSession,
    project: Project,
    data: Dict[str, Any],
    is_autosave: bool = False,
) -> Document:
    doc = await get_or_create_document(session, project)
    expected_revision = data.get("expected_revision")
    if expected_revision is not None and doc.revision != expected_revision:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Document revision conflict",
                "server_revision": doc.revision,
                "expected_revision": expected_revision,
            },
        )

    content = extract_content_payload(data, project.id, project.name)

    doc.content_json = json.dumps(content)
    doc.revision += 1
    if "lowVersion" in data:
        doc.low_version = data["lowVersion"]

    # If manual save, optionally create a snapshot if revision is a multiple of 10 or explicitly requested
    await session.commit()
    await session.refresh(doc)
    return doc


async def create_document_version(
    session: AsyncSession,
    doc: Document,
    reason: Optional[str] = "manual snapshot",
) -> DocumentVersion:
    # Find latest version number
    stmt = select(DocumentVersion.version_number).where(DocumentVersion.document_id == doc.id).order_by(desc(DocumentVersion.version_number)).limit(1)
    result = await session.execute(stmt)
    latest_ver = result.scalar_one_or_none() or 0

    version = DocumentVersion(
        document_id=doc.id,
        version_number=latest_ver + 1,
        content_json=doc.content_json,
        reason=reason,
    )
    session.add(version)
    await session.commit()
    await session.refresh(version)
    return version


async def list_document_versions(session: AsyncSession, doc: Document) -> List[DocumentVersion]:
    stmt = select(DocumentVersion).where(DocumentVersion.document_id == doc.id).order_by(desc(DocumentVersion.version_number))
    result = await session.execute(stmt)
    return list(result.scalars().all())

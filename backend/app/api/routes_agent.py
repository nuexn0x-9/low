import json
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.agent import AgentEvent
from app.schemas.agent import (
    SessionCreate,
    SessionOut,
    SessionDetailOut,
    AgentActionBody,
    AgentInstructionsOut,
)
from app.services.agent_service import (
    AGENT_SCHEMA,
    create_session,
    get_session_by_id,
    revoke_session,
    execute_agent_action,
    get_session_events,
    generate_session_instructions,
    undo_session_event,
    undo_last_session_event,
    cleanup_expired_sessions,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/schema")
async def get_agent_schema():
    return AGENT_SCHEMA


@router.post("/sessions", response_model=SessionOut)
async def create_agent_session(
    payload: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    sess, raw_token = await create_session(
        db,
        name=payload.name,
        document=payload.document,
        project_id=payload.project_id,
        preset=payload.preset,
        scopes=payload.scopes,
    )
    doc = json.loads(sess.document_snapshot_json)
    scopes = json.loads(sess.scopes_json) if sess.scopes_json else []
    return SessionOut(
        session_id=sess.id,
        token=raw_token,
        name=payload.name or "LOW Session",
        seq=sess.seq,
        frames=doc,
        expires_at=sess.expires_at,
        scopes=scopes,
        preset=sess.preset_name,
        is_revoked=sess.is_revoked,
    )


@router.get("/sessions/{sid}", response_model=SessionDetailOut)
async def get_session_info(
    sid: str,
    db: AsyncSession = Depends(get_db),
):
    sess = await get_session_by_id(db, sid)
    doc = json.loads(sess.document_snapshot_json)
    scopes = json.loads(sess.scopes_json) if sess.scopes_json else []
    return SessionDetailOut(
        id=sess.id,
        project_id=sess.project_id,
        screens=len(doc),
        seq=sess.seq,
        expires_at=sess.expires_at,
        created_at=sess.created_at,
        updated_at=sess.updated_at,
        scopes=scopes,
        preset=sess.preset_name,
        is_revoked=sess.is_revoked,
        revoked_at=sess.revoked_at,
    )


@router.post("/sessions/{sid}/revoke")
async def revoke_agent_session(
    sid: str,
    db: AsyncSession = Depends(get_db),
):
    sess = await revoke_session(db, sid)
    return {
        "ok": True,
        "session_id": sess.id,
        "status": "revoked",
        "revoked_at": sess.revoked_at.isoformat() if sess.revoked_at else None,
    }


@router.get("/sessions/{sid}/instructions", response_model=AgentInstructionsOut)
async def get_agent_instructions(
    sid: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    sess = await get_session_by_id(db, sid)
    base_url = str(request.base_url).rstrip("/")
    instructions = generate_session_instructions(sess, base_url)
    return AgentInstructionsOut(**instructions)


@router.get("/sessions/{sid}/document")
async def get_session_document(
    sid: str,
    db: AsyncSession = Depends(get_db),
):
    sess = await get_session_by_id(db, sid)
    doc = json.loads(sess.document_snapshot_json)
    return {
        "seq": sess.seq,
        "frames": doc,
    }


@router.get("/sessions/{sid}/events")
async def get_events(
    sid: str,
    after: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    seq, doc, events = await get_session_events(db, sid, after=after)
    return {
        "seq": seq,
        "frames": doc,
        "events": events,
    }


@router.post("/sessions/{sid}/actions")
async def post_action(
    sid: str,
    body: AgentActionBody,
    x_low_token: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    # Enforce payload size limit (max 1MB for action params)
    raw_size = len(json.dumps(body.params))
    if raw_size > 1024 * 1024:
        raise HTTPException(status_code=413, detail="Action payload exceeds 1MB limit")

    result = await execute_agent_action(
        db,
        sid=sid,
        action=body.action,
        params=body.params,
        token=x_low_token,
        dry_run=body.dryRun,
    )
    return result


@router.post("/events/{event_id}/undo")
async def undo_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AgentEvent).where(AgentEvent.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Agent event not found")

    result = await undo_session_event(db, sid=event.session_id, event_id=event_id)
    return result


@router.post("/sessions/{sid}/undo-last")
async def undo_last_session_action(
    sid: str,
    db: AsyncSession = Depends(get_db),
):
    result = await undo_last_session_event(db, sid)
    return result


@router.delete("/sessions/expired")
async def prune_expired_sessions(
    db: AsyncSession = Depends(get_db),
):
    count = await cleanup_expired_sessions(db)
    return {
        "status": "ok",
        "message": f"Pruned {count} expired agent sessions",
        "pruned_count": count,
    }

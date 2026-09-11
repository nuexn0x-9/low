from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, utc_now
import uuid


def generate_session_id() -> str:
    return f"sess_{uuid.uuid4().hex[:8]}"


def generate_event_id() -> str:
    return f"evt_{uuid.uuid4().hex[:8]}"


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_session_id)
    project_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    document_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    seq: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scopes_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default='["read_document","write_document","create_screen","edit_screen","delete_screen","manage_components","manage_templates","run_ai_import","apply_ai_import","batch_update","dry_run","undo_changes"]',
    )
    preset_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, default="full_editor_assistant")
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="agent_sessions")
    events = relationship("AgentEvent", back_populates="session", cascade="all, delete-orphan", order_by="AgentEvent.seq")


class AgentEvent(Base):
    __tablename__ = "agent_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_event_id)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    params_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    result_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    document_before_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_after_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dry_run: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scope_used: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="applied", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session = relationship("AgentSession", back_populates="events")

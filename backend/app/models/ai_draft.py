from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, utc_now
import uuid


def generate_draft_id() -> str:
    return f"aid_{uuid.uuid4().hex[:10]}"


class AIImportDraft(Base):
    __tablename__ = "ai_import_drafts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_draft_id)
    owner_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="mock")
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="mock-deterministic")
    result_type: Mapped[str] = mapped_column(String(64), nullable=False, default="screen")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    draft_json: Mapped[str] = mapped_column(Text, nullable=False)
    validation_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="generated")
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    token_usage_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    owner = relationship("User")
    project = relationship("Project")

from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, utc_now
import uuid


def generate_setting_id() -> str:
    return f"set_{uuid.uuid4().hex[:12]}"


class UserSetting(Base):
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_setting_id)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User")

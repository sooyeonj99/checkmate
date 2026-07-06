from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    enterprise_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    member_email: Mapped[str] = mapped_column(String(255), nullable=False)
    member_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="member")  # owner / admin / member
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / active
    invite_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True, index=True)
    invite_method: Mapped[str] = mapped_column(String(10), default="email")   # email | sms
    member_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    invited_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

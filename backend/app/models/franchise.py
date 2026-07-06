from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class FranchiseStore(Base):
    """프랜차이즈 본사-가맹점 관계 테이블"""
    __tablename__ = "franchise_stores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    franchisor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    franchisee_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    franchisee_email: Mapped[str] = mapped_column(String(255), nullable=False)
    store_name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | active
    invite_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    invited_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

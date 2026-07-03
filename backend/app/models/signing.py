from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class SigningRecord(Base):
    __tablename__ = "signing_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # 'self' = 내가 서명만, 'request' = 상대방에게 요청
    type: Mapped[str] = mapped_column(String(10), default='self')

    contract_id: Mapped[str] = mapped_column(String(255), nullable=False)
    contract_name: Mapped[str] = mapped_column(String(500), nullable=False)

    requester_id: Mapped[int] = mapped_column(nullable=False)
    requester_email: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_name: Mapped[str] = mapped_column(String(100), nullable=False)

    requestee_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default='pending')  # pending / signed / expired

    requester_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requestee_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requestee_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    requester_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    requestee_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

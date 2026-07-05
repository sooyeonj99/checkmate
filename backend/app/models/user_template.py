from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class UserTemplate(Base):
    __tablename__ = "user_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'image' | 'html'
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_ext: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    html_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 서명1 (요청자가 받는 서명) 위치 — % 단위
    sig1_x: Mapped[float] = mapped_column(Float, default=5.0)
    sig1_y: Mapped[float] = mapped_column(Float, default=82.0)
    sig1_w: Mapped[float] = mapped_column(Float, default=40.0)
    sig1_h: Mapped[float] = mapped_column(Float, default=10.0)

    # 서명2 (요청자 본인 서명) 위치 — 선택적
    sig2_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sig2_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sig2_w: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sig2_h: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

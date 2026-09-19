from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class PopupSetting(Base):
    """홈페이지 공지/이벤트 팝업 설정 — 단일 레코드로 관리한다."""
    __tablename__ = "popup_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(200), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    link_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    button_text: Mapped[str] = mapped_column(String(50), default="자세히 보기")
    width: Mapped[int] = mapped_column(Integer, default=420)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # null = 내용에 맞춰 자동
    position: Mapped[str] = mapped_column(String(20), default="center")   # center / top / bottom
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

from datetime import datetime
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class SavedContract(Base):
    __tablename__ = "saved_contracts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id: Mapped[str] = mapped_column(String(64), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    contract_type: Mapped[str] = mapped_column(String(100), default="기타 계약서")
    score: Mapped[int] = mapped_column(Integer, default=0)
    grade: Mapped[str] = mapped_column(String(10), default="안전")
    danger_count: Mapped[int] = mapped_column(Integer, default=0)
    warn_count: Mapped[int] = mapped_column(Integer, default=0)
    safe_count: Mapped[int] = mapped_column(Integer, default=0)
    analysis_time: Mapped[str] = mapped_column(String(50), default="")
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

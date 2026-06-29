from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from app.db.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    service_name = Column(String(100), nullable=False)
    emoji = Column(String(10), default="📱")
    category = Column(String(50), default="기타")           # 동영상/음악/배달/쇼핑/기타
    monthly_fee = Column(Integer, default=0)                # 원 단위 (월 기준)
    billing_cycle = Column(String(20), default="monthly")   # monthly / annual
    billing_date = Column(Integer, default=1)               # 매월 N일
    start_date = Column(String(20), nullable=True)          # YYYY-MM-DD
    end_date = Column(String(20), nullable=True)            # null = 무기한
    cancellation_penalty = Column(Integer, default=0)       # 해지 위약금
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

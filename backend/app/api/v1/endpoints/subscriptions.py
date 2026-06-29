"""
구독/렌탈 서비스 관리 API
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.api.v1.endpoints.users import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["구독관리"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    service_name: str
    emoji: str = "📱"
    category: str = "기타"
    monthly_fee: int = 0
    billing_cycle: str = "monthly"   # monthly / annual
    billing_date: int = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cancellation_penalty: int = 0
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    service_name: Optional[str] = None
    emoji: Optional[str] = None
    category: Optional[str] = None
    monthly_fee: Optional[int] = None
    billing_cycle: Optional[str] = None
    billing_date: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cancellation_penalty: Optional[int] = None
    notes: Optional[str] = None


def _serialize(s: Subscription) -> dict:
    # 사용 개월 수 계산
    used_months = 0
    if s.start_date:
        try:
            start = datetime.strptime(s.start_date, "%Y-%m-%d")
            end = datetime.strptime(s.end_date, "%Y-%m-%d") if s.end_date else datetime.now()
            diff = (end.year - start.year) * 12 + (end.month - start.month)
            used_months = max(0, diff)
        except Exception:
            pass

    total_paid = used_months * s.monthly_fee

    return {
        "id": s.id,
        "service_name": s.service_name,
        "emoji": s.emoji,
        "category": s.category,
        "monthly_fee": s.monthly_fee,
        "billing_cycle": s.billing_cycle,
        "billing_date": s.billing_date,
        "start_date": s.start_date,
        "end_date": s.end_date,
        "cancellation_penalty": s.cancellation_penalty,
        "notes": s.notes,
        "used_months": used_months,
        "total_paid": total_paid,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ── 목록 조회 ─────────────────────────────────────────────────────────────────

@router.get("", summary="구독 목록 조회")
async def list_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(Subscription).filter_by(user_id=current_user.id).order_by(Subscription.created_at.desc()).all()
    return [_serialize(r) for r in rows]


# ── 추가 ─────────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, summary="구독 추가")
async def add_subscription(
    body: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = Subscription(user_id=current_user.id, **body.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _serialize(sub)


# ── 수정 ─────────────────────────────────────────────────────────────────────

@router.put("/{sub_id}", summary="구독 수정")
async def update_subscription(
    sub_id: int,
    body: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="구독 항목을 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(sub, k, v)
    sub.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)
    return _serialize(sub)


# ── 삭제 ─────────────────────────────────────────────────────────────────────

@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT, summary="구독 삭제")
async def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="구독 항목을 찾을 수 없습니다.")
    db.delete(sub)
    db.commit()

"""통계 · 분석 대시보드 API"""
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.saved_contract import SavedContract
from app.models.signing import SigningRecord
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["통계"])


class MonthlyCount(BaseModel):
    month: str
    count: int
    avg_score: float


class ExpiringItem(BaseModel):
    id: int
    filename: str
    expiry_date: str
    days_left: int


class StatsResponse(BaseModel):
    total_analyzed: int
    total_saved: int
    avg_score: float
    grade_breakdown: dict[str, int]
    type_breakdown: dict[str, int]
    monthly_trend: list[MonthlyCount]
    expiring_soon: list[ExpiringItem]
    signing_sent: int
    signing_received: int
    signing_completed: int


@router.get("/me", response_model=StatsResponse)
def get_my_stats(
    months: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = current_user.id

    saved = db.query(SavedContract).filter(SavedContract.user_id == uid).all()
    total_saved = len(saved)
    total_analyzed = total_saved

    avg_score = round(sum(c.score for c in saved) / total_saved, 1) if total_saved else 0.0

    # 등급 분포 — dict 형태로 반환
    grade_breakdown: dict[str, int] = {}
    for c in saved:
        g = c.grade or "기타"
        grade_breakdown[g] = grade_breakdown.get(g, 0) + 1

    # 계약 유형 분포 — dict 형태로 반환
    type_breakdown: dict[str, int] = {}
    for c in saved:
        t = c.contract_type or "기타"
        type_breakdown[t] = type_breakdown.get(t, 0) + 1

    # 월별 트렌드
    since = datetime.now() - timedelta(days=30 * months)
    monthly_counts: dict[str, list[int]] = {}
    for c in saved:
        if c.saved_at and c.saved_at >= since:
            key = c.saved_at.strftime("%Y-%m")
            if key not in monthly_counts:
                monthly_counts[key] = []
            monthly_counts[key].append(c.score)

    trend: list[MonthlyCount] = []
    for i in range(months - 1, -1, -1):
        d = datetime.now() - timedelta(days=30 * i)
        key = d.strftime("%Y-%m")
        scores = monthly_counts.get(key, [])
        trend.append(MonthlyCount(
            month=key,
            count=len(scores),
            avg_score=round(sum(scores) / len(scores), 1) if scores else 0.0,
        ))

    # 만료 임박 — 리스트로 반환
    now = datetime.now()
    expiring_soon: list[ExpiringItem] = []
    for c in saved:
        if c.expiry_date and now <= c.expiry_date <= now + timedelta(days=7):
            days_left = (c.expiry_date - now).days
            expiring_soon.append(ExpiringItem(
                id=c.id,
                filename=c.filename,
                expiry_date=c.expiry_date.strftime("%Y-%m-%d"),
                days_left=days_left,
            ))

    # 서명 통계 (signing_records 테이블이 없을 경우 0 반환)
    try:
        signing_sent = db.query(SigningRecord).filter(SigningRecord.requester_id == uid).count()
        signing_received = db.query(SigningRecord).filter(SigningRecord.requestee_email == current_user.email).count()
        signing_completed = db.query(SigningRecord).filter(
            SigningRecord.requester_id == uid,
            SigningRecord.status == "signed",
        ).count()
    except Exception:
        signing_sent = signing_received = signing_completed = 0

    return StatsResponse(
        total_analyzed=total_analyzed,
        total_saved=total_saved,
        avg_score=avg_score,
        grade_breakdown=grade_breakdown,
        type_breakdown=type_breakdown,
        monthly_trend=trend,
        expiring_soon=expiring_soon,
        signing_sent=signing_sent,
        signing_received=signing_received,
        signing_completed=signing_completed,
    )

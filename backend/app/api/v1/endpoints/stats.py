"""통계 · 분석 대시보드 API"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.saved_contract import SavedContract
from app.models.signing import SigningRecord
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["통계"])


class MonthlyCount(BaseModel):
    month: str  # "2026-07"
    count: int


class GradeBreakdown(BaseModel):
    grade: str
    count: int
    percentage: float


class TypeBreakdown(BaseModel):
    contract_type: str
    count: int


class StatsResponse(BaseModel):
    total_analyzed: int
    total_saved: int
    avg_score: float
    grade_breakdown: list[GradeBreakdown]
    type_breakdown: list[TypeBreakdown]
    monthly_trend: list[MonthlyCount]
    expiring_soon: int           # 7일 이내 만료
    signing_sent: int
    signing_received: int
    signing_completed: int


@router.get("/me", response_model=StatsResponse)
def get_my_stats(
    months: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """로그인 사용자의 계약 분석 통계"""
    uid = current_user.id

    # 저장된 계약 전체
    saved = db.query(SavedContract).filter(SavedContract.user_id == uid).all()
    total_saved = len(saved)
    total_analyzed = total_saved  # 현재 저장 = 분석 완료 기준

    avg_score = round(sum(c.score for c in saved) / total_saved, 1) if total_saved else 0.0

    # 등급 분포
    grade_counts: dict[str, int] = {}
    for c in saved:
        grade_counts[c.grade] = grade_counts.get(c.grade, 0) + 1

    grade_breakdown = [
        GradeBreakdown(
            grade=g,
            count=cnt,
            percentage=round(cnt / total_saved * 100, 1) if total_saved else 0.0,
        )
        for g, cnt in sorted(grade_counts.items())
    ]

    # 계약 유형 분포 (상위 6개)
    type_counts: dict[str, int] = {}
    for c in saved:
        t = c.contract_type or "기타"
        type_counts[t] = type_counts.get(t, 0) + 1
    type_breakdown = [
        TypeBreakdown(contract_type=t, count=cnt)
        for t, cnt in sorted(type_counts.items(), key=lambda x: -x[1])[:6]
    ]

    # 월별 트렌드
    since = datetime.now() - timedelta(days=30 * months)
    monthly: dict[str, int] = {}
    for c in saved:
        if c.saved_at and c.saved_at >= since:
            key = c.saved_at.strftime("%Y-%m")
            monthly[key] = monthly.get(key, 0) + 1

    # 비어있는 달 채우기
    trend = []
    for i in range(months - 1, -1, -1):
        d = datetime.now() - timedelta(days=30 * i)
        key = d.strftime("%Y-%m")
        trend.append(MonthlyCount(month=key, count=monthly.get(key, 0)))

    # 만료 임박 (7일 이내)
    now = datetime.now()
    expiring_soon = sum(
        1 for c in saved
        if c.expiry_date and now <= c.expiry_date <= now + timedelta(days=7)
    )

    # 서명 통계
    signing_sent = db.query(SigningRecord).filter(SigningRecord.requester_id == uid).count()
    signing_received = db.query(SigningRecord).filter(SigningRecord.signer_email == current_user.email).count()
    signing_completed = db.query(SigningRecord).filter(
        SigningRecord.requester_id == uid,
        SigningRecord.status == "signed",
    ).count()

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

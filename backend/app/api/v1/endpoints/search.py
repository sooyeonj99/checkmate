"""계약서 전문 검색 API"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from datetime import datetime

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.saved_contract import SavedContract
from app.models.user import User

router = APIRouter(prefix="/search", tags=["검색"])


class SearchResult(BaseModel):
    id: int
    contract_id: str
    filename: str
    contract_type: str
    score: int
    grade: str
    danger_count: int
    warn_count: int
    safe_count: int
    saved_at: datetime
    expiry_date: Optional[datetime]
    match_snippet: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/contracts", response_model=list[SearchResult])
def search_contracts(
    q: str = Query(..., min_length=1, description="검색어"),
    grade: Optional[str] = Query(None, description="위험|주의|안전"),
    contract_type: Optional[str] = Query(None, description="계약서 유형 필터"),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """키워드로 저장된 계약서 검색 (파일명 + 계약유형 + 분석 내용)"""
    query = db.query(SavedContract).filter(SavedContract.user_id == current_user.id)

    q_lower = q.lower()

    # 기본 필터: 파일명 + 계약 유형
    text_filter = or_(
        SavedContract.filename.ilike(f"%{q}%"),
        SavedContract.contract_type.ilike(f"%{q}%"),
    )
    query = query.filter(text_filter)

    if grade:
        query = query.filter(SavedContract.grade == grade)
    if contract_type:
        query = query.filter(SavedContract.contract_type.ilike(f"%{contract_type}%"))

    contracts = query.order_by(SavedContract.saved_at.desc()).limit(limit).all()

    results = []
    for c in contracts:
        snippet = None
        # result_json에서 매칭 텍스트 스니펫 추출
        if c.result_json:
            summary = c.result_json.get("summary", "")
            if q_lower in summary.lower():
                idx = summary.lower().find(q_lower)
                start = max(0, idx - 40)
                end = min(len(summary), idx + len(q) + 60)
                snippet = "..." + summary[start:end] + "..."
            else:
                for clause in c.result_json.get("clauses", []):
                    desc = clause.get("description", "")
                    if q_lower in desc.lower():
                        idx = desc.lower().find(q_lower)
                        start = max(0, idx - 40)
                        end = min(len(desc), idx + len(q) + 60)
                        snippet = "..." + desc[start:end] + "..."
                        break

        results.append(SearchResult(
            id=c.id,
            contract_id=c.contract_id,
            filename=c.filename,
            contract_type=c.contract_type,
            score=c.score,
            grade=c.grade,
            danger_count=c.danger_count,
            warn_count=c.warn_count,
            safe_count=c.safe_count,
            saved_at=c.saved_at,
            expiry_date=c.expiry_date,
            match_snippet=snippet,
        ))

    return results

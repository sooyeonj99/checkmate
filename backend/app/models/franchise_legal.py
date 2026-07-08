"""
법적 안전 설계를 위한 추가 모델
- ContractRiskSummary : 본사 열람용 익명화 위험도 요약 (개인정보 없음)
- WorkerConsent       : 근로자 동의 추적
- FranchiseAuditLog  : 감사 로그
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ContractRiskSummary(Base):
    """
    본사가 열람할 수 있는 유일한 계약 데이터.
    계약서 원문·파일명·근로자 개인정보는 일절 포함하지 않음.
    """
    __tablename__ = "contract_risk_summaries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # saved_contracts 참조 — 본사 API에는 절대 노출 안 함
    saved_contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("saved_contracts.id"), nullable=False
    )
    store_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("franchise_stores.id"), nullable=False, index=True
    )

    # 본사에 공개 가능한 집계 데이터만
    grade: Mapped[str] = mapped_column(String(10))          # 위험 / 주의 / 안전
    score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    contract_type: Mapped[str] = mapped_column(String(100), default="기타 계약서")
    risk_categories: Mapped[list] = mapped_column(JSON, default=list)  # ["위약금 과다", ...]
    danger_count: Mapped[int] = mapped_column(Integer, default=0)
    warn_count: Mapped[int] = mapped_column(Integer, default=0)

    # 근로자 동의 상태
    # pending   : 동의 요청 전
    # requested : 동의 이메일 발송됨
    # consented : 동의 완료 → 개별 식별 가능
    # declined  : 거절 → 집계 통계에만 포함
    # exempt    : 근로계약서 외 계약 → 동의 불필요
    consent_status: Mapped[str] = mapped_column(String(20), default="pending")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class WorkerConsent(Base):
    """근로자 동의 요청 및 응답 추적"""
    __tablename__ = "worker_consents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    risk_summary_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contract_risk_summaries.id"), nullable=False, index=True
    )
    worker_email: Mapped[str] = mapped_column(String(255), nullable=False)
    consent_token: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/consented/declined
    consented_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class FranchiseAuditLog(Base):
    """
    감사 로그 — 누가 언제 어떤 데이터를 조회/사용했는지 기록
    actions: view_dashboard / view_store_contracts / send_support / request_consent
    """
    __tablename__ = "franchise_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)  # store / risk_summary
    resource_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

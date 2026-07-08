"""
프랜차이즈 본사-가맹점 API
법적 안전 설계 원칙:
- 본사 API는 익명화된 위험도 요약(ContractRiskSummary)만 반환
- 계약서 원문·파일명·근로자 개인정보는 절대 포함 안 함
- 감사 로그(FranchiseAuditLog) 자동 기록
- 본사 기능은 지원/안내 전용 (페널티·해지 기능 없음)
"""
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.franchise import FranchiseStore
from app.models.franchise_legal import ContractRiskSummary, WorkerConsent, FranchiseAuditLog
from app.models.user import User
from app.services.email_service import _send_smtp

router = APIRouter(prefix="/franchise", tags=["프랜차이즈"])


# ── 요청/응답 스키마 ──────────────────────────────────────

class InviteStoreRequest(BaseModel):
    franchisee_email: EmailStr
    store_name: str
    region: Optional[str] = None


class StoreOut(BaseModel):
    id: int
    store_name: str
    region: Optional[str]
    status: str
    invited_at: datetime
    joined_at: Optional[datetime]
    franchisee_username: Optional[str] = None
    # 집계 통계 (동의 여부와 무관하게 항상 집계에 포함)
    contract_count: int = 0
    danger_count: int = 0
    warn_count: int = 0
    # 동의 미완료 건수 (개별 식별 불가)
    pending_consent_count: int = 0

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    total_stores: int
    active_stores: int
    pending_stores: int
    total_contracts: int
    danger_contracts: int
    warn_contracts: int
    safe_contracts: int
    stores: list[StoreOut]


class ContractRiskOut(BaseModel):
    """
    본사 열람 전용 — 개인정보 없는 위험도 요약.
    파일명·계약 원문·근로자 정보 일절 미포함.
    """
    id: int
    grade: str
    score: int
    contract_type: str
    risk_categories: list[str]   # 위험 조항 유형명만 (구체적 문구·금액 없음)
    danger_count: int
    warn_count: int
    consent_status: str          # consented / declined / pending / requested / exempt
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsentRequestBody(BaseModel):
    worker_email: EmailStr
    risk_summary_id: int


class SendSupportBody(BaseModel):
    store_id: int
    message_type: str = "risk_improvement"  # risk_improvement / general_guide


# ── 감사 로그 헬퍼 ───────────────────────────────────────

def _audit(db: Session, user_id: int, action: str,
           resource_type: str = None, resource_id: int = None):
    db.add(FranchiseAuditLog(
        user_id=user_id, action=action,
        resource_type=resource_type, resource_id=resource_id,
    ))
    db.commit()


# ── 권한 확인 헬퍼 ───────────────────────────────────────

def _require_franchisor(user: User):
    if user.user_type != "franchisor":
        raise HTTPException(403, "프랜차이즈 본사 계정만 사용할 수 있습니다.")


def _require_franchisee(user: User):
    if user.user_type != "franchisee":
        raise HTTPException(403, "가맹점주 계정만 사용할 수 있습니다.")


# ── 가맹점 통계 빌더 ─────────────────────────────────────

def _build_store_out(store: FranchiseStore, db: Session) -> StoreOut:
    franchisee = (
        db.query(User).filter_by(id=store.franchisee_user_id).first()
        if store.franchisee_user_id else None
    )

    # ContractRiskSummary만 집계 — SavedContract 직접 접근 없음
    summaries = db.query(ContractRiskSummary).filter_by(store_id=store.id).all()

    danger = sum(s.danger_count for s in summaries)
    warn = sum(s.warn_count for s in summaries)
    pending_consent = sum(
        1 for s in summaries if s.consent_status in ("pending", "requested")
    )

    return StoreOut(
        id=store.id,
        store_name=store.store_name,
        region=store.region,
        status=store.status,
        invited_at=store.invited_at,
        joined_at=store.joined_at,
        franchisee_username=franchisee.username if franchisee else None,
        contract_count=len(summaries),
        danger_count=danger,
        warn_count=warn,
        pending_consent_count=pending_consent,
    )


# ── 가맹점 초대 ──────────────────────────────────────────

@router.post("/invite")
def invite_store(
    body: InviteStoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)

    existing = db.query(FranchiseStore).filter_by(
        franchisor_id=current_user.id,
        franchisee_email=str(body.franchisee_email),
    ).first()
    if existing:
        raise HTTPException(409, "이미 초대된 이메일입니다.")

    token = secrets.token_urlsafe(32)
    store = FranchiseStore(
        franchisor_id=current_user.id,
        franchisee_email=str(body.franchisee_email),
        store_name=body.store_name,
        region=body.region,
        status="pending",
        invite_token=token,
    )
    db.add(store)
    db.commit()

    from app.core.config import settings
    invite_link = f"{settings.FRONTEND_URL}/franchise/accept?token={token}"

    try:
        _send_smtp(
            to_email=str(body.franchisee_email),
            subject=f"[CHECKMATE] {current_user.username}(본사)에서 가맹점으로 초대했습니다",
            html_body=f"""안녕하세요!<br><br>
<b>{current_user.username}</b> 프랜차이즈 본사에서 가맹점주로 초대했습니다.<br><br>
가맹점명: <b>{body.store_name}</b>{f'<br>지역: {body.region}' if body.region else ''}<br><br>
아래 링크를 클릭하여 가맹점으로 합류하세요:<br>
<a href="{invite_link}">{invite_link}</a><br><br>
초대 링크는 7일간 유효합니다.<br><br>
감사합니다, CHECKMATE 팀""",
        )
    except Exception as e:
        print(f"[WARN] 가맹점 초대 이메일 발송 실패: {e}")

    return {"ok": True, "invite_token": token}


# ── 초대 수락 ────────────────────────────────────────────

@router.get("/accept")
def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    store = db.query(FranchiseStore).filter_by(invite_token=token).first()
    if not store:
        raise HTTPException(404, "유효하지 않은 초대 링크입니다.")
    if store.status == "active":
        raise HTTPException(409, "이미 수락된 초대입니다.")
    if current_user.user_type != "franchisee":
        raise HTTPException(400, "가맹점주 계정으로 로그인해야 합니다.")

    store.status = "active"
    store.franchisee_user_id = current_user.id
    store.joined_at = datetime.now()
    store.invite_token = None
    db.commit()
    return {"ok": True, "store_name": store.store_name, "franchisor_id": store.franchisor_id}


# ── 가맹점 직접 생성 (enterprise 계정 + franchisor 계정 공통) ─────────

class CreateStoreRequest(BaseModel):
    store_name: str
    region: Optional[str] = None


@router.post("/stores", response_model=StoreOut)
def create_store(
    body: CreateStoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type not in ("franchisor", "enterprise"):
        raise HTTPException(403, "기업/프랜차이즈 본사 계정만 사용할 수 있습니다.")
    store = FranchiseStore(
        franchisor_id=current_user.id,
        franchisee_email="",
        store_name=body.store_name,
        region=body.region,
        status="active",
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return _build_store_out(store, db)


# ── 가맹점 상태 토글 ─────────────────────────────────────

@router.patch("/stores/{store_id}")
def toggle_store_status(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type not in ("franchisor", "enterprise"):
        raise HTTPException(403, "기업/프랜차이즈 본사 계정만 사용할 수 있습니다.")
    store = db.query(FranchiseStore).filter_by(id=store_id, franchisor_id=current_user.id).first()
    if not store:
        raise HTTPException(404, "가맹점을 찾을 수 없습니다.")
    store.status = "inactive" if store.status == "active" else "active"
    db.commit()
    return _build_store_out(store, db)


# ── 가맹점 목록 ──────────────────────────────────────────

@router.get("/stores", response_model=list[StoreOut])
def list_stores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type not in ("franchisor", "enterprise"):
        raise HTTPException(403, "기업/프랜차이즈 본사 계정만 사용할 수 있습니다.")
    stores = db.query(FranchiseStore).filter_by(franchisor_id=current_user.id).all()
    return [_build_store_out(s, db) for s in stores]


# ── 본사 통합 대시보드 ────────────────────────────────────

@router.get("/dashboard", response_model=DashboardOut)
def franchise_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    _audit(db, current_user.id, "view_dashboard")

    stores = db.query(FranchiseStore).filter_by(franchisor_id=current_user.id).all()
    store_outs = [_build_store_out(s, db) for s in stores]

    store_ids = [s.id for s in stores]
    summaries = []
    if store_ids:
        summaries = db.query(ContractRiskSummary).filter(
            ContractRiskSummary.store_id.in_(store_ids)
        ).all()

    return DashboardOut(
        total_stores=len(stores),
        active_stores=sum(1 for s in stores if s.status == "active"),
        pending_stores=sum(1 for s in stores if s.status == "pending"),
        total_contracts=len(summaries),
        danger_contracts=sum(1 for s in summaries if s.grade == "위험"),
        warn_contracts=sum(1 for s in summaries if s.grade == "주의"),
        safe_contracts=sum(1 for s in summaries if s.grade == "안전"),
        stores=store_outs,
    )


# ── 특정 가맹점 위험도 요약 목록 (개인정보 없음) ─────────

@router.get("/stores/{store_id}/contracts", response_model=list[ContractRiskOut])
def store_risk_summaries(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    store = db.query(FranchiseStore).filter_by(
        id=store_id, franchisor_id=current_user.id
    ).first()
    if not store:
        raise HTTPException(404, "가맹점을 찾을 수 없습니다.")

    _audit(db, current_user.id, "view_store_contracts", "store", store_id)

    summaries = db.query(ContractRiskSummary).filter_by(store_id=store_id).all()
    return summaries


# ── 가맹점 지원 안내 이메일 ──────────────────────────────
# 페널티/해지 기능 없음 — 개선 안내 지원 전용

@router.post("/send-support")
def send_support_email(
    body: SendSupportBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    store = db.query(FranchiseStore).filter_by(
        id=body.store_id, franchisor_id=current_user.id
    ).first()
    if not store or not store.franchisee_user_id:
        raise HTTPException(404, "가맹점을 찾을 수 없습니다.")

    franchisee = db.query(User).filter_by(id=store.franchisee_user_id).first()
    if not franchisee:
        raise HTTPException(404, "가맹점주 정보를 찾을 수 없습니다.")

    _audit(db, current_user.id, "send_support", "store", body.store_id)

    guide_messages = {
        "risk_improvement": {
            "subject": f"[CHECKMATE] {store.store_name} 계약서 개선 안내",
            "body": f"""안녕하세요, {franchisee.username}님!<br><br>
{current_user.username} 본사에서 계약서 관리를 지원드리고자 연락드립니다.<br><br>
최근 분석된 계약서에서 <b>개선이 필요한 조항</b>이 발견되었습니다.<br>
아래 가이드를 참고하시어 계약서를 점검해 주시기 바랍니다.<br><br>
<b>주요 점검 항목:</b><br>
• 위약금 조항: 근로기준법상 허용 범위 내인지 확인<br>
• 4대보험: 가입 및 명시 여부 확인<br>
• 근무시간·휴게: 법정 기준 준수 여부 확인<br><br>
CHECKMATE 대시보드에서 상세 분석 결과를 확인하실 수 있습니다.<br><br>
궁금한 사항은 본사로 문의해 주세요.<br><br>
감사합니다,<br>{current_user.username} 본사 / CHECKMATE 팀""",
        },
        "general_guide": {
            "subject": f"[CHECKMATE] {store.store_name} 계약서 관리 안내",
            "body": f"""안녕하세요, {franchisee.username}님!<br><br>
{current_user.username} 본사에서 계약서 관리 안내를 드립니다.<br><br>
정기적으로 CHECKMATE를 통해 계약서를 점검하시면 법적 리스크를 사전에 예방할 수 있습니다.<br><br>
감사합니다,<br>{current_user.username} 본사 / CHECKMATE 팀""",
        },
    }

    msg = guide_messages.get(body.message_type, guide_messages["general_guide"])
    try:
        _send_smtp(
            to_email=franchisee.email,
            subject=msg["subject"],
            html_body=msg["body"],
        )
    except Exception as e:
        raise HTTPException(500, f"이메일 발송 실패: {e}")

    return {"ok": True, "sent_to": franchisee.email}


# ── 근로자 동의 요청 ─────────────────────────────────────

@router.post("/request-consent")
def request_worker_consent(
    body: ConsentRequestBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """가맹점주가 근로자에게 데이터 공유 동의 요청 이메일 발송"""
    if current_user.user_type != "franchisee":
        raise HTTPException(403, "가맹점주 계정만 사용할 수 있습니다.")

    summary = db.query(ContractRiskSummary).filter_by(id=body.risk_summary_id).first()
    if not summary:
        raise HTTPException(404, "분석 결과를 찾을 수 없습니다.")

    # 이미 동의 요청된 경우
    existing = db.query(WorkerConsent).filter_by(risk_summary_id=body.risk_summary_id).first()
    if existing:
        raise HTTPException(409, "이미 동의 요청이 발송되었습니다.")

    token = secrets.token_urlsafe(48)
    consent = WorkerConsent(
        risk_summary_id=body.risk_summary_id,
        worker_email=str(body.worker_email),
        consent_token=token,
        status="pending",
    )
    db.add(consent)

    summary.consent_status = "requested"
    db.commit()

    from app.core.config import settings
    accept_link = f"{settings.FRONTEND_URL}/consent/respond?token={token}&action=accept"
    decline_link = f"{settings.FRONTEND_URL}/consent/respond?token={token}&action=decline"

    try:
        _send_smtp(
            to_email=str(body.worker_email),
            subject="[CHECKMATE] 계약서 분석 결과 공유 동의 요청",
            html_body=f"""안녕하세요!<br><br>
귀하가 서명한 계약서의 AI 분석 결과(위험도 점수·등급)를 프랜차이즈 본사와
<b>익명화된 형태로 공유</b>하는 데 동의를 요청드립니다.<br><br>
<b>공유되는 정보:</b> 위험도 점수, 등급, 위험 조항 유형 (예: "위약금 과다")<br>
<b>공유되지 않는 정보:</b> 계약서 원문, 귀하의 성명·주민번호·계좌번호 등 개인정보<br><br>
<table style="border-collapse:collapse; margin:20px 0;">
  <tr>
    <td style="padding:12px 24px; background:#2563eb; border-radius:6px; margin-right:12px;">
      <a href="{accept_link}" style="color:#fff; text-decoration:none; font-weight:700;">
        동의합니다
      </a>
    </td>
    <td style="width:16px;"></td>
    <td style="padding:12px 24px; background:#f4f4f5; border-radius:6px; border:1px solid #e5e7eb;">
      <a href="{decline_link}" style="color:#374151; text-decoration:none;">
        동의하지 않습니다
      </a>
    </td>
  </tr>
</table>
동의하지 않으셔도 귀하의 계약서 분석 결과는 <b>통계 집계에만 반영</b>되며,
개별 식별은 불가합니다.<br><br>
감사합니다, CHECKMATE 팀""",
        )
    except Exception as e:
        raise HTTPException(500, f"동의 요청 이메일 발송 실패: {e}")

    return {"ok": True}


# ── 근로자 동의 응답 (공개 엔드포인트, 인증 불필요) ──────

@router.get("/consent/respond")
def respond_to_consent(
    token: str,
    action: str,  # accept | decline
    db: Session = Depends(get_db),
):
    consent = db.query(WorkerConsent).filter_by(consent_token=token).first()
    if not consent:
        raise HTTPException(404, "유효하지 않은 링크입니다.")
    if consent.status != "pending":
        return {"ok": True, "message": "이미 처리된 요청입니다."}

    if action == "accept":
        consent.status = "consented"
        consent.consented_at = datetime.now()
        summary = db.query(ContractRiskSummary).filter_by(id=consent.risk_summary_id).first()
        if summary:
            summary.consent_status = "consented"
        db.commit()
        return {"ok": True, "message": "동의가 완료되었습니다. 감사합니다."}

    elif action == "decline":
        consent.status = "declined"
        summary = db.query(ContractRiskSummary).filter_by(id=consent.risk_summary_id).first()
        if summary:
            summary.consent_status = "declined"
        db.commit()
        return {"ok": True, "message": "거절이 완료되었습니다. 귀하의 계약서는 통계에만 포함됩니다."}

    raise HTTPException(400, "action은 'accept' 또는 'decline'이어야 합니다.")


# ── 가맹점 삭제 ──────────────────────────────────────────

@router.delete("/stores/{store_id}")
def delete_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    store = db.query(FranchiseStore).filter_by(id=store_id, franchisor_id=current_user.id).first()
    if not store:
        raise HTTPException(404, "가맹점을 찾을 수 없습니다.")
    db.delete(store)
    db.commit()
    return {"ok": True}


# ── 가맹점주: 내 본사 정보 조회 ─────────────────────────

@router.get("/my-franchisor")
def my_franchisor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisee(current_user)
    store = db.query(FranchiseStore).filter_by(
        franchisee_user_id=current_user.id, status="active"
    ).first()
    if not store:
        return {"franchisor": None}
    franchisor = db.query(User).filter_by(id=store.franchisor_id).first()
    return {
        "franchisor": {
            "id": store.franchisor_id,
            "username": franchisor.username if franchisor else "알 수 없음",
            "store_name": store.store_name,
            "region": store.region,
        }
    }

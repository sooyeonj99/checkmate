import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.franchise import FranchiseStore
from app.models.saved_contract import SavedContract
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
    franchisee_email: str
    store_name: str
    region: Optional[str]
    status: str
    invited_at: datetime
    joined_at: Optional[datetime]
    franchisee_username: Optional[str] = None
    contract_count: int = 0
    danger_count: int = 0
    warn_count: int = 0

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


class ContractOut(BaseModel):
    id: int
    filename: str
    contract_type: str
    grade: str
    score: int
    danger_count: int
    warn_count: int
    safe_count: int
    saved_at: datetime

    model_config = {"from_attributes": True}


# ── 헬퍼: 본사 계정 확인 ─────────────────────────────────

def _require_franchisor(user: User):
    if user.user_type != "franchisor":
        raise HTTPException(403, "프랜차이즈 본사 계정만 사용할 수 있습니다.")


def _require_franchisee(user: User):
    if user.user_type != "franchisee":
        raise HTTPException(403, "가맹점주 계정만 사용할 수 있습니다.")


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


# ── 가맹점 목록 ──────────────────────────────────────────

def _build_store_out(store: FranchiseStore, db: Session) -> StoreOut:
    franchisee = db.query(User).filter_by(id=store.franchisee_user_id).first() if store.franchisee_user_id else None
    contracts = []
    if store.franchisee_user_id:
        contracts = db.query(SavedContract).filter_by(user_id=store.franchisee_user_id).all()

    return StoreOut(
        id=store.id,
        franchisee_email=store.franchisee_email,
        store_name=store.store_name,
        region=store.region,
        status=store.status,
        invited_at=store.invited_at,
        joined_at=store.joined_at,
        franchisee_username=franchisee.username if franchisee else None,
        contract_count=len(contracts),
        danger_count=sum(c.danger_count for c in contracts),
        warn_count=sum(c.warn_count for c in contracts),
    )


@router.get("/stores", response_model=list[StoreOut])
def list_stores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    stores = db.query(FranchiseStore).filter_by(franchisor_id=current_user.id).all()
    return [_build_store_out(s, db) for s in stores]


# ── 본사 통합 대시보드 ────────────────────────────────────

@router.get("/dashboard", response_model=DashboardOut)
def franchise_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    stores = db.query(FranchiseStore).filter_by(franchisor_id=current_user.id).all()
    store_outs = [_build_store_out(s, db) for s in stores]

    all_franchisee_ids = [s.franchisee_user_id for s in stores if s.franchisee_user_id]
    all_contracts = []
    if all_franchisee_ids:
        all_contracts = db.query(SavedContract).filter(
            SavedContract.user_id.in_(all_franchisee_ids)
        ).all()

    return DashboardOut(
        total_stores=len(stores),
        active_stores=sum(1 for s in stores if s.status == "active"),
        pending_stores=sum(1 for s in stores if s.status == "pending"),
        total_contracts=len(all_contracts),
        danger_contracts=sum(1 for c in all_contracts if c.grade == "위험"),
        warn_contracts=sum(1 for c in all_contracts if c.grade == "주의"),
        safe_contracts=sum(1 for c in all_contracts if c.grade == "안전"),
        stores=store_outs,
    )


# ── 특정 가맹점 계약서 목록 ──────────────────────────────

@router.get("/stores/{store_id}/contracts", response_model=list[ContractOut])
def store_contracts(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_franchisor(current_user)
    store = db.query(FranchiseStore).filter_by(id=store_id, franchisor_id=current_user.id).first()
    if not store:
        raise HTTPException(404, "가맹점을 찾을 수 없습니다.")
    if not store.franchisee_user_id:
        return []
    contracts = db.query(SavedContract).filter_by(user_id=store.franchisee_user_id).all()
    return contracts


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

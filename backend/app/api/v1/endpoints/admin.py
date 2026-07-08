"""어드민 패널 API — ghdiehddl@gmail.com 전용"""
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.saved_contract import SavedContract
from app.models.signing import SigningRecord
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["어드민"])

ADMIN_EMAILS = {"ghdiehddl@gmail.com"}


def _require_admin(current_user: User = Depends(get_current_user)):
    if current_user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user


# ── 사용자 목록 ──────────────────────────────────────────────────────────────

class UserAdminOut(BaseModel):
    id: int
    email: str
    username: str
    user_type: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    contract_count: int
    model_config = {"from_attributes": True}


@router.get("/users", response_model=list[UserAdminOut])
def list_users(
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for u in users:
        cnt = db.query(SavedContract).filter(SavedContract.user_id == u.id).count()
        result.append(UserAdminOut(
            id=u.id, email=u.email, username=u.username,
            user_type=u.user_type, is_active=u.is_active,
            is_verified=u.is_verified, created_at=u.created_at,
            contract_count=cnt,
        ))
    return result


@router.get("/users/count")
def count_users(admin: User = Depends(_require_admin), db: Session = Depends(get_db)):
    return {"total": db.query(User).count()}


# ── 전체 통계 ────────────────────────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total_users: int
    personal_users: int
    enterprise_users: int
    franchisor_users: int
    franchisee_users: int
    total_contracts: int
    total_signings: int
    total_api_keys: int
    avg_score: float
    danger_count: int
    warn_count: int
    safe_count: int


@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(admin: User = Depends(_require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    personal = db.query(User).filter(User.user_type == "personal").count()
    enterprise = db.query(User).filter(User.user_type == "enterprise").count()
    franchisor = db.query(User).filter(User.user_type == "franchisor").count()
    franchisee = db.query(User).filter(User.user_type == "franchisee").count()

    contracts = db.query(SavedContract).all()
    total_c = len(contracts)
    avg_score = round(sum(c.score for c in contracts) / total_c, 1) if total_c else 0.0
    danger = sum(1 for c in contracts if c.grade == "위험")
    warn = sum(1 for c in contracts if c.grade == "주의")
    safe = sum(1 for c in contracts if c.grade == "안전")

    signings = db.query(SigningRecord).count()
    api_keys = db.query(ApiKey).filter(ApiKey.is_active == True).count()

    return AdminStatsOut(
        total_users=total_users,
        personal_users=personal,
        enterprise_users=enterprise,
        franchisor_users=franchisor,
        franchisee_users=franchisee,
        total_contracts=total_c,
        total_signings=signings,
        total_api_keys=api_keys,
        avg_score=avg_score,
        danger_count=danger,
        warn_count=warn,
        safe_count=safe,
    )


# ── 사용자 활성화/비활성화 ──────────────────────────────────────────────────

@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.email in ADMIN_EMAILS:
        raise HTTPException(status_code=400, detail="관리자 계정은 변경할 수 없습니다.")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user_id, "is_active": user.is_active}


# ── B2B API 키 관리 (DB 저장) ─────────────────────────────────────────────────

class ApiKeyOut(BaseModel):
    key: str
    name: str
    created_at: datetime
    calls: int
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("/api-keys", response_model=list[ApiKeyOut])
def list_api_keys(admin: User = Depends(_require_admin), db: Session = Depends(get_db)):
    return db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()


class CreateKeyRequest(BaseModel):
    name: str


@router.post("/api-keys", response_model=ApiKeyOut)
def create_api_key(
    body: CreateKeyRequest,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    key_val = "cm_" + secrets.token_urlsafe(32)
    api_key = ApiKey(key=key_val, name=body.name, calls=0, is_active=True)
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key


@router.delete("/api-keys/{key}")
def delete_api_key(
    key: str,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    api_key = db.query(ApiKey).filter(ApiKey.key == key).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다.")
    db.delete(api_key)
    db.commit()
    return {"deleted": key}


@router.patch("/api-keys/{key}/toggle")
def toggle_api_key(
    key: str,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    api_key = db.query(ApiKey).filter(ApiKey.key == key).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다.")
    api_key.is_active = not api_key.is_active
    db.commit()
    return {"key": key, "is_active": api_key.is_active}


# ── B2B 외부 엔드포인트 (X-Api-Key 인증) ────────────────────────────────────

def _require_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    api_key = db.query(ApiKey).filter(ApiKey.key == x_api_key, ApiKey.is_active == True).first()
    if not api_key:
        raise HTTPException(status_code=401, detail="유효하지 않은 API 키입니다.")
    api_key.calls += 1
    db.commit()
    return x_api_key


@router.get("/b2b/health")
def b2b_health(api_key: str = Depends(_require_api_key)):
    """B2B API 키 유효성 확인"""
    return {"status": "ok", "service": "Checkmate AI", "version": "1.0"}

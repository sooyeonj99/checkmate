import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db.session import get_db
from app.models.signing import SigningRecord
from app.models.user import User
from app.services.email_service import send_signing_request_email, send_signing_complete_email

router = APIRouter(prefix="/signing", tags=["전자서명"])

MAX_SIG_BYTES = 300_000  # base64 ~225KB 이미지 상한


# ── Schemas ──────────────────────────────────────────

class SelfSignRequest(BaseModel):
    contract_id: str
    contract_name: str
    signature_data: str  # base64 PNG


class SigningRequestCreate(BaseModel):
    contract_id: str
    contract_name: str
    requestee_email: EmailStr
    message: Optional[str] = None
    my_signature: Optional[str] = None  # 요청자도 미리 서명 가능


class SigningSubmit(BaseModel):
    signature_data: str  # base64 PNG
    signer_name: str


class SigningRecordOut(BaseModel):
    id: int
    type: str
    contract_name: str
    requestee_email: Optional[str]
    status: str
    requester_signed_at: Optional[datetime]
    requestee_signed_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    has_requester_signature: bool
    has_requestee_signature: bool

    model_config = {"from_attributes": True}


class PublicSigningInfo(BaseModel):
    id: int
    contract_name: str
    requester_name: str
    message: Optional[str]
    status: str
    is_expired: bool
    requester_signed: bool


# ── Helpers ──────────────────────────────────────────

def _check_sig_size(data: str) -> None:
    if len(data.encode()) > MAX_SIG_BYTES:
        raise HTTPException(status_code=413, detail="서명 이미지가 너무 큽니다.")


# ── Endpoints ────────────────────────────────────────

@router.post("/self-sign", response_model=SigningRecordOut)
def self_sign(
    body: SelfSignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_sig_size(body.signature_data)
    record = SigningRecord(
        type="self",
        contract_id=body.contract_id,
        contract_name=body.contract_name,
        requester_id=current_user.id,
        requester_email=current_user.email,
        requester_name=current_user.username,
        token=secrets.token_urlsafe(32),
        status="signed",
        requester_signature=body.signature_data,
        requester_signed_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_out(record)


@router.post("/request", response_model=SigningRecordOut)
def create_signing_request(
    body: SigningRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.my_signature:
        _check_sig_size(body.my_signature)

    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(days=7)

    record = SigningRecord(
        type="request",
        contract_id=body.contract_id,
        contract_name=body.contract_name,
        requester_id=current_user.id,
        requester_email=current_user.email,
        requester_name=current_user.username,
        requestee_email=str(body.requestee_email),
        message=body.message,
        token=token,
        status="pending",
        requester_signature=body.my_signature,
        requester_signed_at=datetime.now() if body.my_signature else None,
        expires_at=expires,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    background_tasks.add_task(
        send_signing_request_email,
        str(body.requestee_email),
        current_user.username,
        body.contract_name,
        token,
        body.message,
    )

    return _to_out(record)


@router.get("/my-records", response_model=list[SigningRecordOut])
def my_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(SigningRecord)
        .filter(SigningRecord.requester_id == current_user.id)
        .order_by(SigningRecord.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in records]


@router.get("/public/{token}", response_model=PublicSigningInfo)
def get_signing_info(token: str, db: Session = Depends(get_db)):
    record = db.query(SigningRecord).filter(SigningRecord.token == token).first()
    if not record:
        raise HTTPException(status_code=404, detail="서명 링크를 찾을 수 없습니다.")

    is_expired = bool(record.expires_at and datetime.now() > record.expires_at)

    return PublicSigningInfo(
        id=record.id,
        contract_name=record.contract_name,
        requester_name=record.requester_name,
        message=record.message,
        status=record.status,
        is_expired=is_expired,
        requester_signed=bool(record.requester_signature),
    )


@router.post("/public/{token}/sign")
def submit_signature(
    token: str,
    body: SigningSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    _check_sig_size(body.signature_data)
    record = db.query(SigningRecord).filter(SigningRecord.token == token).first()
    if not record:
        raise HTTPException(status_code=404, detail="서명 링크를 찾을 수 없습니다.")
    if record.status == "signed":
        raise HTTPException(status_code=409, detail="이미 서명이 완료된 문서입니다.")
    if record.expires_at and datetime.now() > record.expires_at:
        record.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="서명 링크가 만료되었습니다.")

    record.requestee_signature = body.signature_data
    record.requestee_name = body.signer_name
    record.requestee_signed_at = datetime.now()
    record.status = "signed"
    db.commit()

    background_tasks.add_task(
        send_signing_complete_email,
        record.requester_email,
        record.requester_name,
        body.signer_name,
        record.contract_name,
    )

    return {"success": True, "signed_at": record.requestee_signed_at}


# ── Helper ───────────────────────────────────────────

def _to_out(r: SigningRecord) -> SigningRecordOut:
    return SigningRecordOut(
        id=r.id,
        type=r.type,
        contract_name=r.contract_name,
        requestee_email=r.requestee_email,
        status=r.status,
        requester_signed_at=r.requester_signed_at,
        requestee_signed_at=r.requestee_signed_at,
        created_at=r.created_at,
        expires_at=r.expires_at,
        has_requester_signature=bool(r.requester_signature),
        has_requestee_signature=bool(r.requestee_signature),
    )

import base64
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.signing import SigningRecord
from app.models.user import User
from app.services.email_service import (
    send_signing_request_email,
    send_signing_complete_email,
)
from app.services.push_service import (
    send_push_signing_request,
    send_push_signing_complete,
)
from app.services.sms_service import (
    send_signing_request_sms_new_user,
    send_signing_request_sms_existing_user,
)

router = APIRouter(prefix="/signing", tags=["전자서명"])

MAX_SIG_BYTES = 300_000


# ── Schemas ──────────────────────────────────────────

class SelfSignRequest(BaseModel):
    contract_id: str
    contract_name: str
    signature_data: str


class SigningRequestCreate(BaseModel):
    contract_id: str
    contract_name: str
    requestee_email: Optional[EmailStr] = None
    requestee_phone: Optional[str] = None
    message: Optional[str] = None
    my_signature: Optional[str] = None


class SigningSubmit(BaseModel):
    signature_data: str
    signer_name: str


class SigningRecordOut(BaseModel):
    id: int
    type: str
    token: str
    contract_name: str
    requestee_email: Optional[str]
    status: str
    requester_name: str
    requester_signed_at: Optional[datetime]
    requestee_signed_at: Optional[datetime]
    requestee_name: Optional[str]
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
    contract_html: Optional[str] = None


# ── Helpers ──────────────────────────────────────────

def _check_sig_size(data: str) -> None:
    if len(data.encode()) > MAX_SIG_BYTES:
        raise HTTPException(status_code=413, detail="서명 이미지가 너무 큽니다.")


def _to_out(r: SigningRecord) -> SigningRecordOut:
    return SigningRecordOut(
        id=r.id,
        type=r.type,
        token=r.token,
        contract_name=r.contract_name,
        requestee_email=r.requestee_email,
        status=r.status,
        requester_name=r.requester_name,
        requester_signed_at=r.requester_signed_at,
        requestee_signed_at=r.requestee_signed_at,
        requestee_name=r.requestee_name,
        created_at=r.created_at,
        expires_at=r.expires_at,
        has_requester_signature=bool(r.requester_signature),
        has_requestee_signature=bool(r.requestee_signature),
    )


def _build_certificate_html(record: SigningRecord) -> str:
    """서명 완료 인증서 HTML 생성 (양쪽 저장 / PDF 출력용)"""
    req_sig_html = (
        f'<img src="{record.requester_signature}" style="max-height:100px;max-width:280px;"/>'
        if record.requester_signature else '<p style="color:#94a3b8">서명 없음</p>'
    )
    rec_sig_html = (
        f'<img src="{record.requestee_signature}" style="max-height:100px;max-width:280px;"/>'
        if record.requestee_signature else '<p style="color:#94a3b8">서명 없음</p>'
    )
    req_signed = record.requester_signed_at.strftime('%Y-%m-%d %H:%M') if record.requester_signed_at else '-'
    rec_signed = record.requestee_signed_at.strftime('%Y-%m-%d %H:%M') if record.requestee_signed_at else '-'

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>전자서명 완료 인증서 — {record.contract_name}</title>
<style>
  body {{ margin:0; padding:40px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f8fafc; color:#1e293b; }}
  .card {{ max-width:680px; margin:0 auto; background:#fff; border-radius:16px; padding:40px; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
  .header {{ text-align:center; border-bottom:2px solid #e2e8f0; padding-bottom:28px; margin-bottom:28px; }}
  .badge {{ display:inline-block; background:#dcfce7; color:#16a34a; border-radius:20px; padding:6px 18px; font-size:13px; font-weight:700; margin-bottom:14px; }}
  h1 {{ margin:0 0 8px; font-size:22px; color:#1e3a8a; }}
  .contract-name {{ font-size:17px; font-weight:700; color:#1e293b; background:#eff6ff; border-radius:10px; padding:12px 20px; margin:20px 0; text-align:center; }}
  .sig-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:24px; }}
  .sig-box {{ border:1.5px solid #e2e8f0; border-radius:12px; padding:20px; }}
  .sig-label {{ font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }}
  .sig-name {{ font-size:16px; font-weight:700; color:#1e293b; margin-bottom:4px; }}
  .sig-date {{ font-size:12px; color:#94a3b8; margin-bottom:12px; }}
  .sig-img {{ border:1px solid #f1f5f9; border-radius:8px; background:#f8fafc; padding:8px; min-height:80px; display:flex; align-items:center; justify-content:center; }}
  .footer {{ margin-top:32px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align:center; }}
  @media print {{ body {{ background:white; padding:20px; }} .card {{ box-shadow:none; }} }}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="badge">✓ 전자서명 완료</div>
    <h1>CHECKMATE 전자서명 인증서</h1>
    <p style="color:#64748b;font-size:14px;margin:0">AI 계약서 분석 서비스</p>
  </div>

  <div class="contract-name">📄 {record.contract_name}</div>

  <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 0;width:120px;color:#94a3b8">서명 유형</td><td>{'상호 서명' if record.type == 'request' else '개인 서명'}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8">서명 완료일</td><td>{rec_signed if record.requestee_signed_at else req_signed}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8">문서 ID</td><td style="font-family:monospace;font-size:11px">{record.token[:24]}...</td></tr>
  </table>

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-label">요청자 서명</div>
      <div class="sig-name">{record.requester_name}</div>
      <div class="sig-date">{record.requester_email} · {req_signed}</div>
      <div class="sig-img">{req_sig_html}</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">{'서명자' if record.type == 'request' else '본인'} 서명</div>
      <div class="sig-name">{record.requestee_name or record.requester_name}</div>
      <div class="sig-date">{record.requestee_email or record.requester_email} · {rec_signed}</div>
      <div class="sig-img">{rec_sig_html}</div>
    </div>
  </div>

  <div class="footer">
    본 인증서는 CHECKMATE 플랫폼을 통해 전자적으로 서명된 문서입니다.<br/>
    법적 효력은 당사자 간 합의에 따릅니다. · ⓒ 2026 CHECKMATE
    <div style="margin-top:12px">
      <button onclick="window.print()" style="padding:10px 24px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">
        PDF로 저장 (인쇄)
      </button>
    </div>
  </div>
</div>
</body>
</html>"""


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
    if not body.requestee_email and not body.requestee_phone:
        raise HTTPException(400, "이메일 또는 전화번호 중 하나를 입력해주세요.")
    if body.my_signature:
        _check_sig_size(body.my_signature)

    import re as _re
    normalized_phone = _re.sub(r"\D", "", body.requestee_phone) if body.requestee_phone else None

    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(days=7)

    record = SigningRecord(
        type="request",
        contract_id=body.contract_id,
        contract_name=body.contract_name,
        requester_id=current_user.id,
        requester_email=current_user.email,
        requester_name=current_user.username,
        requestee_email=str(body.requestee_email) if body.requestee_email else None,
        requestee_phone=normalized_phone,
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

    # ── 이메일 경로 ──────────────────────────────────────
    if body.requestee_email:
        background_tasks.add_task(
            send_signing_request_email,
            str(body.requestee_email),
            current_user.username,
            body.contract_name,
            token,
            body.message,
        )
        requestee_user = db.query(User).filter(User.email == str(body.requestee_email)).first()
        if requestee_user and requestee_user.push_token:
            background_tasks.add_task(
                send_push_signing_request,
                requestee_user.push_token,
                current_user.username,
                body.contract_name,
                token,
            )

    # ── 전화번호 경로 ─────────────────────────────────────
    if normalized_phone:
        phone_user = db.query(User).filter(User.phone_number == normalized_phone).first()
        if phone_user:
            # 가입된 사용자: 푸시 알림 or SMS
            if phone_user.push_token:
                background_tasks.add_task(
                    send_push_signing_request,
                    phone_user.push_token,
                    current_user.username,
                    body.contract_name,
                    token,
                )
            else:
                background_tasks.add_task(
                    send_signing_request_sms_existing_user,
                    normalized_phone,
                    current_user.username,
                    body.contract_name,
                    token,
                )
        else:
            # 미가입 사용자: SMS + 앱 다운로드 링크
            background_tasks.add_task(
                send_signing_request_sms_new_user,
                normalized_phone,
                current_user.username,
                body.contract_name,
                token,
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


@router.get("/received", response_model=list[SigningRecordOut])
def received_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내가 서명 요청을 받은 목록 (이메일 또는 전화번호 기준)"""
    from sqlalchemy import or_
    conditions = [SigningRecord.requestee_email == current_user.email]
    if current_user.phone_number:
        conditions.append(SigningRecord.requestee_phone == current_user.phone_number)
    records = (
        db.query(SigningRecord)
        .filter(or_(*conditions))
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
        contract_html=record.contract_html,
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

    # 요청자에게 완료 이메일
    background_tasks.add_task(
        send_signing_complete_email,
        record.requester_email,
        record.requester_name,
        body.signer_name,
        record.contract_name,
    )
    # 서명자에게도 완료 이메일 (requestee_email이 있는 경우)
    if record.requestee_email:
        background_tasks.add_task(
            send_signing_complete_email,
            record.requestee_email,
            record.requester_name,
            body.signer_name,
            record.contract_name,
        )

    # 요청자 푸시 알림
    requester = db.query(User).filter(User.id == record.requester_id).first()
    if requester and requester.push_token:
        background_tasks.add_task(
            send_push_signing_complete,
            requester.push_token,
            body.signer_name,
            record.contract_name,
        )

    return {"success": True, "signed_at": record.requestee_signed_at}


@router.get("/{record_id}/signed-doc", response_class=HTMLResponse)
def get_signed_document(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """서명 완료된 계약서 문서 반환 — 서명 이미지가 계약서 내에 삽입됨."""
    record = db.query(SigningRecord).filter(SigningRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="서명 기록을 찾을 수 없습니다.")
    if record.requester_id != current_user.id and record.requestee_email != current_user.email:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    if record.status != "signed":
        raise HTTPException(status_code=400, detail="서명이 완료되지 않은 문서입니다.")

    req_sig_html = (
        f'<img src="{record.requester_signature}" style="max-height:80px;max-width:200px;display:block"/>'
        if record.requester_signature else '<span style="color:#94a3b8;font-size:12px">서명 없음</span>'
    )
    rec_sig_html = (
        f'<img src="{record.requestee_signature}" style="max-height:80px;max-width:200px;display:block"/>'
        if record.requestee_signature else '<span style="color:#94a3b8;font-size:12px">서명 없음</span>'
    )

    footer_html = f"""
<div style="margin-top:48px;padding:24px 40px;border-top:2px solid #e2e8f0;background:#f8fafc;text-align:center">
  <p style="color:#16a34a;font-weight:700;font-size:15px;margin:0 0 6px">✓ 전자서명 완료 문서</p>
  <p style="color:#64748b;font-size:12px;margin:0 0 4px">
    요청자: {record.requester_name} ({record.requester_email})
    {"&nbsp;·&nbsp; 서명자: " + (record.requestee_name or "") + " (" + (record.requestee_email or "") + ")" if record.requestee_name else ""}
  </p>
  <p style="color:#94a3b8;font-size:11px;margin:0 0 14px">
    완료일: {record.requestee_signed_at.strftime('%Y-%m-%d %H:%M') if record.requestee_signed_at else '-'}
    &nbsp;·&nbsp; 문서 ID: {record.token[:20]}...
  </p>
  <button onclick="window.print()" style="padding:10px 28px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">
    PDF로 저장 (인쇄)
  </button>
</div>
"""

    if record.contract_html:
        html = record.contract_html
        html = html.replace("{{SIG_REQUESTER}}", req_sig_html)
        html = html.replace("{{SIG_REQUESTEE}}", rec_sig_html)
        html = html.replace("</body>", footer_html + "</body>")
        return HTMLResponse(content=html)

    # 사용자 업로드 이미지 템플릿
    if record.user_template_id:
        from app.models.user_template import UserTemplate
        tpl = db.query(UserTemplate).filter(UserTemplate.id == record.user_template_id).first()
        if tpl and tpl.file_path and os.path.exists(tpl.file_path):
            with open(tpl.file_path, "rb") as f:
                file_data = f.read()
            ext = (tpl.file_ext or ".png").lstrip(".")
            mime = f"image/{ext}" if ext != "pdf" else "application/pdf"
            file_b64 = base64.b64encode(file_data).decode()
            data_url = f"data:{mime};base64,{file_b64}"

            sig1_html = f'<img src="{record.requestee_signature}" style="width:100%;height:100%;object-fit:contain"/>' if record.requestee_signature else ''
            sig2_html = f'<img src="{record.requester_signature}" style="width:100%;height:100%;object-fit:contain"/>' if record.requester_signature else ''

            html = f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<title>서명된 계약서 — {record.contract_name}</title>
<style>
  body{{margin:0;padding:0;background:#f8fafc;font-family:sans-serif}}
  .container{{max-width:800px;margin:0 auto;padding:20px}}
  .doc-wrap{{position:relative;display:inline-block;width:100%}}
  .doc-wrap img.contract{{width:100%;display:block}}
  .sig-overlay{{position:absolute;pointer-events:none}}
  @media print{{body{{background:white}}.no-print{{display:none}}}}
</style></head>
<body>
<div class="container">
  <div class="doc-wrap">
    <img class="contract" src="{data_url}" alt="계약서"/>
    <div class="sig-overlay" style="left:{tpl.sig1_x}%;top:{tpl.sig1_y}%;width:{tpl.sig1_w}%;height:{tpl.sig1_h}%">
      {sig1_html}
    </div>
    {f'<div class="sig-overlay" style="left:{tpl.sig2_x}%;top:{tpl.sig2_y}%;width:{tpl.sig2_w}%;height:{tpl.sig2_h}%">{sig2_html}</div>' if tpl.sig2_x is not None else ''}
  </div>
  {footer_html}
</div>
</body></html>"""
            return HTMLResponse(content=html)

    # 서명만 있는 인증서 fallback
    return HTMLResponse(content=_build_certificate_html(record))


@router.get("/{record_id}/certificate", response_class=HTMLResponse)
def get_certificate(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """서명 완료 인증서 HTML 반환 (브라우저에서 PDF로 인쇄 가능)"""
    record = db.query(SigningRecord).filter(SigningRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="서명 기록을 찾을 수 없습니다.")
    # 요청자 또는 서명자만 접근 가능
    if record.requester_id != current_user.id and record.requestee_email != current_user.email:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    if record.status != "signed":
        raise HTTPException(status_code=400, detail="서명이 완료되지 않은 문서입니다.")
    return HTMLResponse(content=_build_certificate_html(record))


# ── 서명 필드 템플릿 CRUD (모바일 TemplateEditorScreen용) ────────────
# 간단한 인메모리 저장소 (DB 모델 없이 빠르게 구현)
# 서버 재시작 시 초기화됨 — 실제 운영에서는 DB 모델로 교체 필요

from typing import Any

_sign_tpls: dict[int, dict[str, Any]] = {}  # id → template dict
_sign_tpl_seq = {"val": 0}


class SigningTemplateField(BaseModel):
    id: str
    label: str
    type: str
    required: bool


class SigningTemplateIn(BaseModel):
    name: str
    description: str = ""
    fields: list[SigningTemplateField]


class SigningTemplateOut(BaseModel):
    id: int
    name: str
    description: str
    fields: list[SigningTemplateField]
    created_at: str


@router.get("/templates", response_model=list[SigningTemplateOut])
def list_signing_templates(current_user: User = Depends(get_current_user)):
    user_tpls = [v for v in _sign_tpls.values() if v["user_id"] == current_user.id]
    user_tpls.sort(key=lambda x: x["created_at"], reverse=True)
    return [SigningTemplateOut(**{k: v for k, v in t.items() if k != "user_id"}) for t in user_tpls]


@router.post("/templates", response_model=SigningTemplateOut)
def create_signing_template(body: SigningTemplateIn, current_user: User = Depends(get_current_user)):
    _sign_tpl_seq["val"] += 1
    tpl_id = _sign_tpl_seq["val"]
    tpl = {
        "id": tpl_id,
        "name": body.name,
        "description": body.description,
        "fields": [f.model_dump() for f in body.fields],
        "created_at": datetime.now().isoformat(),
        "user_id": current_user.id,
    }
    _sign_tpls[tpl_id] = tpl
    return SigningTemplateOut(**{k: v for k, v in tpl.items() if k != "user_id"})


@router.put("/templates/{tpl_id}", response_model=SigningTemplateOut)
def update_signing_template(tpl_id: int, body: SigningTemplateIn, current_user: User = Depends(get_current_user)):
    tpl = _sign_tpls.get(tpl_id)
    if not tpl or tpl["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    tpl.update({"name": body.name, "description": body.description, "fields": [f.model_dump() for f in body.fields]})
    return SigningTemplateOut(**{k: v for k, v in tpl.items() if k != "user_id"})


@router.delete("/templates/{tpl_id}")
def delete_signing_template(tpl_id: int, current_user: User = Depends(get_current_user)):
    tpl = _sign_tpls.get(tpl_id)
    if not tpl or tpl["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    del _sign_tpls[tpl_id]
    return {"ok": True}

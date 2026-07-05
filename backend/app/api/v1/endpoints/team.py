import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.team import TeamMember
from app.models.user import User
from app.services.email_service import _send_smtp

router = APIRouter(prefix="/team", tags=["팀 관리"])


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class MemberOut(BaseModel):
    id: int
    member_email: str
    role: str
    status: str
    invited_at: datetime
    joined_at: Optional[datetime]
    username: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/members", response_model=list[MemberOut])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type != "enterprise":
        raise HTTPException(403, "기업 계정만 팀 관리를 사용할 수 있습니다.")
    rows = db.query(TeamMember).filter_by(enterprise_user_id=current_user.id).all()
    result = []
    for r in rows:
        member_user = db.query(User).filter_by(id=r.member_user_id).first() if r.member_user_id else None
        result.append(MemberOut(
            id=r.id,
            member_email=r.member_email,
            role=r.role,
            status=r.status,
            invited_at=r.invited_at,
            joined_at=r.joined_at,
            username=member_user.username if member_user else None,
        ))
    return result


@router.post("/invite")
def invite_member(
    body: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type != "enterprise":
        raise HTTPException(403, "기업 계정만 팀원을 초대할 수 있습니다.")

    existing = db.query(TeamMember).filter_by(
        enterprise_user_id=current_user.id, member_email=str(body.email)
    ).first()
    if existing:
        raise HTTPException(409, "이미 초대된 이메일입니다.")

    token = secrets.token_urlsafe(32)
    member = TeamMember(
        enterprise_user_id=current_user.id,
        member_email=str(body.email),
        role=body.role,
        status="pending",
        invite_token=token,
    )
    db.add(member)
    db.commit()

    from app.core.config import settings
    invite_link = f"{settings.FRONTEND_URL}/team/accept?token={token}"
    try:
        _send_smtp(
            to_email=str(body.email),
            subject=f"[CHECKMATE] {current_user.username}님이 팀에 초대했습니다",
            html_body=f"""안녕하세요!<br><br>
<b>{current_user.username}</b>님이 CHECKMATE 팀에 초대했습니다.<br><br>
아래 링크를 클릭하여 팀에 합류하세요:<br>
<a href="{invite_link}">{invite_link}</a><br><br>
초대 링크는 7일간 유효합니다.<br><br>
감사합니다, CHECKMATE 팀""",
        )
    except Exception as e:
        print(f"[WARN] 초대 이메일 발송 실패: {e}")

    return {"ok": True, "invite_token": token}


@router.get("/accept")
def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(TeamMember).filter_by(invite_token=token).first()
    if not member:
        raise HTTPException(404, "유효하지 않은 초대 링크입니다.")
    if member.status == "active":
        raise HTTPException(409, "이미 수락된 초대입니다.")

    member.status = "active"
    member.member_user_id = current_user.id
    member.joined_at = datetime.now()
    member.invite_token = None
    db.commit()
    return {"ok": True, "enterprise_user_id": member.enterprise_user_id}


@router.delete("/members/{member_id}")
def remove_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.user_type != "enterprise":
        raise HTTPException(403, "기업 계정만 팀원을 삭제할 수 있습니다.")
    member = db.query(TeamMember).filter_by(id=member_id, enterprise_user_id=current_user.id).first()
    if not member:
        raise HTTPException(404, "팀원을 찾을 수 없습니다.")
    db.delete(member)
    db.commit()
    return {"ok": True}

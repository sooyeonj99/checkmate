from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError
from pydantic import BaseModel
from passlib.context import CryptContext
from app.db.session import get_db
from app.schemas.user import UserResponse
from app.services.user_service import get_user_by_id
from app.core.security import decode_token
from fastapi.security import OAuth2PasswordBearer

pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')

router = APIRouter(prefix="/users", tags=["users"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


class PushTokenRequest(BaseModel):
    push_token: str


@router.post("/push-token")
def register_push_token(
    body: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    current_user.push_token = body.push_token
    db.commit()
    return {"success": True}


class VerifyPasswordRequest(BaseModel):
    password: str


@router.post("/verify-password")
def verify_password(
    body: VerifyPasswordRequest,
    current_user=Depends(get_current_user),
):
    if not pwd_ctx.verify(body.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")
    return {"ok": True}


class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/profile")
def update_profile(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if body.username and body.username != current_user.username:
        from app.models.user import User
        conflict = db.query(User).filter(User.username == body.username, User.id != current_user.id).first()
        if conflict:
            raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")
        current_user.username = body.username

    if body.phone_number is not None:
        current_user.phone_number = body.phone_number or None

    if body.new_password:
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다.")
        current_user.hashed_password = pwd_ctx.hash(body.new_password)

    db.commit()
    db.refresh(current_user)
    return {
        "ok": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "user_type": current_user.user_type,
        }
    }

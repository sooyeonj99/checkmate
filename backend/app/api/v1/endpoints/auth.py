import re
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    FindIdRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
)
from app.services.email_service import (
    send_find_id_email,
    send_password_reset_email,
    send_verification_email,
)
from app.services.user_service import (
    authenticate_user,
    create_password_reset_token,
    create_user,
    get_user_by_email,
    get_user_by_reset_token,
    get_user_by_verification_token,
    refresh_verification_token,
    reset_user_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
    user = create_user(db, user_in)
    background_tasks.add_task(
        send_verification_email, user.email, user.username, user.verification_token
    )
    return RegisterResponse(
        message="회원가입이 완료되었습니다. 이메일을 확인해 인증을 완료해 주세요.",
        email=user.email,
    )


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이메일 인증이 필요합니다. 메일함을 확인해 주세요.",
        )
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        user=user,
    )


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = get_user_by_verification_token(db, token)
    if not user:
        raise HTTPException(status_code=400, detail="유효하지 않은 인증 링크입니다.")
    if user.is_verified:
        return {"success": True, "message": "이미 인증된 계정입니다. 로그인해 주세요."}
    if user.verification_token_expires and datetime.now() > user.verification_token_expires:
        raise HTTPException(
            status_code=400,
            detail="만료된 인증 링크입니다. 인증 메일을 재발송해 주세요.",
        )
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    return {"success": True, "message": "이메일 인증이 완료되었습니다! 로그인해 주세요."}


@router.post("/resend-verification")
def resend_verification(
    body: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, body.email)
    # 계정 존재 여부를 외부에 노출하지 않음
    if not user or user.is_verified:
        return {"message": "인증 메일을 재발송했습니다. 메일함을 확인해 주세요."}
    new_token = refresh_verification_token(db, user)
    background_tasks.add_task(send_verification_email, user.email, user.username, new_token)
    return {"message": "인증 메일을 재발송했습니다. 메일함을 확인해 주세요."}


@router.post("/find-id")
def find_id(
    body: FindIdRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, body.email)
    if user:
        background_tasks.add_task(send_find_id_email, user.email, user.username)
    # 계정 존재 여부 노출 방지 — 항상 동일 응답
    return {"message": "입력하신 이메일로 아이디 정보를 발송했습니다. 메일함을 확인해 주세요."}


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, body.email)
    if user and user.is_verified:
        token = create_password_reset_token(db, user)
        background_tasks.add_task(send_password_reset_email, user.email, user.username, token)
    return {"message": "비밀번호 재설정 링크를 이메일로 발송했습니다. 메일함을 확인해 주세요."}


@router.get("/check-username")
def check_username(value: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == value).first()
    return {"available": user is None}


@router.get("/check-email")
def check_email(value: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == value).first()
    return {"available": user is None}


@router.get("/check-phone")
def check_phone(value: str, db: Session = Depends(get_db)):
    digits = re.sub(r"\D", "", value)
    if not digits:
        return {"available": True}
    user = db.query(User).filter(User.phone_number == digits).first()
    return {"available": user is None}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_reset_token(db, body.token)
    if not user:
        raise HTTPException(status_code=400, detail="유효하지 않은 링크입니다.")
    if user.password_reset_token_expires and datetime.now() > user.password_reset_token_expires:
        raise HTTPException(status_code=400, detail="만료된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다.")
    reset_user_password(db, user, body.new_password)
    return {"message": "비밀번호가 성공적으로 변경되었습니다. 로그인해 주세요."}

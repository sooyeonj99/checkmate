import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_verification_token(db: Session, token: str) -> User | None:
    return db.query(User).filter(User.verification_token == token).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    import re as _re
    token = secrets.token_urlsafe(32)
    normalized_phone = _re.sub(r"\D", "", user_in.phone_number) if user_in.phone_number else None
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        is_verified=False,
        verification_token=token,
        verification_token_expires=datetime.now() + timedelta(hours=24),
        user_type=user_in.user_type,
        business_number=user_in.business_number,
        phone_number=normalized_phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _unique_username(db: Session, base: str) -> str:
    """base 닉네임이 이미 사용 중이면 뒤에 숫자를 붙여 유니크하게 만든다."""
    candidate = base.strip() or "user"
    suffix = 0
    while db.query(User).filter(User.username == candidate).first():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def get_or_create_google_user(db: Session, email: str, name: str) -> User:
    """
    구글 계정으로 로그인/가입. 이미 같은 이메일의 계정이 있으면 그대로 로그인 처리하고,
    없으면 새로 생성한다 (비밀번호는 임의값 — 구글 로그인 전용 계정).
    구글이 이미 이메일을 검증했으므로 is_verified=True로 생성한다.
    """
    user = get_user_by_email(db, email)
    if user:
        return user

    username = _unique_username(db, name or email.split("@")[0])
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        is_verified=True,
        user_type="personal",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def refresh_verification_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.now() + timedelta(hours=24)
    db.commit()
    db.refresh(user)
    return token


def get_user_by_reset_token(db: Session, token: str) -> User | None:
    return db.query(User).filter(User.password_reset_token == token).first()


def create_password_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires = datetime.now() + timedelta(hours=1)
    db.commit()
    db.refresh(user)
    return token


def reset_user_password(db: Session, user: User, new_password: str) -> None:
    from app.core.security import hash_password
    user.hashed_password = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_token_expires = None
    db.commit()

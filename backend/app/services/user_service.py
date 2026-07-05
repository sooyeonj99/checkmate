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

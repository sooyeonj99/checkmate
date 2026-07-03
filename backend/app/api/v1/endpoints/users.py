from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError
from pydantic import BaseModel
from app.db.session import get_db
from app.schemas.user import UserResponse
from app.services.user_service import get_user_by_id
from app.core.security import decode_token
from fastapi.security import OAuth2PasswordBearer

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

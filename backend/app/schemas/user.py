from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    user_type: str = 'personal'


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_verified: bool
    user_type: str = 'personal'
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    email: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr

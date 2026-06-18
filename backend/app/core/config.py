from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── 데이터베이스 ──────────────────────────────────────
    DATABASE_URL: Optional[str] = None

    # ── 보안 ─────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ── CORS (프론트엔드 연결) ────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://sooyeonj99.github.io",
    ]

    # ── 파일 업로드 ───────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20

    # ── AI 분석 (Gemini) ─────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()

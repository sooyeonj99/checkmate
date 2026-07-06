from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── 데이터베이스 ──────────────────────────────────────
    DATABASE_URL: Optional[str] = None

    # ── 보안 ─────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30일 (앱은 수동 로그아웃 전까지 유지, 웹은 30분 미사용 시 프론트에서 자동 로그아웃)

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

    # ── 이메일 (SMTP) ─────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_SSL: bool = False          # True = SSL(465포트), False = STARTTLS(587포트)
    SMTP_USER: Optional[str] = None # 발송 이메일 주소
    SMTP_PASSWORD: Optional[str] = None  # 앱 비밀번호
    SMTP_FROM: Optional[str] = None      # 표시될 발신자 이메일 (미설정 시 SMTP_USER)
    FRONTEND_URL: str = "http://localhost:3000/checkmate"

    # ── 국세청 사업자등록정보 API ──────────────────────────
    NTS_API_KEY: Optional[str] = None

    # ── NCP SMS (네이버 클라우드 플랫폼) ─────────────────
    NCP_ACCESS_KEY: Optional[str] = None
    NCP_SECRET_KEY: Optional[str] = None
    NCP_SMS_SERVICE_ID: Optional[str] = None
    NCP_SMS_SENDER: Optional[str] = None  # 등록된 발신 번호 (예: 01012345678)

    # ── 앱 다운로드 링크 ──────────────────────────────────
    APP_STORE_URL: str = "https://apps.apple.com/app/checkmate"
    PLAY_STORE_URL: str = "https://play.google.com/store/apps/details?id=com.checkmate"

    class Config:
        env_file = ".env"


settings = Settings()

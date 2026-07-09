"""
Checkmate API 서버
AI 기반 계약서 분석 서비스 백엔드
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.services.scheduler import start_scheduler, stop_scheduler
import app.models.franchise       # noqa: F401
import app.models.franchise_legal  # noqa: F401


def _migrate_db():
    """기존 테이블에 누락된 컬럼 추가 (SQLite ALTER TABLE)"""
    from sqlalchemy import text
    migrations = [
        # users 테이블 누락 컬럼
        "ALTER TABLE team_members ADD COLUMN invite_method VARCHAR(10) DEFAULT 'email'",
        "ALTER TABLE team_members ADD COLUMN member_phone VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN push_token VARCHAR(500)",
        "ALTER TABLE users ADD COLUMN business_number VARCHAR(12)",
        "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME",
        "ALTER TABLE users ADD COLUMN verification_token_expires DATETIME",
        "ALTER TABLE users ADD COLUMN updated_at DATETIME",
        # saved_contracts 테이블 누락 컬럼
        "ALTER TABLE saved_contracts ADD COLUMN expiry_date DATETIME",
        "ALTER TABLE saved_contracts ADD COLUMN expiry_notice_days INTEGER DEFAULT 7",
        # signing_records 테이블 누락 컬럼 (이미 테이블이 있는 경우)
        "ALTER TABLE signing_records ADD COLUMN requestee_phone VARCHAR(20)",
        "ALTER TABLE signing_records ADD COLUMN contract_html TEXT",
        "ALTER TABLE signing_records ADD COLUMN user_template_id INTEGER",
        "ALTER TABLE signing_records ADD COLUMN requester_signature TEXT",
        "ALTER TABLE signing_records ADD COLUMN requestee_signature TEXT",
        "ALTER TABLE signing_records ADD COLUMN requestee_name VARCHAR(100)",
        "ALTER TABLE signing_records ADD COLUMN requester_signed_at DATETIME",
        "ALTER TABLE signing_records ADD COLUMN requestee_signed_at DATETIME",
        "ALTER TABLE signing_records ADD COLUMN expires_at DATETIME",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # 이미 존재하면 무시


@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작/종료 시 실행되는 작업"""
    # DB 테이블 자동 생성
    Base.metadata.create_all(bind=engine)
    # 기존 테이블 컬럼 마이그레이션 (SQLite ALTER TABLE)
    _migrate_db()
    # 업로드 디렉토리 생성
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"[OK] 서버 시작 | 업로드 폴더: {settings.UPLOAD_DIR}")
    print(f"[OK] CORS 허용 출처: {settings.CORS_ORIGINS}")
    start_scheduler()
    yield
    stop_scheduler()
    print("[--] 서버 종료")


app = FastAPI(
    title="Checkmate API",
    description="AI 기반 계약서 분석 서비스 API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정 — 프론트엔드와의 통신 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 라우터 등록
app.include_router(api_router)


@app.get("/health", tags=["시스템"])
async def health_check():
    """서버 상태 확인 엔드포인트"""
    return {
        "status": "정상",
        "service": "Checkmate API",
        "version": "0.1.0",
    }


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=404,
        content={"detail": "요청한 리소스를 찾을 수 없습니다."},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."},
    )

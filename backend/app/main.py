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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작/종료 시 실행되는 작업"""
    # 업로드 디렉토리 생성
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"✅ 서버 시작 | 업로드 폴더: {settings.UPLOAD_DIR}")
    print(f"📋 CORS 허용 출처: {settings.CORS_ORIGINS}")
    yield
    print("🛑 서버 종료")


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

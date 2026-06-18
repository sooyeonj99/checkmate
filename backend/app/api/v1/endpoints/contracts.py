"""
계약서 업로드 및 분석 API
지원 형식: PDF, JPG, JPEG, PNG, HWP, DOCX (최대 20MB)
"""
import json
import os
import shutil
import uuid
from datetime import datetime
from typing import Optional

import aiofiles
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.contract import AnalysisResult, ClauseResult, ContractUploadResponse

router = APIRouter(prefix="/contracts", tags=["계약서"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".hwp", ".docx"}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024

CONTRACT_TYPE_LABELS = {
    "employment":   "근로계약서",
    "lease":        "임대차계약서",
    "freelance":    "프리랜서 계약서",
    "subscription": "구독·이용약관",
    "other":        "기타 계약서",
}


def _validate_file(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일명이 없습니다. 파일을 다시 선택해 주세요.",
        )
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"지원하지 않는 파일 형식입니다. ({ext})\n지원 형식: PDF, JPG, PNG, HWP, DOCX",
        )
    return ext


@router.post(
    "/upload",
    response_model=ContractUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="계약서 업로드",
)
async def upload_contract(
    file: UploadFile = File(..., description="계약서 파일"),
    contract_type: Optional[str] = Form(None, description="계약 유형"),
):
    ext = _validate_file(file)
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="빈 파일입니다. 내용이 있는 파일을 업로드해 주세요.",
        )
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일 크기가 너무 큽니다. ({file_size / 1024 / 1024:.1f}MB)\n최대: {settings.MAX_FILE_SIZE_MB}MB",
        )

    type_label = CONTRACT_TYPE_LABELS.get(contract_type or "other", "기타 계약서")
    contract_id = str(uuid.uuid4())
    save_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    os.makedirs(save_dir, exist_ok=True)

    safe_filename = f"{contract_id}{ext}"
    save_path = os.path.join(save_dir, safe_filename)

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    # 원본 파일명·계약유형 메타데이터 저장 (분석 시 참조)
    meta = {
        "original_filename": file.filename,
        "contract_type": type_label,
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    async with aiofiles.open(os.path.join(save_dir, "meta.json"), "w", encoding="utf-8") as f:
        await f.write(json.dumps(meta, ensure_ascii=False))

    return ContractUploadResponse(
        contract_id=contract_id,
        filename=file.filename or safe_filename,
        contract_type=type_label,
        file_size=file_size,
        file_ext=ext.lstrip(".").upper(),
        status="업로드 완료",
        message="파일이 성공적으로 업로드되었습니다. 분석을 시작할 수 있습니다.",
    )


@router.post(
    "/{contract_id}/analyze",
    response_model=AnalysisResult,
    summary="계약서 AI 분석",
)
async def analyze_contract(contract_id: str):
    contract_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    if not os.path.isdir(contract_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="계약서를 찾을 수 없습니다. 먼저 파일을 업로드해 주세요.",
        )

    # 메타데이터 읽기
    meta_path = os.path.join(contract_dir, "meta.json")
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

    # 업로드된 파일 찾기 (meta.json 제외)
    files = [f for f in os.listdir(contract_dir) if f != "meta.json"]
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="업로드된 파일을 찾을 수 없습니다.",
        )
    file_path = os.path.join(contract_dir, files[0])
    original_filename = meta.get("original_filename", files[0])

    # Gemini API 연동
    if settings.GEMINI_API_KEY:
        try:
            from app.services.gemini_service import analyze_with_gemini
            result = await analyze_with_gemini(contract_id, file_path, original_filename)
            # 업로드 시 감지된 계약 유형 우선 적용
            if meta.get("contract_type"):
                result.contract_type = meta["contract_type"]
            return result
        except Exception as e:
            print(f"⚠️  Gemini 분석 오류 (목업으로 대체): {e}")

    return _mock_analysis(contract_id, original_filename, meta.get("contract_type", "기타 계약서"))


@router.delete(
    "/{contract_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="계약서 삭제",
)
async def delete_contract(contract_id: str):
    contract_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    if not os.path.isdir(contract_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="계약서를 찾을 수 없습니다.",
        )
    shutil.rmtree(contract_dir)


# ── 목업 분석 결과 (Gemini 미연결 또는 오류 시 반환) ───────────────

def _mock_analysis(contract_id: str, filename: str = "계약서.pdf", contract_type: str = "기타 계약서") -> AnalysisResult:
    clauses = [
        ClauseResult(
            article="제7조",
            title="지식재산권 귀속",
            risk="danger",
            description="결과물 저작권이 발주사에 무상 귀속되며 2차 창작물 이용권까지 포함되어 있습니다.",
            original="본 계약에 따라 생성된 모든 결과물의 저작권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 어떠한 권리도 주장할 수 없다.",
            suggestion="완성된 최종 결과물에 한하여 발주사 이용을 허락하며, 저작인격권은 수급인이 보유한다.",
            law_ref="저작권법 제9조, 제45조",
        ),
        ClauseResult(
            article="제4조",
            title="대금 지급 조건",
            risk="danger",
            description="지급 시기가 발주사 내부 결재 완료 후로 명시되어 지연 위험이 있습니다.",
            original="용역 대금은 발주사의 내부 결재 완료 시점으로부터 60일 이내에 지급한다.",
            suggestion="납품 확인일로부터 30일 이내 지급. 지연 시 연 12% 지연이자 가산.",
            law_ref="하도급법 제13조, 민법 제54조",
        ),
        ClauseResult(
            article="제8조",
            title="비밀유지 의무",
            risk="warn",
            description="비밀유지 대상이 포괄적이고 기간이 영구적으로 설정되어 있습니다.",
            original="수급인은 본 계약과 관련한 모든 정보를 영구적으로 제3자에게 공개할 수 없다.",
            suggestion="영업비밀로 지정된 정보에 한하여 계약 종료 후 2년간 적용. 포트폴리오 활용은 사전 동의 시 허용.",
            law_ref="부정경쟁방지법 제2조 제2호",
        ),
        ClauseResult(
            article="제5조",
            title="수정 및 검수 조건",
            risk="safe",
            description="수정 횟수와 기간이 명확하게 정의되어 있어 분쟁 소지가 낮습니다.",
            original="수정 요청은 납품일로부터 14일 이내, 최대 2회로 한정한다.",
            suggestion="현행 조항이 적절합니다.",
            law_ref=None,
        ),
    ]

    danger_count = sum(1 for c in clauses if c.risk == "danger")
    warn_count   = sum(1 for c in clauses if c.risk == "warn")
    safe_count   = sum(1 for c in clauses if c.risk == "safe")
    score = min(100, danger_count * 20 + warn_count * 8)
    grade = "위험" if score >= 60 else "주의" if score >= 30 else "안전"

    return AnalysisResult(
        contract_id=contract_id,
        filename=filename,
        contract_type=contract_type,
        score=score,
        grade=grade,
        danger_count=danger_count,
        warn_count=warn_count,
        safe_count=safe_count,
        analysis_time="목업 데이터",
        clauses=clauses,
        analyzed_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )

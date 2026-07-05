"""
계약서 업로드 및 분석 API
지원 형식: PDF, JPG, JPEG, PNG, HWP, DOCX (최대 20MB)
"""
import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.saved_contract import SavedContract
from app.models.user import User
from app.schemas.contract import AnalysisResult, ClauseResult, ContractUploadResponse
from app.api.v1.endpoints.users import get_current_user

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
    summary="계약서 업로드 (다중 파일 지원)",
)
async def upload_contract(
    files: list[UploadFile] = File(..., description="계약서 파일 (여러 장 가능)"),
    contract_type: Optional[str] = Form(None, description="계약 유형"),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="파일을 선택해 주세요.")

    type_label = CONTRACT_TYPE_LABELS.get(contract_type or "other", "기타 계약서")
    contract_id = str(uuid.uuid4())
    save_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    os.makedirs(save_dir, exist_ok=True)

    saved_filenames = []
    total_size = 0

    for idx, file in enumerate(files, start=1):
        ext = _validate_file(file)
        contents = await file.read()
        file_size = len(contents)

        if file_size == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{file.filename}' 파일이 비어 있습니다.")
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"'{file.filename}' 파일이 너무 큽니다. ({file_size/1024/1024:.1f}MB / 최대 {settings.MAX_FILE_SIZE_MB}MB)")

        safe_name = f"file_{idx:02d}{ext}"
        async with aiofiles.open(os.path.join(save_dir, safe_name), "wb") as f:
            await f.write(contents)

        saved_filenames.append({"saved": safe_name, "original": file.filename or safe_name})
        total_size += file_size

    # 메타데이터 저장
    first_name = files[0].filename or "계약서"
    display_name = first_name if len(files) == 1 else f"{first_name} 외 {len(files)-1}장"
    meta = {
        "original_filename": display_name,
        "file_list": saved_filenames,
        "file_count": len(files),
        "contract_type": type_label,
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    async with aiofiles.open(os.path.join(save_dir, "meta.json"), "w", encoding="utf-8") as f:
        await f.write(json.dumps(meta, ensure_ascii=False))

    return ContractUploadResponse(
        contract_id=contract_id,
        filename=display_name,
        contract_type=type_label,
        file_size=total_size,
        file_ext=f"{len(files)}개 파일" if len(files) > 1 else saved_filenames[0]["saved"].split(".")[-1].upper(),
        status="업로드 완료",
        message=f"{len(files)}개 파일이 업로드되었습니다. 분석을 시작할 수 있습니다.",
    )


class CustomMaskItem(BaseModel):
    start: int
    end: int
    label: str = '<직접선택>'


class AnalyzeRequest(BaseModel):
    selected_ids: list[int] | None = None
    user_type: str | None = None  # freelancer | employee | small_biz | subscription | newcomer
    custom_masks: list[CustomMaskItem] | None = None
    ocr_text_override: str | None = None  # 빈칸 채우기로 완성된 OCR 텍스트


def _load_contract_dir(contract_id: str):
    """업로드 디렉토리, 메타, 파일목록 반환 (공통 헬퍼)"""
    contract_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    if not os.path.isdir(contract_dir):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
            detail="계약서를 찾을 수 없습니다. 먼저 파일을 업로드해 주세요.")
    meta_path = os.path.join(contract_dir, "meta.json")
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    _SKIP = {"meta.json", "ocr_cache.json"}
    all_files = sorted([f for f in os.listdir(contract_dir) if f not in _SKIP])
    if not all_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
            detail="업로드된 파일을 찾을 수 없습니다.")
    file_paths = [os.path.join(contract_dir, f) for f in all_files]
    return contract_dir, meta, file_paths


@router.get(
    "/{contract_id}/preview",
    summary="계약서 PII 감지 미리보기 (마스킹 전 검토용)",
)
async def preview_contract(contract_id: str):
    """
    파일에서 텍스트 추출 후 PII 감지 결과 반환.
    이미지 파일은 Gemini OCR로 텍스트 추출 → 마스킹 검토 가능.
    API 키 없거나 OCR 실패 시에만 image_only=true 반환.
    """
    contract_dir, _, file_paths = _load_contract_dir(contract_id)

    from app.services.gemini_service import extract_texts_from_files, extract_text_from_image_with_gemini
    from app.services.masking_service import detect_pii

    # PDF / DOCX 텍스트 추출
    texts, _ = extract_texts_from_files(file_paths)

    # 이미지 파일 목록
    image_paths = [fp for fp in file_paths if Path(fp).suffix.lower() in {".jpg", ".jpeg", ".png"}]

    # 이미지 OCR (Gemini)
    ocr_cache: dict[str, str] = {}
    all_missing_fields: list = []
    from_ocr = False

    if image_paths and settings.GEMINI_API_KEY:
        for img_fp in image_paths:
            try:
                logger.info(f"이미지 OCR 시작: {Path(img_fp).name}")
                ocr_text, missing_fields = extract_text_from_image_with_gemini(img_fp)
                if ocr_text:
                    ocr_cache[Path(img_fp).name] = ocr_text
                    texts.append(ocr_text)
                    from_ocr = True
                    all_missing_fields.extend(missing_fields)
                    logger.info(f"OCR 완료: {Path(img_fp).name} ({len(ocr_text)}자, 빈칸 {len(missing_fields)}개)")
            except Exception as e:
                logger.warning(f"이미지 OCR 실패 ({Path(img_fp).name}): {e}")

        # OCR 결과 캐시 저장 (analyze 단계에서 재사용)
        if ocr_cache:
            cache_path = os.path.join(contract_dir, "ocr_cache.json")
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(ocr_cache, f, ensure_ascii=False)

    if not texts:
        return {"image_only": True, "text": None, "entities": [], "from_ocr": False, "missing_fields": []}

    combined = "\n\n--- 다음 파일 ---\n\n".join(texts)
    entities = detect_pii(combined)

    return {
        "image_only": False,
        "from_ocr": from_ocr,
        "text": combined[:5000],
        "missing_fields": all_missing_fields,
        "entities": [
            {
                "id": e.id,
                "type": e.type,
                "label": e.label,
                "start": e.start,
                "end": e.end,
                "original": e.original,
            }
            for e in entities
        ],
    }


@router.post(
    "/{contract_id}/analyze",
    response_model=AnalysisResult,
    summary="계약서 AI 분석",
)
async def analyze_contract(contract_id: str, body: AnalyzeRequest | None = None):
    contract_dir, meta, file_paths = _load_contract_dir(contract_id)
    original_filename = meta.get("original_filename", os.path.basename(file_paths[0]))
    selected_ids = body.selected_ids if body else None
    user_type = body.user_type if body else None
    custom_masks = [m.dict() for m in body.custom_masks] if body and body.custom_masks else None

    # 빈칸 채우기로 완성된 OCR 텍스트 → ocr_cache에 반영
    if body and body.ocr_text_override:
        cache_path = os.path.join(contract_dir, "ocr_cache.json")
        img_files = [f for f in os.listdir(contract_dir)
                     if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        img_key = img_files[0] if img_files else "image.jpg"
        with open(cache_path, "w", encoding="utf-8") as _f:
            json.dump({img_key: body.ocr_text_override}, _f, ensure_ascii=False)
        logger.info(f"OCR 완성 텍스트 캐시 저장 ({len(body.ocr_text_override)}자)")

    # Gemini API 연동
    if settings.GEMINI_API_KEY:
        try:
            from app.services.gemini_service import analyze_with_gemini
            result = await analyze_with_gemini(
                contract_id, file_paths, original_filename,
                selected_ids=selected_ids, user_type=user_type,
                custom_masks=custom_masks
            )
            # contract_type은 Gemini가 문서 내용으로 판단한 것을 우선 사용
            # meta의 유형(사용자 선택)은 Gemini가 반환하지 못한 경우에만 폴백
            if not result.contract_type and meta.get("contract_type"):
                result.contract_type = meta["contract_type"]
            return result
        except Exception as e:
            print(f"[WARN] Gemini 분석 오류 (목업으로 대체): {e}")

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


# ── 분석 결과 저장 (대시보드 등록) ────────────────────────────────────

@router.post(
    "/{contract_id}/save",
    status_code=status.HTTP_201_CREATED,
    summary="분석 결과 대시보드 저장",
)
async def save_contract(
    contract_id: str,
    result: AnalysisResult,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 중복 저장 방지
    existing = db.query(SavedContract).filter_by(
        user_id=current_user.id, contract_id=contract_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 저장된 분석 결과입니다.")

    saved = SavedContract(
        user_id=current_user.id,
        contract_id=contract_id,
        filename=result.filename,
        contract_type=result.contract_type,
        score=result.score,
        grade=result.grade,
        danger_count=result.danger_count,
        warn_count=result.warn_count,
        safe_count=result.safe_count,
        analysis_time=result.analysis_time,
        result_json=result.model_dump(),
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    # 마스킹된 텍스트 계정별 저장 (AI 학습용)
    if result.contract_text:
        try:
            masked_dir = Path(settings.UPLOAD_DIR).parent / "masked_data" / "users" / str(current_user.id)
            masked_dir.mkdir(parents=True, exist_ok=True)
            masked_file = masked_dir / f"{contract_id}.txt"
            masked_file.write_text(result.contract_text, encoding="utf-8")
            meta_file = masked_dir / f"{contract_id}.json"
            meta_file.write_text(json.dumps({
                "filename": result.filename,
                "contract_type": result.contract_type,
                "saved_at": saved.saved_at.isoformat(),
                "masked_count": result.masked_count,
            }, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[WARN] 마스킹 파일 저장 실패: {e}")

    # 업로드 파일 정리 (저장했으므로 더 이상 필요 없음)
    contract_dir = os.path.join(settings.UPLOAD_DIR, contract_id)
    if os.path.isdir(contract_dir):
        shutil.rmtree(contract_dir)

    return {"id": saved.id, "saved_at": saved.saved_at.isoformat()}


# ── 저장된 계약서 목록 ────────────────────────────────────────────────

@router.get(
    "/saved",
    summary="저장된 분석 결과 목록",
)
async def list_saved_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(SavedContract)
        .filter_by(user_id=current_user.id)
        .order_by(SavedContract.saved_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "contract_id": r.contract_id,
            "filename": r.filename,
            "contract_type": r.contract_type,
            "score": r.score,
            "grade": r.grade,
            "danger_count": r.danger_count,
            "warn_count": r.warn_count,
            "safe_count": r.safe_count,
            "analysis_time": r.analysis_time,
            "saved_at": r.saved_at.isoformat(),
        }
        for r in rows
    ]


# ── 저장된 계약서 상세 조회 ───────────────────────────────────────────

@router.get(
    "/saved/{saved_id}",
    summary="저장된 분석 결과 상세",
)
async def get_saved_contract(
    saved_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(SavedContract).filter_by(id=saved_id, user_id=current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="저장된 계약서를 찾을 수 없습니다.")
    return row.result_json


# ── 저장된 계약서 삭제 ────────────────────────────────────────────────

@router.delete(
    "/saved/{saved_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="저장된 분석 결과 삭제",
)
async def delete_saved_contract(
    saved_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(SavedContract).filter_by(id=saved_id, user_id=current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="저장된 계약서를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()


# ── 목업 분석 결과 (Gemini 미연결 또는 오류 시 반환) ───────────────

def _mock_analysis(contract_id: str, filename: str = "계약서.pdf", contract_type: str = "기타 계약서") -> AnalysisResult:
    clauses = [
        ClauseResult(
            article="제7조",
            title="지식재산권 귀속",
            risk="danger",
            description="결과물 저작권이 발주사에 무상 귀속되며 2차 창작물 이용권까지 포함되어 있습니다.",
            original="본 계약에 따라 생성된 모든 결과물의 저작권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 어떠한 권리도 주장할 수 없다.",
            simple_explanation="쉽게 말하면, 당신이 만든 모든 결과물은 납품하는 순간 회사 것이 됩니다. 포트폴리오에 올릴 수도 없고, 어떠한 권리도 주장할 수 없습니다.",
            suggestion="완성된 최종 결과물에 한하여 발주사 이용을 허락하며, 저작인격권은 수급인이 보유한다.",
            law_ref="저작권법 제9조, 제45조",
        ),
        ClauseResult(
            article="제4조",
            title="대금 지급 조건",
            risk="danger",
            description="지급 시기가 발주사 내부 결재 완료 후로 명시되어 지연 위험이 있습니다.",
            original="용역 대금은 발주사의 내부 결재 완료 시점으로부터 60일 이내에 지급한다.",
            simple_explanation="쉽게 말하면, 돈을 언제 받을지가 회사 내부 사정에 달려 있습니다. 결재가 늦어지면 납품 후 2개월 이상 기다려야 할 수 있어요.",
            suggestion="납품 확인일로부터 30일 이내 지급. 지연 시 연 12% 지연이자 가산.",
            law_ref="하도급법 제13조, 민법 제54조",
        ),
        ClauseResult(
            article="제8조",
            title="비밀유지 의무",
            risk="warn",
            description="비밀유지 대상이 포괄적이고 기간이 영구적으로 설정되어 있습니다.",
            original="수급인은 본 계약과 관련한 모든 정보를 영구적으로 제3자에게 공개할 수 없다.",
            simple_explanation="쉽게 말하면, 이 계약과 관련된 모든 것을 평생 비밀로 지켜야 합니다. 심지어 '이 회사와 일했다'는 사실조차 말하기 어려울 수 있어요.",
            suggestion="영업비밀로 지정된 정보에 한하여 계약 종료 후 2년간 적용. 포트폴리오 활용은 사전 동의 시 허용.",
            law_ref="부정경쟁방지법 제2조 제2호",
        ),
        ClauseResult(
            article="제5조",
            title="수정 및 검수 조건",
            risk="safe",
            description="수정 횟수와 기간이 명확하게 정의되어 있어 분쟁 소지가 낮습니다.",
            original="수정 요청은 납품일로부터 14일 이내, 최대 2회로 한정한다.",
            simple_explanation="쉽게 말하면, 납품 후 2주 안에 최대 2번까지만 수정 요청을 받습니다. 횟수와 기간이 명확해서 양쪽 모두 이해하기 쉬운 조항이에요.",
            suggestion="현행 조항이 적절합니다.",
            law_ref=None,
        ),
    ]

    danger_count = sum(1 for c in clauses if c.risk == "danger")
    warn_count   = sum(1 for c in clauses if c.risk == "warn")
    safe_count   = sum(1 for c in clauses if c.risk == "safe")
    score = min(100, danger_count * 20 + warn_count * 8)
    grade = "위험" if score >= 60 else "주의" if score >= 30 else "안전"

    mock_text = """프리랜서 용역 계약서

주식회사 ABC(이하 "발주사")와 홍길동(이하 "수급인")은 아래와 같이 용역 계약을 체결한다.

제1조 (계약의 목적)
본 계약은 발주사가 수급인에게 의뢰하는 용역 업무의 범위, 대가, 납기 및 기타 조건을 정함을 목적으로 한다.

제2조 (용역의 내용)
수급인은 발주사가 요청하는 디자인 및 개발 업무를 성실히 수행하며, 세부 업무 범위는 별도 작업지시서에 따른다.

제3조 (계약 기간)
본 계약의 기간은 계약 체결일로부터 6개월로 하며, 당사자 합의 시 연장할 수 있다.

제4조 (대금 지급 조건)
용역 대금은 발주사의 내부 결재 완료 시점으로부터 60일 이내에 지급한다. 세금계산서는 납품일 기준으로 발행한다.

제5조 (수정 및 검수 조건)
수정 요청은 납품일로부터 14일 이내, 최대 2회로 한정한다. 발주사의 귀책 사유로 인한 추가 수정은 별도 협의한다.

제6조 (비용 정산)
용역 수행에 필요한 재료비, 출장비 등 추가 비용은 사전 서면 합의 후 발주사가 부담한다.

제7조 (지식재산권 귀속)
본 계약에 따라 생성된 모든 결과물의 저작권 일체는 납품 즉시 발주사에 무상으로 귀속되며, 수급인은 어떠한 권리도 주장할 수 없다.

제8조 (비밀유지 의무)
수급인은 본 계약과 관련한 모든 정보를 영구적으로 제3자에게 공개할 수 없다. 이를 위반할 경우 발생하는 모든 손해를 배상하여야 한다.

제9조 (계약 해지)
발주사는 30일 전 서면 통보로 계약을 해지할 수 있다. 수급인의 귀책으로 인한 해지 시 기지급된 선금을 반환하여야 한다.

제10조 (분쟁 해결)
본 계약과 관련한 분쟁은 서울중앙지방법원을 관할 법원으로 하여 해결한다.

제11조 (기타)
본 계약에 명시되지 않은 사항은 관련 법령 및 상관례에 따른다. 본 계약은 계약 체결일로부터 효력이 발생한다."""

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
        summary="이 계약서는 프리랜서(수급인)와 발주사 간의 용역 계약서입니다. 핵심 문제는 두 가지로, 당신이 만든 결과물의 저작권이 납품 즉시 모두 회사로 넘어가고, 대금 지급도 회사 내부 결재 완료 후 최대 60일이라 상당히 늦을 수 있습니다. 또한 비밀유지 의무가 영구적으로 적용되어 포트폴리오 활용도 어렵습니다. 계약 전 저작권 귀속과 대금 지급 조건을 반드시 협의하시기 바랍니다.",
        contract_text=mock_text,
    )

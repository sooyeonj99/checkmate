"""계약서 비교 · AI 생성 · 일괄 분석 API"""
import json
import logging
import os
import uuid
import shutil
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.endpoints.users import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.saved_contract import SavedContract
from app.models.user import User
from app.services import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["계약서 고급"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".hwp", ".docx"}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


# ── 계약서 비교 ─────────────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    saved_id_a: int
    saved_id_b: int


class ClauseDiff(BaseModel):
    article: str
    title_a: Optional[str] = None
    title_b: Optional[str] = None
    risk_a: Optional[str] = None
    risk_b: Optional[str] = None
    changed: bool


class CompareResponse(BaseModel):
    filename_a: str
    filename_b: str
    score_a: int
    score_b: int
    grade_a: str
    grade_b: str
    summary: str
    clause_diffs: list[ClauseDiff]
    ai_verdict: str


@router.post("/compare", response_model=CompareResponse)
async def compare_contracts(
    body: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """저장된 두 계약서를 AI로 비교 분석"""
    a = db.query(SavedContract).filter(
        SavedContract.id == body.saved_id_a, SavedContract.user_id == current_user.id
    ).first()
    b = db.query(SavedContract).filter(
        SavedContract.id == body.saved_id_b, SavedContract.user_id == current_user.id
    ).first()

    if not a or not b:
        raise HTTPException(status_code=404, detail="계약서를 찾을 수 없습니다.")

    clauses_a = {c.get("article", ""): c for c in (a.result_json or {}).get("clauses", [])}
    clauses_b = {c.get("article", ""): c for c in (b.result_json or {}).get("clauses", [])}

    all_articles = sorted(set(list(clauses_a.keys()) + list(clauses_b.keys())))
    diffs = []
    for art in all_articles:
        ca = clauses_a.get(art, {})
        cb = clauses_b.get(art, {})
        changed = ca.get("risk") != cb.get("risk") or ca.get("title") != cb.get("title")
        diffs.append(ClauseDiff(
            article=art,
            title_a=ca.get("title"),
            title_b=cb.get("title"),
            risk_a=ca.get("risk"),
            risk_b=cb.get("risk"),
            changed=changed,
        ))

    # AI 종합 판단
    summary_a = (a.result_json or {}).get("summary", "")
    summary_b = (b.result_json or {}).get("summary", "")
    ai_verdict = await gemini_service.compare_summaries(
        a.filename, summary_a, a.score, a.grade,
        b.filename, summary_b, b.score, b.grade,
    )

    changed_count = sum(1 for d in diffs if d.changed)
    summary = f"{a.filename}(점수:{a.score})와 {b.filename}(점수:{b.score})을 비교했습니다. 총 {len(diffs)}개 조항 중 {changed_count}개에서 차이가 발견됐습니다."

    return CompareResponse(
        filename_a=a.filename,
        filename_b=b.filename,
        score_a=a.score,
        score_b=b.score,
        grade_a=a.grade,
        grade_b=b.grade,
        summary=summary,
        clause_diffs=diffs,
        ai_verdict=ai_verdict,
    )


# ── AI 계약서 생성 ───────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    description: str          # 사용자가 입력한 계약 설명
    contract_type: Optional[str] = None  # 원하는 계약 유형 힌트


class GenerateResponse(BaseModel):
    contract_text: str
    contract_type: str
    suggested_title: str


@router.post("/generate", response_model=GenerateResponse)
async def generate_contract(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """설명을 입력하면 AI가 계약서 초안을 생성"""
    if len(body.description.strip()) < 10:
        raise HTTPException(status_code=400, detail="계약 내용을 10자 이상 입력해주세요.")

    result = await gemini_service.generate_contract(body.description, body.contract_type)
    return GenerateResponse(**result)


# ── 일괄 분석 ────────────────────────────────────────────────────────────────

class BulkUploadItem(BaseModel):
    contract_id: str
    filename: str
    status: str  # "uploaded" | "error"
    error: Optional[str] = None


class BulkUploadResponse(BaseModel):
    items: list[BulkUploadItem]
    total: int
    success: int


@router.post("/bulk-upload", response_model=BulkUploadResponse)
async def bulk_upload(
    files: list[UploadFile] = File(...),
    contract_type: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """여러 파일을 동시 업로드 → 각각 contract_id 반환 (분석은 별도 호출)"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="한 번에 최대 10개 파일까지 업로드 가능합니다.")

    upload_dir = Path(settings.UPLOAD_DIR)
    items: list[BulkUploadItem] = []

    for file in files:
        try:
            if not file.filename:
                raise ValueError("파일명 없음")
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise ValueError(f"지원하지 않는 형식: {ext}")

            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise ValueError("파일 크기 초과 (최대 20MB)")

            contract_id = str(uuid.uuid4())
            contract_dir = upload_dir / contract_id
            contract_dir.mkdir(parents=True, exist_ok=True)

            safe_filename = file.filename.replace("/", "_").replace("\\", "_")
            dest = contract_dir / safe_filename

            async with aiofiles.open(dest, "wb") as f:
                await f.write(content)

            # 메타 저장
            meta = {
                "contract_id": contract_id,
                "original_filename": safe_filename,
                "contract_type": contract_type or "other",
                "upload_time": datetime.now().isoformat(),
                "pages": [safe_filename],
                "user_id": current_user.id,
            }
            async with aiofiles.open(contract_dir / "meta.json", "w", encoding="utf-8") as f:
                await f.write(json.dumps(meta, ensure_ascii=False))

            items.append(BulkUploadItem(contract_id=contract_id, filename=safe_filename, status="uploaded"))

        except Exception as e:
            items.append(BulkUploadItem(
                contract_id="", filename=file.filename or "unknown",
                status="error", error=str(e),
            ))

    success = sum(1 for i in items if i.status == "uploaded")
    return BulkUploadResponse(items=items, total=len(items), success=success)

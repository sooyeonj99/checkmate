"""
Gemini AI 계약서 분석 서비스

처리 흐름:
  파일 → 텍스트 추출 → Presidio 개인정보 마스킹 → Gemini 분석 → 결과 반환
  ※ 원본 텍스트는 마스킹 직후 메모리에서 삭제(del)됩니다.
"""
import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path

import google.generativeai as genai
import PIL.Image

from app.core.config import settings
from app.schemas.contract import AnalysisResult, ClauseResult

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"

# ── Gemini 프롬프트 (텍스트용) ────────────────────────────────────────────────
_PROMPT = """당신은 한국 법률 계약서 분석 전문가입니다.
아래 계약서를 분석하고, 반드시 JSON만 반환하세요. 마크다운, 설명, 코드블록 없이 순수 JSON만 출력하세요.

※ 계약서 내 일부 개인정보는 보안을 위해 <이름>, <이메일> 등으로 마스킹 처리되었습니다.
   마스킹된 레이블은 실제 내용으로 취급하여 조항의 법적 의미를 분석해 주세요.

계약서 내용:
{text}

출력 형식:
{{
  "contract_type": "계약서 유형 (예: 근로계약서, 임대차계약서, 프리랜서 계약서, 기타 계약서)",
  "score": 위험도 점수 숫자 (0~100, 높을수록 위험),
  "grade": "위험 또는 주의 또는 안전",
  "clauses": [
    {{
      "article": "제N조",
      "title": "조항 제목",
      "risk": "danger 또는 warn 또는 safe",
      "description": "이 조항이 위험/주의/안전한 이유를 구체적으로",
      "original": "계약서 원문 발췌 (없으면 유사 표현)",
      "suggestion": "수정 제안 (safe이면 현행 조항이 적절합니다.)",
      "law_ref": "관련 법령 (없으면 null)"
    }}
  ]
}}

분석 기준:
- danger: 일방에게 현저히 불리하거나 위법 소지 있는 조항
- warn: 불명확하거나 주의가 필요한 조항
- safe: 균형 잡히고 적절한 조항
- score = min(100, danger 수 × 20 + warn 수 × 8)
- grade: score 60 이상→위험, 30 이상→주의, 30 미만→안전
- 주요 조항 4개 이상 반드시 분석
- 모든 응답은 한국어로 작성"""

# ── Gemini 프롬프트 (이미지용) ────────────────────────────────────────────────
_PROMPT_IMAGE = """당신은 한국 법률 계약서 분석 전문가입니다.
이미지로 제공된 계약서를 분석하고, 반드시 JSON만 반환하세요. 마크다운, 설명 없이 순수 JSON만 출력하세요.

출력 형식:
{
  "contract_type": "계약서 유형",
  "score": 위험도 점수 (0~100),
  "grade": "위험 또는 주의 또는 안전",
  "extracted_text": "이미지에서 추출한 계약서 전문 텍스트 (OCR). 최대한 원문 그대로 추출하세요.",
  "clauses": [
    {
      "article": "제N조",
      "title": "조항 제목",
      "risk": "danger 또는 warn 또는 safe",
      "description": "설명",
      "original": "원문 발췌",
      "suggestion": "수정 제안",
      "law_ref": "관련 법령 또는 null"
    }
  ]
}

분석 기준:
- danger: 일방에게 현저히 불리하거나 위법 소지
- warn: 불명확하거나 주의 필요
- safe: 균형 잡히고 적절
- 주요 조항 4개 이상 분석, 한국어로 작성
- extracted_text는 반드시 포함하세요"""


def _init_model() -> genai.GenerativeModel:
    """Gemini 모델 초기화"""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해 주세요.")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(GEMINI_MODEL)


def _extract_pdf_text(file_path: str) -> str:
    """PDF에서 텍스트 추출"""
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    text = "".join(page.extract_text() or "" for page in reader.pages)
    return text.strip()


def _extract_docx_text(file_path: str) -> str:
    """DOCX에서 텍스트 추출"""
    from docx import Document
    doc = Document(file_path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _parse_response(raw: str, contract_id: str, filename: str) -> tuple[AnalysisResult, str | None]:
    """Gemini 응답 텍스트 → (AnalysisResult, extracted_text) 변환"""
    # 마크다운 코드블록 제거
    text = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    data = json.loads(text)

    clauses = [
        ClauseResult(
            article=c.get("article", ""),
            title=c.get("title", ""),
            risk=c.get("risk", "safe"),
            description=c.get("description", ""),
            original=c.get("original", ""),
            suggestion=c.get("suggestion", ""),
            law_ref=c.get("law_ref"),
        )
        for c in data.get("clauses", [])
    ]

    danger_count = sum(1 for c in clauses if c.risk == "danger")
    warn_count   = sum(1 for c in clauses if c.risk == "warn")
    safe_count   = sum(1 for c in clauses if c.risk == "safe")
    score = int(data.get("score", min(100, danger_count * 20 + warn_count * 8)))
    grade = data.get("grade", "위험" if score >= 60 else "주의" if score >= 30 else "안전")

    result = AnalysisResult(
        contract_id=contract_id,
        filename=filename,
        contract_type=data.get("contract_type", "기타 계약서"),
        score=score,
        grade=grade,
        danger_count=danger_count,
        warn_count=warn_count,
        safe_count=safe_count,
        analysis_time="AI 분석 완료",
        clauses=clauses,
        analyzed_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    extracted_text = data.get("extracted_text") or None
    return result, extracted_text


async def analyze_with_gemini(
    contract_id: str,
    file_paths: str | list[str],
    filename: str,
) -> AnalysisResult:
    """
    Gemini API로 계약서 파일 분석 (단일 또는 다중 파일 지원)

    흐름:
      1. 각 파일에서 텍스트 또는 이미지 추출
      2. 텍스트는 Presidio 마스킹 후 합산
      3. Gemini로 전체 분석 (이미지+텍스트 혼합 가능)
    """
    from app.services.masking_service import mask_pii

    # 단일 파일도 리스트로 통일
    paths: list[str] = [file_paths] if isinstance(file_paths, str) else file_paths

    model = _init_model()
    start = time.time()

    combined_texts: list[str] = []
    images: list[PIL.Image.Image] = []
    total_masked_count = 0

    for fp in paths:
        ext = Path(fp).suffix.lower()

        if ext in {".jpg", ".jpeg", ".png"}:
            logger.info(f"🖼️  이미지 추가: {Path(fp).name}")
            images.append(PIL.Image.open(fp))

        elif ext == ".pdf":
            logger.info(f"📄 PDF 텍스트 추출: {Path(fp).name}")
            raw = _extract_pdf_text(fp)
            if not raw:
                raise ValueError(f"PDF({Path(fp).name})에서 텍스트를 추출할 수 없습니다. 스캔 PDF는 JPG/PNG로 변환해 주세요.")
            masking_result = mask_pii(raw)
            del raw
            combined_texts.append(masking_result.masked_text)
            total_masked_count += masking_result.masked_count
            logger.info(f"✅ PDF 마스킹 완료 ({masking_result.masked_count}건)")

        elif ext == ".docx":
            logger.info(f"📝 DOCX 텍스트 추출: {Path(fp).name}")
            raw = _extract_docx_text(fp)
            if not raw:
                raise ValueError(f"DOCX({Path(fp).name})에서 텍스트를 추출할 수 없습니다.")
            masking_result = mask_pii(raw)
            del raw
            combined_texts.append(masking_result.masked_text)
            total_masked_count += masking_result.masked_count
            logger.info(f"✅ DOCX 마스킹 완료 ({masking_result.masked_count}건)")

        else:
            raise ValueError(f"지원하지 않는 형식: {ext.upper()}")

    # ── Gemini 호출 ───────────────────────────────────────────────────────────
    merged_text = "\n\n--- 다음 페이지 ---\n\n".join(combined_texts) if combined_texts else ""

    if images and not merged_text:
        # 이미지만: Vision API로 OCR+분석
        logger.info(f"🖼️  이미지 {len(images)}장 Vision 분석 시작")
        prompt_parts: list = [_PROMPT_IMAGE] + images
        response = model.generate_content(prompt_parts)

        elapsed = round(time.time() - start, 1)
        result, extracted_text = _parse_response(response.text, contract_id, filename)

        if extracted_text:
            masking_result = mask_pii(extracted_text)
            result.contract_text = masking_result.masked_text
            result.masked_count = masking_result.masked_count + total_masked_count
            logger.info(f"✅ 이미지 OCR 마스킹 완료 ({masking_result.masked_count}건)")
        else:
            result.contract_text = None
            result.masked_count = total_masked_count

        result.analysis_time = f"{elapsed}초"
        return result

    elif images and merged_text:
        # 이미지 + 텍스트 혼합
        logger.info(f"📋 혼합 분석: 텍스트 {len(combined_texts)}개 + 이미지 {len(images)}장")
        mixed_prompt = _PROMPT.format(text=merged_text[:8000]) + "\n\n이미지로 제공된 페이지도 함께 분석하세요."
        prompt_parts = [mixed_prompt] + images
        response = model.generate_content(prompt_parts)

    else:
        # 텍스트만
        logger.info(f"📝 텍스트 분석 시작 ({len(merged_text)}자)")
        response = model.generate_content(_PROMPT.format(text=merged_text[:10000]))

    elapsed = round(time.time() - start, 1)
    result, _ = _parse_response(response.text, contract_id, filename)
    result.analysis_time = f"{elapsed}초"
    result.masked_count = total_masked_count
    result.contract_text = merged_text or None

    return result

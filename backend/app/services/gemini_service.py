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

GEMINI_MODEL = "gemini-2.0-flash"

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
- 주요 조항 4개 이상 분석, 한국어로 작성"""


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


def _parse_response(raw: str, contract_id: str, filename: str) -> AnalysisResult:
    """Gemini 응답 텍스트 → AnalysisResult 변환"""
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

    return AnalysisResult(
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


async def analyze_with_gemini(
    contract_id: str,
    file_path: str,
    filename: str,
) -> AnalysisResult:
    """
    Gemini API로 계약서 파일 분석

    흐름:
      1. 파일 형식에 따라 텍스트 또는 이미지로 추출
      2. 텍스트 파일의 경우 Presidio로 개인정보 마스킹
      3. 마스킹된 텍스트를 Gemini로 분석
      4. 원본 텍스트 즉시 삭제 (del)
    """
    from app.services.masking_service import mask_pii

    ext = Path(file_path).suffix.lower()
    model = _init_model()
    start = time.time()

    masked_text: str | None = None
    masked_count: int = 0

    # ── 이미지 파일: 직접 Gemini에 전달 (텍스트 추출 없음) ──────────────────
    if ext in {".jpg", ".jpeg", ".png"}:
        logger.info(f"🖼️  이미지 파일 분석 시작: {filename}")
        image = PIL.Image.open(file_path)
        response = model.generate_content([_PROMPT_IMAGE, image])

    # ── PDF 파일 ─────────────────────────────────────────────────────────────
    elif ext == ".pdf":
        logger.info(f"📄 PDF 텍스트 추출 중: {filename}")
        raw_text = _extract_pdf_text(file_path)

        if not raw_text:
            raise ValueError(
                "PDF에서 텍스트를 추출할 수 없습니다. "
                "스캔 이미지 PDF는 JPG/PNG로 변환 후 업로드해 주세요."
            )

        # 개인정보 마스킹
        logger.info("🔒 PDF 개인정보 마스킹 처리 중...")
        masking_result = mask_pii(raw_text)
        masked_text = masking_result.masked_text
        masked_count = masking_result.masked_count

        # 원본 텍스트 즉시 메모리에서 삭제
        del raw_text

        logger.info(f"✅ 마스킹 완료 ({masked_count}건) → Gemini 분석 전송")
        response = model.generate_content(_PROMPT.format(text=masked_text[:10000]))

    # ── DOCX 파일 ────────────────────────────────────────────────────────────
    elif ext == ".docx":
        logger.info(f"📝 DOCX 텍스트 추출 중: {filename}")
        raw_text = _extract_docx_text(file_path)

        if not raw_text:
            raise ValueError("DOCX에서 텍스트를 추출할 수 없습니다.")

        # 개인정보 마스킹
        logger.info("🔒 DOCX 개인정보 마스킹 처리 중...")
        masking_result = mask_pii(raw_text)
        masked_text = masking_result.masked_text
        masked_count = masking_result.masked_count

        del raw_text  # 원본 즉시 삭제

        logger.info(f"✅ 마스킹 완료 ({masked_count}건) → Gemini 분석 전송")
        response = model.generate_content(_PROMPT.format(text=masked_text[:10000]))

    else:
        raise ValueError(f"AI 분석을 지원하지 않는 형식입니다: {ext.upper()}")

    # ── 응답 파싱 ─────────────────────────────────────────────────────────────
    elapsed = round(time.time() - start, 1)
    result = _parse_response(response.text, contract_id, filename)
    result.analysis_time = f"{elapsed}초"
    result.masked_count = masked_count

    # 계약서 원문은 마스킹된 버전으로 저장 (원본은 이미 삭제됨)
    result.contract_text = masked_text

    return result

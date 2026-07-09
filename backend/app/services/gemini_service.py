"""
Gemini AI 계약서 분석 서비스

처리 흐름:
  파일 → 텍스트 추출 → Presidio 개인정보 마스킹 → Gemini 분석 → 결과 반환
  ※ 원본 텍스트는 마스킹 직후 메모리에서 삭제(del)됩니다.
"""
import json
import logging
import os
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

# ── 공통 출력 형식 ──────────────────────────────────────────────────────────
_OUTPUT_FORMAT = """
출력 형식 (반드시 순수 JSON만, 마크다운/코드블록 금지):
{{
  "contract_type": "계약서 유형",
  "summary": "법률 지식 없는 일반인도 이해할 수 있도록 3~4문장 쉬운 요약. 어떤 계약인지, 핵심 조건, 특히 주의할 점 포함.",
  "score": 위험도 점수 숫자 (0~100, 높을수록 위험),
  "grade": "위험 또는 주의 또는 안전",
  "clauses": [
    {{
      "article": "제N조 또는 조항번호",
      "title": "조항 제목",
      "risk": "danger 또는 warn 또는 safe",
      "description": "이 조항이 위험/주의/안전한 이유 구체적으로",
      "original": "계약서 원문 발췌",
      "simple_explanation": "'쉽게 말하면, ...' 형식으로 시작. 법 용어 없이 일상적 표현으로.",
      "suggestion": "수정 제안 (safe이면 '현행 조항이 적절합니다.')",
      "law_ref": "관련 법령 또는 null"
    }}
  ]
}}

공통 분석 기준:
- contract_type: 반드시 문서 실제 제목과 내용을 기반으로 판단 (사용자가 선택한 유형과 달라도 됨)
  예) 근로계약서, 임대차계약서, 용역계약서, 프리랜서계약서, 가맹계약서, 구독계약서 등
- danger: 일방에게 현저히 불리하거나 위법 소지 있는 조항
- warn: 불명확하거나 주의가 필요한 조항
- safe: 균형 잡히고 적절한 조항
- score = min(100, danger수×20 + warn수×8)
- grade: score 60↑→위험, 30↑→주의, 30↓→안전
- 주요 조항 4개 이상 반드시 분석
- 모든 응답은 한국어로 작성
※ 계약서 내 <이름>, <이메일> 등은 개인정보 마스킹 처리. 실제 내용으로 취급하여 분석."""

# ── 기본 프롬프트 (계약서 유형 미지정) ──────────────────────────────────────
_PROMPT = """당신은 한국 법률 계약서 분석 전문가입니다.
아래 계약서를 분석하고, 반드시 JSON만 반환하세요. 마크다운, 설명, 코드블록 없이 순수 JSON만 출력하세요.

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# ── 유형별 전문 프롬프트 ─────────────────────────────────────────────────────

# 1. 프리랜서 — 용역·외주 계약
_PROMPT_FREELANCER = """당신은 프리랜서·용역 계약 전문 법률 분석가입니다.
아래 계약서를 분석하세요. 반드시 JSON만 반환하세요.
※ contract_type은 문서 실제 내용을 기반으로 판단하세요 (근로계약서라면 "근로계약서"로 표기).

[프리랜서·용역 관점 핵심 체크포인트]
1. 대금 지급 — 지급 시기 불명확, 조건부 지급(검수 통과 시), 지연이자 없음
2. 지식재산권(IP) 귀속 — 작업물 저작권이 발주사에 자동 귀속되는지
3. 일방적 계약 해지 — 발주사만 해지 가능, 기완료 작업 미지급
4. 납품 기준 불명확 — '만족할 때까지' 수정 요구 가능한 조항
5. 추가 업무 강요 — 범위 외 작업을 무상으로 요구할 수 있는 조항
6. 과도한 손해배상 — 지체상금·위약금이 과도하게 설정된 조항
7. 경업금지 — 퇴사 후 동종 업무 금지 기간·범위가 지나치게 넓은 조항
8. 비밀유지 — 과도한 범위의 비밀유지 의무

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# 2. 직장인 — 근로계약서
_PROMPT_EMPLOYEE = """당신은 한국 노동법 전문 계약서 분석가입니다.
아래 계약서를 분석하세요. 반드시 JSON만 반환하세요.
※ contract_type은 문서 실제 내용을 기반으로 판단하세요 (용역계약서라면 "용역계약서"로 표기).

[근로계약 관점 핵심 체크포인트]
1. 포괄임금제 — 연장·야간·휴일근로수당이 기본급에 포함된 불법적 포괄임금 조항
2. 최저임금 — 월급/시급 환산 시 2024년 최저임금(9,860원/시간) 이상인지
3. 수습기간 임금 삭감 — 수습 기간 중 10% 이상 감액 여부
4. 경업금지 조항 — 퇴직 후 동종 업계 취업 제한 기간·범위 (2년·동일지역 초과 시 위험)
5. 일방적 해고 사유 — 사용자에게 과도하게 넓은 해고 재량 부여
6. 퇴직금 — 지급 시기, 분할 지급 강요 조항
7. 근로시간 — 주 52시간 초과 가능성, 탄력근무제 적용 여부
8. 비밀유지·연대보증 — 과도한 의무나 연대보증 요구

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# 3. 소상공인 — 가맹·입점·공급 계약
_PROMPT_SMALL_BIZ = """당신은 가맹·유통·공급 계약 전문 법률 분석가입니다.
아래 계약서를 분석하세요. 반드시 JSON만 반환하세요.
※ contract_type은 문서 실제 내용을 기반으로 판단하세요.

[소상공인 관점 핵심 체크포인트]
1. 일방적 조항 변경권 — 본사·플랫폼이 계약 조건을 일방적으로 변경할 수 있는 조항
2. 과도한 위약금 — 계약 해지 시 과도한 위약금, 위약벌 조항
3. 독점 공급 의무 — 특정 업체에서만 물품 구매 강제, 가격 경쟁 차단
4. 수수료·로열티 — 매출 대비 과도한 수수료, 숨은 비용
5. 반품·환불 불리 조항 — 상품 반품 불가, 불량품 책임 전가
6. 지식재산권 침해 — 업체 브랜드·디자인 사용 제한, 이후 귀속 문제
7. 계약 해지 불균형 — 본사는 쉽게 해지, 가맹점은 해지 어려운 구조
8. 하도급법·공정거래법 위반 소지 — 대금 감액, 부당 반품, 경영 간섭

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# 4. 구독 이용자 — 구독·렌탈 서비스 계약
_PROMPT_SUBSCRIPTION = """당신은 소비자 계약 전문 법률 분석가입니다.
아래 계약서를 분석하세요. 반드시 JSON만 반환하세요.
※ contract_type은 문서 실제 내용을 기반으로 판단하세요.

[구독·렌탈 관점 핵심 체크포인트]
1. 자동 갱신 — 해지 통보 없으면 자동 연장, 통보 기간 불명확
2. 중도 해지 위약금 — 남은 기간 전액·과도한 위약금, 위약금 상한 없음
3. 요금 인상 — 사업자 임의 요금 인상 가능 조항, 사전 고지 의무 없음
4. 해지 절차 복잡 — 전화·방문 해지만 가능, 온라인 해지 불가
5. 숨은 추가 비용 — 설치비, 회수비, 파손 책임, 부품 교체 비용 소비자 부담
6. 서비스 변경·중단 — 사업자 임의로 서비스 내용 변경·중단 가능
7. 개인정보 과도한 수집·활용 — 제3자 제공, 마케팅 활용 동의 강제
8. 제품 하자 책임 — 렌탈 제품 하자 발생 시 소비자 책임 전가

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# 5. 사회초년생 — 처음 계약서를 접하는 일반인
_PROMPT_NEWCOMER = """당신은 법률 지식이 없는 사회초년생을 위한 계약서 해설 전문가입니다.
아래 계약서를 분석하되, 모든 설명을 법률 용어 없이 쉽고 친절하게 작성해주세요.
반드시 JSON만 반환하세요.
※ contract_type은 문서 실제 내용을 기반으로 판단하세요.

[사회초년생 분석 원칙]
- 모든 조항을 마치 친한 선배가 설명하듯 쉽게 풀이
- 법률 용어가 나오면 반드시 괄호 안에 쉬운 말로 설명 추가
- 위험한 조항은 구체적으로 "이렇게 수정해달라고 요청하세요" 문구 포함
- 계약 전 반드시 확인해야 할 핵심 3가지를 summary에 포함
- 일반적으로 정상적인 계약서에 있어야 할 조항이 빠져 있으면 경고
- 서명 전 주의사항을 simple_explanation에 반드시 포함

[전체 계약서 유형별 주요 확인 사항]
- 근로계약: 임금, 근무시간, 수습기간, 해고 조건
- 임대차: 보증금 반환, 계약갱신, 수리 책임
- 서비스·구독: 위약금, 자동갱신, 해지 방법
- 용역·프리랜서: 대금 지급일, 저작권, 계약 해지
- 기타: 핵심 의무, 위약금, 분쟁 해결 방법

계약서 내용:
{text}
""" + _OUTPUT_FORMAT

# ── user_type → 프롬프트 매핑 ─────────────────────────────────────────────
_PROMPT_MAP: dict[str, str] = {
    "freelancer": _PROMPT_FREELANCER,
    "employee":   _PROMPT_EMPLOYEE,
    "small_biz":  _PROMPT_SMALL_BIZ,
    "subscription": _PROMPT_SUBSCRIPTION,
    "newcomer":   _PROMPT_NEWCOMER,
}

def _select_prompt(user_type: str | None) -> str:
    """user_type에 맞는 프롬프트 반환. 없으면 기본 프롬프트."""
    return _PROMPT_MAP.get(user_type or "", _PROMPT)

# ── Gemini 프롬프트 (이미지 OCR 전용) ───────────────────────────────────────
_PROMPT_OCR = """이 계약서 이미지에서 모든 텍스트를 빠짐없이 추출하고, JSON으로만 응답하세요.

[추출 규칙]
- 제목, 조항 번호, 조항 내용 전체
- 노란색·주황색 형광펜으로 강조된 텍스트 (반드시 포함)
- 빨간색·파란색 등 색깔 텍스트 (반드시 포함)
- 빈칸(_____)에 채워진 수기·타이핑 내용 → 읽기 어려우면 [빈칸N] 으로 표시 (N은 1부터 순서대로)
- 표(테이블) 안의 모든 데이터, 숫자, 금액
- 서명란, 날짜, 도장 주변 텍스트
- ** 또는 ■ 기호로 가려진 부분 → [마스킹] 으로 표시

[출력 형식 — 반드시 순수 JSON만, 마크다운·코드블록 금지]
{
  "text": "추출한 전체 텍스트. 읽기 어려운 빈칸은 [빈칸1], [빈칸2] 순서로 표시",
  "missing_fields": [
    {"id": 1, "label": "해당 빈칸이 어떤 항목인지 (예: 근로계약 시작일)", "hint": "입력 예시 (예: 2024년 7월 1일)"},
    {"id": 2, "label": "...", "hint": "..."}
  ]
}

빈칸이 없으면 missing_fields는 빈 배열 [] 로 반환."""

# ── Gemini 프롬프트 (이미지 분석용 — OCR 캐시 없을 때 폴백) ───────────────
_PROMPT_IMAGE = """당신은 한국 법률 계약서 분석 전문가입니다.
이미지로 제공된 계약서를 분석하고, 반드시 JSON만 반환하세요. 마크다운, 설명 없이 순수 JSON만 출력하세요.

출력 형식:
{
  "contract_type": "계약서 유형",
  "summary": "이 계약서 전체를 일반인도 이해할 수 있도록 3~4문장으로 쉽게 요약",
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
      "simple_explanation": "이 조항이 실제로 무엇을 의미하는지 쉽게 설명. '쉽게 말하면, ...' 형식으로 시작",
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
    return genai.GenerativeModel(
        GEMINI_MODEL,
        generation_config={"temperature": 0},
    )


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
            simple_explanation=c.get("simple_explanation") or None,
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
        summary=data.get("summary") or None,
    )
    extracted_text = data.get("extracted_text") or None
    return result, extracted_text


def extract_text_from_image_with_gemini(file_path: str) -> tuple[str, list]:
    """이미지에서 텍스트 추출 (OCR 전용).
    Returns: (extracted_text, missing_fields)
    missing_fields: [{"id": N, "label": "설명", "hint": "예시"}, ...]
    """
    model = _init_model()
    img = PIL.Image.open(file_path)
    response = model.generate_content([_PROMPT_OCR, img])
    raw = re.sub(r"```(?:json)?\s*|\s*```", "", response.text).strip()
    try:
        data = json.loads(raw)
        return data.get("text", raw), data.get("missing_fields", [])
    except Exception:
        # JSON 파싱 실패 → 텍스트 그대로 반환 (빈칸 없음)
        return raw, []


def extract_texts_from_files(file_paths: list[str]) -> tuple[list[str], list]:
    """
    파일 목록에서 텍스트와 이미지를 추출 (마스킹 없이 원본 반환).
    returns: (texts, images)
    """
    import PIL.Image as _PIL
    texts: list[str] = []
    images = []
    for fp in file_paths:
        ext = Path(fp).suffix.lower()
        if ext in {".jpg", ".jpeg", ".png"}:
            images.append(_PIL.open(fp))
        elif ext == ".pdf":
            raw = _extract_pdf_text(fp)
            if raw:
                texts.append(raw)
        elif ext == ".docx":
            raw = _extract_docx_text(fp)
            if raw:
                texts.append(raw)
    return texts, images


async def analyze_with_gemini(
    contract_id: str,
    file_paths: str | list[str],
    filename: str,
    selected_ids: list[int] | None = None,
    user_type: str | None = None,
    custom_masks: list[dict] | None = None,
) -> AnalysisResult:
    """
    Gemini API로 계약서 파일 분석 (단일 또는 다중 파일 지원)

    흐름:
      1. 각 파일에서 텍스트 또는 이미지 추출
      2. 텍스트는 Presidio 마스킹 후 합산
      3. Gemini로 전체 분석 (이미지+텍스트 혼합 가능)
    """
    from app.services.masking_service import mask_pii, detect_pii, mask_pii_selective, apply_custom_masks
    from app.core.config import settings as _settings

    # 단일 파일도 리스트로 통일
    paths: list[str] = [file_paths] if isinstance(file_paths, str) else file_paths

    model = _init_model()
    start = time.time()

    # preview 단계에서 이미지 OCR이 완료된 경우 캐시 로드
    ocr_cache: dict[str, str] = {}
    cache_path = os.path.join(_settings.UPLOAD_DIR, contract_id, "ocr_cache.json")
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as _f:
            ocr_cache = json.load(_f)
        logger.info(f"OCR 캐시 로드: {len(ocr_cache)}개 이미지")

    combined_texts: list[str] = []
    images: list[PIL.Image.Image] = []
    total_masked_count = 0

    for fp in paths:
        ext = Path(fp).suffix.lower()

        if ext in {".jpg", ".jpeg", ".png"}:
            cached_text = ocr_cache.get(Path(fp).name)
            if cached_text:
                # OCR 캐시 사용 → 텍스트처럼 마스킹 처리
                logger.info(f"OCR 캐시 사용: {Path(fp).name}")
                if selected_ids is not None:
                    _entities = detect_pii(cached_text)
                    masking_result = mask_pii_selective(cached_text, _entities, selected_ids)
                else:
                    masking_result = mask_pii(cached_text)
                masked = apply_custom_masks(masking_result.masked_text, custom_masks or [])
                combined_texts.append(masked)
                total_masked_count += masking_result.masked_count + (len(custom_masks) if custom_masks else 0)
                logger.info(f"이미지 OCR 마스킹 완료 ({masking_result.masked_count}건)")
            else:
                # 캐시 없음 → Gemini Vision 폴백
                logger.info(f"이미지 Vision 분석: {Path(fp).name}")
                images.append(PIL.Image.open(fp))

        elif ext == ".pdf":
            logger.info(f"PDF 텍스트 추출: {Path(fp).name}")
            raw = _extract_pdf_text(fp)
            if not raw:
                raise ValueError(f"PDF({Path(fp).name})에서 텍스트를 추출할 수 없습니다. 스캔 PDF는 JPG/PNG로 변환해 주세요.")
            if selected_ids is not None:
                entities = detect_pii(raw)
                masking_result = mask_pii_selective(raw, entities, selected_ids)
            else:
                masking_result = mask_pii(raw)
            del raw
            masked = apply_custom_masks(masking_result.masked_text, custom_masks or [])
            combined_texts.append(masked)
            total_masked_count += masking_result.masked_count
            logger.info(f"마스킹 완료 ({masking_result.masked_count}건)")

        elif ext == ".docx":
            logger.info(f"DOCX 텍스트 추출: {Path(fp).name}")
            raw = _extract_docx_text(fp)
            if not raw:
                raise ValueError(f"DOCX({Path(fp).name})에서 텍스트를 추출할 수 없습니다.")
            if selected_ids is not None:
                entities = detect_pii(raw)
                masking_result = mask_pii_selective(raw, entities, selected_ids)
            else:
                masking_result = mask_pii(raw)
            del raw
            masked = apply_custom_masks(masking_result.masked_text, custom_masks or [])
            combined_texts.append(masked)
            total_masked_count += masking_result.masked_count
            logger.info(f"마스킹 완료 ({masking_result.masked_count}건)")

        else:
            raise ValueError(f"지원하지 않는 형식: {ext.upper()}")

    # ── Gemini 호출 ───────────────────────────────────────────────────────────
    merged_text = "\n\n--- 다음 페이지 ---\n\n".join(combined_texts) if combined_texts else ""
    selected_prompt = _select_prompt(user_type)
    logger.info(f"프롬프트 유형: {user_type or 'default'}")

    if images and not merged_text:
        # 이미지만: Vision API로 OCR+분석
        logger.info(f"이미지 {len(images)}장 Vision 분석 시작")
        prompt_parts: list = [_PROMPT_IMAGE] + images
        response = model.generate_content(prompt_parts)

        elapsed = round(time.time() - start, 1)
        result, extracted_text = _parse_response(response.text, contract_id, filename)

        if extracted_text:
            masking_result = mask_pii(extracted_text)
            result.contract_text = masking_result.masked_text
            result.masked_count = masking_result.masked_count + total_masked_count
            logger.info(f"이미지 OCR 마스킹 완료 ({masking_result.masked_count}건)")
        else:
            result.contract_text = None
            result.masked_count = total_masked_count

        result.analysis_time = f"{elapsed}초"
        return result

    elif images and merged_text:
        # 이미지 + 텍스트 혼합
        logger.info(f"혼합 분석: 텍스트 {len(combined_texts)}개 + 이미지 {len(images)}장")
        mixed_prompt = selected_prompt.format(text=merged_text[:8000]) + "\n\n이미지로 제공된 페이지도 함께 분석하세요."
        prompt_parts = [mixed_prompt] + images
        response = model.generate_content(prompt_parts)

    else:
        # 텍스트만
        logger.info(f"텍스트 분석 시작 ({len(merged_text)}자) / 유형: {user_type or 'default'}")
        response = model.generate_content(selected_prompt.format(text=merged_text[:10000]))

    elapsed = round(time.time() - start, 1)
    result, _ = _parse_response(response.text, contract_id, filename)
    result.analysis_time = f"{elapsed}초"
    result.masked_count = total_masked_count
    result.contract_text = merged_text or None

    return result


# ── 계약서 비교 AI 판단 ──────────────────────────────────────────────────────

async def compare_summaries(
    filename_a: str, summary_a: str, score_a: int, grade_a: str,
    filename_b: str, summary_b: str, score_b: int, grade_b: str,
) -> str:
    """두 계약서 요약을 기반으로 AI 종합 비교 판단"""
    model = _init_model()
    prompt = f"""당신은 한국 법률 계약서 비교 전문가입니다.
두 계약서를 비교하고 어느 쪽이 더 유리한지, 주요 차이점이 무엇인지 3~4문장으로 간결하게 설명하세요.
반드시 한국어로, 순수 텍스트만 반환하세요 (JSON/마크다운 금지).

[계약서 A] {filename_a} — 위험도 {score_a}점 ({grade_a})
{summary_a}

[계약서 B] {filename_b} — 위험도 {score_b}점 ({grade_b})
{summary_b}

두 계약서의 핵심 차이점과 어느 쪽이 계약자에게 더 유리한지 판단해주세요."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"비교 AI 오류: {e}")
        return f"AI 비교 분석 중 오류가 발생했습니다. 점수 기준으로는 {'A' if score_a < score_b else 'B'}가 더 유리합니다."


# ── AI 계약서 생성 ─────────────────────────────────────────────────────────

async def generate_contract(description: str, contract_type: str | None = None) -> dict:
    """설명을 기반으로 계약서 초안 생성"""
    model = _init_model()
    type_hint = f"\n계약서 유형: {contract_type}" if contract_type else ""
    prompt = f"""당신은 한국 법률 계약서 작성 전문가입니다.
아래 설명을 바탕으로 한국 법률에 맞는 계약서 초안을 작성하세요.{type_hint}

[계약 설명]
{description}

[출력 형식 — 반드시 순수 JSON만, 마크다운/코드블록 금지]
{{
  "contract_type": "계약서 유형 (예: 근로계약서, 용역계약서, 임대차계약서 등)",
  "suggested_title": "계약서 제목 (예: 소프트웨어 개발 용역계약서)",
  "contract_text": "계약서 전문 텍스트 (제1조, 제2조... 형식으로 조항 구성. 빈칸은 [  ]로 표시)"
}}

작성 원칙:
- 한국 법률(민법, 근로기준법, 상법 등)에 부합하는 조항 포함
- 양 당사자가 균형있게 보호받는 공정한 조항 작성
- 최소 6개 이상의 조항 포함 (당사자, 목적, 기간, 대금/임금, 의무, 해지, 분쟁해결)
- 빈칸([  ])은 실제 계약 시 채워야 할 부분"""

    response = model.generate_content(prompt)
    raw = re.sub(r"```(?:json)?\s*|\s*```", "", response.text).strip()
    data = json.loads(raw)
    return {
        "contract_text": data.get("contract_text", ""),
        "contract_type": data.get("contract_type", "기타 계약서"),
        "suggested_title": data.get("suggested_title", "계약서"),
    }

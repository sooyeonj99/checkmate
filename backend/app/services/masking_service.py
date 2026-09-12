"""
계약서 개인정보 마스킹 서비스
Microsoft Presidio + 한국어 커스텀 정규식 패턴 사용

처리 순서:
  1. 한국어 정규식 1단계 → 전화번호/이메일/IP 등 언어 무관 패턴
  2. Presidio NLP 엔진  → 이름/기관명/장소 AI 감지
  3. 한국어 정규식 2단계 → 주민번호/계좌번호/사업자번호 등
  ※ 원본 텍스트는 호출 측에서 즉시 del 처리합니다.
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── 마스킹 레이블 ─────────────────────────────────────────────────────────────
LABEL = {
    "KR_PHONE":         "<전화번호>",
    "EMAIL":            "<이메일>",
    "IP_ADDRESS":       "<IP주소>",
    "CREDIT_CARD":      "<카드번호>",
    "KR_RESIDENT_ID":   "<주민번호>",
    "KR_ALIEN_ID":      "<외국인등록번호>",
    "KR_BUSINESS_REG":  "<사업자번호>",
    "KR_CORP_REG":      "<법인번호>",
    "KR_BANK_ACCOUNT":  "<계좌번호>",
    "KR_DRIVER_LIC":    "<면허번호>",
    "KR_PASSPORT":      "<여권번호>",
    "KR_VEHICLE":       "<차량번호>",
    "KR_ADDRESS":       "<주소>",
    # Presidio NLP 감지
    "PERSON":           "<이름>",
    "ORGANIZATION":     "<기관명>",
    "LOCATION":         "<장소>",
}

# ── 정규식 패턴 (순서 중요: 구체적→일반적) ──────────────────────────────────
# (entity_type, 정규식, 설명)
_PATTERNS: list[tuple[str, str, str]] = [
    # ── 전화번호 (계좌번호보다 먼저 처리) ────────────────────────────────────
    # 한국 휴대폰: 010-0000-0000 / 011 / 016 / 017 / 018 / 019
    ("KR_PHONE",
     r"\b01[016789][-–\s]\d{3,4}[-–\s]\d{4}\b",
     "휴대폰번호"),
    # 한국 일반전화: 02-0000-0000 / 0XX-XXX-XXXX
    ("KR_PHONE",
     r"\b0\d{1,2}[-–]\d{3,4}[-–]\d{4}\b",
     "일반전화"),

    # ── 이메일 ────────────────────────────────────────────────────────────────
    ("EMAIL",
     r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
     "이메일주소"),

    # ── IP 주소 ───────────────────────────────────────────────────────────────
    ("IP_ADDRESS",
     r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
     "IP주소"),

    # ── 신용카드번호: 0000-0000-0000-0000 ────────────────────────────────────
    ("CREDIT_CARD",
     r"\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b",
     "신용카드"),

    # ── 주민등록번호: 000000-1234567 (뒷자리 1~4) ────────────────────────────
    ("KR_RESIDENT_ID",
     r"\b\d{6}[-–]\s*[1-4]\d{6}\b",
     "주민등록번호"),

    # ── 외국인등록번호: 000000-5678901 (뒷자리 5~8) ──────────────────────────
    ("KR_ALIEN_ID",
     r"\b\d{6}[-–]\s*[5-8]\d{6}\b",
     "외국인등록번호"),

    # ── 법인등록번호: 000000-0xxxxxx (뒷자리 첫 자리 0) ─────────────────────
    ("KR_CORP_REG",
     r"\b\d{6}[-–]\s*0\d{6}\b",
     "법인등록번호"),

    # ── 사업자등록번호: 000-00-00000 ─────────────────────────────────────────
    ("KR_BUSINESS_REG",
     r"\b\d{3}[-–]\d{2}[-–]\d{5}\b",
     "사업자등록번호"),

    # ── 운전면허번호: 00-00-000000-00 ────────────────────────────────────────
    ("KR_DRIVER_LIC",
     r"\b\d{2}[-–]\d{2}[-–]\d{6}[-–]\d{2}\b",
     "운전면허"),

    # ── 여권번호: M12345678 (영문1~2 + 숫자7~8) ──────────────────────────────
    ("KR_PASSPORT",
     r"\b[A-Z]{1,2}\d{7,8}\b",
     "여권번호"),

    # ── 계좌번호: 전화번호 마스킹 후 남은 숫자 패턴 ──────────────────────────
    # 최소 3개 구간, 총 자릿수 >= 12 이상인 패턴만 (전화번호와 구분)
    ("KR_BANK_ACCOUNT",
     r"\b\d{3,4}[-–]\d{3,6}[-–]\d{4,8}(?:[-–]\d{2,3})?\b",
     "계좌번호"),

    # ── 차량번호: 12가1234 / 123가1234 / 서울12가1234 ────────────────────────
    ("KR_VEHICLE",
     r"\b(?:[가-힣]{2})?\d{2,3}[가-힣]{1}\d{4}\b",
     "차량번호"),

    # ── 한국 주소: 광역시/도 + 세부주소 ─────────────────────────────────────
    ("KR_ADDRESS",
     r"(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)"
     r"(?:특별시|광역시|특별자치시|특별자치도|도)?"
     r"[\s\S]{1,60}"
     r"(?:\d+\s*(?:가|동|로|길|번길|호|층)|아파트|빌딩|오피스텔|타워)",
     "한국주소"),
]


# ── NER 오탐 필터링 ──────────────────────────────────────────────────────────
# spaCy 한국어 소형 모델(ko_core_news_sm)이 자주 오탐하는 토큰들
# (예: "제1조"의 "조"만 분리 인식, 서명 플랫폼이 남기는 "Envelope" 등)
_NER_STOPWORDS = {
    "조", "항", "호", "목", "년", "월", "일", "원", "등", "장", "절", "관", "款",
    "envelope", "docusign",
}
_PURE_HANGUL_RE = re.compile(r"^[가-힣]+$")


def _is_valid_ner_span(span: str, entity_type: str) -> bool:
    """
    spaCy NER 결과가 실제 개인정보일 가능성이 낮으면 False.
    - 한 글자짜리("조", "항" 등)는 이름/기관명이 될 수 없음
    - 알려진 오탐 단어(Envelope, Docusign 등) 제외
    - 순수 한글 PERSON은 보통 2~4음절(실제 이름 길이) — 서명 플랫폼이 붙이는
      "__signhereN" 같은 접미사가 있으면 길이 제한 없이 허용
    """
    s = span.strip()
    if len(s) < 2:
        return False
    if s.lower() in _NER_STOPWORDS:
        return False
    if entity_type == "PERSON" and _PURE_HANGUL_RE.match(s) and not (2 <= len(s) <= 4):
        return False
    return True


def _propagate_exact_name_matches(text: str, entities: list["PiiEntity"]) -> list["PiiEntity"]:
    """
    감지된 이름(PERSON)과 문자열이 정확히 같은 부분이 문서 다른 위치에도 있으면
    같이 마스킹 대상에 포함시킨다.
    NER은 문장 문맥별로 판단하기 때문에 동일 인물의 이름이라도 일부 등장 위치에서는
    인식하지 못하는 경우가 있어(예: 서명란에 반복되는 "홍길동__signhere1"), 이미 한 번
    이름으로 확인된 문자열은 나머지 등장 위치도 동일하게 처리한다.
    """
    working = list(entities)

    def overlaps_any(s: int, e: int) -> bool:
        return any(x.start < e and s < x.end for x in working)

    seen: set[str] = set()
    additions: list[PiiEntity] = []
    for e in entities:
        if e.type != "PERSON" or e.original in seen:
            continue
        seen.add(e.original)
        for m in re.finditer(re.escape(e.original), text):
            if overlaps_any(m.start(), m.end()):
                continue
            new_e = PiiEntity(
                id=0, type="PERSON", label=LABEL["PERSON"],
                start=m.start(), end=m.end(), original=m.group(),
            )
            working.append(new_e)
            additions.append(new_e)
    return additions


@dataclass
class PiiEntity:
    """감지된 개인정보 엔티티 (위치 포함)"""
    id: int
    type: str
    label: str
    start: int
    end: int
    original: str


@dataclass
class MaskingResult:
    """마스킹 처리 결과"""
    masked_text: str
    masked_count: int
    masked_items: dict[str, int] = field(default_factory=dict)


# ── Presidio 초기화 (지연 로딩) ──────────────────────────────────────────────

_presidio_ready = False
_analyzer = None
_anonymizer = None


def _init_presidio() -> None:
    """Presidio NLP 엔진 초기화 (최초 1회)"""
    global _presidio_ready, _analyzer, _anonymizer
    if _presidio_ready:
        return

    try:
        from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
        from presidio_analyzer.nlp_engine import NlpEngineProvider
        from presidio_anonymizer import AnonymizerEngine

        # 한국어 spaCy 모델 사용 가능 여부 확인
        ko_available = False
        try:
            import spacy
            spacy.load("ko_core_news_sm")
            ko_available = True
        except (OSError, ImportError):
            pass

        # NLP 엔진: 영어(필수) + 한국어(선택)
        models = [{"lang_code": "en", "model_name": "en_core_web_sm"}]
        supported_langs = ["en"]
        if ko_available:
            models.insert(0, {"lang_code": "ko", "model_name": "ko_core_news_sm"})
            supported_langs.insert(0, "ko")
            logger.info("✅ 한국어 spaCy 모델 로드 (ko_core_news_sm)")
        else:
            logger.warning("⚠️  ko_core_news_sm 미설치 → 영어 NLP로 대체")

        provider = NlpEngineProvider(
            nlp_configuration={"nlp_engine_name": "spacy", "models": models}
        )
        nlp_engine = provider.create_engine()

        # Presidio 기본 recognizer 로드 (이메일·전화·IP·신용카드·이름·기관 등)
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers(nlp_engine=nlp_engine)

        _analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            registry=registry,
            supported_languages=supported_langs,
        )
        _anonymizer = AnonymizerEngine()
        _presidio_ready = True
        logger.info("✅ Presidio 엔진 초기화 완료 (언어: %s)", supported_langs)

    except ImportError:
        logger.error("❌ Presidio 미설치: pip install presidio-analyzer presidio-anonymizer")
    except Exception as e:
        logger.error("❌ Presidio 초기화 실패: %s", e)


def _spacy_ner_mask(text: str) -> tuple[str, dict[str, int]]:
    """
    spaCy NER로 이름·기관명·장소 마스킹.

    한국어(ko_core_news_sm) 레이블:
      PS → PERSON(<이름>),  OG → ORGANIZATION(<기관명>),  LC → LOCATION(<장소>)
    영어(en_core_web_sm) 레이블:
      PERSON → <이름>,  ORG → <기관명>,  GPE/LOC → <장소>

    Presidio를 우회하고 spaCy를 직접 호출합니다.
    (Presidio는 한국어 엔티티 레이블을 기본 지원하지 않음)
    """
    try:
        import spacy

        # 한국어 모델 우선, 없으면 영어 모델로 대체
        ko_label_map = {"PS": "PERSON", "OG": "ORGANIZATION", "LC": "LOCATION"}
        en_label_map = {"PERSON": "PERSON", "ORG": "ORGANIZATION",
                        "GPE": "LOCATION", "LOC": "LOCATION"}

        try:
            nlp = spacy.load("ko_core_news_sm")
            label_map = ko_label_map
        except OSError:
            try:
                nlp = spacy.load("en_core_web_sm")
                label_map = en_label_map
            except OSError:
                logger.warning("⚠️  spaCy 모델 없음 - NER 마스킹 건너뜀")
                return text, {}

        doc = nlp(text)

        # 이미 마스킹된 <레이블> 범위 수집 (NER가 내부를 건드리지 않도록 보호)
        masked_spans = [(m.start(), m.end()) for m in re.finditer(r"<[^>]+>", text)]

        def _in_masked(start: int, end: int) -> bool:
            """엔티티가 기존 마스킹 레이블 안에 있으면 True"""
            return any(ms <= start and end <= me for ms, me in masked_spans)

        # 엔티티를 역순 정렬 (뒤에서 치환해야 offset 유지)
        entities = [
            (ent.start_char, ent.end_char, label_map[ent.label_])
            for ent in doc.ents
            if ent.label_ in label_map
            and not _in_masked(ent.start_char, ent.end_char)
            and _is_valid_ner_span(ent.text, label_map[ent.label_])
        ]
        entities.sort(key=lambda x: x[0], reverse=True)

        result = text
        counts: dict[str, int] = {}
        for start, end, entity_type in entities:
            replacement = LABEL.get(entity_type, f"<{entity_type}>")
            result = result[:start] + replacement + result[end:]
            counts[entity_type] = counts.get(entity_type, 0) + 1

        return result, counts

    except Exception as e:
        logger.warning("⚠️  spaCy NER 마스킹 오류: %s", e)
        return text, {}


def _regex_mask(text: str, patterns: list[tuple[str, str, str]]) -> tuple[str, dict[str, int]]:
    """
    정규식 기반 마스킹.
    이미 마스킹된 <레이블> 안의 내용은 건드리지 않는다.
    """
    result = text
    counts: dict[str, int] = {}

    for entity_type, pattern_str, _ in patterns:
        label = LABEL.get(entity_type, f"<{entity_type}>")

        try:
            def _replacer(m: re.Match, lbl: str = label, et: str = entity_type) -> str:
                # 이미 마스킹된 레이블이면 그대로 반환
                s = m.group()
                if s.startswith("<") and s.endswith(">"):
                    return s
                counts[et] = counts.get(et, 0) + 1
                return lbl

            result = re.sub(pattern_str, _replacer, result, flags=re.IGNORECASE)
        except re.error as exc:
            logger.warning("⚠️  정규식 오류 (%s): %s", entity_type, exc)

    return result, counts


# ── 공개 API ─────────────────────────────────────────────────────────────────

def detect_pii(text: str) -> list[PiiEntity]:
    """
    PII 탐지만 수행 - 마스킹 없이 감지된 엔티티(위치+원문) 목록 반환.
    사용자가 직접 선택 후 mask_pii_selective()로 마스킹할 때 사용.
    """
    if not text or not text.strip():
        return []

    _init_presidio()
    entities: list[PiiEntity] = []

    def overlaps(s: int, e: int) -> bool:
        return any(x.start < e and s < x.end for x in entities)

    # 1단계: 정규식 패턴 (원본 텍스트에서 위치 수집)
    for entity_type, pattern_str, _ in _PATTERNS:
        try:
            for m in re.finditer(pattern_str, text, re.IGNORECASE):
                if not overlaps(m.start(), m.end()):
                    entities.append(PiiEntity(
                        id=0,
                        type=entity_type,
                        label=LABEL.get(entity_type, f"<{entity_type}>"),
                        start=m.start(),
                        end=m.end(),
                        original=m.group(),
                    ))
        except re.error:
            pass

    # 2단계: spaCy NER (이름·기관명·장소)
    try:
        import spacy
        ko_label_map = {"PS": "PERSON", "OG": "ORGANIZATION", "LC": "LOCATION"}
        en_label_map = {"PERSON": "PERSON", "ORG": "ORGANIZATION", "GPE": "LOCATION", "LOC": "LOCATION"}
        try:
            nlp = spacy.load("ko_core_news_sm")
            label_map = ko_label_map
        except OSError:
            nlp = spacy.load("en_core_web_sm")
            label_map = en_label_map

        doc = nlp(text)
        for ent in doc.ents:
            mapped = label_map.get(ent.label_)
            if (mapped and not overlaps(ent.start_char, ent.end_char)
                    and _is_valid_ner_span(ent.text, mapped)):
                entities.append(PiiEntity(
                    id=0,
                    type=mapped,
                    label=LABEL.get(mapped, f"<{mapped}>"),
                    start=ent.start_char,
                    end=ent.end_char,
                    original=text[ent.start_char:ent.end_char],
                ))
    except Exception:
        pass

    # 3단계: 같은 이름 문자열이 다른 위치에도 있으면 함께 감지 대상에 포함
    entities.extend(_propagate_exact_name_matches(text, entities))

    # 위치순 정렬 후 ID 부여
    entities.sort(key=lambda e: e.start)
    for i, e in enumerate(entities):
        e.id = i

    return entities


def mask_pii_selective(text: str, entities: list[PiiEntity], selected_ids: list[int]) -> MaskingResult:
    """
    사용자가 선택한 엔티티 ID만 마스킹.
    역순(오른쪽→왼쪽) 처리로 offset 유지.
    """
    to_mask = sorted(
        [e for e in entities if e.id in selected_ids],
        key=lambda e: e.start,
        reverse=True,
    )
    result = text
    counts: dict[str, int] = {}
    for e in to_mask:
        result = result[:e.start] + e.label + result[e.end:]
        counts[e.type] = counts.get(e.type, 0) + 1

    return MaskingResult(
        masked_text=result,
        masked_count=sum(counts.values()),
        masked_items=counts,
    )


def apply_custom_masks(text: str, custom_masks: list[dict]) -> str:
    """사용자가 직접 선택한 텍스트 범위를 마스킹."""
    if not custom_masks:
        return text
    sorted_masks = sorted(custom_masks, key=lambda m: m['start'], reverse=True)
    result = text
    for m in sorted_masks:
        start, end = m.get('start', 0), m.get('end', 0)
        label = m.get('label', '<직접선택>')
        if 0 <= start < end <= len(result):
            result = result[:start] + label + result[end:]
    return result


def mask_text(
    text: str,
    selected_ids: list[int] | None,
    custom_masks: list[dict] | None,
) -> MaskingResult:
    """
    자동 감지(selected_ids로 필터링) + 사용자 직접 선택(custom_masks)을
    원본 텍스트 기준으로 한 번에 마스킹한다.

    주의: 자동 마스킹을 먼저 적용한 뒤 그 결과 문자열에 custom_masks의
    start/end를 다시 적용하면 안 된다 — 자동 마스킹으로 치환된 라벨 때문에
    뒤쪽 문자 위치가 이미 밀려서, 프론트엔드가 원본 텍스트 기준으로 계산해
    보낸 custom_masks 좌표가 더 이상 맞지 않게 된다. 따라서 자동 감지 결과와
    직접 선택 범위를 하나의 리스트로 합쳐 원본 텍스트에 대해 역순(오른쪽→왼쪽)
    으로 한 번만 치환한다.
    """
    entities = detect_pii(text)
    to_mask: list[PiiEntity] = (
        list(entities) if selected_ids is None
        else [e for e in entities if e.id in selected_ids]
    )

    if custom_masks:
        next_id = -1
        for m in custom_masks:
            start, end = m.get("start", 0), m.get("end", 0)
            if 0 <= start < end <= len(text):
                to_mask.append(PiiEntity(
                    id=next_id, type="CUSTOM", label=m.get("label", "<직접선택>"),
                    start=start, end=end, original=text[start:end],
                ))
                next_id -= 1

    return mask_pii_selective(text, to_mask, [e.id for e in to_mask])


def mask_pii(text: str) -> MaskingResult:
    """
    계약서 텍스트의 개인정보를 마스킹합니다.

    처리 순서:
      1단계(정규식): 전화번호·이메일·IP·카드·주민번호·계좌·차량·주소 등
      2단계(NLP)   : Presidio로 이름·기관명·장소 AI 감지
    """
    if not text or not text.strip():
        return MaskingResult(masked_text=text, masked_count=0)

    _init_presidio()

    total_counts: dict[str, int] = {}

    # 1단계: 정규식 마스킹 (전화·이메일·IP·카드·주민번호·계좌 등)
    step1, reg_counts = _regex_mask(text, _PATTERNS)
    for k, v in reg_counts.items():
        total_counts[k] = total_counts.get(k, 0) + v

    # 2단계: spaCy NER 마스킹 (이름·기관명·장소)
    step2, nlp_counts = _spacy_ner_mask(step1)
    for k, v in nlp_counts.items():
        total_counts[k] = total_counts.get(k, 0) + v

    total = sum(total_counts.values())

    if total > 0:
        summary = ", ".join(
            f"{LABEL.get(k, k)} {v}건" for k, v in sorted(total_counts.items())
        )
        logger.info("🔒 마스킹 완료: 총 %d건 (%s)", total, summary)
    else:
        logger.info("🔒 마스킹 대상 개인정보 없음")

    return MaskingResult(
        masked_text=step2,
        masked_count=total,
        masked_items=total_counts,
    )

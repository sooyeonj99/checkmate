from pydantic import BaseModel
from typing import Optional


class ContractUploadResponse(BaseModel):
    """계약서 업로드 응답"""
    contract_id: str
    filename: str
    contract_type: str
    file_size: int        # 바이트 단위
    file_ext: str
    status: str
    message: str


class ClauseResult(BaseModel):
    """조항 분석 결과"""
    article: str          # 조항 번호 (예: 제7조)
    title: str            # 조항 제목
    risk: str             # danger / warn / safe
    description: str      # 위험 설명
    original: str         # 원문
    suggestion: str       # 수정 제안
    law_ref: Optional[str] = None  # 관련 법령


class AnalysisResult(BaseModel):
    """AI 분석 결과"""
    contract_id: str
    filename: str
    contract_type: str
    score: int            # 0~100 (높을수록 위험)
    grade: str            # 위험 / 주의 / 안전
    danger_count: int
    warn_count: int
    safe_count: int
    analysis_time: str    # 분석 소요 시간
    clauses: list[ClauseResult]
    analyzed_at: str
    contract_text: Optional[str] = None   # 마스킹된 계약서 전문 텍스트
    masked_count: int = 0                 # Presidio가 마스킹한 개인정보 항목 수

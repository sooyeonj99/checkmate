"""Gemini 기반 계약서 상담 챗봇 API"""
from typing import List

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["챗봇"])

SYSTEM_PROMPT = """당신은 Checkmate의 계약서 분석 전문 AI 상담사 '체크메이트'입니다.
Checkmate는 AI로 계약서를 분석해 위험 조항을 탐지하고, 구독·렌탈 비용을 관리하는 서비스입니다.

역할:
- 계약서 관련 질문 답변 (근로계약서, 프리랜서, 구독·렌탈 등)
- 위험 조항의 의미와 대응 방법 설명
- 한국 법률 기초 정보 제공 (근로기준법, 민법, 공정거래법 등)
- Checkmate 서비스 이용 방법 안내
- 위약금·해지 조건·자동갱신 등 구독 계약 관련 조언

주의:
- 구체적인 법적 조언은 반드시 전문 변호사 상담을 권유할 것
- 일반적인 법률 정보만 제공할 것
- 항상 친절하고 이해하기 쉽게 설명할 것
- 반드시 한국어로만 답변할 것
- 답변은 간결하게 유지할 것 (200자 내외 권장)"""


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI 서비스 키가 설정되지 않았습니다. 백엔드 .env에 GEMINI_API_KEY를 추가하세요.")

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        history = [
            {"role": msg.role, "parts": [{"text": msg.content}]}
            for msg in request.history
        ]

        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(request.message)

        return ChatResponse(reply=response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 응답 생성 실패: {str(e)}")

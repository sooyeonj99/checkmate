"""홈페이지 공지/이벤트 팝업 — 공개(비로그인) 조회 엔드포인트"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.popup import PopupSetting

router = APIRouter(prefix="/popup", tags=["팝업"])


class PublicPopupOut(BaseModel):
    id: int
    title: str = ""
    body: str = ""
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: str = "자세히 보기"
    width: int = 420
    height: Optional[int] = None
    position: str = "center"
    updated_at: Optional[str] = None


@router.get("", response_model=list[PublicPopupOut])
def get_active_popups(db: Session = Depends(get_db)):
    """활성화된 팝업 목록 반환 (없으면 빈 배열)."""
    rows = db.query(PopupSetting).filter(PopupSetting.enabled == True).order_by(PopupSetting.id).all()  # noqa: E712
    return [
        PublicPopupOut(
            id=r.id, title=r.title, body=r.body, image_url=r.image_url, link_url=r.link_url,
            button_text=r.button_text, width=r.width, height=r.height, position=r.position,
            updated_at=r.updated_at.isoformat() if r.updated_at else None,
        )
        for r in rows
    ]

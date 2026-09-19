"""홈페이지 공지/이벤트 팝업 — 공개(비로그인) 조회 엔드포인트"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.popup import PopupSetting

router = APIRouter(prefix="/popup", tags=["팝업"])


class PublicPopupOut(BaseModel):
    enabled: bool
    title: str = ""
    body: str = ""
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: str = "자세히 보기"
    width: int = 420
    height: Optional[int] = None
    position: str = "center"
    updated_at: Optional[str] = None


@router.get("", response_model=PublicPopupOut)
def get_active_popup(db: Session = Depends(get_db)):
    """활성화된 팝업 설정 반환. 비활성 상태면 enabled=false만 반환."""
    setting = db.query(PopupSetting).first()
    if not setting or not setting.enabled:
        return PublicPopupOut(enabled=False)
    return PublicPopupOut(
        enabled=True,
        title=setting.title,
        body=setting.body,
        image_url=setting.image_url,
        link_url=setting.link_url,
        button_text=setting.button_text,
        width=setting.width,
        height=setting.height,
        position=setting.position,
        updated_at=setting.updated_at.isoformat() if setting.updated_at else None,
    )

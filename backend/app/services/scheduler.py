"""만료 알림 스케줄러 (APScheduler)
매일 오전 9시에 만료 임박 계약서를 확인하여 이메일 + 푸시 알림 발송
"""
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.saved_contract import SavedContract
from app.models.user import User
from app.services.email_service import send_expiry_alert_email
from app.services.push_service import send_push

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


def _get_expiring_contracts(db: Session, days: int) -> list[tuple[SavedContract, User]]:
    """만료까지 정확히 N일 남은 계약서 조회"""
    now = datetime.now()
    start = now + timedelta(days=days)
    end = start + timedelta(hours=24)

    contracts = (
        db.query(SavedContract, User)
        .join(User, SavedContract.user_id == User.id)
        .filter(
            SavedContract.expiry_date >= start,
            SavedContract.expiry_date < end,
        )
        .all()
    )
    return contracts


async def check_expiring_contracts():
    """매일 오전 9시 실행 — 30일·7일·3일·1일 전 알림"""
    db: Session = SessionLocal()
    try:
        for days in [30, 7, 3, 1]:
            pairs = _get_expiring_contracts(db, days)
            for contract, user in pairs:
                d_str = contract.expiry_date.strftime("%Y년 %m월 %d일")
                label = f"{days}일" if days > 1 else "내일"

                # 이메일 알림
                if user.email:
                    try:
                        send_expiry_alert_email(
                            to_email=user.email,
                            username=user.username,
                            filename=contract.filename,
                            expiry_date=d_str,
                            days_left=days,
                        )
                    except Exception as e:
                        logger.warning(f"만료 이메일 발송 실패 ({user.email}): {e}")

                # 푸시 알림
                if user.push_token:
                    try:
                        await send_push(
                            token=user.push_token,
                            title=f"계약 만료 {label} 전",
                            body=f"'{contract.filename}' 계약이 {d_str}에 만료됩니다.",
                            data={"type": "expiry_alert", "contract_id": str(contract.id)},
                        )
                    except Exception as e:
                        logger.warning(f"만료 푸시 실패 ({user.push_token}): {e}")

                logger.info(f"만료 알림: {user.email} / {contract.filename} / {days}일 전")

    except Exception as e:
        logger.error(f"만료 알림 스케줄러 오류: {e}")
    finally:
        db.close()


def start_scheduler():
    """서버 시작 시 스케줄러 등록"""
    scheduler.add_job(
        check_expiring_contracts,
        trigger="cron",
        hour=9,
        minute=0,
        id="expiry_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[스케줄러] 만료 알림 스케줄러 시작 (매일 09:00)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[스케줄러] 종료")

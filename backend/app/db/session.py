from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# DATABASE_URL 미설정 시 SQLite(로컬 개발용) 사용
_db_url = settings.DATABASE_URL or "sqlite:///./checkmate.db"

engine = create_engine(
    _db_url,
    # SQLite 멀티스레드 허용 (개발용)
    connect_args={"check_same_thread": False} if _db_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """DB 세션 의존성 주입"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

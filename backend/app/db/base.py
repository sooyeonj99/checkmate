from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# import all models here so Alembic can detect them
from app.models import user  # noqa: F401, E402

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# import all models here so Alembic can detect them
from app.models import user  # noqa: F401, E402
from app.models import saved_contract  # noqa: F401, E402
from app.models import subscription  # noqa: F401, E402
from app.models import signing  # noqa: F401, E402
from app.models import api_key  # noqa: F401, E402

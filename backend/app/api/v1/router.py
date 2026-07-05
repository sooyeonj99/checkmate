from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, contracts, chat, subscriptions, business, signing, templates, team
import app.models.user_template  # noqa: F401
import app.models.team  # noqa: F401

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(contracts.router)
api_router.include_router(chat.router)
api_router.include_router(subscriptions.router)
api_router.include_router(business.router)
api_router.include_router(signing.router)
api_router.include_router(templates.router)
api_router.include_router(team.router)

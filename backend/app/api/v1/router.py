from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, contracts, chat, subscriptions, business, signing

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(contracts.router)
api_router.include_router(chat.router)
api_router.include_router(subscriptions.router)
api_router.include_router(business.router)
api_router.include_router(signing.router)

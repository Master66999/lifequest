from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, quests, character, shop, boss, analytics, ai

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="LIFEQUEST AI — AI-powered real-life RPG backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://lifequest-ai.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/auth",        tags=["Authentication"])
app.include_router(quests.router,      prefix="/quests",      tags=["Quests"])
app.include_router(character.router,   prefix="/character",   tags=["Character"])
app.include_router(shop.router,        prefix="",             tags=["Shop & Inventory"])
app.include_router(boss.router,        prefix="/boss",        tags=["Boss Battle"])
app.include_router(analytics.router,   prefix="/analytics",   tags=["Analytics"])
app.include_router(ai.router,          prefix="/ai",          tags=["AURA AI"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

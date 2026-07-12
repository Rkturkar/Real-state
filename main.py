"""
Real Estate Property Listing API
FastAPI + Pydantic v2 + JSON database (swappable via database/base.py)

Run locally:
    uvicorn main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Backend.routes.properties import router as properties_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    print("✅ Real Estate API starting up…")
    yield
    print("🛑 Real Estate API shutting down…")


app = FastAPI(
    title="Real Estate Property Listing API",
    description=(
        "Production-ready REST API for browsing, searching, filtering and sorting "
        "Indian real estate properties. JSON storage now — swap for MySQL/MongoDB "
        "by implementing `database/base.py`."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────────
# Allow any origin for local dev & Netlify/GitHub Pages deployment.
# Tighten in production: allow_origins=["https://your-frontend.netlify.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────────
app.include_router(properties_router, prefix="/api/v1")


# ── Health ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Meta"])
async def root():
    return {"message": "Real Estate API is live 🏠", "version": "1.0.0", "docs": "/docs"}


@app.get("/health", tags=["Meta"])
async def health():
    return {"status": "healthy"}
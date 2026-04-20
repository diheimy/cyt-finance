from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routers import health, recurring, reports

app = FastAPI(
    title="CYT Finance API",
    version="0.1.0",
    description="Python services: PDF, recurring jobs, aggregations, external integrations.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Cron-Secret"],
)

app.include_router(health.router)
app.include_router(recurring.router)
app.include_router(reports.router)

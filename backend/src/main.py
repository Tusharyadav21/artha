from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.core.config import get_settings
from src.core.logging import configure_logging
from src.core.middleware import RequestTracingMiddleware
from src.core.rate_limit import limiter
from src.routers import auth, chat, conversations, documents, health, projects, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Purpose:
        Manages application startup and shutdown events.

    Responsibilities:
        - Initialize global settings
        - Configure system logging

    Args:
        app (FastAPI):
            The FastAPI application instance.

    Returns:
        None

    Side Effects:
        - Sets up logging for the process
    """
    settings = get_settings()
    configure_logging(settings.log_level)
    yield


app = FastAPI(title="Agentic RAG API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

settings = get_settings()
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestTracingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(video.router)

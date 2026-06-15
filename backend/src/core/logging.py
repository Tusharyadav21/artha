import logging
import os
import sys
import warnings
from logging.handlers import RotatingFileHandler

import structlog


def configure_logging(level: str = "INFO") -> None:
    warnings.filterwarnings("ignore", category=UserWarning, module="langgraph")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")
    try:
        from langchain_core._api.deprecation import LangChainPendingDeprecationWarning
        warnings.filterwarnings("ignore", category=LangChainPendingDeprecationWarning)
    except ImportError:
        pass

    log_level = getattr(logging, level.upper(), logging.INFO)

    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S", utc=False),
    ]

    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    os.makedirs("logs", exist_ok=True)
    file_handler = RotatingFileHandler("logs/app.log", maxBytes=10 * 1024 * 1024, backupCount=5)
    console_handler = logging.StreamHandler(sys.stdout)

    logging.basicConfig(
        format="%(message)s",
        handlers=[console_handler, file_handler],
        level=log_level,
    )

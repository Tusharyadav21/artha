import logging
import os
import sys
import warnings
from logging.handlers import RotatingFileHandler

import structlog

def configure_logging(level: str = "INFO") -> None:
    warnings.filterwarnings("ignore", category=UserWarning, module="langgraph")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

    log_level = getattr(logging, level.upper(), logging.INFO)

    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("dishka").setLevel(logging.WARNING)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
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

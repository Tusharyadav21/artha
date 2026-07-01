import structlog

from app.utils.logging import configure_logging

configure_logging("INFO")
logger = structlog.stdlib.get_logger("test")

try:
    1 / 0
except Exception:
    logger.exception("Stream error after %d tokens", 5)

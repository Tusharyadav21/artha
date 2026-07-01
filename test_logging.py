import sys
from app.utils.logging import configure_logging
from app.config import get_settings
import structlog
import logging

configure_logging("INFO")
logger = structlog.stdlib.get_logger("test")
logger.info("This is a structlog test", my_var=123)
logging.getLogger("test2").info("This is a standard logging test")
try:
    1 / 0
except Exception:
    logger.exception("An error occurred")

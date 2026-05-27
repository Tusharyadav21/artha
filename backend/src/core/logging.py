import logging
import sys
import warnings
import structlog


def configure_logging(level: str = "INFO") -> None:
    """
    Purpose:
        Initializes and configures the system-wide logging infrastructure.

    Responsibilities:
        - Suppress noisy warnings from third-party libraries (LangGraph, LangChain)
        - Set log levels for critical internal and external loggers
        - Configure structlog for human-readable, formatted console output
        - Initialize standard logging basic configuration

    Args:
        level (str):
            The desired logging level (e.g., "DEBUG", "INFO", "WARNING"). Defaults to "INFO".

    Returns:
        None

    Side Effects:
        - Modifies global warning filters.
        - Configures global structlog and logging settings.

    Flow:
        1. Ignore specific LangGraph/LangChain warnings.
        2. Map string level to logging constant.
        3. Set specific levels for httpcore, httpx, uvicorn, and sqlalchemy.
        4. Define structlog processors (contextvars, level, timestamps, console renderer).
        5. Finalize structlog configuration.
        6. Apply basic logging configuration for standard output.
    """
    # 1. Suppress noisy warnings
    warnings.filterwarnings("ignore", category=UserWarning, module="langgraph")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")
    # Suppress the specific LangChainPendingDeprecationWarning
    try:
        from langchain_core._api.deprecation import LangChainPendingDeprecationWarning
        warnings.filterwarnings("ignore", category=LangChainPendingDeprecationWarning)
    except ImportError:
        pass

    log_level = getattr(logging, level.upper(), logging.INFO)

    # 2. Configure standard logging for libraries
    # Set levels for noisy third-party loggers
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING) # Debloat request logs
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # 3. Configure structlog for human-readable output
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S", utc=False),
    ]

    # Use ConsoleRenderer for terminal output (dev/local), JSON for production if needed
    # For now, let's prioritize human readability as requested
    processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Redirect standard logging to structlog if desired,
    # but for now let's just make basicConfig clean
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

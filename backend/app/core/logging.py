"""
Logging configuration.

Provides a single `configure_logging()` entry point (called once from the
application lifespan in `main.py`) and a `get_logger()` helper that every
other module should use instead of calling `logging.getLogger` directly.
Centralizing this makes it trivial to later swap in structured/JSON logging
(e.g. for shipping logs to a log aggregator) without touching call sites.
"""

import logging
import sys

from app.core.config import settings

# Log format shared by all handlers. Includes timestamp, level, logger name
# (so log lines can be traced back to the module that emitted them), and message.
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    """
    Configure the root logger for the whole application process.

    Called once during application startup (see `app.main.lifespan`). Safe to
    call multiple times - handlers are cleared first to avoid duplicate logs
    if the app is reloaded in-process (e.g. under `--reload`).
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL.upper())

    # Avoid duplicate handlers on reload.
    root_logger.handlers.clear()

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT))
    root_logger.addHandler(handler)

    # Quiet down noisy third-party loggers unless we're in debug mode.
    if not settings.APP_DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.

    Convention: call with `__name__` from the calling module, e.g.
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)

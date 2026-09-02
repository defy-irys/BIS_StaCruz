"""
Datetime utilities.

A couple of small, timezone-aware helpers used anywhere the codebase needs
"the current time" or to render a timestamp consistently. Centralizing
this avoids naive-vs-aware datetime bugs from `datetime.now()` calls
scattered across the codebase.
"""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def to_iso8601(value: datetime) -> str:
    """Render a datetime as an ISO-8601 string, suitable for API responses."""
    return value.isoformat()

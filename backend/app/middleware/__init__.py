"""
Middleware package.

ASGI middleware registered on the FastAPI app in `main.py`. Currently
contains request logging/timing middleware; additional cross-cutting
middleware (rate limiting, request-id propagation, etc.) can be added here
as separate modules and wired up in `register_middleware`.
"""

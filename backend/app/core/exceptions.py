"""
Application-wide exceptions and exception handlers.

Defines a small hierarchy of domain-agnostic exceptions (auth failures,
not-found, validation, conflicts) that services/repositories can raise
without knowing anything about HTTP. FastAPI exception handlers translate
them into consistent JSON error responses at the edge of the application.

This keeps HTTP concerns out of the service/repository layers: those layers
raise `AppException` subclasses, and only `register_exception_handlers`
(wired up in `main.py`) knows how to turn that into an HTTP response.
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


class AppException(Exception):
    """Base class for all application-raised (non-HTTP) exceptions."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, headers: dict[str, str] | None = None):
        self.message = message or self.default_message
        self.headers = headers
        super().__init__(self.message)


class InvalidCredentialsException(AppException):
    """Raised when login credentials (username/password) are invalid."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Invalid username or password."

    def __init__(self, message: str | None = None):
        super().__init__(message, headers={"WWW-Authenticate": "Bearer"})


class InvalidTokenException(AppException):
    """Raised when a JWT is missing, malformed, expired, or fails verification."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Could not validate credentials."

    def __init__(self, message: str | None = None):
        super().__init__(message, headers={"WWW-Authenticate": "Bearer"})


class InactiveUserException(AppException):
    """Raised when an authenticated user account is disabled."""

    status_code = status.HTTP_403_FORBIDDEN
    default_message = "This user account is inactive."


class InsufficientPermissionsException(AppException):
    """Raised when an authenticated user lacks permission for an action."""

    status_code = status.HTTP_403_FORBIDDEN
    default_message = "You do not have permission to perform this action."


class NotFoundException(AppException):
    """Raised when a requested resource does not exist."""

    status_code = status.HTTP_404_NOT_FOUND
    default_message = "The requested resource was not found."


class ConflictException(AppException):
    """Raised on unique-constraint or state conflicts (e.g. duplicate username)."""

    status_code = status.HTTP_409_CONFLICT
    default_message = "The request conflicts with the current state of the resource."


def _error_response(message: str, status_code: int, headers: dict[str, str] | None = None) -> JSONResponse:
    """Build the standard error envelope returned to API clients."""
    return JSONResponse(status_code=status_code, content={"error": {"message": message}}, headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers on the FastAPI app instance.

    Called once from `app.main` during application creation. Keeping this in
    one place ensures every error path returns a consistent JSON shape.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning("Handled AppException: %s (%s)", exc.message, request.url.path)
        return _error_response(exc.message, exc.status_code, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _error_response(str(exc.detail), exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Return Pydantic's structured validation errors so clients can
        # pinpoint exactly which field(s) failed validation.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": {"message": "Validation failed.", "details": exc.errors()}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Last-resort safety net: never leak stack traces/internal details
        # to clients; log the full exception server-side instead.
        logger.exception("Unhandled exception on %s", request.url.path)
        return _error_response("An internal server error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)

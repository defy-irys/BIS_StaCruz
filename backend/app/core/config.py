"""
Application configuration.

All configurable values for the backend are centralized here as a single
`Settings` object built on `pydantic-settings`. Values are read from
environment variables (and, in local development, from a `.env` file),
which keeps secrets and per-environment values out of source control and
lets the exact same codebase run unmodified in dev/staging/production.

Usage:
    from app.core.config import settings
    settings.DATABASE_URL
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Strongly-typed application settings.

    Each field maps to an environment variable of the same name (case
    insensitive). See `.env.example` at the project root for the full list
    of variables this application understands.
    """

    # --- General application metadata ------------------------------------
    APP_NAME: str = "Barangay Information Management System - BIPS"
    APP_ENV: str = "development"  # development | staging | production
    APP_DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # --- Server ------------------------------------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --- Database (PostgreSQL via async SQLAlchemy) -------------------------
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://bims_user:bims_password@localhost:5432/bims_bips_db",
        description="Async SQLAlchemy connection string (asyncpg driver).",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # --- JWT authentication --------------------------------------------------
    JWT_SECRET_KEY: str = Field(
        default="change-this-to-a-long-random-secret-value",
        description="Symmetric secret used to sign/verify JWTs. Override in production.",
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- CORS ------------------------------------------------------------
    # Stored internally as a raw string and exposed as a parsed list via
    # `cors_origins_list` so both simple and comma-separated env values work.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # --- Logging -----------------------------------------------------------
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        """Restrict APP_ENV to the environments this codebase is designed for."""
        allowed = {"development", "staging", "production"}
        if value not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}, got '{value}'")
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse the comma-separated CORS_ORIGINS string into a clean list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    Using `lru_cache` means the environment is only parsed once per process,
    and the same Settings object is shared everywhere it's injected.
    """
    return Settings()


# Module-level singleton for convenient importing (`from app.core.config import settings`).
settings = get_settings()

"""
Business logic for authentication – fully compatible with the finalized User model.
All model access is through the repository layer.
"""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    UserAlreadyExistsError,
)
from app.auth.models import RefreshToken
from app.auth.repository import RefreshTokenRepository, UserRepository
from app.auth.schemas import TokenResponse, UserCreate, UserResponse
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User


class AuthService:
    """Orchestrates authentication use cases."""

    def __init__(self, session_or_repo: AsyncSession | UserRepository) -> None:
        if isinstance(session_or_repo, UserRepository):
            self.user_repo = session_or_repo
            self.refresh_repo = RefreshTokenRepository(session_or_repo.db)
        else:
            self.user_repo = UserRepository(session_or_repo)
            self.refresh_repo = RefreshTokenRepository(session_or_repo)

    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register a new user. Raises UserAlreadyExistsError on duplicate email."""
        existing = await self.user_repo.get_by_email(user_data.email)
        if existing:
            raise UserAlreadyExistsError()

        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
        )
        created = await self.user_repo.create(user)
        return UserResponse.model_validate(created)

    async def authenticate_user(self, email: str, password: str) -> TokenResponse:
        """Validate credentials and return a token pair."""
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise InactiveUserError()
        return await self._generate_tokens(user)

    async def refresh_access_token(self, refresh_token_str: str) -> TokenResponse:
        """Rotate a valid refresh token and issue new tokens."""
        stored_token = await self.refresh_repo.get_valid_token(refresh_token_str)
        if not stored_token:
            raise InvalidTokenError()

        # Server‑side expiry check
        if stored_token.expires_at < datetime.now(timezone.utc):
            await self.refresh_repo.revoke_token(stored_token)
            raise InvalidTokenError()

        user = stored_token.user
        if not user.is_active:
            raise InvalidTokenError()

        # Revoke the old token (rotation)
        await self.refresh_repo.revoke_token(stored_token)
        return await self._generate_tokens(user)

    async def get_current_user(self, token: str) -> User:
        """Decode access token and return active user."""
        try:
            payload = decode_access_token(token)
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise InvalidCredentialsError()
            user_id = UUID(user_id_str)
        except (ValueError, KeyError):
            raise InvalidCredentialsError()

        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise InvalidCredentialsError()
        return user

    async def _generate_tokens(self, user: User) -> TokenResponse:
        """Create token pair and persist the refresh token."""
        access_token = create_access_token(str(user.id))
        refresh_str, expires_at = create_refresh_token()

        refresh_model = RefreshToken(
            user_id=user.id,
            token=refresh_str,
            expires_at=expires_at,
        )
        await self.refresh_repo.create(refresh_model)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_str,
        )
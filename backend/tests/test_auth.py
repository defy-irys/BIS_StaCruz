"""
Unit tests for authentication module – uses mocked repositories and an async test client.
Requires: pytest, pytest-asyncio, httpx (or TestClient), and your FastAPI app fixture.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import router
from app.auth.dependencies import get_current_user
from app.auth.exceptions import (
    InvalidCredentialsError,
    InvalidTokenError,
    UserAlreadyExistsError,
)
from app.auth.schemas import TokenResponse, UserResponse
from app.models.user import User

# Dummy app for isolated endpoint testing
app = FastAPI()
app.include_router(router)


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        username="tester",
        hashed_password="hashed",
        is_active=True,
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# -------------------------------------------------------
#  Registration tests
# -------------------------------------------------------
@pytest.mark.asyncio
async def test_register_success(async_client, mock_user):
    with patch("app.auth.service.AuthService.register_user") as mock_reg:
        mock_reg.return_value = UserResponse.model_validate(mock_user)
        payload = {"email": "new@test.com", "password": "secret1234"}
        response = await async_client.post("/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == mock_user.email


@pytest.mark.asyncio
async def test_register_conflict(async_client):
    with patch("app.auth.service.AuthService.register_user") as mock_reg:
        mock_reg.side_effect = UserAlreadyExistsError()
        response = await async_client.post("/auth/register", json={
            "email": "exist@test.com", "password": "secret1234"
        })
        assert response.status_code == 409


# -------------------------------------------------------
#  Login tests
# -------------------------------------------------------
@pytest.mark.asyncio
async def test_login_success(async_client, mock_user):
    with patch("app.auth.service.AuthService.authenticate_user") as mock_auth:
        mock_auth.return_value = TokenResponse(
            access_token="access", refresh_token="refresh"
        )
        payload = {"email": mock_user.email, "password": "correct"}
        response = await async_client.post("/auth/login", json=payload)
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["access_token"] == "access"
        assert json_data["refresh_token"] == "refresh"


@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client):
    with patch("app.auth.service.AuthService.authenticate_user") as mock_auth:
        mock_auth.side_effect = InvalidCredentialsError()
        response = await async_client.post("/auth/login", json={
            "email": "wrong@test.com", "password": "wrong"
        })
        assert response.status_code == 401


# -------------------------------------------------------
#  Token refresh tests
# -------------------------------------------------------
@pytest.mark.asyncio
async def test_refresh_success(async_client):
    with patch("app.auth.service.AuthService.refresh_access_token") as mock_ref:
        mock_ref.return_value = TokenResponse(
            access_token="new_access", refresh_token="new_refresh"
        )
        response = await async_client.post("/auth/refresh", json={"refresh_token": "valid"})
        assert response.status_code == 200
        assert response.json()["access_token"] == "new_access"


@pytest.mark.asyncio
async def test_refresh_invalid_token(async_client):
    with patch("app.auth.service.AuthService.refresh_access_token") as mock_ref:
        mock_ref.side_effect = InvalidTokenError()
        response = await async_client.post("/auth/refresh", json={"refresh_token": "bad"})
        assert response.status_code == 401


# -------------------------------------------------------
#  /me endpoint tests
# -------------------------------------------------------
@pytest.mark.asyncio
async def test_get_me_authenticated(async_client, mock_user):
    # Override the dependency to inject our mock user directly
    app.dependency_overrides[get_current_user] = lambda: mock_user
    response = await async_client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == mock_user.email
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_me_unauthenticated(async_client):
    response = await async_client.get("/auth/me")
    assert response.status_code == 401  # OAuth2PasswordBearer returns 401 if no token
import uuid

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.auth.password import hash_password
from app.dependencies.database import get_user_repository
from app.api.rbac import require_role, require_permission
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User

app = FastAPI()

@app.get("/test-role-admin")
async def protected_role_admin(user: User = Depends(require_role("admin"))):
    return {"ok": True}

@app.get("/test-permission-read")
async def protected_permission_read(user: User = Depends(require_permission("resident.read"))):
    return {"ok": True}

client = TestClient(app)

def create_test_user(is_superuser=False, roles=None):
    user = User(
        id=uuid.uuid4(),
        username="rbac-user",
        email="test@example.com",
        hashed_password=hash_password("password"),
        is_active=True,
        is_superuser=is_superuser,
    )
    if roles is not None:
        user.roles = list(roles)
    return user

def override_get_current_user(user):
    async def _override():
        return user
    app.dependency_overrides[get_current_user] = _override

def override_get_user_repository():
    async def _override():
        return None  # Test scenario - DB not available, use roles/permissions from mocked user
    app.dependency_overrides[get_user_repository] = _override

@pytest.fixture(autouse=True)
def reset_overrides():
    yield
    app.dependency_overrides.clear()

# --- Tests ---

def test_unauthenticated_request():
    async def _raise_401():
        raise HTTPException(status_code=401, detail="Not authenticated")
    app.dependency_overrides[get_current_user] = _raise_401
    response = client.get("/test-role-admin")
    assert response.status_code == 401

def test_inactive_user():
    async def _raise_inactive():
        raise HTTPException(status_code=401, detail="Inactive user")
    app.dependency_overrides[get_current_user] = _raise_inactive
    response = client.get("/test-role-admin")
    assert response.status_code == 401

def test_user_with_required_role():
    role = Role(name="admin")
    user = create_test_user(roles=[role])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-role-admin")
    assert response.status_code == 200

def test_user_without_required_role():
    role = Role(name="encoder")
    user = create_test_user(roles=[role])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-role-admin")
    assert response.status_code == 403

def test_user_with_required_permission():
    perm = Permission(name="resident.read")
    role = Role(name="encoder", permissions=[perm])
    user = create_test_user(roles=[role])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-permission-read")
    assert response.status_code == 200

def test_user_without_required_permission():
    perm = Permission(name="resident.write")
    role = Role(name="encoder", permissions=[perm])
    user = create_test_user(roles=[role])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-permission-read")
    assert response.status_code == 403

def test_user_receives_permission_from_one_of_multiple_roles():
    perm = Permission(name="resident.read")
    role1 = Role(name="secretary")
    role2 = Role(name="encoder", permissions=[perm])
    user = create_test_user(roles=[role1, role2])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-permission-read")
    assert response.status_code == 200


def test_superuser_bypasses_role_check():
    user = create_test_user(is_superuser=True, roles=[])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-role-admin")
    assert response.status_code == 200


def test_superuser_bypasses_permission_check():
    user = create_test_user(is_superuser=True, roles=[])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-permission-read")
    assert response.status_code == 200


def test_permission_denial_returns_403():
    role = Role(name="encoder")
    user = create_test_user(roles=[role])
    override_get_current_user(user)
    override_get_user_repository()
    response = client.get("/test-permission-read")
    assert response.status_code == 403
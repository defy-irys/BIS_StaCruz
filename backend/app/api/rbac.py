from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_user_repository
from app.repositories.user_repository import UserRepository
from app.models.user import User


async def get_rbac_user(
    current_user: Annotated[User, Depends(get_current_user)],
    user_repo: Annotated[UserRepository | None, Depends(get_user_repository)] = None,
) -> User:
    """Load the authenticated user with roles and permissions eagerly.
    
    In test scenarios where the DB is not available, falls back to the current_user
    which may have been populated with roles/permissions by the test setup.
    """
    if user_repo is None:
        return current_user
    
    user = await user_repo.get_by_id_with_roles_permissions(current_user.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def require_role(role_name: str):
    async def role_dependency(
        user: Annotated[User, Depends(get_rbac_user)]
    ) -> User:
        if user.is_superuser:
            return user
        roles = getattr(user, "roles", []) or []
        if not any(getattr(role, "name", None) == role_name for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User lacks the required role: {role_name}",
            )
        return user
    return role_dependency


def require_permission(permission_name: str):
    async def permission_dependency(
        user: Annotated[User, Depends(get_rbac_user)]
    ) -> User:
        if user.is_superuser:
            return user
        roles = getattr(user, "roles", []) or []
        has_permission = any(
            getattr(permission, "name", None) == permission_name
            for role in roles
            for permission in (getattr(role, "permissions", []) or [])
        )
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User lacks the required permission: {permission_name}",
            )
        return user
    return permission_dependency
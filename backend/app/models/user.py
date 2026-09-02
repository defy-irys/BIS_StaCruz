"""
User model.

This is the *only* domain entity included in this backend foundation,
because authentication is impossible to wire up without something to
authenticate against. It intentionally holds only the fields needed for
login/authorization mechanics - it is NOT a "staff profile" or "resident"
model, and no barangay-specific roles/permissions are encoded here. Those
are business decisions for a later phase and are out of scope here.
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.associations import user_roles
from app.database.base import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.auth.models import RefreshToken


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A system account capable of authenticating against the API."""

    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Generic account-state flags - deliberately not domain-specific.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid only
        return f"<User id={self.id} username={self.username!r}>"

    # RBAC relationship
    roles: Mapped[list["Role"]] = relationship(
        "Role", secondary=user_roles, back_populates="users"
    )

    # Authentication relationship
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

"""
One-time bootstrap script for creating the initial administrator account.

Usage:

    python -m app.scripts.create_admin

Edit the DEFAULT_* values below before running, or replace them with
environment variables later if desired.
"""

from sqlalchemy import select

from app.auth.password import hash_password
from app.database.session import AsyncSessionLocal
from app.models.user import User


# ---------------------------------------------------------------------
# Change these before running
# ---------------------------------------------------------------------

DEFAULT_USERNAME = "admin"
DEFAULT_EMAIL = "admin@example.com"
DEFAULT_PASSWORD = "admin123"

# ---------------------------------------------------------------------


async def main() -> None:
    async with AsyncSessionLocal() as session:

        # Check if username already exists
        result = await session.execute(
            select(User).where(User.username == DEFAULT_USERNAME)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"User '{DEFAULT_USERNAME}' already exists.")
            return

        user = User(
            username=DEFAULT_USERNAME,
            email=DEFAULT_EMAIL,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            is_active=True,
            is_superuser=True,
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)

        print("===================================")
        print("Administrator created successfully")
        print(f"Username : {DEFAULT_USERNAME}")
        print(f"Email    : {DEFAULT_EMAIL}")
        print("===================================")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
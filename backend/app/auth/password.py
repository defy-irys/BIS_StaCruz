"""
Password hashing utilities.

Wraps `passlib`'s bcrypt scheme so the rest of the application never touches
a raw hashing library directly - if the hashing algorithm ever needs to
change (e.g. to argon2), only this module needs to change.

Never store or log plaintext passwords anywhere outside of this module's
input parameters.
"""

from passlib.context import CryptContext

# `schemes=["bcrypt"]` with `deprecated="auto"` means passlib will happily
# verify hashes produced by older schemes (if any are added later) while
# always hashing new passwords with bcrypt.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password for storage. Never store the plaintext itself."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a previously hashed value."""
    return _pwd_context.verify(plain_password, hashed_password)

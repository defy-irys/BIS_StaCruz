"""
Token schemas.

`Token` is the response body returned from the login/refresh endpoints.
`TokenPayload` describes the *decoded* JWT claims and is used internally
(see `app.dependencies.auth`) to validate the shape of a token's payload
after `jwt.decode` has verified its signature.
"""

from pydantic import BaseModel


class Token(BaseModel):
    """Response body for successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Request body for exchanging a refresh token for a new token pair."""

    refresh_token: str


class TokenPayload(BaseModel):
    """Decoded JWT claims, validated after signature verification."""

    sub: str  # user id
    type: str  # "access" | "refresh"
    iat: int
    exp: int

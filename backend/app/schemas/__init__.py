"""
Schemas package.

Pydantic v2 models used for request validation and response serialization
at the API boundary. These are deliberately kept separate from the
SQLAlchemy models in `app.models` - ORM models describe *storage*, schemas
describe the *API contract*, and the two are allowed to diverge.
"""

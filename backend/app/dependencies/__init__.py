"""
Dependencies package.

FastAPI dependency-injection providers. `database.py` re-exports the DB
session dependency; `auth.py` provides `get_current_user` and related
dependencies that endpoints use to require/authorize a caller.
"""

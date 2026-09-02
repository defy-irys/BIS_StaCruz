"""
Repositories package.

Implements the repository pattern: a thin data-access layer that wraps
SQLAlchemy queries, so services (and, later, domain feature code) never
construct raw queries themselves. `base.py` provides a small generic
repository that concrete repositories (e.g. `user_repository.py`) extend
with entity-specific lookups.
"""

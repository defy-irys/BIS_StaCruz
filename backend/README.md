# BIMS-BIPS Backend Foundation

Backend foundation for the **Barangay Information Management System -
Barangay Inhabitant Profiling System (BIMS-BIPS)**.

This repository contains **only the backend foundation**: application
wiring, configuration, database setup, and JWT authentication
infrastructure. Domain features (residents, households, reports, GIS,
analytics) are **not implemented** here by design - the corresponding
`app/analytics`, `app/geocoding`, and `app/reports` packages exist as
placeholders for future work.

## Stack

- Python 3.13+
- FastAPI
- SQLAlchemy 2.x (async, via `asyncpg`)
- Alembic (async-aware migrations)
- PostgreSQL
- Pydantic v2 / pydantic-settings
- JWT authentication (PyJWT) + bcrypt password hashing (passlib)
- Uvicorn

## Project layout

```
backend/
  app/
    api/            # Versioned routers (v1/router.py) and endpoints (v1/endpoints/auth.py)
    auth/            # JWT + password hashing utilities (framework-agnostic)
    core/            # Settings, logging, exception hierarchy + handlers
    database/        # Declarative Base, async engine/session, startup DB check
    models/          # SQLAlchemy ORM models (only `User`, required for auth)
    repositories/     # Data-access layer (generic base + UserRepository)
    schemas/         # Pydantic v2 request/response models
    services/        # Business logic (AuthService)
    dependencies/     # FastAPI DI providers (db session, current-user)
    middleware/       # ASGI middleware (request logging)
    analytics/        # Placeholder - out of scope
    geocoding/        # Placeholder - out of scope
    reports/          # Placeholder - out of scope
    utils/           # Small generic helpers (datetime)
    main.py          # create_app() factory + lifespan + app instance
  alembic/           # Migration environment (async-aware env.py)
  alembic.ini
  requirements.txt
  .env.example
```

## Getting started

1. **Install dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # edit .env: set DATABASE_URL and a strong JWT_SECRET_KEY
   ```

3. **Create the database** (PostgreSQL must already be running)
   ```sql
   CREATE DATABASE bims_bips_db;
   ```

4. **Run the first migration** (once you've added a model beyond `User`,
   or immediately to create the `users` table)
   ```bash
   alembic revision --autogenerate -m "create users table"
   alembic upgrade head
   ```

5. **Run the API**
   ```bash
   uvicorn app.main:app --reload
   ```
   Visit `http://localhost:8000/docs` for interactive API docs, and
   `http://localhost:8000/health` for a liveness check.

## Authentication flow

- `POST /api/v1/auth/login` - OAuth2 password flow (`username` + `password`
  form fields) → returns `{ access_token, refresh_token, token_type }`.
- `POST /api/v1/auth/refresh` - exchange a refresh token for a new pair.
- `GET  /api/v1/auth/me` - returns the authenticated user's profile;
  requires `Authorization: Bearer <access_token>`.

There is intentionally **no public registration endpoint**. Seed an
initial user directly (e.g. via a one-off script using
`app.auth.password.hash_password` and the `UserRepository`) until an
account-provisioning policy is decided.

## Design notes

- **Schema changes go through Alembic only** - `Base.metadata.create_all()`
  is deliberately not used, so migration history stays the single source
  of truth for the database schema.
- **Repository pattern** - services never write raw queries; they go
  through repositories, which is what will let future domain features
  (residents, households) plug into the same conventions.
- **Exceptions decoupled from HTTP** - services/repositories raise
  `AppException` subclasses (see `app/core/exceptions.py`); only the
  registered exception handlers know how to turn those into HTTP responses.
- **No business rules invented** - the `User` model only carries the
  fields required to authenticate (no barangay-specific roles/permissions
  are encoded here).

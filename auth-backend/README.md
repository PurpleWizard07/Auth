# auth-backend

FastAPI authentication service providing JWT-based login, registration, password reset, and token refresh.

---

## Overview

This service exposes a small set of authentication endpoints consumed by the `auth-frontend` React application. It uses:

- **FastAPI** — ASGI web framework
- **SQLAlchemy** — ORM for PostgreSQL
- **psycopg** — PostgreSQL driver
- **python-jose** — JWT creation and verification
- **passlib / bcrypt** — password hashing
- **uvicorn** — ASGI server

### Entities

| Model | Table | Key fields |
|---|---|---|
| `User` | `users` | `id`, `full_name`, `email`, `password_hash`, `is_active`, `created_at`, `updated_at` |
| `PasswordReset` | `password_resets` | `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at` |
| `RefreshToken` | `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `remember_me`, `created_at` |

### Endpoints

| Method | Path | Handler |
|---|---|---|
| `POST` | `/auth/register` | `register` |
| `POST` | `/auth/login` | `login` |
| `GET` | `/auth/me` | `me` |
| `POST` | `/auth/logout` | `logout` |
| `POST` | `/auth/refresh` | `refresh` |
| `POST` | `/auth/forgot-password` | `forgotPassword` |
| `POST` | `/auth/reset-password` | `resetPassword` |

---

## Project structure

```
auth-backend/
├── app/
│   ├── main.py            # FastAPI app factory, CORS, router registration
│   ├── database.py        # SQLAlchemy engine and session
│   ├── config.py          # Settings loaded from environment
│   ├── auth/
│   │   ├── router.py      # FastAPI router (all /auth/* paths)
│   │   ├── service.py     # Business logic
│   │   └── schemas.py     # Pydantic request/response models
│   └── models/
│       ├── user.py
│       ├── password_reset.py
│       └── refresh_token.py
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## Local setup

### Prerequisites

- Python 3.12+
- PostgreSQL 15+ (or use the provided `docker-compose.yml` at the repo root)

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

See the [Environment variables](#environment-variables) section below for a full description of every variable.

### 4. Apply the database schema

Run the SQL from `schema.sql` (at the repo root) against your PostgreSQL database:

```bash
psql "$DATABASE_URL" -f ../schema.sql
```

### 5. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs are at `http://localhost:8000/docs`.

---

## Docker

Build and run with the repo-root `docker-compose.yml`:

```bash
# from the repository root
docker compose up --build
```

Or build the image standalone:

```bash
cd auth-backend
docker build -t auth-backend .
docker run --env-file .env -p 8000:8000 auth-backend
```

---

## Running tests

```bash
pytest
```

Tests cover the full register → login → refresh → forgot-password → reset-password → logout flow as well as negative cases (duplicate email, weak password, password mismatch, expired tokens).

---

## Environment variables

All variables must be present at startup. There are no defaults for secrets.

### Database

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full SQLAlchemy connection string for PostgreSQL via psycopg. | `postgresql+psycopg://user:password@localhost:5432/auth_db` |

### JWT

| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET_KEY` | Long, random secret used to sign access tokens. **Change before deploying.** | `change-me-to-a-long-random-secret` |
| `JWT_ALGORITHM` | Algorithm used by python-jose. | `HS256` |
| `JWT_ACCESS_TOKEN_TTL_MINUTES` | Lifetime of an access token in minutes. | `15` |

### Bcrypt

| Variable | Description | Example |
|---|---|---|
| `BCRYPT_ROUNDS` | Work factor for bcrypt password hashing. Must be ≥ 12. | `12` |

### Password reset

| Variable | Description | Example |
|---|---|---|
| `RESET_TOKEN_TTL_MINUTES` | How long a password-reset token remains valid in minutes. | `30` |

### Refresh tokens

| Variable | Description | Example |
|---|---|---|
| `REFRESH_TOKEN_TTL_DAYS` | Lifetime of a refresh token issued without "remember me" in days. | `7` |
| `REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME` | Lifetime of a refresh token issued with "remember me" in days. | `30` |

### SMTP (outbound email)

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname. | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port. | `587` |
| `SMTP_USERNAME` | SMTP authentication username. | `no-reply@example.com` |
| `SMTP_PASSWORD` | SMTP authentication password. **Change before deploying.** | `change-me` |
| `SMTP_FROM_ADDRESS` | Envelope and header From address. | `no-reply@example.com` |
| `SMTP_FROM_NAME` | Display name shown in the From header. | `Auth Starter` |
| `SMTP_TLS` | Set to `true` to use STARTTLS. | `true` |

### Rate limiting

| Variable | Description | Example |
|---|---|---|
| `RATE_LIMIT_LOGIN_MAX_ATTEMPTS` | Maximum login attempts allowed in the window. | `5` |
| `RATE_LIMIT_LOGIN_WINDOW_SECONDS` | Sliding window duration for login rate limiting in seconds. | `60` |
| `RATE_LIMIT_FORGOT_PASSWORD_MAX_ATTEMPTS` | Maximum forgot-password requests allowed in the window. | `3` |
| `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS` | Sliding window duration for forgot-password rate limiting in seconds. | `300` |

### Application

| Variable | Description | Example |
|---|---|---|
| `APP_BASE_URL` | Public base URL of the frontend application. Used to construct password-reset links in emails. | `http://localhost:3000` |
| `CORS_ORIGIN` | Origin allowed by the CORS middleware. Should match the frontend origin. | `http://localhost:3000` |

---

## Security notes

- Passwords are hashed with bcrypt at the configured work factor; plaintext passwords are never stored or logged.
- Password-reset tokens and refresh tokens are stored as SHA-256 hashes; the raw token is sent only once (in the email or response) and is never persisted.
- The `/auth/forgot-password` endpoint always returns the same `202 Accepted` response regardless of whether the email exists, preventing user enumeration.
- The `/auth/login` endpoint always returns `"Invalid email or password."` on failure for the same reason.
- Refresh tokens are rotated on every use and fully revoked on logout.

# Enterprise IAM Platform

A runnable, full-stack Identity & Access Management starter built with **FastAPI + SQLite + JWT + React (Vite)**. It is a real working application, not a static UI mockup.

## Features
- Login with JWT bearer tokens
- Password hashing (PBKDF2)
- User directory: list, create, enable/disable users
- Role-based access control (RBAC): `admin`, `manager`, `viewer`
- Admin-only user management
- Audit events for login and user changes
- Dashboard with user and audit counts
- Docker support
- Seeded local demo accounts

> **Security note:** This is a portfolio/starter implementation, not production-certified IAM. Before real organizational use, add HTTPS, refresh-token rotation, MFA, email verification, rate limiting, secret management, backups, security review, and a mature identity provider such as Keycloak. Do not expose the seeded credentials on a public deployment.

## Requirements
- Python 3.11+
- Node.js 20+ (for frontend), or Docker + Docker Compose

## Run locally

### 1) Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2) Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Seeded accounts
- Admin: `admin@acme.local` / `ChangeMe_Admin123!`
- Manager: `manager@acme.local` / `ChangeMe_Manager123!`
- Viewer: `viewer@acme.local` / `ChangeMe_Viewer123!`

Change these before any shared/public use. Local data is stored in `backend/iam.db`.

## Docker Compose
```bash
docker compose up --build
```
Frontend: http://localhost:5173  
Backend API docs: http://localhost:8000/docs

## API overview
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/users` (authenticated)
- `POST /api/users` (admin only)
- `PATCH /api/users/{user_id}/status` (admin only)
- `GET /api/audit` (admin/manager)

## Suggested next steps
1. Replace local login with Keycloak OIDC (authorization code + PKCE).
2. Add MFA and password reset.
3. Add department/group membership and access reviews.
4. Add tests, CI pipeline, structured logging, and deployment manifests.

# TalkForms

A full-stack platform for **agentic forms**: admins design conversational data-collection flows (with optional AI-assisted drafting), and end users complete them through **chat** or **voice**. The product UI brands the consumer experience as **TalkForms**.

The repository contains a **React (Vite) frontend** and a **FastAPI backend** with SQL persistence, JWT auth for admins, and Groq-powered speech and language models.

---

## What the application does

### Admin experience (authenticated)

- **Landing** (`/`) — Entry point with links to admin login and the legacy voice demo.
- **Login** (`/admin/login`) — Email/password authentication; JWT access tokens; optional redirect after login.
- **Protected admin area** (`/admin/*`):
  - **Dashboard** — Organization-level analytics: total submissions and sessions, completion rate, published vs draft forms, 7-day submission trends, average time to complete, breakdown by channel (chat/voice), 14-day daily submission chart, per-form submission counts, and recent submissions.
  - **Form editor** (`/admin/forms/new`, `/admin/forms/:formId`) — Create and edit **draft** forms: title, description, URL **slug**, **mode** (`chat`, `voice`, or `chat_voice`), **persona**, **system prompt** (instructions for the conversational agent), and a structured **fields schema** (name, type, required, description). **Published** forms cannot be edited in place (API enforces this).
  - **AI form generation** — `POST /v1/orgs/{org_id}/forms/generate` turns a natural-language prompt into title, description, system prompt, and typed fields (Groq Llama via LiteLLM).
  - **Publish** — Validates that the form has a system prompt and/or fields, then sets status to `published` and records audit events.
  - **Submissions** (`/admin/forms/:formId/submissions`) — Lists completed runs with per-field answers.
  - **CSV export** — Triggers a server-side export job and audit log entry for submission data.

Admin APIs live under `**/v1`** (`/v1/auth/*`, `/v1/orgs/...`, `/v1/forms/...`).

### Consumer experience (public, no admin account)

- **Public form URL** (`/f/:slug`) — Start screen to choose **chat** or **voice**, then run the form against a **published** form only.
- **Session creation** — Server creates a `RespondentSession`, returns a **signed public session JWT**, and sends an **initial assistant greeting** from the agent.
- **Chat**:
  - Non-streaming and **SSE streaming** message endpoints for token-by-token replies.
  - **Message history** for reconnect/resume.
- **Voice** (session-scoped WebSocket):
  - Auth with session token; stream PCM chunks; server runs **STT → agent → TTS** (with guards for silence/short audio and optional text-only turns).
  - Greeting can be synthesized with TTS without re-running the full voice LLM path.
- **Completion** — Agent engine marks sessions complete and creates **Submission** records when the conversational flow finishes; a **manual complete** endpoint also exists.

Public runtime APIs are under `**/v1/public/...`** (REST) and `**/v1/public/sessions/{session_id}/voice**` (WebSocket).

### Legacy voice agent

- `**/legacy/voice**` — Older Web UI that talks to the standalone `**/ws**` WebSocket and `**/api/***` routes (health, settings, voices, Groq connectivity check via `/api/spin`). This path is separate from the agentic form session flow.

---

## Backend capabilities (technical)


| Area                | Details                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agentic engine**  | OpenAI **Agents SDK** with **LiteLLM** to **Groq** (`llama-3.3-70b-versatile`), **function tools** (e.g. `save_answer`) to persist answers with validation (reject fillers, placeholders, bad values). |
| **Voice pipeline**  | `openai-agents[voice]` voice workflow integrated with app `VoiceService` (Groq STT/TTS/LLM stack under `backend/src/voiceagent/`).                                                                     |
| **Form generation** | Dedicated LLM JSON extraction from admin prompts (`backend/v1/services/form_generator.py`).                                                                                                            |
| **Data model**      | Organizations, admin users, memberships, forms (agentic fields + legacy graph/version tables in schema), respondent sessions, messages, answers, submissions, audit logs, export jobs.                 |
| **Database**        | SQLAlchemy 2; **Alembic** migrations with fallback to `create_all`; default **SQLite** (`DATABASE_URL` overrides, e.g. PostgreSQL in production).                                                      |
| **Bootstrap**       | Seeds default org + admin from env (`AGENTIC_DEFAULT_ORG_NAME`, `AGENTIC_ADMIN_EMAIL`, `AGENTIC_ADMIN_PASSWORD`).                                                                                      |
| **Security**        | Bcrypt-compatible password hashing; JWT for admins and public sessions (`JWT_SECRET`, `ACCESS_TOKEN_TTL_MIN`, `PUBLIC_SESSION_TTL_HOURS`).                                                             |


---

## Frontend capabilities (technical)

- **React 18**, **React Router 7**, **TanStack Query**, **Tailwind CSS**, **Framer Motion**.
- **Lazy-loaded routes** and a **protected admin route** wired to `AuthProvider`.
- **HTTP client** for `/v1` REST; **WebSocket** usage for public form voice and (where applicable) legacy voice.
- **Shared UI** — Layout shell, buttons, inputs, modals, cards, error boundary, tests (Vitest) for some components.

---

## API surface (quick reference)


| Prefix                           | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| `GET /`                          | Service metadata (links to `/ws`, `/api`, `/v1`).                    |
| `/api/*`                         | Legacy/config: health, settings, voices, Groq warm-up (`/api/spin`). |
| `/ws`                            | Legacy voice WebSocket.                                              |
| `/v1/auth/*`                     | Admin login, refresh, `me`.                                          |
| `/v1/orgs/{org_id}/...`          | Forms list, generate, create, dashboard.                             |
| `/v1/forms/{form_id}/...`        | Get, update (draft), publish, submissions, CSV export.               |
| `/v1/public/f/{slug}/sessions`   | Create consumer session.                                             |
| `/v1/public/sessions/{id}/...`   | Message, stream, messages, complete.                                 |
| `/v1/public/sessions/{id}/voice` | Agentic voice WebSocket.                                             |


---

## Prerequisites

- **Node.js** (for the frontend).
- **Python 3.11+** recommended (see `backend/pyproject.toml` / `backend/requirements.txt`).
- **Groq API key** for LLM, form generation, and voice features (`GROQ_API_KEY`).
- **Database** — optional; defaults to SQLite file if `DATABASE_URL` is unset.

---

## Environment variables (common)


| Variable                                                                      | Role                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `GROQ_API_KEY`                                                                | LLM, form generation, STT/TTS (voice).                           |
| `DATABASE_URL`                                                                | SQLAlchemy URL (default: `sqlite:///./agentic_forms.db`).        |
| `JWT_SECRET`                                                                  | Sign admin and public session tokens (**change in production**). |
| `AGENTIC_ADMIN_EMAIL` / `AGENTIC_ADMIN_PASSWORD` / `AGENTIC_DEFAULT_ORG_NAME` | Seed admin and org on startup.                                   |
| `ACCESS_TOKEN_TTL_MIN`, `PUBLIC_SESSION_TTL_HOURS`                            | Token lifetimes.                                                 |


Backend server settings (host, port, CORS, log level) are in `backend/config.py` (`BackendSettings`).

Frontend dev proxy expects the API on port **8000** unless overridden; use `**VITE_BACKEND_URL`** and `**VITE_WS_URL**` in `frontend/.env` when the backend is not on `localhost:8000`.

---

## Local development

**Backend** (from repository root, with dependencies installed per `backend/pyproject.toml` or `pip install -r backend/requirements.txt`):

```bash
cd backend
# configure .env with GROQ_API_KEY, JWT_SECRET, DATABASE_URL as needed
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Run from the **repository root** so the `backend` package and `voiceagent` under `backend/src` resolve correctly (as in `backend/main.py`).

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app (default **[http://localhost:5173](http://localhost:5173)**) and proxies `/api`, `/v1`, and `/ws` to the backend.

**Tests** — Backend tests under `backend/tests/`; frontend: `npm run test` in `frontend/`.

---

## Project layout

```
frontend/          # Vite + React SPA (admin + consumer + legacy voice UI)
backend/           # FastAPI app (main.py), v1 agentic API, voice services
backend/v1/      # Models, routes, agent engine, migrations, security
backend/src/voiceagent/   # Groq STT/TTS/LLM and audio helpers
```

---

## License / deployment notes

- The repo includes a **Vercel** entrypoint (`backend/index.py` re-exports the FastAPI app). Production deployments should set strong secrets, a real `DATABASE_URL`, and CORS origins in `BackendSettings` as appropriate.

For OpenAPI documentation in development, run the backend and open `**/docs`** (Swagger UI) on the API host.
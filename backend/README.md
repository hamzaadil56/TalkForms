# TalkForms Backend

FastAPI backend for TalkForms. Provides the `/v1` REST API and voice WebSocket, powered by Groq (LLM, STT, TTS) and Neon Postgres.

---

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) — install once:

  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

- `ffmpeg` — required for WebM → WAV audio conversion:

  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu / Debian
  sudo apt install ffmpeg
  ```

---

## Local Development

### 1. Install dependencies

From the `backend/` directory:

```bash
cd backend
uv sync
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp ../.env.example .env
```

Required variables in `.env`:

| Variable | Description |
| --- | --- |
| `GROQ_API_KEY` | Groq API key (LLM + STT + TTS) |
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Strong random secret — `openssl rand -hex 32` |
| `AGENTIC_ADMIN_EMAIL` | Bootstrap admin email (first run only) |
| `AGENTIC_ADMIN_PASSWORD` | Bootstrap admin password (first run only) |

### 3. Run database migrations

```bash
cd backend
uv run alembic upgrade head
```

### 4. Start the dev server

Run this from the `backend/` directory:

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

All imports use local module paths (e.g. `from config import ...`). Running from `backend/` makes Python's working directory the package root — no `PYTHONPATH` setup needed.

The API will be available at `http://localhost:8000`. Verify with:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## Production — Docker

### Build and run with Docker Compose

From the **repo root**:

```bash
# 1. Copy and fill in the env file
cp .env.example .env

# 2. Build and start the backend container
docker compose up -d --build

# 3. Run migrations inside the container (first deploy and after each update)
docker compose exec backend uv run alembic upgrade head
```

The backend binds to `127.0.0.1:8000` — Nginx proxies public traffic to it.

### Rebuild after code changes

```bash
docker compose up -d --build
```

### View logs

```bash
docker compose logs -f backend
```

### Stop

```bash
docker compose down
```

---

## Production — Nginx

Copy the provided config and enable it:

```bash
sudo cp nginx/talkforms.conf /etc/nginx/sites-available/talkforms
sudo ln -s /etc/nginx/sites-available/talkforms /etc/nginx/sites-enabled/talkforms

# Edit yourdomain.com in the config
sudo nano /etc/nginx/sites-available/talkforms

sudo nginx -t && sudo systemctl reload nginx
```

---

## Frontend (static files)

```bash
cd frontend
npm install
npm run build

# Copy dist to the path Nginx serves from
sudo cp -r dist /var/www/talkforms/frontend/
```

---

## Migrations

| Command | Description |
| --- | --- |
| `uv run alembic upgrade head` | Apply all pending migrations |
| `uv run alembic downgrade -1` | Roll back one migration |
| `uv run alembic current` | Show current migration version |
| `uv run alembic revision --autogenerate -m "description"` | Generate a new migration from model changes |

Run these from the `backend/` directory.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `DATABASE_URL` | Yes | SQLite (`agentic_forms.db`) | Postgres connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `AGENTIC_ADMIN_EMAIL` | First run | — | Bootstrap admin email |
| `AGENTIC_ADMIN_PASSWORD` | First run | — | Bootstrap admin password |
| `AGENTIC_DEFAULT_ORG_NAME` | No | `Default Workspace` | Initial org name |
| `CORS_ORIGINS` | No | `["http://localhost:5173"]` | Allowed frontend origins (JSON array) |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `ACCESS_TOKEN_TTL_MIN` | No | `60` | Admin JWT expiry (minutes) |
| `PUBLIC_SESSION_TTL_HOURS` | No | `8` | Consumer session TTL (hours) |
| `OPENAI_AGENTS_DISABLE_TRACING` | No | — | Set to `true` to disable OpenAI tracing |

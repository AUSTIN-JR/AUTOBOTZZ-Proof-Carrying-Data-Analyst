# AGENTS.md — running AUTOBOTZZ in the Base44 sandbox

Two processes, no database: a FastAPI backend (in-memory session store) and a
Next.js 14 frontend. `docker-compose.base44.yml` runs both from the bind-mounted
source with hot reload.

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- Web (preview): http://localhost:3000 — API: http://localhost:8000 (`/health`, `/docs`).
- The API image (`backend/Dockerfile.base44`) only installs `requirements.txt`;
  app code comes from the bind mount at `/workspace`. Rebuild it after editing
  `backend/requirements.txt`.
- Frontend deps are installed at container start with `npm ci`, so
  `frontend/node_modules` and `frontend/.next` live inside the repo (gitignored).
- Polling watchers (`WATCHPACK_POLLING`) are on because bind mounts often miss
  inotify events.

## Non-obvious behaviour

- The demo-data loader resolves fixtures relative to the repo root
  (`datasets/demo/*.csv`), computed from the source file location — the whole
  repo must be mounted, not just `backend/`.
- Analysis proof scripts run as a `sys.executable` subprocess inside the API
  container, so pandas/numpy must be installed there (they are).
- The frontend reads `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL`. Compose
  points them at `https://8000-${BASE44_PUBLIC_HOST_SUFFIX}` (separate-origin
  wiring), and `AUTOBOTZZ_ALLOWED_ORIGINS` must contain
  `https://3000-${BASE44_PUBLIC_HOST_SUFFIX}` or the browser calls fail CORS.
  Nothing is hardcoded; both derive from `BASE44_PUBLIC_HOST_SUFFIX`.
- No external services or credentials are required: `app/services/gemini_service.py`
  is an empty placeholder for a later phase and no code reads `GEMINI_API_KEY`.
  State is in-memory, so restarting the API clears loaded datasets.

## Verifying

```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/datasets/load-demo | head -c 200
docker compose -f docker-compose.base44.yml exec -T api python -m pytest -q
```

Demo flow in the UI: **Load Demo Data (4 Datasets)** → ask
"What was net revenue in September after refunds?" to see the verified
₹150,400.50 answer, and "Convert all USD and INR revenue into INR." to see the
deliberate refusal path.

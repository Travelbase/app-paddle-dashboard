# Changelog — Team Paddle Dashboard

## 2026-06-18 — Onboarded to apps.travelbase.eu

Normalised the Lovable export into a Travelbase App on Cloud Run behind the apps-gateway:

- `serve.js` rewritten: removed the hard-coded HTTP basic-auth gate (auth is now the gateway's job),
  added `BASE_PATH` sub-path handling + trailing-slash redirect, structured JSON logging, path-
  traversal guard, and configurable export-API host. Default port now 8080.
- `dashboard.html`: `PROXY_URL` made relative (`api/export`) so it resolves under the base path.
- Added `Dockerfile`, `.dockerignore`, and `.github/workflows/deploy.yml` (Cloud Build → Cloud Run).
- Added README / CLAUDE / docs (architecture, runbook, data-access, this changelog).
- Removed `Procfile` (Heroku) and `proxy-server.js` (dev-only duplicate of the serve.js proxy).
- Registered in the `travelbase-apps` registry as `paddle-dashboard` (internal-tool).

> Known gap: 19 persona avatar images referenced in `dashboard.html` (e.g. `images/kayak-clara.png`)
> are not in the repo; the cards self-remove the broken `<img>` via `onerror`, so they degrade
> gracefully. Add the artwork to `images/` to restore them.

# Changelog — Team Paddle Dashboard

## 2026-10-06 — Prereg comparison per language per project (2027 view)

- New "Pre-registrations per language — '27 vs previous seasons" block in the 2027 view, directly
  under the Pre-Registration Tracker: one row per project (Packraft Micro's split by destination),
  one column group per season that has prereg leads (NL / FR / DE / EN / Total), plus a Δ column
  vs the previous season. A "To date / Full season" toggle aligns past seasons on the same point in
  season (same shift-and-cut logic as the "% preregs vs 'YY" scorecard) or shows their final totals.
  A grouped bar chart underneath repeats the per-project totals per season. Respects the
  trip/group/language filters.
- Hoisted `PRT_DEST` / `getPRTDest()` and the lead brand label/colour/order maps to module scope
  (`LEAD_BRAND_LABELS`, `LEAD_BRAND_COLORS`, `LEAD_BRAND_ORDER`) so the leads table and the new
  block share them.

## 2026-06-18 — Export keys moved to Secret Manager; repo renamed

- Removed all 21 export-report `id`/`key` pairs from `dashboard.html`. The browser now sends only a
  report `id`; `serve.js` attaches the key from `EXPORT_KEYS` (mounted from Secret Manager
  `paddle-dashboard-export-keys`). Keys no longer ship to the browser or live in the repo.
- Repo renamed `app-paddledashboard` → `app-paddle-dashboard` (consistency with other `app-*` repos);
  WIF deploy binding updated to the new name.

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

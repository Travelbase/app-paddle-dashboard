# Team Paddle Dashboard — Agent Instructions

## What this is

Internal analytics dashboard for Travelbase's paddle/canoe trips (bookings, web stats, leads,
personas, team performance). A single static `dashboard.html` (vanilla JS + Chart.js, no build step,
no framework) served by a tiny Node static server (`serve.js`). Runs as Cloud Run service
`paddle-dashboard` in GCP project `travelbase-apps`, served to employees at
`https://apps.travelbase.eu/a/paddle-dashboard`.

- **Type:** internal-tool · **Runtime:** Cloud Run service `paddle-dashboard`
- **Manifest:** governed in the `travelbase-apps` registry (`registry/paddle-dashboard.yaml`)
- **Layout:** `dashboard.html` (the whole UI) + `images/` + `serve.js` (static server + `/api/export`
  proxy). That's it.

## Conventions

- **No build step, no framework, no bundler.** All UI lives in `dashboard.html`. `serve.js` uses
  only Node built-ins (`http`/`https`/`fs`/`path`) — keep it dependency-free.
- The app is mounted under a sub-path (`/a/paddle-dashboard/`). All asset and API URLs in
  `dashboard.html` are **relative** (`images/…`, `api/export`) so they resolve under the base path.
  Never hardcode a leading-slash absolute path or `/a/paddle-dashboard/` — `serve.js` strips the
  `BASE_PATH` prefix and relies on relative URLs + the trailing-slash redirect.
- Structured JSON logs with standard event names (`app.started`, `external_api.failed`) — see
  `travelbase-apps/standards/logging.md`.
- Never commit secrets. This app currently needs none.

## Auth

None in the app. The shared **apps-gateway** authenticates every request (Logto SSO, @travelbase.eu
only) and reverse-proxies to this container. Do **not** add app-level login — see
`travelbase-apps/standards/auth.md`. (The original Lovable build had a basic-auth gate; it was
removed in favour of the gateway.)

## Data

Read-only. The dashboard fetches report data from the legacy Travelbase export API
(`admin.travelbase.eu/task/export`) via the same-origin `/api/export` proxy in `serve.js`. The
browser sends only a report `id`; `serve.js` attaches the export key from `EXPORT_KEYS` (mounted from
Secret Manager `paddle-dashboard-export-keys`). **Export keys are secrets — keep them in Secret
Manager, never in `dashboard.html` or the repo.** Keep in sync with the manifest's `data` +
`integrations` blocks. See [`docs/data-access.md`](docs/data-access.md).

## Deploying

Push to `main` → `.github/workflows/deploy.yml` builds via Cloud Build and deploys to Cloud Run.
One-time GCP / gateway wiring is in [`docs/runbook.md`](docs/runbook.md).

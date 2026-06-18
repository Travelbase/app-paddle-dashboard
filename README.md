# Team Paddle Dashboard

> Internal analytics dashboard for the Travelbase paddle/canoe trips — bookings, web stats,
> leads, personas and team performance, in one page.

- **Type:** internal-tool
- **Owner:** business=marketing · technical=tech
- **Manifest:** [`travelbase-apps/registry/paddle-dashboard.yaml`](https://github.com/Travelbase/travelbase-apps/blob/main/registry/paddle-dashboard.yaml)
- **Live:** https://apps.travelbase.eu/a/paddle-dashboard

## What it does

A single self-contained `dashboard.html` (vanilla JS + [Chart.js](https://www.chartjs.org/))
visualises the paddle/canoe trips. It pulls its data at runtime from the legacy Travelbase
**export API** (`admin.travelbase.eu/task/export`) through a same-origin proxy in `serve.js`, so the
browser never makes a cross-origin call and no API keys are exposed beyond the public report
`id`/`key` pairs already embedded in the page.

There is no build step and no framework — `serve.js` is a ~120-line Node static server using only
built-in modules.

## Running locally

```bash
# Root-mounted (no gateway), serves at http://localhost:8080/
node serve.js

# Or emulate production (mounted under the gateway base path):
BASE_PATH=/a/paddle-dashboard PORT=8080 node serve.js
# → http://localhost:8080/a/paddle-dashboard/
```

No environment variables or secrets are required. Optional overrides:

| Var          | Default                 | Purpose                                            |
|--------------|-------------------------|----------------------------------------------------|
| `PORT`       | `8080`                  | Listen port (Cloud Run sets this).                 |
| `BASE_PATH`  | `/` (local), `/a/paddle-dashboard/` (Docker) | Sub-path the app is mounted under; stripped before routing. |
| `EXPORT_HOST`| `admin.travelbase.eu`   | Upstream export API host (proxy target).           |

## Deployment

Push to `main` → [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the Docker
image (Cloud Build) and deploys to Cloud Run service `paddle-dashboard` in project `travelbase-apps`
(region `europe-west1`). The shared **apps-gateway** fronts it on `apps.travelbase.eu/a/paddle-dashboard`
and enforces Logto SSO (@travelbase.eu only) — the app does no auth itself.

See [`docs/runbook.md`](docs/runbook.md) for operations.

## Data

Read-only. Pulls report data from the legacy Travelbase export API — see
[`docs/data-access.md`](docs/data-access.md).

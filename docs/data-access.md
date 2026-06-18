# Data access — Team Paddle Dashboard

## Summary

Read-only. The dashboard has no database and stores nothing. All data comes from the legacy
Travelbase **export API** at runtime.

## Reads

| Source                                | What                                              | Credentials                                   |
|---------------------------------------|---------------------------------------------------|-----------------------------------------------|
| `admin.travelbase.eu/task/export`     | Bookings (unified), web stats, leads, per-trip detail | Per-report export keys, server-side (Secret Manager) |

The browser POSTs only a report `{ id }` to the same-origin `/api/export`. `serve.js` looks up that
report's key in `EXPORT_KEYS`, attaches it, and forwards `{ id, key }` to
`admin.travelbase.eu/task/export`. **The keys never reach the browser and are not in the repo** — a
client-sent key is ignored.

## Writes

None.

## Secrets

| Secret (Google Secret Manager)      | Mounted as   | Contents                                              |
|-------------------------------------|--------------|-------------------------------------------------------|
| `paddle-dashboard-export-keys`      | `EXPORT_KEYS`| JSON map of export-report `id` → `key` (~21 reports)  |

The secret lives in project `travelbase-apps`; the runtime SA `paddle-dashboard@` holds
`secretAccessor` on it, and Cloud Run mounts it as the `EXPORT_KEYS` env var. To add/rotate a report
key: `gcloud secrets versions add paddle-dashboard-export-keys --data-file=<new.json>` (then redeploy
or it picks up `:latest` on the next revision). Never embed export keys in `dashboard.html`.

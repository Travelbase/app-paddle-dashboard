# Data access — Team Paddle Dashboard

## Summary

Read-only. The dashboard has no database and stores nothing. All data comes from the legacy
Travelbase **export API** at runtime.

## Reads

| Source                                | What                                              | Credentials                                   |
|---------------------------------------|---------------------------------------------------|-----------------------------------------------|
| `admin.travelbase.eu/task/export`     | Bookings (unified), web stats, leads, per-trip detail | Public report `{ id, key }` pairs embedded in `dashboard.html` |

The page POSTs `{ id, key }` to the same-origin `/api/export`, which `serve.js` forwards verbatim to
`admin.travelbase.eu/task/export`. The proxy adds **no** authentication header — these report keys
are scoped access tokens for individual exports, not account credentials, and are already shipped to
the browser. They are not stored in Secret Manager.

## Writes

None.

## Secrets

None. If the export API ever requires a real credential, add it to Google Secret Manager (project
`travelbase-apps`, name `paddle-dashboard-export-api-key`), mount it as an env var on the Cloud Run
service, read it in `serve.js`, and record the secret **name** in the manifest's `integrations`
block. Never embed account credentials in `dashboard.html`.

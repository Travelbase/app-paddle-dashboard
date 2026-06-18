# Architecture — Team Paddle Dashboard

## Shape

```
Browser (employee, @travelbase.eu)
  │  https://apps.travelbase.eu/a/paddle-dashboard/
  ▼
apps-gateway (Cloud Run)            ← Logto SSO; reverse-proxies /a/paddle-dashboard/* here
  │
  ▼
paddle-dashboard (Cloud Run, this repo)
  ├── serve.js          static server + POST /api/export proxy
  ├── dashboard.html    the entire UI (vanilla JS + Chart.js)
  └── images/           hero + persona artwork
        │  POST /api/export   (same origin)
        ▼
   admin.travelbase.eu/task/export   ← legacy Travelbase export API (report id/key)
```

## How it works

- **One container, one process.** `serve.js` (Node built-ins only) serves static files and proxies
  the single data endpoint. No database, no build, no framework.
- **Sub-path mounting.** In production the app lives under `/a/paddle-dashboard/`. The gateway
  forwards the full path; `serve.js` strips `BASE_PATH` and redirects the bare base to a trailing
  slash so the page's relative URLs (`images/…`, `api/export`) resolve correctly. Locally
  `BASE_PATH` is empty and everything is at the root.
- **Data flow.** `dashboard.html` issues `POST api/export` with a report `{ id, key }`; `serve.js`
  forwards the body verbatim to `admin.travelbase.eu/task/export` and streams the JSON back. Several
  reports (unified bookings, web stats, leads, per-trip detail APIs) are fetched in parallel and
  rendered into scorecards, charts, persona cards and tables.
- **Auth** is entirely at the gateway (Logto, @travelbase.eu). The app trusts that it only ever
  receives authenticated traffic.

## Why this stayed vanilla

It originated as a Lovable export — a single hand-built HTML page. There was no value in porting it
to the `@travelbase/app-api-kit` Bun stack (as `app-roadtrip-africa` did): it has exactly one
read-only proxy endpoint and no typed actions, writes, or secrets. The kit is the right tool when an
app grows a real API; this one hasn't.

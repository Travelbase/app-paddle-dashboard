# Runbook — Team Paddle Dashboard

## What the app does

Serves a single static analytics dashboard for the paddle/canoe trips and proxies its read-only data
calls to the legacy Travelbase export API. Internal-only, fronted by the apps-gateway (Logto SSO).

- **Live:** https://apps.travelbase.eu/a/paddle-dashboard
- **Cloud Run service:** `paddle-dashboard` · project `travelbase-apps` · region `europe-west1`
- **Runtime service account:** `paddle-dashboard@travelbase-apps.iam.gserviceaccount.com`

## How to deploy

Push to `main` → `.github/workflows/deploy.yml` builds via Cloud Build and runs
`gcloud run deploy paddle-dashboard --source .`. Manual:

```bash
gcloud run deploy paddle-dashboard \
  --project travelbase-apps --region europe-west1 --source . \
  --labels app=paddle-dashboard --ingress all --no-allow-unauthenticated \
  --service-account paddle-dashboard@travelbase-apps.iam.gserviceaccount.com
```

> **Ingress must be `all`**, not `internal-and-cloud-load-balancing`. The gateway reverse-proxies to
> this service's public `*.run.app` URL; locking ingress to the LB returns a Google 404. Auth is
> still enforced — only `apps-gateway@` holds `run.invoker` and the gateway presents an ID token.

## One-time setup (per GCP / this repo)

1. **Runtime SA:** `gcloud iam service-accounts create paddle-dashboard --project travelbase-apps`.
2. **Deploy auth (WIF):** bind `roles/iam.workloadIdentityUser` on `gh-deploy@` for
   `principalSet://…/attribute.repository/Travelbase/app-paddle-dashboard`, and set repo Actions
   secrets `WIF_PROVIDER` and `DEPLOY_SERVICE_ACCOUNT` (= `gh-deploy@travelbase-apps…`).
3. **Gateway invoke:** grant `roles/run.invoker` on the `paddle-dashboard` service to
   `apps-gateway@travelbase-apps.iam.gserviceaccount.com`.
4. **Export keys (secret):** the export-report keys live in Secret Manager
   `paddle-dashboard-export-keys` (JSON `id`→`key`); the runtime SA holds `secretAccessor` and the
   service mounts it as `EXPORT_KEYS`
   (`gcloud run services update paddle-dashboard --update-secrets EXPORT_KEYS=paddle-dashboard-export-keys:latest`).
5. **Registry:** add `registry/paddle-dashboard.yaml` in `travelbase-apps` — this is what mounts the
   app on the gateway and the portal. No gateway code change is needed.

## Where logs are

- Cloud Logging, filtered by `resource.labels.service_name="paddle-dashboard"` (or `labels.app`).
- Console: https://console.cloud.google.com/run/detail/europe-west1/paddle-dashboard/logs?project=travelbase-apps

## Common failures & what they mean

| Symptom / log event   | Meaning                                            | Action                                         |
|-----------------------|----------------------------------------------------|------------------------------------------------|
| Charts empty / spinner| `admin.travelbase.eu/task/export` errored          | check `external_api.failed` logs; verify the export API |
| `400 unknown report id`| `EXPORT_KEYS` secret not mounted, or a report id has no key | confirm `EXPORT_KEYS` is mounted (`paddle-dashboard-export-keys`) and contains that id |
| `external_api.failed` | upstream export API unreachable                    | retry; check admin.travelbase.eu status        |
| Google 404 page       | service deployed with wrong ingress                | redeploy with `--ingress all`                  |
| Redirect to Logto loop| not signed in / not @travelbase.eu                 | sign in with a Travelbase Google account       |

## How to roll back

```bash
gcloud run services update-traffic paddle-dashboard \
  --project travelbase-apps --region europe-west1 --to-revisions <PREVIOUS_REVISION>=100
```

## Data read/written

- **Reads:** legacy Travelbase export API (`admin.travelbase.eu/task/export`) — bookings, web stats,
  leads, per-trip detail. Keyed by per-report keys in Secret Manager `paddle-dashboard-export-keys`.
- **Writes:** none.

## Contacts

- Technical owner: tech
- Business owner: marketing

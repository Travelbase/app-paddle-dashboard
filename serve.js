// Team Paddle Dashboard — single static server for Cloud Run.
//
// Serves the built dashboard (dashboard.html + images/) AND proxies the
// dashboard's data calls (POST /api/export) to the legacy Travelbase export API
// at admin.travelbase.eu/task/export (same-origin, so the browser needs no CORS).
//
// Auth is NOT handled here. On apps.travelbase.eu the shared apps-gateway gates
// every request behind Logto SSO (@travelbase.eu only) before it reaches this
// container — see travelbase-apps/standards/auth.md ("Do not implement custom
// login in the app"). Locally there is no gate.
//
// The app is mounted under a sub-path in production (/a/paddle-dashboard/). The
// gateway forwards the full path, so we strip BASE_PATH before resolving files.
// Locally BASE_PATH is "/" and everything is served from the root.
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
// "/a/paddle-dashboard" (no trailing slash) in prod, "" locally.
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

// Upstream legacy export API. Overridable for testing, but defaults to prod.
const EXPORT_HOST = process.env.EXPORT_HOST || "admin.travelbase.eu";
const EXPORT_PATH = process.env.EXPORT_PATH || "/task/export";

// Per-report export-API keys, kept server-side. Mounted from Google Secret
// Manager (secret `paddle-dashboard-export-keys`) as the EXPORT_KEYS env var —
// a JSON map of report id → key. The browser sends only an `id`; serve.js
// attaches the matching key before proxying, so the credentials never ship to
// the client or live in the repo.
const EXPORT_KEYS = (() => {
  try {
    return JSON.parse(process.env.EXPORT_KEYS || "{}");
  } catch {
    console.error(JSON.stringify({ severity: "ERROR", app: "paddle-dashboard", event: "config.invalid", field: "EXPORT_KEYS" }));
    return {};
  }
})();

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function log(event, fields = {}) {
  console.log(JSON.stringify({ severity: "INFO", app: "paddle-dashboard", event, ...fields }));
}

function proxyExport(req, res) {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw || "{}");
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON body" }));
      return;
    }

    // Attach the server-side key for the requested report; never trust a key
    // sent by the client.
    const key = EXPORT_KEYS[String(payload.id)];
    if (!key) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `unknown report id: ${payload.id ?? "(none)"}` }));
      return;
    }
    const body = JSON.stringify({ ...payload, key });

    const options = {
      hostname: EXPORT_HOST,
      path: EXPORT_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on("error", (err) => {
      console.error(
        JSON.stringify({ severity: "ERROR", app: "paddle-dashboard", event: "external_api.failed", upstream: EXPORT_HOST, error: err.message }),
      );
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });
    proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  // Strip the query string and the production base path so routing below is
  // identical locally and behind the gateway.
  const rawPath = req.url.split("?")[0];

  // Mounted under a sub-path: a request to the bare base (no trailing slash)
  // must redirect so the page's RELATIVE asset/API URLs (images/…, api/export)
  // resolve under the base instead of the domain root.
  if (BASE_PATH && rawPath === BASE_PATH) {
    res.writeHead(301, { Location: BASE_PATH + "/" });
    res.end();
    return;
  }

  let urlPath = rawPath;
  if (BASE_PATH && urlPath.startsWith(BASE_PATH)) urlPath = urlPath.slice(BASE_PATH.length);
  if (urlPath === "") urlPath = "/";

  // Data proxy — relative "api/export" from the dashboard lands here.
  if (req.method === "POST" && urlPath === "/api/export") {
    return proxyExport(req, res);
  }

  // Static files. "/" → dashboard.html; otherwise serve from the repo root.
  const rel = urlPath === "/" ? "dashboard.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.join(__dirname, rel);

  // Guard against path traversal escaping the app directory.
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "text/plain" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  log("app.started", { port: PORT, basePath: BASE_PATH || "/" });
});

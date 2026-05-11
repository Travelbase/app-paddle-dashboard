const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4747;
const USERNAME = "paddleteam";
const PASSWORD = "paddleteam";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  // Basic auth check
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Tessa\'s Paddle Dashboard"' });
    res.end("Unauthorized");
    return;
  }
  const [user, pass] = Buffer.from(auth.split(" ")[1], "base64").toString().split(":");
  if (user !== USERNAME || pass !== PASSWORD) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Tessa\'s Paddle Dashboard"' });
    res.end("Unauthorized");
    return;
  }

  // API proxy endpoint
  if (req.method === "POST" && req.url === "/api/export") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const options = {
        hostname: "admin.travelbase.eu",
        path: "/task/export",
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
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });
      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Static files
  const file = req.url === "/" ? "/dashboard.html" : req.url;
  const filePath = path.join(__dirname, file);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
});

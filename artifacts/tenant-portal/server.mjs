/**
 * Minimal static file server for the tenant-portal dist/public directory.
 * Used as the workflow dev command via: vite build && node server.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 24567);
const BASE_PATH = process.env.BASE_PATH ?? "/tenant-portal/";
const PUBLIC_DIR = path.join(__dirname, "dist", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    serveIndex(res);
  }
}

function serveIndex(res) {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  try {
    const data = fs.readFileSync(indexPath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  // Strip base path prefix
  let urlPath = req.url?.split("?")[0] ?? "/";
  if (urlPath.startsWith(BASE_PATH)) {
    urlPath = urlPath.slice(BASE_PATH.length - 1); // keep leading slash
  }
  if (urlPath === "" || urlPath === "/") {
    urlPath = "/index.html";
  }

  const filePath = path.join(PUBLIC_DIR, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
  } else {
    // SPA fallback — serve index.html for all unknown routes
    serveIndex(res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CivicAI Tenant Portal — http://localhost:${PORT}${BASE_PATH}`);
});

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());

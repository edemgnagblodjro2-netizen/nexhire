import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;
const isBuild = process.argv.some((a) => a === "build");

if (!rawPort && !isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort ?? "3000");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

const ROOT = path.resolve(import.meta.dirname);

const ROUTE_TO_HTML: Record<string, string> = {
  "/services": "/services.html",
  "/products": "/products.html",
  "/contact": "/contact.html",
  "/careers": "/careers.html",
  "/blog": "/blog.html",
  "/resources": "/resources.html",
  "/privacy": "/privacy.html",
};

function resolveHtmlFile(pathname: string): string | undefined {
  const exact = ROUTE_TO_HTML[pathname];
  if (exact) return exact;
  const segments = pathname.split("/");
  if (segments.length >= 2) {
    const prefix = "/" + segments[1];
    if (ROUTE_TO_HTML[prefix]) return ROUTE_TO_HTML[prefix];
  }
  return undefined;
}

function routeToHtmlMiddleware() {
  return {
    name: "route-to-html",
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const pathname = req.url.split("?")[0].replace(/\/$/, "") || "/";
          const htmlFile = resolveHtmlFile(pathname);
          if (htmlFile) {
            req.url = htmlFile + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
          }
        }
        next();
      });
    },
    configurePreviewServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const pathname = req.url.split("?")[0].replace(/\/$/, "") || "/";
          const htmlFile = resolveHtmlFile(pathname);
          if (htmlFile) {
            req.url = htmlFile + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    routeToHtmlMiddleware(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: ROOT,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(ROOT, "index.html"),
        services: path.resolve(ROOT, "services.html"),
        products: path.resolve(ROOT, "products.html"),
        contact: path.resolve(ROOT, "contact.html"),
        careers: path.resolve(ROOT, "careers.html"),
        blog: path.resolve(ROOT, "blog.html"),
        resources: path.resolve(ROOT, "resources.html"),
        privacy: path.resolve(ROOT, "privacy.html"),
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

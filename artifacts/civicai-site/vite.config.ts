import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

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
    runtimeErrorOverlay(),
    routeToHtmlMiddleware(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
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

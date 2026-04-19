import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { handleStripeWebhook } from "./routes/stripe";

const app: Express = express();

// ── Stripe webhook MUST come before express.json() ──
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// Serve admin panel as static files (production)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDistCandidates = [
  path.resolve(__dirname, "../../admin/dist/public"),
  path.resolve(__dirname, "../../../admin/dist/public"),
  path.resolve(process.cwd(), "artifacts/admin/dist/public"),
  path.resolve(process.cwd(), "../admin/dist/public"),
];
const adminDist = adminDistCandidates.find((p) => fs.existsSync(p));

if (adminDist) {
  logger.info({ adminDist }, "Serving admin panel from static files");

  // Static assets first (CSS, JS, images, favicon).
  app.use("/admin", express.static(adminDist, { index: false }));

  // SPA fallback: any /admin or /admin/* path that didn't hit a static file
  // returns the React index.html so client-side routing can take over.
  // Express 5 dropped string-`*` and bare regex support in path-to-regexp v8;
  // we use the named splat syntax `:rest(.*)?` which is the supported form.
  const sendIndex = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    const indexPath = path.join(adminDist, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        logger.error({ err, indexPath }, "Failed to send admin index.html");
        if (!res.headersSent) next(err);
      }
    });
  };
  app.get("/admin", sendIndex);
  app.get(/^\/admin\/.*$/, sendIndex);
} else {
  logger.warn(
    { tried: adminDistCandidates },
    "Admin panel dist not found; /admin will return 503",
  );
  // Surface a clear message instead of a generic 500/404 so it's obvious the
  // build artifact is missing rather than the server being broken.
  const adminMissing = (_req: express.Request, res: express.Response) => {
    res
      .status(503)
      .type("text/plain")
      .send(
        "Admin panel not deployed: artifacts/admin/dist/public is missing. " +
          "Rebuild with `pnpm -r run build` before redeploying.",
      );
  };
  app.get("/admin", adminMissing);
  app.get("/admin/:rest(.*)", adminMissing);
}

export default app;

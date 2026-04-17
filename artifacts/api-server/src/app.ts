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

// Redirect root to the admin panel
app.get("/", (_req, res) => {
  res.redirect("/admin/");
});

// Serve admin panel as static files (production)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDistCandidates = [
  path.resolve(__dirname, "../../admin/dist/public"),
  path.resolve(__dirname, "../../../admin/dist/public"),
  path.resolve(process.cwd(), "artifacts/admin/dist/public"),
];
const adminDist = adminDistCandidates.find((p) => fs.existsSync(p));
if (adminDist) {
  logger.info({ adminDist }, "Serving admin panel from static files");
  app.use("/admin", express.static(adminDist));
  app.get(/^\/admin(\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });
} else {
  logger.warn("Admin panel dist not found; /admin will 404");
}

export default app;

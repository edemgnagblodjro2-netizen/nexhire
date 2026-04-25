import { Router, type Request } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, bugReportsTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Signalement de bogues.
//
// POST /api/bug-reports        → public submission, IP hashed, rate-limited.
// GET  /api/bug-reports        → admin-only list of recent reports.
// PATCH /api/bug-reports/:id   → admin-only status update (new → triaged → fixed).
//
// Privacy:
//  - We store sha256(ip + salt) only, never the raw IP.
//  - Email is optional; users can submit anonymously.
//  - Free-text "message" is trimmed and capped at 4000 chars.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MINUTES = 5;
const MAX_REPORTS_PER_WINDOW = 3;

const SubmitBody = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  email: z.string().trim().email("Courriel invalide").max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message trop court").max(4000),
  appVersion: z.string().trim().max(40).optional(),
  platform: z.string().trim().max(32).optional(),
});

function hashIp(ip: string): string {
  const salt = process.env.WAIT_REPORT_SALT ?? "attentezero-default-salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

// Express is configured with `app.set("trust proxy", 1)`, so `req.ip` already
// derives the real client address from the trusted edge proxy. We deliberately
// do NOT parse `x-forwarded-for` ourselves — that would let any caller spoof
// the header to bypass rate-limiting.
function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

const router = Router();

router.post("/bug-reports", async (req, res) => {
  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    });
    return;
  }

  const ipHash = hashIp(getClientIp(req));
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const recent = await db
    .select({ id: bugReportsTable.id })
    .from(bugReportsTable)
    .where(and(eq(bugReportsTable.ipHash, ipHash), gte(bugReportsTable.createdAt, since)))
    .limit(MAX_REPORTS_PER_WINDOW);

  if (recent.length >= MAX_REPORTS_PER_WINDOW) {
    res.status(429).json({
      error: `Trop de signalements en peu de temps. Réessayez dans ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
    });
    return;
  }

  const userIdHeader = req.header("x-user-id");
  const userId = typeof userIdHeader === "string" && userIdHeader.length > 0
    ? userIdHeader.slice(0, 64)
    : null;

  const { name, email, message, appVersion, platform } = parsed.data;

  const [row] = await db
    .insert(bugReportsTable)
    .values({
      name,
      email: email && email.length > 0 ? email : null,
      message,
      appVersion: appVersion ?? null,
      platform: platform ?? null,
      userId,
      ipHash,
    })
    .returning({ id: bugReportsTable.id, createdAt: bugReportsTable.createdAt });

  res.status(201).json({ id: row?.id, createdAt: row?.createdAt });
});

// Admin endpoints — guarded by ADMIN_API_KEY header.
function requireAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;
  const got = req.header("x-admin-key");
  return typeof got === "string" && got === expected;
}

router.get("/bug-reports", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  const rows = await db
    .select({
      id: bugReportsTable.id,
      name: bugReportsTable.name,
      email: bugReportsTable.email,
      message: bugReportsTable.message,
      appVersion: bugReportsTable.appVersion,
      platform: bugReportsTable.platform,
      status: bugReportsTable.status,
      createdAt: bugReportsTable.createdAt,
    })
    .from(bugReportsTable)
    .orderBy(desc(bugReportsTable.createdAt))
    .limit(limit);
  res.json({ reports: rows });
});

const PatchBody = z.object({
  status: z.enum(["new", "triaged", "fixed", "wontfix"]),
});

router.patch("/bug-reports/:id", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [row] = await db
    .update(bugReportsTable)
    .set({ status: parsed.data.status })
    .where(eq(bugReportsTable.id, id))
    .returning({ id: bugReportsTable.id, status: bugReportsTable.status });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";

const router: IRouter = Router();

// HMAC secret — generated at startup. Captcha tokens are short-lived (5 min)
// so losing pending challenges on restart is acceptable.
const CAPTCHA_HMAC_SECRET = crypto.randomBytes(32);
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
// v1.1.9 — Lowered from 2000ms → 600ms. The 2s floor was tripping on real
// users who solve a 1+9 math problem in <2s ("Inscription trop rapide" error
// was the #1 signup blocker per user reports). 600ms still catches automated
// bots that submit instantly while remaining invisible to humans.
const CAPTCHA_MIN_AGE_MS = 600;

type ChallengePayload = {
  answer: number;
  iat: number;
  exp: number;
  jti: string; // unique id — required for one-time-use tracking
};

// ── Single-use token tracking (anti-replay) ──────────────────────────────
// In-memory Set of consumed jti values + their expiry. Cleared periodically.
// Single-process server, so no need for Redis. If we ever scale horizontally,
// swap this for a shared store (Redis SETNX with TTL).
const CONSUMED_JTI = new Map<string, number>(); // jti → exp timestamp
const MAX_CONSUMED_ENTRIES = 50_000; // hard cap to bound memory

function pruneConsumed() {
  const now = Date.now();
  for (const [jti, exp] of CONSUMED_JTI) {
    if (exp <= now) CONSUMED_JTI.delete(jti);
  }
  // Hard-cap fallback: if still too many, drop oldest by insertion order.
  if (CONSUMED_JTI.size > MAX_CONSUMED_ENTRIES) {
    const overflow = CONSUMED_JTI.size - MAX_CONSUMED_ENTRIES;
    let i = 0;
    for (const k of CONSUMED_JTI.keys()) {
      if (i++ >= overflow) break;
      CONSUMED_JTI.delete(k);
    }
  }
}
setInterval(pruneConsumed, 60_000).unref();

function sign(payload: ChallengePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", CAPTCHA_HMAC_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): ChallengePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto
    .createHmac("sha256", CAPTCHA_HMAC_SECRET)
    .update(body)
    .digest("base64url");
  // Constant-time compare to avoid timing attacks.
  const sigBuf = Buffer.from(sig, "base64url");
  const expBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ChallengePayload;
    if (typeof payload.answer !== "number") return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.jti !== "string" || payload.jti.length < 8) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify a captcha token + user-provided answer + honeypot field.
 * Returns null on success, or an error string on failure.
 *
 * Public so the register endpoint can call it directly. On success the
 * underlying token's `jti` is marked as consumed so the same token cannot
 * be replayed (anti-bot defense — without this, a single solved captcha
 * could be reused for thousands of registrations within the 5 min TTL).
 *
 * The honeypot field MUST be present (as a string, possibly empty) for
 * org/partenaire signups — a bot crafting a minimal payload will omit it
 * and get rejected. Set `requireHoneypot=true` to enforce that.
 */
export function verifyCaptcha(input: {
  captchaToken?: unknown;
  captchaAnswer?: unknown;
  honeypot?: unknown;
  requireHoneypot?: boolean;
}): string | null {
  // Layer 1 — Honeypot.
  // Bots may auto-fill (non-empty trips trap) OR omit the field entirely
  // (undefined = bot crafted minimal payload). Reject both.
  if (typeof input.honeypot === "string") {
    if (input.honeypot.trim() !== "") return "Vérification anti-bot échouée.";
  } else if (input.requireHoneypot) {
    return "Vérification anti-bot échouée.";
  }

  // Layer 2 + 3 — Signed math challenge. Token must be present and valid.
  if (typeof input.captchaToken !== "string" || !input.captchaToken) {
    return "Captcha manquant. Recharger la page et réessayer.";
  }
  const payload = verify(input.captchaToken);
  if (!payload) {
    return "Captcha expiré ou invalide. Recharger la page et réessayer.";
  }

  // Anti-replay — same token cannot be reused.
  if (CONSUMED_JTI.has(payload.jti)) {
    return "Ce captcha a déjà été utilisé. Recharger la page et réessayer.";
  }

  // Min-age guard: forms submitted in <2s after fetching the challenge are bots.
  if (Date.now() - payload.iat < CAPTCHA_MIN_AGE_MS) {
    return "Inscription trop rapide. Veuillez réessayer.";
  }

  const userAnswer = Number(input.captchaAnswer);
  if (!Number.isFinite(userAnswer) || userAnswer !== payload.answer) {
    return "Réponse au captcha incorrecte.";
  }

  // Mark consumed only after full success — failed attempts don't burn the
  // token (so a user who fat-fingers the math can retry with the same one).
  CONSUMED_JTI.set(payload.jti, payload.exp);
  return null;
}

// ── GET /api/captcha/challenge ──────────────────────────────────────────
// Returns a fresh math challenge (a + b) and a signed token. The token must
// be sent back with the answer at registration time.
router.get("/captcha/challenge", (_req: Request, res: Response) => {
  const a = 1 + Math.floor(Math.random() * 9); // 1..9
  const b = 1 + Math.floor(Math.random() * 9); // 1..9
  const now = Date.now();
  const payload: ChallengePayload = {
    answer: a + b,
    iat: now,
    exp: now + CAPTCHA_TTL_MS,
    jti: crypto.randomBytes(12).toString("base64url"),
  };
  const token = sign(payload);
  res.json({
    question: `${a} + ${b}`,
    a,
    b,
    token,
    ttlSec: Math.floor(CAPTCHA_TTL_MS / 1000),
  });
});

export default router;

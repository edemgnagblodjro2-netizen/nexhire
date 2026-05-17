import { Router, type Request } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { sendEmailTo } from "../lib/notify";

// ─────────────────────────────────────────────────────────────────────────────
// CivicAI — Formulaire de contact.
//
// POST /api/contact → public, IP rate-limited (3 / 5 min).
//   Envoie une notification par courriel à CIVICAI_CONTACT_EMAIL
//   (défaut : civicai@attentezero.com).
// ─────────────────────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const ipTimestamps = new Map<string, number[]>();

const ContactBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  org: z.string().trim().max(200).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  service: z.string().trim().max(120).optional().default(""),
  msg: z.string().trim().min(5).max(4000),
  lang: z.enum(["fr", "en"]).default("fr"),
});

function hashIp(ip: string): string {
  const salt = process.env.WAIT_REPORT_SALT ?? "civicai-contact-salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const timestamps = (ipTimestamps.get(ipHash) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (timestamps.length >= MAX_PER_WINDOW) return true;
  timestamps.push(now);
  ipTimestamps.set(ipHash, timestamps);
  return false;
}

const router = Router();

router.post("/contact", async (req, res) => {
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const ipHash = hashIp(getClientIp(req));
  if (isRateLimited(ipHash)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const { name, email, org, phone, service, msg, lang } = parsed.data;
  const isFr = lang === "fr";
  const DEST = process.env.CIVICAI_CONTACT_EMAIL ?? "civicai@attentezero.com";

  const subject = isFr
    ? `[CivicAI] Nouvelle demande — ${service || "Général"} (${name})`
    : `[CivicAI] New request — ${service || "General"} (${name})`;

  const text = [
    isFr ? "Nouvelle demande via le formulaire CivicAI.ca" : "New request via CivicAI.ca contact form",
    "",
    `${isFr ? "Nom" : "Name"}: ${name}`,
    `${isFr ? "Courriel" : "Email"}: ${email}`,
    org ? `${isFr ? "Organisation" : "Organization"}: ${org}` : null,
    phone ? `${isFr ? "Téléphone" : "Phone"}: ${phone}` : null,
    service ? `${isFr ? "Service souhaité" : "Requested service"}: ${service}` : null,
    "",
    isFr ? "Message:" : "Message:",
    msg,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">
          ${isFr ? "Nouvelle demande de contact" : "New contact request"} — CivicAI
        </h2>
      </div>
      <div style="background:#f8fafc;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">${isFr ? "Nom" : "Name"}</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">${isFr ? "Courriel" : "Email"}</td><td style="padding:6px 0"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
          ${org ? `<tr><td style="padding:6px 0;color:#64748b">${isFr ? "Organisation" : "Organization"}</td><td style="padding:6px 0">${org}</td></tr>` : ""}
          ${phone ? `<tr><td style="padding:6px 0;color:#64748b">${isFr ? "Téléphone" : "Phone"}</td><td style="padding:6px 0">${phone}</td></tr>` : ""}
          ${service ? `<tr><td style="padding:6px 0;color:#64748b">${isFr ? "Service" : "Service"}</td><td style="padding:6px 0">${service}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="color:#64748b;margin:0 0 8px 0;font-size:13px">${isFr ? "Message :" : "Message:"}</p>
        <p style="white-space:pre-wrap;margin:0;background:#fff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;line-height:1.6">${msg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
      <p style="color:#94a3b8;font-size:11px;margin-top:12px;text-align:center">CivicAI — NEQ 2280791601 — Québec, Canada</p>
    </div>
  `;

  const { sent } = await sendEmailTo(DEST, { subject, text, html });

  req.log?.info({ sent, dest: DEST }, "contact form submission");

  res.json({ success: true, delivered: sent });
});

export default router;

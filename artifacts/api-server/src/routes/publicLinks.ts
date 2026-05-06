import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Universal-link infrastructure for service sharing.
//
// 1) /.well-known/apple-app-site-association : declares to iOS that
//    https://<this-host>/s/<id> can open the AttenteZéro app directly.
// 2) /.well-known/assetlinks.json : Android equivalent (placeholder until the
//    Play Store cert fingerprint is known).
// 3) /s/:id : a tiny HTML landing for users WITHOUT the app installed.
//    Apple/Google sniff the AASA to intercept these URLs FIRST when the
//    app is installed — the HTML is the fallback only.
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? "com.attentezero.app";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? "com.attentezero.app";
const APP_STORE_URL = process.env.APP_STORE_URL ?? "https://apps.apple.com/ca/app/attentezero/id6766750916";
const PLAY_STORE_URL = process.env.PLAY_STORE_URL ?? "https://play.google.com/store/apps/details?id=com.attentezero.app";

const router = Router();

router.get("/.well-known/apple-app-site-association", (_req, res) => {
  if (!TEAM_ID) {
    res.status(503).json({ error: "APPLE_TEAM_ID not configured" });
    return;
  }
  res.set("Content-Type", "application/json").json({
    applinks: {
      apps: [],
      details: [
        {
          appID: `${TEAM_ID}.${BUNDLE_ID}`,
          paths: ["/s/*", "/service/*", "/aide-financiere", "/sos", "/"],
        },
      ],
    },
  });
});

router.get("/.well-known/assetlinks.json", (_req, res) => {
  res.set("Content-Type", "application/json").json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: [],
      },
    },
  ]);
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

router.get("/s/:id", async (req, res) => {
  const id = req.params.id;
  let serviceName = "AttenteZéro";
  let serviceCity = "";

  if (id) {
    try {
      const [svc] = await db
        .select({ name: servicesTable.name, city: servicesTable.city })
        .from(servicesTable)
        .where(eq(servicesTable.id, id))
        .limit(1);
      if (svc) {
        serviceName = svc.name;
        serviceCity = svc.city ?? "";
      }
    } catch (err) {
      req.log.error({ err }, "publicLinks service lookup");
    }
  }

  const safeName = escapeHtml(serviceName);
  const safeCity = escapeHtml(serviceCity);
  const safeId = escapeHtml(id ?? "");
  const deepLink = `service-qc://service/${encodeURIComponent(safeId)}`;

  res.set("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${safeName} — AttenteZéro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta property="og:title" content="${safeName}" />
  <meta property="og:description" content="Trouvé sur AttenteZéro — services communautaires gratuits du Québec." />
  <meta property="og:type" content="website" />
  <meta name="apple-itunes-app" content="app-id=6766750916, app-argument=${deepLink}" />
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#0e7e6e,#0a5e52);min-height:100vh;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;max-width:480px;width:100%;padding:40px 28px;text-align:center}
    .logo{font-size:48px;margin-bottom:8px}
    h1{margin:0 0 6px;font-size:24px;font-weight:700}
    .city{opacity:0.8;font-size:15px;margin-bottom:24px}
    .tag{display:inline-block;background:rgba(255,255,255,0.15);padding:6px 14px;border-radius:999px;font-size:13px;margin-bottom:24px}
    .btn{display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#0a5e52;padding:14px 20px;border-radius:14px;text-decoration:none;font-weight:600;margin:8px 0;font-size:15px;transition:transform .15s}
    .btn:active{transform:scale(0.98)}
    .btn.outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4)}
    .stores{display:flex;gap:10px;margin-top:12px}
    .stores a{flex:1}
    .footer{margin-top:24px;font-size:12px;opacity:0.7}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📍</div>
    <span class="tag">AttenteZéro</span>
    <h1>${safeName}</h1>
    ${safeCity ? `<div class="city">${safeCity}</div>` : ""}
    <a href="${deepLink}" class="btn">📲 Ouvrir dans l'app</a>
    <div class="stores">
      <a class="btn outline" href="${escapeHtml(APP_STORE_URL)}">App Store</a>
      <a class="btn outline" href="${escapeHtml(PLAY_STORE_URL)}">Google Play</a>
    </div>
    <div class="footer">App gratuite · 5000+ services au Canada</div>
  </div>
  <script>
    // Try the deep link automatically — if app is installed, it opens; otherwise nothing happens and the user sees the buttons.
    setTimeout(function(){ window.location.href = "${deepLink}"; }, 250);
  </script>
</body>
</html>`);
});

export default router;

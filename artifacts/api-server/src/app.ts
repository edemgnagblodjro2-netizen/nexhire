import express, { type Express, type Request } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { handleStripeWebhook } from "./routes/stripe";

const app: Express = express();

// Trust the Replit proxy so req.ip / X-Forwarded-* are honored (needed for
// correct rate-limiting and secure cookies behind the edge proxy).
app.set("trust proxy", 1);

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
// ── Security headers (helmet) ─────────────────────────────────────────────
// `crossOriginResourcePolicy: false` allows the admin SPA assets to be
// fetched from the embedded preview iframe.
// CSP is set explicitly: `script-src 'self'` blocks `javascript:` URL
// execution in browsers that honour CSP Level 2+, which is the primary
// mitigation for the admin-origin credential-theft vector.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS — restrict to known origins ──────────────────────────────────────
// Allowed: Replit dev/preview hosts, configured prod domain, and same-origin
// requests (no Origin header — typical for native mobile fetch / curl).
const ALLOWED_ORIGIN_HOSTS = new Set<string>(
  [
    process.env.REPLIT_DEV_DOMAIN,
    process.env.REPLIT_DOMAINS?.split(","),
    process.env.PUBLIC_API_DOMAIN,
    process.env.PUBLIC_APP_DOMAIN,
  ]
    .flat()
    .filter(Boolean) as string[],
);

app.use(
  cors({
    credentials: true,
    origin(origin, cb) {
      // Same-origin / native mobile / server-to-server requests
      if (!origin) return cb(null, true);
      try {
        const { hostname } = new URL(origin);
        if (
          ALLOWED_ORIGIN_HOSTS.has(hostname) ||
          hostname.endsWith(".replit.dev") ||
          hostname.endsWith(".replit.app") ||
          hostname.endsWith(".repl.co") ||
          hostname === "localhost" ||
          hostname === "127.0.0.1"
        ) {
          return cb(null, true);
        }
      } catch {}
      logger.warn({ origin }, "CORS blocked origin");
      return cb(new Error("CORS: origin not allowed"));
    },
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(authMiddleware);

// ── Rate limiting on sensitive auth endpoints ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts / IP / window for login & register
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
});
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 5, // 5 reset requests / IP / hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de demandes. Réessayez plus tard." },
});
const resetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 code confirmation attempts / IP / 15 min (brute-force guard)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez plus tard." },
});

app.use("/api/mobile-auth/email-login", authLimiter);
app.use("/api/mobile-auth/register", authLimiter);
app.use("/api/mobile-auth/forgot-password", passwordResetLimiter);
app.use("/api/mobile-auth/reset-password", resetConfirmLimiter);

// Admin endpoints — guard against admin-key brute-force. The key is
// already validated with constant-time compare; this caps attempts.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 attempts / IP / 15 min — enough for normal admin browsing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes admin. Réessayez plus tard." },
});
app.use("/api/admin", adminLimiter);

// Captcha challenge endpoint — cap to prevent token-farming for replay.
const captchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 fresh challenges / IP / minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de demandes de captcha." },
});
app.use("/api/captcha/challenge", captchaLimiter);

app.use("/api", router);

app.get(["/api/delete-account", "/delete-account"], (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Suppression de compte — AttenteZéro</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:2rem auto;padding:1rem;line-height:1.6;color:#1f2937}
h1{color:#dc2626;border-bottom:2px solid #e5e7eb;padding-bottom:.5rem}
h2{color:#0369a1;margin-top:2rem}
a{color:#0ea5e9}
.box{background:#fef2f2;border-left:4px solid #dc2626;padding:1rem;margin:1.5rem 0;border-radius:4px}
.email{background:#f0f9ff;padding:1rem;border-radius:6px;font-size:1.1rem;text-align:center}
ul{padding-left:1.5rem}
</style>
</head>
<body>
<h1>Suppression de votre compte AttenteZéro</h1>
<p><strong>Dernière mise à jour :</strong> 19 avril 2026</p>

<p>Conformément à la Loi 25 du Québec sur la protection des renseignements personnels et aux exigences de Google Play, vous pouvez demander la suppression de votre compte AttenteZéro et de toutes vos données associées à tout moment.</p>

<h2>Méthode 1 — Supprimer depuis l'application (recommandé)</h2>
<ol>
<li>Ouvrez l'application AttenteZéro</li>
<li>Allez dans <strong>Profil</strong> → <strong>Paramètres</strong></li>
<li>Cliquez sur <strong>« Supprimer mon compte »</strong></li>
<li>Confirmez votre choix</li>
</ol>
<p>La suppression est <strong>immédiate et définitive</strong>.</p>

<h2>Méthode 2 — Demander la suppression par courriel</h2>
<p>Si vous n'avez plus accès à l'application, envoyez un courriel à :</p>

<div class="email">
<a href="mailto:contact@attentezero.ca?subject=Demande%20de%20suppression%20de%20compte">contact@attentezero.ca</a>
</div>

<p>Précisez dans votre message :</p>
<ul>
<li>L'adresse courriel utilisée pour créer votre compte</li>
<li>L'objet : <em>« Demande de suppression de compte »</em></li>
</ul>
<p>Nous traiterons votre demande dans un délai maximal de <strong>30 jours</strong>.</p>

<h2>Données supprimées</h2>
<p>La suppression efface définitivement :</p>
<ul>
<li>Votre profil (nom, courriel, langue préférée, mot de passe)</li>
<li>Vos services favoris</li>
<li>L'historique de vos recherches</li>
<li>Vos conversations avec l'assistant IA</li>
<li>Vos préférences personnelles</li>
<li>Vos données de géolocalisation</li>
</ul>

<h2>Données conservées</h2>
<div class="box">
<p>Pour des raisons légales, comptables et de prévention de la fraude, nous conservons pendant la durée prévue par la loi :</p>
<ul>
<li><strong>Factures et historique de paiement</strong> (7 ans, obligation fiscale Québec/Canada)</li>
<li><strong>Journaux de sécurité anonymisés</strong> (12 mois)</li>
</ul>
<p>Ces données ne permettent plus de vous identifier après suppression du compte.</p>
</div>

<h2>Abonnements actifs</h2>
<p>Si vous avez un abonnement payant (Premium, Terrain, Organisme, Institution), il sera automatiquement annulé. Aucun remboursement au prorata n'est effectué pour la période en cours, conformément aux conditions d'utilisation acceptées à l'inscription.</p>

<h2>Contact</h2>
<p>Pour toute question :<br>
<strong>Startup Ayas</strong><br>
Courriel : <a href="mailto:contact@attentezero.ca">contact@attentezero.ca</a></p>

<p>Pour déposer une plainte : <a href="https://www.cai.gouv.qc.ca">Commission d'accès à l'information du Québec</a>.</p>

<hr>
<p style="font-size:.85rem;color:#6b7280"><a href="/api/privacy">← Voir la politique de confidentialité</a></p>
</body>
</html>`);
});

app.get(["/api/privacy", "/privacy"], (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Politique de confidentialité — AttenteZéro</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:2rem auto;padding:1rem;line-height:1.6;color:#1f2937}
h1{color:#0ea5e9;border-bottom:2px solid #e5e7eb;padding-bottom:.5rem}
h2{color:#0369a1;margin-top:2rem}
a{color:#0ea5e9}
</style>
</head>
<body>
<h1>Politique de confidentialité — AttenteZéro</h1>
<p><strong>Dernière mise à jour :</strong> 19 avril 2026</p>

<p>AttenteZéro (« nous », « notre application ») est une application mobile qui aide les personnes au Québec à trouver rapidement des services communautaires (banques alimentaires, hébergement d'urgence, santé mentale, aide juridique, etc.). La présente politique décrit les renseignements personnels que nous collectons et la façon dont nous les utilisons, conformément à la Loi 25 du Québec sur la protection des renseignements personnels.</p>

<h2>1. Renseignements collectés</h2>
<ul>
<li><strong>Compte utilisateur :</strong> adresse courriel, mot de passe chiffré, langue préférée.</li>
<li><strong>Géolocalisation :</strong> position approximative (avec votre consentement) pour afficher les services à proximité. Vous pouvez refuser et saisir manuellement votre code postal.</li>
<li><strong>Caméra :</strong> uniquement utilisée si vous choisissez d'ajouter une photo à votre profil ou de scanner un code QR. Aucune photo n'est transmise sans votre action explicite.</li>
<li><strong>Données d'usage :</strong> recherches effectuées, services consultés, favoris (anonymisés à des fins statistiques).</li>
<li><strong>Paiement :</strong> traité par Stripe ; nous ne stockons aucune information de carte bancaire.</li>
</ul>

<h2>2. Utilisation des renseignements</h2>
<ul>
<li>Fournir des recommandations géolocalisées de services.</li>
<li>Améliorer la pertinence des résultats par intelligence artificielle.</li>
<li>Détecter les situations de crise et orienter vers les ressources appropriées (911, 211, ligne 1-866-APPELLE).</li>
<li>Gérer les abonnements et facturation.</li>
</ul>

<h2>3. Partage des renseignements</h2>
<p>Nous ne vendons jamais vos données. Nous partageons uniquement avec :</p>
<ul>
<li>Stripe (traitement des paiements)</li>
<li>Fournisseur d'hébergement (Replit Inc., serveurs au Canada/É.-U.)</li>
<li>Fournisseur d'IA (OpenAI / Anthropic, données anonymisées)</li>
</ul>

<h2>4. Conservation</h2>
<p>Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression à tout moment.</p>

<h2>5. Vos droits (Loi 25 Québec)</h2>
<ul>
<li>Accès à vos renseignements personnels</li>
<li>Rectification des données inexactes</li>
<li>Suppression de votre compte</li>
<li>Retrait de votre consentement à tout moment</li>
<li>Portabilité de vos données</li>
</ul>

<h2>6. Sécurité</h2>
<p>Mots de passe hachés (bcrypt), connexions chiffrées TLS, base de données chiffrée au repos, journalisation des accès administratifs.</p>

<h2>7. Mineurs</h2>
<p>L'application est destinée aux personnes de 13 ans et plus. Nous ne collectons pas sciemment de données d'enfants de moins de 13 ans.</p>

<h2>8. Modifications</h2>
<p>Toute modification importante sera notifiée dans l'application au moins 30 jours avant son entrée en vigueur.</p>

<h2>9. Contact</h2>
<p>Responsable de la protection des renseignements personnels :<br>
<strong>Startup Ayas</strong><br>
Courriel : <a href="mailto:contact@attentezero.ca">contact@attentezero.ca</a></p>

<p>Pour déposer une plainte : <a href="https://www.cai.gouv.qc.ca">Commission d'accès à l'information du Québec</a>.</p>

<hr>
<p style="font-size:.85rem;color:#6b7280">AttenteZéro complète le service 211 Québec en offrant une réponse géolocalisée plus rapide. AttenteZéro ne remplace pas les services d'urgence — en cas de danger immédiat, composez le 911.</p>
</body>
</html>`);
});

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

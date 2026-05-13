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
import publicLinksRouter from "./routes/publicLinks";

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

// publicLinks routes (/.well-known/* + /s/:id) are mounted at ROOT, not under /api,
// because mobile share links and Apple/Google App Site Association files MUST be at root
// (e.g. https://attentezero.ca/s/<id>, https://attentezero.ca/.well-known/apple-app-site-association).
app.use(publicLinksRouter);

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
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:780px;margin:0 auto;padding:2rem 1rem;line-height:1.7;color:#1f2937;background:#f9fafb}
header{background:#0d9488;color:#fff;border-radius:16px;padding:2rem;margin-bottom:2rem;text-align:center}
header h1{margin:0 0 .25rem;font-size:1.6rem}
header p{margin:0;opacity:.85;font-size:.9rem}
h2{color:#0d9488;font-size:1.05rem;margin-top:2rem;border-left:3px solid #0d9488;padding-left:.75rem}
.card{background:#fff;border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th{background:#f0fdf9;color:#0d9488;text-align:left;padding:.5rem .75rem;border-bottom:2px solid #d1fae5}
td{padding:.5rem .75rem;border-bottom:1px solid #e5e7eb;vertical-align:top}
ul{padding-left:1.5rem;margin:.5rem 0}
li{margin:.3rem 0}
a{color:#0d9488}
.badge{display:inline-block;background:#f0fdf9;color:#065f46;border:1px solid #a7f3d0;border-radius:6px;padding:2px 8px;font-size:.8rem;font-weight:600;margin:2px}
.warn{background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem;border-radius:8px;margin:1rem 0}
footer{text-align:center;font-size:.8rem;color:#9ca3af;margin-top:2rem}
</style>
</head>
<body>
<header>
  <h1>Politique de confidentialité</h1>
  <p>AttenteZéro · CivicAI · NEQ 2280791601 · Dernière mise à jour : 13 mai 2026</p>
</header>

<div class="card">
<p>AttenteZéro est une application mobile gratuite qui aide les personnes au Québec et au Canada à trouver rapidement des services communautaires (banques alimentaires, hébergement d'urgence, santé mentale, aide juridique, etc.). Elle est développée par <strong>CivicAI</strong> (NEQ 2280791601), entreprise québécoise.</p>
<p>La présente politique décrit les renseignements personnels collectés et leur utilisation, conformément à la <strong>Loi 25 du Québec</strong> sur la protection des renseignements personnels.</p>
</div>

<h2>1. Données collectées</h2>
<div class="card">
<table>
<tr><th>Type de donnée</th><th>Détail</th><th>Obligatoire ?</th></tr>
<tr><td><strong>Adresse courriel</strong></td><td>Utilisée pour créer votre compte, vous authentifier et envoyer les emails de réinitialisation de mot de passe.</td><td>Non — l'app fonctionne sans compte</td></tr>
<tr><td><strong>Mot de passe</strong></td><td>Haché avec bcrypt (jamais stocké en clair). Jamais partagé.</td><td>Non</td></tr>
<tr><td><strong>Géolocalisation approximative</strong></td><td>Position utilisée uniquement pour afficher les services près de vous. Non partagée avec des tiers publicitaires. Vous pouvez refuser et saisir votre code postal manuellement.</td><td>Non — toujours optionnelle</td></tr>
<tr><td><strong>Recherches effectuées</strong></td><td>Termes de recherche et services consultés, agrégés anonymement pour améliorer les résultats et produire des statistiques régionales (B2G). Aucun profil individuel n'est conservé.</td><td>Automatique en utilisant l'app</td></tr>
<tr><td><strong>Données audio (micro)</strong></td><td>Uniquement si vous appuyez sur le bouton microphone dans l'assistant IA pour dicter votre question. L'audio est transmis en temps réel à OpenAI (Whisper) pour transcription, puis immédiatement supprimé. Jamais stocké sur nos serveurs, jamais utilisé à d'autres fins. L'accès au microphone n'est demandé que lorsque vous l'activez explicitement.</td><td>Non — strictement optionnel, à la demande de l'utilisateur</td></tr>
<tr><td><strong>Données de paiement</strong></td><td>Traitement entièrement géré par Stripe. Nous ne stockons jamais vos numéros de carte. Sur iOS, toutes les fonctionnalités sont gratuites — aucun paiement collecté.</td><td>Non</td></tr>
</table>
</div>

<h2>2. Utilisation des données</h2>
<div class="card">
<ul>
<li>Authentifier votre compte et sécuriser l'accès à vos données personnelles.</li>
<li>Afficher les services communautaires les plus proches de votre position.</li>
<li>Faire fonctionner l'assistant IA multilingue (GPT-4o-mini via OpenAI).</li>
<li>Produire des statistiques régionales agrégées et anonymisées pour les administrations publiques (données B2G — seuil minimum de 5 occurrences avant publication).</li>
<li>Envoyer les emails transactionnels (réinitialisation de mot de passe uniquement).</li>
<li>Améliorer la pertinence des résultats de recherche.</li>
</ul>
<div class="warn">⚠ Nous ne vendons jamais vos données. Nous n'affichons aucune publicité. Nous n'utilisons pas vos données à des fins de marketing direct.</div>
</div>

<h2>3. Stockage et sécurité</h2>
<div class="card">
<ul>
<li><strong>Hébergement :</strong> Replit Inc. (serveurs aux États-Unis), base de données PostgreSQL chiffrée au repos.</li>
<li><strong>Mots de passe :</strong> hachés avec bcrypt (facteur de coût 12). Jamais visibles même par nos équipes.</li>
<li><strong>Connexions :</strong> chiffrées TLS 1.2+ entre l'app et nos serveurs.</li>
<li><strong>Adresses IP :</strong> jamais stockées directement. Seul un hash SHA-256 est conservé temporairement pour la limitation de taux (anti-abus), sans possibilité de reconstitution.</li>
<li><strong>Journaux d'accès :</strong> conservés 12 mois maximum à des fins de sécurité.</li>
</ul>
</div>

<h2>4. Partage avec des tiers</h2>
<div class="card">
<table>
<tr><th>Tiers</th><th>Finalité</th><th>Données partagées</th></tr>
<tr><td>OpenAI (É.-U.)</td><td>Assistant IA et transcription vocale</td><td>Texte des questions (anonymisé), audio si dictée activée</td></tr>
<tr><td>Stripe (É.-U.)</td><td>Paiements Android uniquement</td><td>Email et montant — aucune donnée de carte</td></tr>
<tr><td>Replit Inc. (É.-U.)</td><td>Hébergement serveur et base de données</td><td>Toutes les données applicatives</td></tr>
</table>
<p style="margin-top:1rem;font-size:.9rem">Aucun autre tiers. Aucun courtier de données. Aucun réseau publicitaire.</p>
</div>

<h2>5. Conservation des données</h2>
<div class="card">
<ul>
<li><strong>Compte actif :</strong> données conservées tant que le compte existe.</li>
<li><strong>Après suppression du compte :</strong> toutes les données personnelles identifiables sont effacées dans les 30 jours.</li>
<li><strong>Exception légale :</strong> les factures et historiques de paiement sont conservés 7 ans (obligation fiscale Québec/Canada).</li>
<li><strong>Journaux de sécurité anonymisés :</strong> conservés 12 mois.</li>
</ul>
</div>

<h2>6. Suppression de compte</h2>
<div class="card">
<p>Vous pouvez supprimer votre compte à tout moment :</p>
<ul>
<li><strong>Dans l'app :</strong> Profil → Paramètres → Supprimer mon compte (immédiat et définitif).</li>
<li><strong>Par courriel :</strong> <a href="mailto:contact@attentezero.ca?subject=Demande%20de%20suppression%20de%20compte">contact@attentezero.ca</a> (traitement sous 30 jours).</li>
</ul>
<p><a href="/delete-account">→ Page dédiée à la suppression de compte</a></p>
</div>

<h2>7. Vos droits (Loi 25 Québec)</h2>
<div class="card">
<p>Conformément à la Loi 25 sur la protection des renseignements personnels dans le secteur privé, vous disposez des droits suivants :</p>
<span class="badge">Accès</span>
<span class="badge">Rectification</span>
<span class="badge">Suppression</span>
<span class="badge">Portabilité</span>
<span class="badge">Retrait du consentement</span>
<span class="badge">Opposition au traitement</span>
<p style="margin-top:1rem">Pour exercer vos droits : <a href="mailto:contact@attentezero.ca">contact@attentezero.ca</a></p>
<p>Pour déposer une plainte : <a href="https://www.cai.gouv.qc.ca">Commission d'accès à l'information du Québec (CAI)</a></p>
</div>

<h2>8. Mineurs</h2>
<div class="card">
<p>L'application est destinée aux personnes de <strong>13 ans et plus</strong>. Nous ne collectons pas sciemment de données d'enfants de moins de 13 ans. Si vous êtes parent et pensez que votre enfant a créé un compte, contactez-nous à <a href="mailto:contact@attentezero.ca">contact@attentezero.ca</a> pour suppression immédiate.</p>
</div>

<h2>9. Intelligence artificielle</h2>
<div class="card">
<p>L'assistant IA intégré utilise le modèle <strong>GPT-4o-mini d'OpenAI</strong>. Vos messages sont transmis à OpenAI pour générer des réponses. Ils ne sont pas utilisés pour entraîner les modèles d'OpenAI (conformément aux conditions API d'OpenAI). Les conversations ne sont pas stockées sur nos serveurs après la session.</p>
<p>La transcription vocale utilise <strong>Whisper (OpenAI)</strong>. L'audio est traité en temps réel et non conservé.</p>
</div>

<h2>10. Modifications</h2>
<div class="card">
<p>Toute modification importante à cette politique sera notifiée dans l'application au moins <strong>30 jours</strong> avant son entrée en vigueur. La date de la dernière mise à jour est toujours affichée en haut de cette page.</p>
</div>

<h2>11. Contact</h2>
<div class="card">
<p><strong>Responsable de la protection des renseignements personnels :</strong><br>
CivicAI — NEQ 2280791601<br>
Courriel : <a href="mailto:contact@attentezero.ca">contact@attentezero.ca</a><br>
Application : AttenteZéro</p>
</div>

<footer>
  AttenteZéro — un produit CivicAI · NEQ 2280791601 · © 2026 CivicAI. Tous droits réservés.<br>
  <a href="/support">Assistance</a> · <a href="/delete-account">Supprimer mon compte</a>
</footer>
</body>
</html>`);
});

app.get(["/api/support", "/support"], (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Assistance — AttenteZéro</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;padding:2rem 1rem;line-height:1.7;color:#1f2937;background:#f9fafb}
header{text-align:center;padding:2rem 1rem 1.5rem;background:#0d9488;border-radius:16px;margin-bottom:2rem;color:#fff}
header h1{margin:0 0 .25rem;font-size:1.8rem;font-weight:700}
header p{margin:0;opacity:.85;font-size:.95rem}
.logo{font-size:2.5rem;margin-bottom:.5rem}
h2{color:#0d9488;font-size:1.1rem;margin-top:2rem}
.card{background:#fff;border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
a{color:#0d9488;text-decoration:none;font-weight:500}
a:hover{text-decoration:underline}
.email-btn{display:inline-block;background:#0d9488;color:#fff!important;padding:.65rem 1.4rem;border-radius:8px;margin-top:.5rem;font-weight:600}
.divider{border:none;border-top:1px solid #e5e7eb;margin:2rem 0}
.lang{font-size:.8rem;color:#9ca3af;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em}
footer{text-align:center;font-size:.8rem;color:#9ca3af;margin-top:2.5rem}
</style>
</head>
<body>
<header>
  <div class="logo">🏥</div>
  <h1>AttenteZéro</h1>
  <p>Services communautaires du Québec · Community Services Québec</p>
</header>

<div class="card">
  <div class="lang">FR</div>
  <h2>Besoin d'aide ?</h2>
  <p>AttenteZéro est une application gratuite qui vous aide à trouver des services communautaires près de chez vous : banques alimentaires, hébergement d'urgence, santé mentale, aide juridique, et plus encore.</p>
  <p>Pour toute question, signalement d'un problème ou suggestion :</p>
  <a class="email-btn" href="mailto:contact@attentezero.ca?subject=Assistance%20AttenteZéro">contact@attentezero.ca</a>
  <p style="margin-top:1rem;font-size:.9rem">Nous répondons dans un délai de <strong>48 h</strong> (jours ouvrables).</p>
</div>

<div class="card">
  <div class="lang">EN</div>
  <h2>Need help?</h2>
  <p>AttenteZéro is a free app helping you find community services near you: food banks, emergency shelters, mental health, legal aid, and more.</p>
  <p>For any question, issue report, or suggestion:</p>
  <a class="email-btn" href="mailto:contact@attentezero.ca?subject=AttenteZero%20Support">contact@attentezero.ca</a>
  <p style="margin-top:1rem;font-size:.9rem">We reply within <strong>48 hours</strong> (business days).</p>
</div>

<hr class="divider">

<div class="card">
  <h2>🚨 Urgence / Emergency</h2>
  <p>En cas de danger immédiat · In case of immediate danger: <strong>911</strong></p>
  <p>Ligne de crise · Crisis line: <strong>1-866-APPELLE (277-3553)</strong></p>
  <p>Service 211 Québec: <a href="tel:211">211</a></p>
</div>

<hr class="divider">

<p style="font-size:.9rem;color:#4b5563;text-align:center">
  <a href="/privacy">Politique de confidentialité · Privacy Policy</a>
  &nbsp;·&nbsp;
  <a href="/delete-account">Supprimer mon compte · Delete account</a>
</p>

<footer>
  AttenteZéro — un produit <strong>CivicAI</strong> · NEQ 2280791601<br>
  © ${new Date().getFullYear()} CivicAI. Tous droits réservés.
</footer>
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

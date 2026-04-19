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
Courriel : <a href="mailto:attentezero5@gmail.com">attentezero5@gmail.com</a></p>

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

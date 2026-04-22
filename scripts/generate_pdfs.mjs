import PDFDocument from "/tmp/node_modules/pdfkit/js/pdfkit.js";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "exports";
const IMG_DIR = "exports/marketing";

const TEAL = "#0e7e6e";
const TEAL_DARK = "#074d43";
const TEAL_LIGHT = "#1a9f8c";
const GOLD = "#d4a017";
const GRAY_DARK = "#1f2937";
const GRAY = "#4b5563";
const GRAY_LIGHT = "#9ca3af";
const BG_LIGHT = "#f3f4f6";
const WHITE = "#ffffff";

function header(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 80).fill(TEAL_DARK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(20).text(title, 50, 28);
  if (subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor("#a8d8d0").text(subtitle, 50, 55);
  }
  doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(11);
  doc.y = 110;
  doc.x = 50;
}

function footer(doc, text) {
  const y = doc.page.height - 40;
  doc.rect(0, y, doc.page.width, 40).fill(BG_LIGHT);
  doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(text, 50, y + 15, {
    width: doc.page.width - 100,
    align: "center",
  });
}

function h1(doc, text) {
  if (doc.y > doc.page.height - 150) doc.addPage();
  doc.moveDown(0.5);
  doc.fillColor(TEAL_DARK).font("Helvetica-Bold").fontSize(18).text(text);
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(TEAL).lineWidth(2).stroke();
  doc.moveDown(0.6);
}

function h2(doc, text) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.4);
  doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(13).text(text);
  doc.moveDown(0.3);
}

function p(doc, text) {
  doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(10).text(text, { align: "justify", lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(doc, text) {
  doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(10);
  doc.text("•  " + text, { indent: 12, lineGap: 2 });
}

function callout(doc, text, color = TEAL) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  const startY = doc.y;
  const padding = 12;
  doc.font("Helvetica-Bold").fontSize(10);
  const textHeight = doc.heightOfString(text, { width: doc.page.width - 100 - padding * 2 });
  const boxHeight = textHeight + padding * 2;
  doc.rect(50, startY, doc.page.width - 100, boxHeight).fill(color + "15");
  doc.rect(50, startY, 4, boxHeight).fill(color);
  doc.fillColor(color).text(text, 50 + padding + 4, startY + padding, { width: doc.page.width - 100 - padding * 2 });
  doc.y = startY + boxHeight + 10;
}

function table(doc, rows, colWidths) {
  if (doc.y > doc.page.height - 150) doc.addPage();
  const startX = 50;
  let y = doc.y;
  const rowH = 22;
  rows.forEach((row, i) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 110;
    }
    let x = startX;
    if (i === 0) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill(TEAL);
    } else if (i % 2 === 0) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill("#f9fafb");
    }
    row.forEach((cell, j) => {
      doc.fillColor(i === 0 ? WHITE : GRAY_DARK)
        .font(i === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(String(cell), x + 6, y + 7, { width: colWidths[j] - 12, ellipsis: true });
      x += colWidths[j];
    });
    y += rowH;
  });
  doc.y = y + 10;
}

function safeImage(doc, imgPath, opts) {
  if (fs.existsSync(imgPath)) {
    try { doc.image(imgPath, opts); } catch (e) { console.warn("img fail", imgPath, e.message); }
  }
}

// =============================================================
// PDF 1 — Documentation Complète
// =============================================================
function buildDoc() {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const out = path.join(OUT_DIR, "AttenteZero_Documentation.pdf");
  doc.pipe(fs.createWriteStream(out));

  // Cover page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(TEAL_DARK);
  safeImage(doc, path.join(IMG_DIR, "hero_app.png"), { x: 50, y: 100, width: 495 });
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(42).text("AttenteZéro", 50, 380, { align: "center", width: 495 });
  doc.fillColor("#a8d8d0").font("Helvetica").fontSize(16).text("Documentation Complète du Projet", 50, 440, { align: "center", width: 495 });
  doc.fillColor(WHITE).fontSize(11).text("Application mobile d'aide aux personnes vulnérables au Québec", 50, 470, { align: "center", width: 495 });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(13).text("Version 1.0.24 — Avril 2026", 50, 720, { align: "center", width: 495 });
  doc.fillColor("#a8d8d0").font("Helvetica").fontSize(10).text("Par Dieubon Yves", 50, 745, { align: "center", width: 495 });

  // Page 2 - Mission
  doc.addPage();
  header(doc, "AttenteZéro", "Documentation v1.0.24");
  h1(doc, "1. Mission & Vision");
  p(doc, "AttenteZéro est une application mobile multilingue conçue pour aider les personnes vulnérables au Québec à trouver rapidement des services communautaires, sociaux et d'urgence.");
  callout(doc, "VISION : Réduire à zéro le temps d'attente entre une situation de détresse et l'accès à une ressource d'aide qualifiée — en français, anglais, espagnol, arabe ou créole haïtien.");
  h2(doc, "Pourquoi battre 211 ?");
  bullet(doc, "211 est limité au français/anglais, en version web seulement, sans application mobile native");
  bullet(doc, "Pas d'intelligence artificielle, pas de bouton SOS dédié");
  bullet(doc, "Pas d'outils dédiés aux intervenants de terrain");
  bullet(doc, "AttenteZéro couvre les 3 piliers : usagers en détresse + intervenants terrain + organismes communautaires");
  footer(doc, "AttenteZéro — Documentation Complète — Page 2");

  // Page 3 - Architecture
  doc.addPage();
  header(doc, "Architecture Technique", "Section 2");
  h1(doc, "2. Architecture Technique");
  p(doc, "Le projet est structuré en monorepo TypeScript géré par pnpm, séparant clairement application mobile, backend, panneau admin et bibliothèques partagées.");
  h2(doc, "Stack technologique");
  table(doc, [
    ["Couche", "Technologie", "Version"],
    ["Mobile", "Expo SDK + React Native", "SDK 54+"],
    ["Routage mobile", "Expo Router", "6.0"],
    ["Backend", "Node.js + Express 5 + TypeScript", "Node 24"],
    ["Base de données", "PostgreSQL + Drizzle ORM", "16"],
    ["Validation", "Zod v4 + drizzle-zod", "—"],
    ["Paiements", "Stripe (5 forfaits)", "API 2024"],
    ["IA conversationnelle", "OpenAI GPT-4o-mini (SSE)", "—"],
    ["Build mobile", "EAS Build (Expo)", "—"],
    ["Hébergement", "Replit Deployments", "—"],
  ], [150, 280, 65]);
  footer(doc, "AttenteZéro — Documentation Complète — Page 3");

  // Page 4 - App Mobile
  doc.addPage();
  header(doc, "Application Mobile", "Section 3");
  h1(doc, "3. Application Mobile (AttenteZéro)");
  h2(doc, "Identité");
  bullet(doc, "Nom : AttenteZéro");
  bullet(doc, "Bundle iOS / Package Android : com.attentezero.app");
  bullet(doc, "Version actuelle : 1.0.24 (versionCode 24)");
  bullet(doc, "Plateforme : Android (iOS à venir)");
  h2(doc, "Écrans principaux");
  bullet(doc, "Splash animé + redirection auto vers login ou accueil");
  bullet(doc, "Inscription en 3 rôles : Personne, Travailleur, Organisme");
  bullet(doc, "Chat IA avec détection de crise (5 langues)");
  bullet(doc, "Liste de 532 services communautaires");
  bullet(doc, "10 catégories visuelles");
  bullet(doc, "Module SOS avec 5 sections (911, hôpital, ambulance, police, pompiers)");
  bullet(doc, "CRM Clients (rôles Intervenant et plus)");
  bullet(doc, "Agenda Rendez-vous (rôles Intervenant et plus)");
  bullet(doc, "Gestion d'Équipe (rôles Organisme et plus)");
  bullet(doc, "Page tarification (5 forfaits Stripe)");
  h2(doc, "Multilingue");
  p(doc, "L'application supporte 5 langues nativement : Français (par défaut), Anglais, Espagnol, Arabe (avec gestion RTL automatique), et Créole Haïtien. Le choix est sauvegardé localement.");
  footer(doc, "AttenteZéro — Documentation Complète — Page 4");

  // Page 5 - Sécurité & Auth
  doc.addPage();
  header(doc, "Sécurité & Authentification", "Section 4-5");
  h1(doc, "4. Base de données");
  h2(doc, "Tables principales");
  table(doc, [
    ["Table", "Rôle"],
    ["users", "Comptes, hash mot de passe, rôle, premium"],
    ["services", "532 services communautaires pré-chargés"],
    ["conversations / messages", "Chat IA avec quota tracking"],
    ["organisations", "Organismes payants (forfait, ville)"],
    ["organisation_members", "Membres avec rôle (owner/admin/member)"],
    ["clients", "Carnet clients d'un intervenant"],
    ["appointments", "Rendez-vous client/intervenant"],
  ], [180, 315]);

  h1(doc, "5. Sécurité");
  bullet(doc, "Helmet activé (CSP, HSTS, X-Frame-Options)");
  bullet(doc, "Rate limiting express anti-brute force");
  bullet(doc, "CORS restrictif (whitelist Replit + domaine custom)");
  bullet(doc, "Body limit 1 MB, trust proxy 1");
  bullet(doc, "Tokens stockés dans Keystore Android natif");
  bullet(doc, "Mot de passe : bcrypt 12 rounds");
  bullet(doc, "Sessions JWT 30 jours, révocables côté serveur");
  callout(doc, "EN ATTENTE : Service d'envoi d'email pour la fonction « mot de passe oublié » (Resend ou Brevo à brancher).", GOLD);
  footer(doc, "AttenteZéro — Documentation Complète — Page 5");

  // Page 6 - Monétisation
  doc.addPage();
  header(doc, "Monétisation Stripe", "Section 6");
  h1(doc, "6. Les 5 forfaits");
  safeImage(doc, path.join(IMG_DIR, "pricing_tiers.png"), { x: 50, y: doc.y, width: 495 });
  doc.y += 290;
  table(doc, [
    ["Forfait", "Prix/mois", "Cible"],
    ["Personne", "Gratuit", "Usagers grand public"],
    ["Travailleur", "19 $", "Travailleurs sociaux, terrain"],
    ["Organisme Standard", "39 $", "OBNL petits"],
    ["Plus", "89 $", "OBNL moyens"],
    ["Institution", "199 $", "CIUSSS, gros OBNL"],
  ], [180, 90, 225]);
  footer(doc, "AttenteZéro — Documentation Complète — Page 6");

  // Page 7 - IA & SOS
  doc.addPage();
  header(doc, "IA & Module SOS", "Sections 7-8");
  h1(doc, "7. Chat IA Conversationnel");
  bullet(doc, "Modèle : OpenAI GPT-4o-mini (proxy Replit, sans clé API requise)");
  bullet(doc, "Streaming SSE pour réponses progressives en temps réel");
  bullet(doc, "Détection de crise : suicide, violence conjugale, danger immédiat");
  bullet(doc, "Réponses humanisées avec ressources locales");
  bullet(doc, "Quota gratuit : 5 messages/jour (illimité Premium)");
  bullet(doc, "Reset automatique à minuit");

  h1(doc, "8. Module SOS Urgences");
  p(doc, "L'écran SOS centralise 5 catégories d'urgence avec triage automatique par distance GPS :");
  bullet(doc, "911 — Bouton appel direct un-touch");
  bullet(doc, "Hôpitaux les plus proches (calcul GPS)");
  bullet(doc, "Ambulance — Numéros régionaux");
  bullet(doc, "Police — Postes locaux");
  bullet(doc, "Pompiers — Casernes");
  callout(doc, "Couvre 75 % des besoins d'urgence du Québec dans les 4 villes pilotes.");
  footer(doc, "AttenteZéro — Documentation Complète — Page 7");

  // Page 8 - Couverture
  doc.addPage();
  header(doc, "Couverture & Roadmap", "Sections 12-13");
  h1(doc, "12. Couverture Géographique");
  safeImage(doc, path.join(IMG_DIR, "quebec_map.png"), { x: 100, y: doc.y, width: 395 });
  doc.y += 310;
  h2(doc, "Phase 1 (actuelle) : 532 services dans 4 villes");
  bullet(doc, "Trois-Rivières");
  bullet(doc, "Shawinigan");
  bullet(doc, "Drummondville");
  bullet(doc, "Victoriaville");
  footer(doc, "AttenteZéro — Documentation Complète — Page 8");

  // Page 9 - Roadmap
  doc.addPage();
  header(doc, "Roadmap & Conclusion", "Section 13+");
  h1(doc, "13. Roadmap");
  h2(doc, "Court terme (en cours)");
  bullet(doc, "AAB v24 publié sur Internal Test Play Store");
  bullet(doc, "Validation utilisateurs internes");
  bullet(doc, "Brancher service email pour reset password");
  bullet(doc, "Lancement en Production sur Play Store");
  h2(doc, "Moyen terme (1 à 3 mois)");
  bullet(doc, "Saisie vocale dans le chat IA (Whisper)");
  bullet(doc, "Favoris + historique de recherches");
  bullet(doc, "Mode sombre + tailles de police accessibles");
  bullet(doc, "Filtre ville/quartier ultra-rapide");
  bullet(doc, "Notifications push (rappels rendez-vous)");
  h2(doc, "Long terme (6 à 12 mois)");
  bullet(doc, "Phase 2 : Montréal, Québec, Sherbrooke, Gatineau, Saguenay");
  bullet(doc, "Système d'avis et notes de services");
  bullet(doc, "Application iOS (Apple App Store)");
  bullet(doc, "API publique pour partenaires (CLSC, Centraide)");
  bullet(doc, "Tableau de bord institutionnel pour les CIUSSS");
  callout(doc, "OBJECTIF 12 MOIS : Devenir la référence numérique des services communautaires au Québec, dépassant 211 en adoption mobile.", GOLD);
  footer(doc, "AttenteZéro — Documentation Complète — Page 9");

  doc.end();
  return out;
}

// =============================================================
// PDF 2 — Flyer Promotionnel
// =============================================================
function buildFlyer() {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
  const out = path.join(OUT_DIR, "AttenteZero_Flyer.pdf");
  doc.pipe(fs.createWriteStream(out));

  const W = doc.page.width;
  const H = doc.page.height;

  // Top hero band
  doc.rect(0, 0, W, 280).fill(TEAL_DARK);
  doc.rect(0, 240, W, 40).fill(TEAL);
  // App icon placeholder (small circle)
  doc.circle(W / 2, 90, 35).fill(WHITE);
  doc.fillColor(TEAL_DARK).font("Helvetica-Bold").fontSize(24).text("AZ", W / 2 - 22, 76);

  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(38).text("AttenteZéro", 0, 145, { align: "center", width: W });
  doc.fillColor("#a8d8d0").font("Helvetica").fontSize(14).text("L'aide est à un clic, dans votre langue.", 0, 195, { align: "center", width: W });

  // Stats row
  const statsY = 310;
  const stats = [
    { num: "532", label: "Services\nrépertoriés" },
    { num: "5", label: "Langues\ndisponibles" },
    { num: "24/7", label: "Disponible\npartout" },
    { num: "0$", label: "Pour les\nusagers" },
  ];
  const colW = (W - 100) / 4;
  stats.forEach((s, i) => {
    const x = 50 + i * colW;
    doc.roundedRect(x + 5, statsY, colW - 10, 90, 10).fill(BG_LIGHT);
    doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(28).text(s.num, x + 5, statsY + 12, { width: colW - 10, align: "center" });
    doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(9).text(s.label, x + 5, statsY + 50, { width: colW - 10, align: "center" });
  });

  // Why us section
  let yy = 430;
  doc.fillColor(TEAL_DARK).font("Helvetica-Bold").fontSize(20).text("Pourquoi AttenteZéro ?", 50, yy);
  yy += 35;
  const features = [
    { icon: "IA", text: "Intelligence artificielle qui comprend votre situation en français, anglais, espagnol, arabe ou créole haïtien." },
    { icon: "SOS", text: "Bouton d'urgence dédié : 911, hôpitaux, ambulance, police, pompiers — triés par proximité." },
    { icon: "PRO", text: "Outils complets pour les travailleurs sociaux : carnet client, agenda, gestion d'équipe." },
    { icon: "QC", text: "Conçu au Québec, pour le Québec. 532 services réels dans 4 villes pilotes." },
  ];
  features.forEach((f) => {
    doc.circle(70, yy + 12, 18).fill(TEAL);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9).text(f.icon, 50, yy + 8, { width: 40, align: "center" });
    doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(11).text(f.text, 105, yy + 5, { width: W - 155, lineGap: 2 });
    yy += 50;
  });

  // Pricing teaser
  yy = 660;
  doc.rect(0, yy, W, 90).fill(BG_LIGHT);
  doc.fillColor(TEAL_DARK).font("Helvetica-Bold").fontSize(16).text("Forfaits", 50, yy + 15);
  doc.fillColor(GRAY).font("Helvetica").fontSize(10).text("Gratuit pour les usagers   •   19 $/mois pour les intervenants   •   À partir de 39 $/mois pour les organismes", 50, yy + 45, { width: W - 100 });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11).text("Stripe sécurisé · Annulable en tout temps · Fait au Québec", 50, yy + 65, { width: W - 100, align: "center" });

  // CTA
  yy = 770;
  doc.rect(0, yy, W, H - yy).fill(TEAL_DARK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(18).text("Téléchargez l'application maintenant", 0, yy + 18, { align: "center", width: W });
  doc.fillColor("#a8d8d0").font("Helvetica").fontSize(11).text("Disponible sur Google Play Store — App iOS à venir", 0, yy + 48, { align: "center", width: W });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10).text("attentezero.app   •   Contact : dieubonyves@gmail.com", 0, yy + 70, { align: "center", width: W });

  doc.end();
  return out;
}

// =============================================================
// PDF 3 — Plan Marketing & Financement
// =============================================================
function buildPlan() {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const out = path.join(OUT_DIR, "AttenteZero_Plan_Marketing_Financement.pdf");
  doc.pipe(fs.createWriteStream(out));

  // Cover
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(TEAL_DARK);
  safeImage(doc, path.join(IMG_DIR, "community_help.png"), { x: 50, y: 130, width: 495 });
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(34).text("Plan Marketing &", 50, 430, { align: "center", width: 495 });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(34).text("Financement", 50, 470, { align: "center", width: 495 });
  doc.fillColor("#a8d8d0").font("Helvetica").fontSize(14).text("AttenteZéro — Stratégie 2026-2027", 50, 530, { align: "center", width: 495 });
  doc.fillColor(WHITE).fontSize(11).text("Croissance utilisateurs · Acquisition · Levée de fonds", 50, 560, { align: "center", width: 495 });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12).text("Document confidentiel", 50, 740, { align: "center", width: 495 });

  // Page 2 - Marché
  doc.addPage();
  header(doc, "Analyse de Marché", "Partie 1");
  h1(doc, "1. Le marché québécois des services communautaires");
  h2(doc, "Taille et opportunité");
  bullet(doc, "8,7 millions d'habitants au Québec, dont 1,4 M de personnes vulnérables");
  bullet(doc, "Plus de 8 000 organismes communautaires au Québec (estimation MSSS)");
  bullet(doc, "Budget gouvernemental annuel d'environ 1,2 G$ en programmes communautaires");
  bullet(doc, "211 reçoit plus de 350 000 appels par année — preuve du besoin");
  h2(doc, "Concurrence");
  table(doc, [
    ["Acteur", "Forces", "Faiblesses"],
    ["211 Québec", "Notoriété, téléphone humain", "Pas d'app, FR/EN seulement, statique"],
    ["Centraide", "Réseau, financement", "Outil interne, pas grand public"],
    ["CIUSSS portails", "Données officielles", "Fragmentation, mauvaise UX"],
    ["AttenteZéro", "IA, mobile, 5 langues, SOS", "Notoriété à construire"],
  ], [110, 195, 190]);
  callout(doc, "OPPORTUNITÉ : Aucun acteur n'offre une expérience mobile native multilingue avec IA. Fenêtre stratégique de 18-24 mois.");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 2");

  // Page 3 - Cibles
  doc.addPage();
  header(doc, "Personas & Cibles", "Partie 2");
  h1(doc, "2. Nos 4 personas clés");
  h2(doc, "PERSONA 1 — Marie, 38 ans, intervenante sociale (Trois-Rivières)");
  p(doc, "Suit 25 clients en situation d'itinérance ou de précarité. Manque d'outils numériques, utilise Excel et papier. Cherche à gagner 5 heures par semaine.");
  bullet(doc, "Forfait visé : Travailleur 19 $/mois");
  bullet(doc, "Canal d'acquisition : Ordres professionnels (OTSTCFQ), CIUSSS, événements terrain");

  h2(doc, "PERSONA 2 — Ahmad, 29 ans, nouvel arrivant syrien (Drummondville)");
  p(doc, "Vient d'arriver, ne parle pas français, cherche logement, francisation, banque alimentaire. Utilise Google Translate au quotidien.");
  bullet(doc, "Forfait : Gratuit");
  bullet(doc, "Canal : Centres de francisation, mosquées, CSSS, MIFI");

  h2(doc, "PERSONA 3 — Direction d'OBNL (Maison Carignan, Shawinigan)");
  p(doc, "Petit OBNL avec 6 intervenants. Veut moderniser, mesurer impact, communiquer aux bailleurs. Budget IT limité.");
  bullet(doc, "Forfait : Organisme 39 $ ou Plus 89 $/mois");
  bullet(doc, "Canal : RIOCM, Centraide, salons sociaux, partenariats");

  h2(doc, "PERSONA 4 — CIUSSS Mauricie-Centre-du-Québec");
  p(doc, "Recherche outil unifié pour 200+ intervenants, conformité RGPD/Loi 25, intégration Cristal-Net.");
  bullet(doc, "Forfait : Institution 199 $/mois × multi-licences");
  bullet(doc, "Canal : Appels d'offres SAGIR, démos directes aux DG");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 3");

  // Page 4 - Stratégie marketing
  doc.addPage();
  header(doc, "Stratégie Marketing", "Partie 3");
  h1(doc, "3. Plan d'acquisition utilisateurs");
  h2(doc, "Phase 1 (mois 1-3) : Lancement local");
  bullet(doc, "Tournée de 12 organismes pilotes dans les 4 villes (visites en personne)");
  bullet(doc, "3 articles dans Le Nouvelliste, La Tribune, journaux locaux");
  bullet(doc, "Pages Facebook + Instagram bilingues, 3 posts/semaine");
  bullet(doc, "Affiches A4 dans CLSC, bibliothèques, banques alimentaires");
  bullet(doc, "Objectif : 500 téléchargements et 30 abonnés payants");

  h2(doc, "Phase 2 (mois 4-6) : Crédibilité institutionnelle");
  bullet(doc, "Partenariat officiel avec un CIUSSS pilote");
  bullet(doc, "Présentation au Forum des organismes communautaires (TROC-CDQ)");
  bullet(doc, "Campagne LinkedIn ciblée travailleurs sociaux Québec (300 $/mois)");
  bullet(doc, "Témoignages vidéo de 3 intervenants utilisateurs");
  bullet(doc, "Objectif : 2 500 téléchargements et 150 abonnés payants");

  h2(doc, "Phase 3 (mois 7-12) : Expansion régionale");
  bullet(doc, "Ouverture Montréal et Québec — 2 000 services additionnels");
  bullet(doc, "Campagne Google Ads bilingue Québec (1 500 $/mois)");
  bullet(doc, "Présence radio CKOI / 98,5 FM (chroniques sociales)");
  bullet(doc, "Programme ambassadeurs : 50 intervenants payés en commissions");
  bullet(doc, "Objectif : 15 000 téléchargements et 800 abonnés payants");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 4");

  // Page 5 - Budget marketing
  doc.addPage();
  header(doc, "Budget Marketing", "Partie 4");
  h1(doc, "4. Budget marketing 12 mois");
  table(doc, [
    ["Poste", "Budget annuel"],
    ["Publicité numérique (Meta, Google, LinkedIn)", "22 000 $"],
    ["Relations publiques (journalistes, événements)", "8 000 $"],
    ["Création de contenu (vidéos, photos, design)", "12 000 $"],
    ["Affichage et impression locale", "5 000 $"],
    ["Programme ambassadeurs (commissions)", "10 000 $"],
    ["Salons et conférences (TROC, AQOCI, RIOCM)", "6 000 $"],
    ["Outils SaaS marketing (CRM, email, analytics)", "3 000 $"],
    ["TOTAL ANNÉE 1", "66 000 $"],
  ], [330, 165]);
  callout(doc, "Coût d'acquisition cible (CAC) : 80 $ par abonné payant. LTV moyenne : 540 $ sur 24 mois. Ratio LTV/CAC : 6,75 — excellent.", TEAL);
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 5");

  // Page 6 - Sources financement
  doc.addPage();
  header(doc, "Sources de Financement", "Partie 5");
  h1(doc, "5. Stratégie de financement");
  h2(doc, "5.1 Financement non dilutif (subventions)");
  table(doc, [
    ["Programme", "Montant visé", "Échéance"],
    ["MEI — Programme jeunes entrepreneurs (Québec)", "25 000 $", "Avril 2026"],
    ["Investissement Québec — Impact", "100 000 $", "Été 2026"],
    ["Mitacs Accélération (R-D IA)", "60 000 $", "Automne 2026"],
    ["Anges Québec — bourse pré-amorçage", "50 000 $", "Continu"],
    ["FIQS (innovation sociale)", "75 000 $", "Hiver 2027"],
    ["TOTAL VISÉ NON DILUTIF", "310 000 $", "12 mois"],
  ], [240, 130, 125]);

  h2(doc, "5.2 Financement dilutif (investisseurs)");
  bullet(doc, "Tour pré-amorçage : 250 000 $ pour 12 % d'équité (valorisation 2 M$)");
  bullet(doc, "Investisseurs ciblés : Anges Québec, Real Ventures, Inovia (impact)");
  bullet(doc, "Usage des fonds : 60 % développement produit, 25 % marketing, 15 % opérations");

  h2(doc, "5.3 Revenus auto-générés");
  bullet(doc, "Année 1 : 800 abonnés × moyenne 32 $/mois = 307 000 $ ARR");
  bullet(doc, "Année 2 : 3 500 abonnés × 35 $/mois = 1 470 000 $ ARR");
  bullet(doc, "Marge brute cible : 78 % (modèle SaaS classique)");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 6");

  // Page 7 - Projection financière
  doc.addPage();
  header(doc, "Projections Financières", "Partie 6");
  h1(doc, "6. Projections sur 3 ans");
  table(doc, [
    ["Indicateur", "Année 1", "Année 2", "Année 3"],
    ["Téléchargements cumulés", "15 000", "75 000", "250 000"],
    ["Abonnés payants", "800", "3 500", "12 000"],
    ["Revenus annuels (ARR)", "307 000 $", "1 470 000 $", "5 040 000 $"],
    ["Coûts opérationnels", "420 000 $", "950 000 $", "2 100 000 $"],
    ["Résultat net", "-113 000 $", "+520 000 $", "+2 940 000 $"],
    ["Équipe (ETP)", "3", "8", "22"],
  ], [165, 110, 110, 110]);
  callout(doc, "POINT MORT atteint au mois 18. Rentabilité forte dès Année 2 grâce au modèle SaaS récurrent et à la faible rotation des organismes (churn estimé < 5 %).", TEAL);

  h2(doc, "Hypothèses clés");
  bullet(doc, "Conversion gratuit → payant : 5 % (référence SaaS B2C)");
  bullet(doc, "Croissance mensuelle abonnés : 25 % (mois 6-18)");
  bullet(doc, "Churn mensuel : 3,5 % particuliers, 1,2 % organismes");
  bullet(doc, "ARPU moyen : 32 $/mois mixte particuliers + organismes");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 7");

  // Page 8 - Impact social
  doc.addPage();
  header(doc, "Impact Social", "Partie 7");
  h1(doc, "7. Mesure d'impact social");
  p(doc, "AttenteZéro n'est pas qu'une entreprise rentable : c'est un projet à impact social mesurable. Nos KPI sociaux :");
  table(doc, [
    ["Indicateur d'impact", "Année 1", "Année 3"],
    ["Personnes vulnérables aidées", "5 000", "85 000"],
    ["Connexions usager-service réussies", "12 000", "210 000"],
    ["Heures économisées aux intervenants", "8 000 h", "180 000 h"],
    ["Situations de crise détectées par IA", "300", "5 200"],
    ["Organismes utilisateurs actifs", "60", "950"],
  ], [220, 137, 138]);
  callout(doc, "ALIGNEMENT ODD : Cibles des Objectifs de Développement Durable de l'ONU n°1 (Pas de pauvreté), n°3 (Bonne santé), n°10 (Inégalités réduites).", GOLD);

  h2(doc, "Partenariats stratégiques visés");
  bullet(doc, "Centraide du Cœur-du-Québec — distribution dans 80 organismes membres");
  bullet(doc, "Ordre des travailleurs sociaux du Québec (OTSTCFQ) — formation continue");
  bullet(doc, "MIFI (Ministère Immigration) — référencement nouveaux arrivants");
  bullet(doc, "Croix-Rouge Canada — module situations de crise");
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 8");

  // Page 9 - Risques + Conclusion
  doc.addPage();
  header(doc, "Risques & Conclusion", "Partie 8-9");
  h1(doc, "8. Risques et mitigation");
  table(doc, [
    ["Risque", "Mitigation"],
    ["Adoption lente par OBNL traditionnels", "Démonstrations gratuites, ambassadeurs"],
    ["Concurrence d'un nouveau 211 mobile", "Vitesse d'exécution, lock-in données"],
    ["Coûts IA (OpenAI) qui explosent", "Modèle hybride (cache + open source)"],
    ["Réglementation Loi 25 / RGPD", "Hébergement Canada, audit annuel"],
    ["Dépendance à 1 fondateur", "Recrutement CTO/COO en An 1"],
  ], [200, 295]);

  h1(doc, "9. Conclusion et appel à l'action");
  p(doc, "AttenteZéro est l'occasion unique de moderniser l'aide communautaire au Québec. Avec une base technique solide déjà en production, un modèle économique éprouvé et un alignement social fort, le projet est prêt pour l'accélération.");
  callout(doc, "DEMANDE : 250 000 $ en pré-amorçage + 310 000 $ en subventions sur 12 mois pour atteindre 800 abonnés payants et 15 000 utilisateurs actifs.", GOLD);
  doc.moveDown(1);
  doc.fillColor(TEAL_DARK).font("Helvetica-Bold").fontSize(12).text("Contact", { align: "center" });
  doc.fillColor(GRAY_DARK).font("Helvetica").fontSize(11).text("Dieubon Yves — Fondateur", { align: "center" });
  doc.text("dieubonyves@gmail.com", { align: "center" });
  doc.fillColor(TEAL).text("attentezero.app", { align: "center" });
  footer(doc, "AttenteZéro — Plan Marketing & Financement — Page 9 — Confidentiel");

  doc.end();
  return out;
}

// Run all
const files = [buildDoc(), buildFlyer(), buildPlan()];
console.log("Generated:", files);

/* ═══════════════════════════════════════════════════════════════════════════
   NexHire Enterprise Assistant — SPA
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  token: null,
  user:  null,
  tab:   "agent",
  docId: null,
};

// ── i18n ───────────────────────────────────────────────────────────────────
const T = {
  fr: {
    'nav.features':'Fonctionnalités','nav.pricing':'Tarifs','nav.connectors':'Connecteurs',
    'nav.login':'Se connecter','nav.trial':'Essai gratuit 14 jours',
    'hero.eyebrow':'Intelligence artificielle · Bilingue FR/EN',
    'hero.title':'Un assistant IA pour <em>tous</em> vos systèmes',
    'hero.sub':'Nexhire connecte vos outils — Microsoft 365, Salesforce, Jira, ServiceNow, SAP, Workday — en un seul agent conversationnel intelligent pour vos équipes canadiennes.',
    'hero.cta':"Commencer l'essai gratuit",'hero.login':'Se connecter',
    'hero.trust1':'14 jours gratuits','hero.trust2':'Aucune carte requise','hero.trust3':'Bilingue FR / EN',
    'hero.demo.q':'Incidents critiques + emails non lus + budget ?',
    'hero.demo.a1':'3 incidents critiques ouverts','hero.demo.a2':'2 emails prioritaires',
    'hero.demo.a3':'Budget juin 2026 — 93,7% consommé',
    'strip.label':'Connecteurs disponibles',
    'feat.label':'Pourquoi Nexhire','feat.title':'Tout ce dont votre organisation a besoin',
    'feat.sub':'Un seul agent IA qui interroge tous vos systèmes en temps réel et vous répond en français ou en anglais.',
    'feat1.title':'6 connecteurs intégrés','feat1.desc':'Microsoft 365, Salesforce, Jira, ServiceNow, SAP et Workday — connectés en quelques clics via OAuth sécurisé.',
    'feat2.title':'Agent IA conversationnel','feat2.desc':"Posez vos questions en langage naturel. L'agent consulte les bons systèmes automatiquement et synthétise les résultats.",
    'feat3.title':'Sécurité entreprise','feat3.desc':"Tokens OAuth chiffrés Fernet, JWT ES256, audit log immuable et contrôle d'accès par rôle (RBAC).",
    'feat4.title':'Bilingue FR / EN','feat4.desc':"Interface et réponses de l'agent disponibles en français et en anglais, adapté aux organisations canadiennes.",
    'feat5.title':'Analyse de documents','feat5.desc':"Téléversez des PDF — politiques, appels d'offres, rapports — et posez des questions directement sur leur contenu.",
    'feat6.title':"Journal d'audit complet",'feat6.desc':"Chaque requête, connexion et action est tracée avec l'IP, l'utilisateur, la source et le résultat — append-only.",
    'price.label':'Tarifs simples','price.title':'Commencez gratuitement. Payez quand vous êtes prêt.',
    'price.sub':"14 jours d'essai complet inclus, sans carte de crédit.",
    'price.trial':"14 jours d'essai gratuit",'price.trial.desc':'— accès complet à tous les connecteurs et fonctionnalités. Aucune carte requise.',
    'price.monthly':'Mensuel','price.monthly.unit':'/mois',
    'price.f1':'9 connecteurs (M365, Zendesk, Autotask…)','price.f2':'Agent IA — 1 000 requêtes / mois',
    'price.f3':'Analyse de documents PDF illimitée','price.f4':"Journal d'audit complet",
    'price.f5':'Support courriel prioritaire','price.f6':'Bilingue FR / EN',
    'price.cta':"Commencer l'essai",'price.monthly.note':'Sans engagement · Annulez à tout moment',
    'price.best':'🏆 Meilleure valeur — économisez 198 $','price.annual':'Annuel','price.annual.unit':'/an',
    'price.annual.saving':'Équivaut à 82,50 $ / mois — économisez 2 mois gratuits',
    'price.annual.f1':'Tout le plan Mensuel inclus','price.annual.f2':'Agent IA — 12 000 requêtes / an',
    'price.annual.f3':'Accès prioritaire aux nouveaux connecteurs','price.annual.f4':"Rapport d'utilisation mensuel",
    'price.annual.f5':'Support téléphonique dédié','price.annual.f6':'Onboarding personnalisé',
    'price.annual.note':'Facturé annuellement · Annulez à tout moment',
    'footer.desc':'Un assistant IA enterprise pour les organisations canadiennes — bilingue, sécurisé, multi-connecteurs.',
    'footer.product':'Produit','footer.support':'Support','footer.legal':'Légal',
    'footer.features':'Fonctionnalités','footer.connectors':'Connecteurs','footer.pricing':'Tarifs',
    'footer.docs':'Documentation','footer.help':"Centre d'aide",'footer.contact':'Contact',
    'footer.terms':"Conditions d'utilisation",'footer.privacy':'Politique de confidentialité','footer.security':'Sécurité',
    'footer.copyright':'© 2026 Nexhire Inc. Tous droits réservés.','footer.tagline':'Conçu pour les organisations canadiennes 🍁',
    'auth.back':"← Retour à l'accueil",'auth.login.title':'Connexion','auth.login.sub':'Accédez à votre espace Nexhire.',
    'auth.email':'Adresse courriel','auth.email.ph':'vous@organisation.ca','auth.password':'Mot de passe',
    'auth.login.btn':'Se connecter','auth.login.switch':'Pas encore de compte ?','auth.login.switch.link':'Essai gratuit 14 jours',
    'auth.signup.title':'Créer un compte','auth.signup.sub':"14 jours d'essai gratuit — aucune carte requise.",
    'auth.org':"Nom de l'organisation",'auth.fname':'Prénom','auth.lname':'Nom',
    'auth.password.new':'Mot de passe (min. 8 caractères)','auth.signup.btn':'Créer mon compte gratuitement',
    'auth.signup.switch':'Déjà un compte ?','auth.signup.switch.link':'Se connecter',
    'app.trial':'Votre essai gratuit se termine bientôt.','app.trial.cta':'Passer au Premium — 99 $/mois',
    'app.tab.agent':'Assistant IA','app.tab.connectors':'Connecteurs','app.tab.documents':'Documents','app.tab.audit':'Audit','app.tab.settings':'Paramètres',
    'app.logout':'Déconnexion','app.notif.title':'Notifications',
    'agent.title':'Posez votre question','agent.mode.ent':'Enterprise','agent.mode.mun':'Municipal / Organisme','agent.mode.rec':'Recrutement',
    'agent.chip1':'Incidents + projets + budget','agent.chip2':'Emails non lus','agent.chip3':'Contrats à renouveler','agent.chip4':'Effectifs RH','agent.chip5':'Budget du mois',
    'agent.placeholder':"Ex : Montre-moi les incidents critiques et les emails non lus liés à la panne de ce matin.",
    'agent.send':"Envoyer à l'agent",'agent.loading':'L\'agent analyse vos systèmes connectés…','agent.tools':'Outils appelés',
    'conn.title':"Connecteurs d'entreprise",'conn.refresh':'↻ Actualiser',
    'conn.desc':"Connectez vos systèmes pour que l'agent puisse les interroger en temps réel. Les tokens OAuth sont chiffrés (Fernet) avant d'être stockés.",
    'docs.title':'Analyse de documents PDF','docs.upload.title':'Téléverser un PDF','docs.upload.label':'Choisir un fichier PDF',
    'docs.upload.btn':'Extraire le texte','docs.summary.title':'Résumé IA','docs.summary.btn':'Générer le résumé',
    'docs.summary.empty':'Téléversez un PDF pour activer le résumé.','docs.chat.title':'Chat sur le document',
    'docs.chat.placeholder':"Ex : Quel est le processus d'achat ?",'docs.chat.send':'Envoyer',
    'docs.chat.init':'Posez une question après le téléversement. Ask in French or English.',
    'docs.preview.title':'Aperçu du texte extrait','docs.preview.empty':'Aucun document téléversé.',
    'audit.title':"Journal d'audit",'audit.refresh':'↻ Actualiser',
    'loading':'Chargement…',
  },
  en: {
    'nav.features':'Features','nav.pricing':'Pricing','nav.connectors':'Connectors',
    'nav.login':'Log in','nav.trial':'14-day free trial',
    'hero.eyebrow':'Artificial intelligence · Bilingual FR/EN',
    'hero.title':'One AI assistant for <em>all</em> your systems',
    'hero.sub':'Nexhire connects your tools — Microsoft 365, Salesforce, Jira, ServiceNow, SAP, Workday — into a single intelligent conversational agent for your Canadian teams.',
    'hero.cta':'Start free trial','hero.login':'Log in',
    'hero.trust1':'14 days free','hero.trust2':'No card required','hero.trust3':'Bilingual FR / EN',
    'hero.demo.q':'Critical incidents + unread emails + budget?',
    'hero.demo.a1':'3 open critical incidents','hero.demo.a2':'2 priority emails',
    'hero.demo.a3':'June 2026 budget — 93.7% consumed',
    'strip.label':'Available connectors',
    'feat.label':'Why Nexhire','feat.title':'Everything your organization needs',
    'feat.sub':'One AI agent that queries all your systems in real time and responds in French or English.',
    'feat1.title':'6 integrated connectors','feat1.desc':'Microsoft 365, Salesforce, Jira, ServiceNow, SAP and Workday — connected in a few clicks via secure OAuth.',
    'feat2.title':'Conversational AI agent','feat2.desc':'Ask questions in natural language. The agent queries the right systems automatically and synthesizes the results.',
    'feat3.title':'Enterprise security','feat3.desc':'Fernet-encrypted OAuth tokens, JWT ES256, immutable audit log and role-based access control (RBAC).',
    'feat4.title':'Bilingual FR / EN','feat4.desc':'Interface and agent responses available in French and English, tailored for Canadian organizations.',
    'feat5.title':'Document analysis','feat5.desc':'Upload PDFs — policies, RFPs, reports — and ask questions directly about their content.',
    'feat6.title':'Full audit log','feat6.desc':'Every query, connection and action is tracked with IP, user, source and result — append-only.',
    'price.label':'Simple pricing','price.title':"Start free. Pay when you're ready.",
    'price.sub':'14-day full trial included, no credit card required.',
    'price.trial':'14-day free trial','price.trial.desc':'— full access to all connectors and features. No card required.',
    'price.monthly':'Monthly','price.monthly.unit':'/mo',
    'price.f1':'9 connectors (M365, Zendesk, Autotask…)','price.f2':'AI Agent — 1,000 queries / month',
    'price.f3':'Unlimited PDF document analysis','price.f4':'Full audit log',
    'price.f5':'Priority email support','price.f6':'Bilingual FR / EN',
    'price.cta':'Start trial','price.monthly.note':'No commitment · Cancel anytime',
    'price.best':'🏆 Best value — save $198','price.annual':'Annual','price.annual.unit':'/yr',
    'price.annual.saving':'Equivalent to $82.50/mo — save 2 free months',
    'price.annual.f1':'All Monthly plan included','price.annual.f2':'AI Agent — 12,000 queries / year',
    'price.annual.f3':'Priority access to new connectors','price.annual.f4':'Monthly usage report',
    'price.annual.f5':'Dedicated phone support','price.annual.f6':'Personalized onboarding',
    'price.annual.note':'Billed annually · Cancel anytime',
    'footer.desc':'An enterprise AI assistant for Canadian organizations — bilingual, secure, multi-connector.',
    'footer.product':'Product','footer.support':'Support','footer.legal':'Legal',
    'footer.features':'Features','footer.connectors':'Connectors','footer.pricing':'Pricing',
    'footer.docs':'Documentation','footer.help':'Help center','footer.contact':'Contact',
    'footer.terms':'Terms of service','footer.privacy':'Privacy policy','footer.security':'Security',
    'footer.copyright':'© 2026 Nexhire Inc. All rights reserved.','footer.tagline':'Built for Canadian organizations 🍁',
    'auth.back':'← Back to home','auth.login.title':'Sign in','auth.login.sub':'Access your Nexhire workspace.',
    'auth.email':'Email address','auth.email.ph':'you@organization.ca','auth.password':'Password',
    'auth.login.btn':'Sign in','auth.login.switch':'No account yet?','auth.login.switch.link':'14-day free trial',
    'auth.signup.title':'Create account','auth.signup.sub':'14-day free trial — no card required.',
    'auth.org':'Organization name','auth.fname':'First name','auth.lname':'Last name',
    'auth.password.new':'Password (min. 8 characters)','auth.signup.btn':'Create my free account',
    'auth.signup.switch':'Already have an account?','auth.signup.switch.link':'Sign in',
    'app.trial':'Your free trial ends soon.','app.trial.cta':'Upgrade to Premium — $99/mo',
    'app.tab.agent':'AI Assistant','app.tab.connectors':'Connectors','app.tab.documents':'Documents','app.tab.audit':'Audit','app.tab.settings':'Settings',
    'app.logout':'Sign out','app.notif.title':'Notifications',
    'agent.title':'Ask a question','agent.mode.ent':'Enterprise','agent.mode.mun':'Municipal / Organization','agent.mode.rec':'Recruiting',
    'agent.chip1':'Incidents + projects + budget','agent.chip2':'Unread emails','agent.chip3':'Contracts to renew','agent.chip4':'HR headcount','agent.chip5':'Monthly budget',
    'agent.placeholder':"E.g.: Show me critical incidents and unread emails related to this morning's outage.",
    'agent.send':'Send to agent','agent.loading':'Agent is analyzing your connected systems…','agent.tools':'Tools called',
    'conn.title':'Enterprise Connectors','conn.refresh':'↻ Refresh',
    'conn.desc':'Connect your systems so the agent can query them in real time. OAuth tokens are Fernet-encrypted before storage.',
    'docs.title':'PDF Document Analysis','docs.upload.title':'Upload a PDF','docs.upload.label':'Choose a PDF file',
    'docs.upload.btn':'Extract text','docs.summary.title':'AI Summary','docs.summary.btn':'Generate summary',
    'docs.summary.empty':'Upload a PDF to enable summary.','docs.chat.title':'Chat with document',
    'docs.chat.placeholder':'E.g.: What is the procurement process?','docs.chat.send':'Send',
    'docs.chat.init':'Ask a question after uploading. Ask in French or English.',
    'docs.preview.title':'Extracted text preview','docs.preview.empty':'No document uploaded.',
    'audit.title':'Audit Log','audit.refresh':'↻ Refresh',
    'loading':'Loading…',
  },
};

let _lang = localStorage.getItem("nexhire_lang") || "fr";

function setLang(l) {
  _lang = l;
  localStorage.setItem("nexhire_lang", l);
  document.getElementById("html-root").lang = l;
  // Update all lang toggle buttons
  document.querySelectorAll(".lang-btn").forEach(b => { b.textContent = l === "fr" ? "EN" : "FR"; });
  // Sync agent-lang and doc-lang selects
  const al = document.getElementById("agent-lang"); if (al) al.value = l;
  const dl = document.getElementById("doc-lang");   if (dl) dl.value = l;
  // Apply text translations
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = T[l][el.dataset.i18n];
    if (v !== undefined) el.textContent = v;
  });
  // Apply HTML translations (for elements with markup like <em>)
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const v = T[l][el.dataset.i18nHtml];
    if (v !== undefined) el.innerHTML = v;
  });
  // Apply placeholder translations
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const v = T[l][el.dataset.i18nPlaceholder];
    if (v !== undefined) el.placeholder = v;
  });
  // Update prompt chips data-prompt to the active language
  document.querySelectorAll(".prompt-chip").forEach(chip => {
    const p = chip.dataset[l === "fr" ? "promptFr" : "promptEn"];
    if (p) chip.dataset.prompt = p;
  });
}

function toggleLang() {
  setLang(_lang === "fr" ? "en" : "fr");
}

// ── Connector metadata ─────────────────────────────────────────────────────
const CONNECTORS = {
  microsoft_365: { label: "Microsoft 365",  icon: "M",  color: "#0078d4", oauth: true  },
  salesforce:    { label: "Salesforce",     icon: "SF", color: "#00a1e0", oauth: false },
  servicenow:    { label: "ServiceNow",     icon: "SN", color: "#62d2cc", oauth: false },
  jira:          { label: "Jira",           icon: "J",  color: "#0052cc", oauth: false },
  sap:           { label: "SAP",            icon: "S",  color: "#0070b8", oauth: false },
  workday:       { label: "Workday",        icon: "W",  color: "#f78b1f", oauth: false },
  zendesk:       { label: "Zendesk",        icon: "ZD", color: "#00b7c5", oauth: false },
  autotask:      { label: "Autotask",       icon: "AT", color: "#007dc6", oauth: false },
  hubspot:       { label: "HubSpot",        icon: "HS", color: "#ff7a59", oauth: false },
};

// ── DOM shortcuts ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// VIEW ROUTING
// ═══════════════════════════════════════════════════════════════════════════

function showLanding() {
  $("view-landing").classList.remove("hidden");
  $("view-auth").classList.add("hidden");
  $("view-app").classList.add("hidden");
}

function showAuth(mode = "login") {
  $("view-landing").classList.add("hidden");
  $("view-auth").classList.remove("hidden");
  $("view-app").classList.add("hidden");
  $("auth-login").classList.toggle("hidden",  mode !== "login");
  $("auth-signup").classList.toggle("hidden", mode !== "signup");
  if (mode === "login")  { $("login-error").classList.add("hidden"); $("login-email").focus(); }
  if (mode === "signup") { $("signup-error").classList.add("hidden"); $("signup-success").classList.add("hidden"); $("signup-org").focus(); }
}

function showApp() {
  $("view-landing").classList.add("hidden");
  $("view-auth").classList.add("hidden");
  $("view-app").classList.remove("hidden");

  // User info
  const u = state.user;
  $("nav-user-email").textContent  = u?.email || "";
  $("nav-user-role").textContent   = u?.role  || "user";
  $("user-avatar").textContent     = (u?.email || "?")[0].toUpperCase();

  // Admin-only elements
  const isAdmin = ["admin", "owner"].includes(u?.role);
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));

  // Trial banner
  if (u?.subscription_status === "trialing") {
    const banner = $("trial-banner");
    $("trial-text").textContent = "Vous êtes en période d'essai gratuit (14 jours) — passez au Premium pour continuer.";
    banner.classList.remove("hidden");
  }

  // Notifications
  buildNotifications();

  // OAuth return params
  const params = new URLSearchParams(window.location.search);
  if (params.get("connected")) {
    switchTab("connectors");
    const name = CONNECTORS[params.get("connected")]?.label || params.get("connected");
    const banner = $("connector-success");
    banner.textContent = `✓ ${name} connecté avec succès via OAuth.`;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 7000);
    window.history.replaceState({}, "", "/");
  } else if (params.get("oauth_error")) {
    switchTab("connectors");
    alert(`Erreur OAuth : ${params.get("oauth_error")}`);
    window.history.replaceState({}, "", "/");
  } else if (params.get("tab")) {
    switchTab(params.get("tab"));
    window.history.replaceState({}, "", "/");
  }

  loadActiveTab();
}

// Trial banner dismiss
$("trial-dismiss")?.addEventListener("click", () => {
  $("trial-banner").classList.add("hidden");
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function buildNotifications() {
  const notifs = [];
  if (state.user?.subscription_status === "trialing") {
    notifs.push({ icon: "🕐", title: "Essai gratuit actif", body: "Passez au Premium pour continuer après la période d'essai — 99 $/mois." });
  }
  notifs.push({ icon: "✅", title: "Système opérationnel", body: "Tous les services NexHire fonctionnent normalement." });

  const list = $("notif-list");
  list.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <div class="notif-item-icon">${n.icon}</div>
      <div class="notif-item-body"><strong>${n.title}</strong><span>${n.body}</span></div>
    </div>
  `).join("");

  $("notif-dot").classList.toggle("hidden", notifs.length === 0);
}

$("notif-btn")?.addEventListener("click", e => {
  e.stopPropagation();
  $("notif-dropdown").classList.toggle("hidden");
});

document.addEventListener("click", () => {
  $("notif-dropdown")?.classList.add("hidden");
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

function saveToken(t) { state.token = t; localStorage.setItem("nexhire_token", t); }
function clearAuth()  { state.token = null; state.user = null; localStorage.removeItem("nexhire_token"); }

async function apiCall(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { clearAuth(); showAuth("login"); throw new Error("Session expirée."); }
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
  return data;
}

async function fetchMe() {
  state.user = await apiCall("/api/auth/me");
}

// Login
$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("login-btn");
  const err = $("login-error");
  btn.disabled = true; btn.textContent = "Connexion…"; err.classList.add("hidden");
  try {
    const data = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("login-email").value, password: $("login-password").value }),
    });
    const json = await data.json();
    if (!data.ok) throw new Error(json.detail || "Connexion échouée.");
    saveToken(json.access_token);
    await fetchMe();
    showApp();
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Se connecter";
  }
});

// Signup
$("signup-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("signup-btn");
  const err = $("signup-error");
  const suc = $("signup-success");
  btn.disabled = true; btn.textContent = "Création…";
  err.classList.add("hidden"); suc.classList.add("hidden");
  const fullName = `${$("signup-fname").value.trim()} ${$("signup-lname").value.trim()}`.trim();
  try {
    await apiCall("/api/auth/signup", "POST", {
      organization_name: $("signup-org").value.trim(),
      full_name: fullName,
      email: $("signup-email").value.trim(),
      password: $("signup-password").value,
    });
    suc.textContent = "Compte créé ! Vérifiez votre courriel pour activer votre compte, puis connectez-vous.";
    suc.classList.remove("hidden");
    setTimeout(() => showAuth("login"), 4000);
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Créer mon compte gratuitement";
  }
});

// Logout
$("logout-btn").addEventListener("click", () => {
  clearAuth();
  showLanding();
});

// ═══════════════════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.toggle("hidden", s.id !== `tab-${name}`));
  loadActiveTab();
}

function loadActiveTab() {
  if (state.tab === "connectors") loadConnectors();
  if (state.tab === "audit")      loadAudit();
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT TAB
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    $("agent-question").value = chip.dataset.prompt;
    $("agent-question").focus();
  });
});

$("agent-form").addEventListener("submit", async e => {
  e.preventDefault();
  const q = $("agent-question").value.trim();
  if (!q) return;
  $("agent-btn").disabled = true;
  $("agent-result").classList.add("hidden");
  $("agent-error").classList.add("hidden");
  $("agent-loading").classList.remove("hidden");
  try {
    const data = await apiCall("/api/agent/query", "POST", {
      question: q,
      assistant_mode: $("agent-mode").value,
      language:       $("agent-lang").value,
    });
    renderAgentResult(data);
  } catch (ex) {
    $("agent-error").textContent = ex.message;
    $("agent-error").classList.remove("hidden");
  } finally {
    $("agent-btn").disabled = false;
    $("agent-loading").classList.add("hidden");
  }
});

function renderAgentResult(data) {
  const sources = $("agent-sources");
  sources.innerHTML = "";
  if (data.sources?.length) {
    const lbl = document.createElement("span"); lbl.textContent = "Sources :"; sources.appendChild(lbl);
    data.sources.forEach(s => {
      const chip = document.createElement("span");
      chip.className = "source-chip";
      chip.textContent = CONNECTORS[s]?.label || s;
      sources.appendChild(chip);
    });
  } else {
    sources.style.display = "none";
  }
  $("agent-answer").textContent  = data.answer || "(aucune réponse)";
  $("agent-tools-json").textContent = JSON.stringify(data.tools_called, null, 2);
  $("agent-result").classList.remove("hidden");
  $("agent-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTORS TAB
// ═══════════════════════════════════════════════════════════════════════════

$("refresh-connectors").addEventListener("click", loadConnectors);

async function loadConnectors() {
  const grid = $("connector-grid");
  grid.innerHTML = "<p class='muted'>Chargement…</p>";
  let connected = {};
  try {
    const list = await apiCall("/api/connectors");
    list.forEach(c => { connected[c.connector_type] = c; });
  } catch {
    grid.innerHTML = "<p class='error-text'>Impossible de charger les connecteurs.</p>";
    return;
  }
  grid.innerHTML = "";
  Object.entries(CONNECTORS).forEach(([type, meta]) => {
    grid.appendChild(buildConnectorCard(type, meta, connected[type] || null));
  });
}

function buildConnectorCard(type, meta, info) {
  const isConnected = info?.status === "connected";
  const connectedAt = info?.connected_at ? new Date(info.connected_at).toLocaleString("fr-CA") : null;

  const card = document.createElement("div");
  card.className = `connector-card${isConnected ? " connected" : ""}`;

  const head = document.createElement("div");
  head.className = "connector-head";
  head.innerHTML = `
    <div class="connector-icon" style="background:${meta.color}">${meta.icon}</div>
    <span class="connector-name">${meta.label}</span>
    <span class="connector-badge ${isConnected ? (meta.oauth ? "badge-oauth" : "badge-connected") : "badge-disconnected"}">
      ${isConnected ? (meta.oauth ? "OAuth ✓" : "Connecté") : "Déconnecté"}
    </span>`;
  card.appendChild(head);

  if (connectedAt) {
    const m = document.createElement("p");
    m.className = "connector-meta";
    m.textContent = `Connecté depuis le ${connectedAt}`;
    card.appendChild(m);
  }
  if (info?.last_error) {
    const er = document.createElement("p");
    er.className = "connector-error";
    er.textContent = info.last_error;
    card.appendChild(er);
  }

  const btn = document.createElement("button");
  if (isConnected) {
    btn.className = "btn-disconnect";
    btn.textContent = "Déconnecter";
    btn.addEventListener("click", () => doDisconnect(type, btn));
  } else if (meta.oauth) {
    btn.className = "btn-connect real";
    btn.textContent = "Connecter avec Microsoft";
    btn.addEventListener("click", () => doOAuthStart(type, btn));
  } else {
    btn.className = "btn-connect sim";
    btn.textContent = "Connecter (simulé)";
    btn.addEventListener("click", () => doConnect(type, btn));
  }
  card.appendChild(btn);
  return card;
}

async function doOAuthStart(type, btn) {
  btn.disabled = true; btn.textContent = "Redirection…";
  try {
    const data = await apiCall(`/api/connectors/${type}/oauth/start`, "POST");
    window.location.href = data.authorization_url;
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Connecter avec Microsoft";
    alert(`Erreur : ${ex.message}`);
  }
}

async function doConnect(type, btn) {
  btn.disabled = true; btn.textContent = "Connexion…";
  try {
    await apiCall(`/api/connectors/${type}/connect`, "POST");
    await loadConnectors();
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Connecter (simulé)";
    alert(`Erreur : ${ex.message}`);
  }
}

async function doDisconnect(type, btn) {
  if (!confirm(`Déconnecter ${CONNECTORS[type]?.label || type} ?`)) return;
  btn.disabled = true; btn.textContent = "Déconnexion…";
  try {
    await apiCall(`/api/connectors/${type}/disconnect`, "POST");
    await loadConnectors();
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Déconnecter";
    alert(`Erreur : ${ex.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════

$("pdf-file").addEventListener("change", () => {
  $("file-label").textContent = $("pdf-file").files[0]?.name || "Choisir un fichier PDF";
});

$("upload-form").addEventListener("submit", async e => {
  e.preventDefault();
  const st = $("upload-status");
  st.textContent = "Extraction en cours…"; st.classList.remove("error");
  toggleDoc(true);
  try {
    const res = await fetch("/api/documents", { method: "POST", body: new FormData($("upload-form")) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erreur téléversement.");
    state.docId = data.id;
    $("preview").textContent = data.text_preview || "Aucun texte extractible.";
    st.textContent = `${data.filename} — ${data.character_count.toLocaleString()} caractères extraits.`;
    $("summary").textContent = data.warning || "Document prêt. Cliquez pour générer un résumé IA.";
    $("summary").classList.toggle("muted", Boolean(data.warning));
    $("chat-log").innerHTML = '<div class="message assistant">Document chargé. Posez votre question en français ou en anglais.</div>';
    toggleDoc(false);
  } catch (ex) {
    state.docId = null; st.textContent = ex.message; st.classList.add("error");
  }
});

$("summary-button").addEventListener("click", async () => {
  if (!state.docId) return;
  $("summary-button").disabled = true;
  $("summary").textContent = "Génération du résumé…";
  try {
    const res = await fetch(`/api/documents/${state.docId}/summary`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail);
    $("summary").textContent = json.summary;
    $("summary").classList.remove("muted");
  } catch (ex) { $("summary").textContent = `Erreur : ${ex.message}`; }
  finally { $("summary-button").disabled = false; }
});

$("chat-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!state.docId) return;
  const q = $("doc-question").value.trim();
  if (!q) return;
  appendMsg("user", q);
  $("doc-question").value = "";
  $("chat-button").disabled = true;
  try {
    const res = await fetch(`/api/documents/${state.docId}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail);
    appendMsg("assistant", json.answer);
  } catch (ex) { appendMsg("assistant", `Erreur : ${ex.message}`); }
  finally { $("chat-button").disabled = false; $("doc-question").focus(); }
});

function toggleDoc(disabled) {
  $("summary-button").disabled = disabled;
  $("doc-question").disabled   = disabled;
  $("chat-button").disabled    = disabled;
}

function appendMsg(role, text) {
  const d = document.createElement("div");
  d.className = `message ${role}`; d.textContent = text;
  $("chat-log").appendChild(d);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT TAB
// ═══════════════════════════════════════════════════════════════════════════

$("refresh-audit").addEventListener("click", loadAudit);

async function loadAudit() {
  const wrap = $("audit-wrap");
  wrap.innerHTML = "<p class='muted' style='padding:20px'>Chargement…</p>";
  try {
    const resp = await apiCall("/api/audit");
    const logs = resp.logs || [];
    if (!logs.length) { wrap.innerHTML = "<p class='muted' style='padding:20px'>Aucun événement enregistré.</p>"; return; }
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>Connecteur</th><th>Statut</th><th>IP</th></tr></thead>
      <tbody>${logs.map(l => `<tr>
        <td>${l.created_at ? new Date(l.created_at).toLocaleString("fr-CA") : "—"}</td>
        <td>${l.action || "—"}</td>
        <td>${l.user_id ? l.user_id.slice(0,8)+"…" : "—"}</td>
        <td>${l.connector || "—"}</td>
        <td class="${l.success !== false ? "badge-ok" : "badge-fail"}">${l.success !== false ? "✓" : "✗"}</td>
        <td>${l.ip_address || "—"}</td>
      </tr>`).join("")}</tbody>`;
    wrap.innerHTML = ""; wrap.appendChild(table);
  } catch (ex) {
    wrap.innerHTML = `<p class='error-text' style='padding:20px'>Erreur : ${ex.message}</p>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  const stored = localStorage.getItem("nexhire_token");
  if (!stored) { showLanding(); return; }
  state.token = stored;
  try {
    await fetchMe();
    showApp();
  } catch {
    clearAuth();
    showLanding();
  }
}

init();
setLang(_lang);

// ═══════════════════════════════════════════════════════════════════════════
// HERO SLIDESHOW
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  const slides = document.querySelectorAll(".hero-slide");
  const dots   = document.querySelectorAll(".slide-dot");
  if (!slides.length) return;

  let current = 0;
  let timer;

  function goTo(n) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (n + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }

  function next() { goTo(current + 1); }

  function start() { timer = setInterval(next, 5000); }
  function stop()  { clearInterval(timer); }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => { stop(); goTo(i); start(); });
  });

  // Pause on hover
  document.getElementById("hero-slider")?.addEventListener("mouseenter", stop);
  document.getElementById("hero-slider")?.addEventListener("mouseleave", start);

  start();
})();

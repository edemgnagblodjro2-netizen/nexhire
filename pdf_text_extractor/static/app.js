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

// ── Helpers globaux ────────────────────────────────────────────────────────
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

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
    'export.label':'Télécharger ce rapport :',
    'rating.label':'Cette réponse vous a-t-elle aidé ?','rating.thanks':'Merci pour votre avis !',
    'stats.title':"Statistiques d'utilisation",
    'stats.queries':'Requêtes','stats.score':'Satisfaction moyenne','stats.rated':'Réponses notées','stats.util':'Utilisateurs actifs',
    'stats.chart.daily':'Activité quotidienne','stats.chart.connectors':'Connecteurs utilisés','stats.chart.sat':'Répartition de la satisfaction',
    'app.tab.stats':'Statistiques',
    'app.tab.team':'Équipe','app.tab.settings':'Paramètres',
    'team.title':"Gestion de l'équipe",'team.invite.btn':'+ Inviter un membre',
    'team.desc':"Les membres invités rejoignent votre organisation et partagent le quota mensuel de requêtes.",
    'team.pending':'Invitations en attente',
    'team.invite.title':'Inviter un membre','team.invite.desc':"Un lien d'invitation valide 7 jours sera généré.",
    'team.invite.role':'Rôle','team.role.user':'Utilisateur','team.role.manager':'Manager','team.role.admin':'Admin',
    'team.invite.generate':'Générer le lien','team.invite.ready':'Lien prêt — copiez-le et partagez-le :',
    'team.invite.copy':'Copier','team.invite.copied':'Lien copié !',
    'auth.invite.joining':'Vous rejoignez cette organisation en tant que',
    'settings.title':'Paramètres',
    'settings.profile.title':'Informations du compte',
    'settings.fullname':'Nom complet','settings.email.label':'Adresse courriel',
    'settings.org':'Organisation','settings.member.since':'Membre depuis',
    'settings.save':'Enregistrer','settings.saved':'Profil mis à jour.',
    'settings.password.title':'Sécurité',
    'settings.pwd.current':'Mot de passe actuel','settings.pwd.new':'Nouveau mot de passe',
    'settings.pwd.confirm':'Confirmer le nouveau mot de passe',
    'settings.pwd.btn':'Changer le mot de passe','settings.pwd.success':'Mot de passe modifié avec succès.',
    'settings.pwd.mismatch':'Les deux mots de passe ne correspondent pas.',
    'settings.sso.title':'Authentification SSO',
    'settings.sso.inactive':'SSO non configuré','settings.sso.active':'SSO actif ✓',
    'settings.sso.desc':"L'authentification unique (SSO) via SAML 2.0 ou OpenID Connect permet à vos collaborateurs de se connecter avec les identifiants de votre organisation.",
    'settings.sso.cta':'Activer le SSO — contacter le support',
    'settings.sso.active.msg':'SSO actif — vos utilisateurs se connectent via votre fournisseur d\'identité.',
    'settings.plan.title':'Abonnement','settings.plan.manage':'Gérer l\'abonnement',
    'loading':'Chargement…',
    'app.tab.parc':'Parc IT',
    'parc.title':'Parc IT','parc.dept.all':'Tous les départements',
    'parc.tab.overview':'Vue d\'ensemble','parc.tab.budget':'Budget',
    'parc.tab.licenses':'Licences','parc.tab.servers':'Serveurs','parc.tab.apps':'Applications',
    'parc.kpi.budget':'Budget utilisé','parc.kpi.lic':'Licences expirant <30j',
    'parc.kpi.srv':'Serveurs à décommissionner','parc.kpi.apps':'Applications inutilisées',
    'parc.chart.budget':'Budget par catégorie','parc.chart.forecast':'Prévision 3 mois',
    'parc.all':'Tout','parc.budget.add':'+ Entrée','parc.budget.label':'Libellé',
    'parc.budget.allocated':'Alloué ($)','parc.budget.actual':'Réel ($)',
    'parc.lic.add':'+ Licence','parc.lic.expiring30':'Expirent <30j','parc.lic.expiring90':'Expirent <90j',
    'parc.srv.add':'+ Serveur','parc.srv.active':'Actifs','parc.srv.idle':'Inactifs','parc.srv.decom':'À décommissionner',
    'parc.app.add':'+ Application','parc.app.active':'Actives','parc.app.unused':'Non utilisées','parc.app.decom':'Décommissionnées',
    'sa.title':'Comptes de service','sa.add':'+ Créer','sa.name':'Nom','sa.role':'Rôle',
    'sa.desc':'Tokens longue durée non liés à un compte utilisateur.',
    'dept.title':'Départements','dept.add':'+ Département','dept.name':'Nom','dept.budget':'Budget annuel ($)',
    'app.tab.optim':'Optimisation IA',
    'optim.title':'Optimisation IA','optim.analyze':'Analyser avec l\'IA',
    'optim.tab.dashboard':'Tableau de bord','optim.tab.licenses':'Licences inutilisées',
    'optim.tab.duplicates':'Outils en doublon','optim.tab.contracts':'Contrats',
    'optim.tab.processes':'Processus RH','optim.tab.aiplan':'Plan IA',
    'optim.score.title':'Score d\'efficacité organisationnelle',
    'optim.score.sw':'Logiciels','optim.score.lic':'Licences',
    'optim.score.infra':'Infrastructure','optim.score.proc':'Processus',
    'optim.savings.title':'Économies identifiées',
    'optim.top':'10 meilleures opportunités',
    'optim.lic.desc':'Licences avec utilisation < 80% — économies immédiates possibles.',
    'optim.dup.desc':'Catégories d\'outils en doublon — consolidation recommandée.',
    'optim.contract.add':'+ Contrat',
    'optim.proc.desc':'Processus manuels et leur potentiel d\'automatisation.',
    'optim.proc.add':'+ Processus',
    'optim.aiplan.hint':'Posez une question pour générer un plan d\'économies personnalisé.',
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
    'export.label':'Download this report:',
    'rating.label':'Was this answer helpful?','rating.thanks':'Thank you for your feedback!',
    'stats.title':'Usage Statistics',
    'stats.queries':'Queries','stats.score':'Avg satisfaction','stats.rated':'Rated responses','stats.util':'Active users',
    'stats.chart.daily':'Daily activity','stats.chart.connectors':'Connectors used','stats.chart.sat':'Satisfaction distribution',
    'app.tab.stats':'Statistics',
    'app.tab.team':'Team','app.tab.settings':'Settings',
    'team.title':'Team management','team.invite.btn':'+ Invite member',
    'team.desc':'Invited members join your organization and share the monthly query quota.',
    'team.pending':'Pending invitations',
    'team.invite.title':'Invite a member','team.invite.desc':'An invitation link valid for 7 days will be generated.',
    'team.invite.role':'Role','team.role.user':'User','team.role.manager':'Manager','team.role.admin':'Admin',
    'team.invite.generate':'Generate link','team.invite.ready':'Link ready — copy and share it:',
    'team.invite.copy':'Copy','team.invite.copied':'Link copied!',
    'auth.invite.joining':'You are joining this organization as',
    'app.tab.settings':'Settings',
    'settings.title':'Settings',
    'settings.profile.title':'Account information',
    'settings.fullname':'Full name','settings.email.label':'Email address',
    'settings.org':'Organization','settings.member.since':'Member since',
    'settings.save':'Save','settings.saved':'Profile updated.',
    'settings.password.title':'Security',
    'settings.pwd.current':'Current password','settings.pwd.new':'New password',
    'settings.pwd.confirm':'Confirm new password',
    'settings.pwd.btn':'Change password','settings.pwd.success':'Password changed successfully.',
    'settings.pwd.mismatch':'The two passwords do not match.',
    'settings.sso.title':'SSO Authentication',
    'settings.sso.inactive':'SSO not configured','settings.sso.active':'SSO active ✓',
    'settings.sso.desc':'Single Sign-On (SSO) via SAML 2.0 or OpenID Connect lets your team log in with your organization credentials (Microsoft Entra ID, Okta, Google Workspace…).',
    'settings.sso.cta':'Enable SSO — contact support',
    'settings.sso.active.msg':'SSO active — your users sign in through your identity provider.',
    'settings.plan.title':'Subscription','settings.plan.manage':'Manage subscription',
    'loading':'Loading…',
    'app.tab.parc':'IT Assets',
    'parc.title':'IT Assets','parc.dept.all':'All departments',
    'parc.tab.overview':'Overview','parc.tab.budget':'Budget',
    'parc.tab.licenses':'Licenses','parc.tab.servers':'Servers','parc.tab.apps':'Applications',
    'parc.kpi.budget':'Budget used','parc.kpi.lic':'Licenses expiring <30d',
    'parc.kpi.srv':'Servers to decommission','parc.kpi.apps':'Unused applications',
    'parc.chart.budget':'Budget by category','parc.chart.forecast':'3-month forecast',
    'parc.all':'All','parc.budget.add':'+ Entry','parc.budget.label':'Label',
    'parc.budget.allocated':'Allocated ($)','parc.budget.actual':'Actual ($)',
    'parc.lic.add':'+ License','parc.lic.expiring30':'Expiring <30d','parc.lic.expiring90':'Expiring <90d',
    'parc.srv.add':'+ Server','parc.srv.active':'Active','parc.srv.idle':'Idle','parc.srv.decom':'To decommission',
    'parc.app.add':'+ Application','parc.app.active':'Active','parc.app.unused':'Unused','parc.app.decom':'Decommissioned',
    'sa.title':'Service Accounts','sa.add':'+ Create','sa.name':'Name','sa.role':'Role',
    'sa.desc':'Long-lived tokens not tied to a user account.',
    'dept.title':'Departments','dept.add':'+ Department','dept.name':'Name','dept.budget':'Annual budget ($)',
    'app.tab.optim':'AI Optimization',
    'optim.title':'AI Optimization','optim.analyze':'Analyze with AI',
    'optim.tab.dashboard':'Dashboard','optim.tab.licenses':'Unused Licenses',
    'optim.tab.duplicates':'Duplicate Tools','optim.tab.contracts':'Contracts',
    'optim.tab.processes':'HR Processes','optim.tab.aiplan':'AI Plan',
    'optim.score.title':'Organizational Efficiency Score',
    'optim.score.sw':'Software','optim.score.lic':'Licenses',
    'optim.score.infra':'Infrastructure','optim.score.proc':'Processes',
    'optim.savings.title':'Identified Savings',
    'optim.top':'Top 10 Opportunities',
    'optim.lic.desc':'Licenses with < 80% utilization — immediate savings possible.',
    'optim.dup.desc':'Duplicate tool categories — consolidation recommended.',
    'optim.contract.add':'+ Contract',
    'optim.proc.desc':'Manual processes and their automation potential.',
    'optim.proc.add':'+ Process',
    'optim.aiplan.hint':'Ask a question to generate a personalized savings plan.',
  },
};

let _lang = localStorage.getItem("nexhire_lang") || "fr";

function setLang(l) {
  _lang = l;
  localStorage.setItem("nexhire_lang", l);
  document.getElementById("html-root").lang = l;
  // Update all lang toggle buttons
  document.querySelectorAll(".lang-btn").forEach(b => { b.textContent = l === "fr" ? "EN" : "FR"; });
  _updateLangLabel();
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
  if (state.token) loadActiveTab(); // rafraîchit les labels dynamiques
}

// ── Connector metadata ─────────────────────────────────────────────────────
const CONNECTORS = {
  // ── OAuth (Authorization Code Flow) ──────────────────────────────────────
  microsoft_365: {
    label: "Microsoft 365", icon: "M",  color: "#0078d4", method: "oauth",
    desc: "Exchange, Teams, SharePoint, OneDrive, Calendrier",
    help_url: "https://portal.azure.com",
    help_label: "Azure App Registration",
  },
  salesforce: {
    label: "Salesforce CRM", icon: "SF", color: "#00a1e0", method: "oauth",
    desc: "Comptes, Leads, Opportunités, Tickets, Rapports",
    help_url: "https://trailhead.salesforce.com/content/learn/modules/connected-app-basics",
    help_label: "Connected App Salesforce",
  },
  servicenow: {
    label: "ServiceNow", icon: "SN", color: "#62d2cc", method: "oauth",
    desc: "Incidents, Changements, CMDB, SLA, Demandes",
    help_url: "https://docs.servicenow.com/bundle/washingtondc-platform-security/page/administer/security/concept/c_OAuthApplications.html",
    help_label: "OAuth dans ServiceNow",
  },
  jira: {
    label: "Jira / Confluence", icon: "J", color: "#0052cc", method: "oauth",
    desc: "Tickets, Sprints, Projets, Pages Confluence",
    help_url: "https://developer.atlassian.com/console/myapps/",
    help_label: "Atlassian Developer Console",
  },
  zendesk: {
    label: "Zendesk", icon: "ZD", color: "#03363d", method: "oauth",
    desc: "Tickets support, Agents, SLA, Articles base de connaissances",
    help_url: "https://developer.zendesk.com/api-reference/ticketing/oauth/oauth_clients/",
    help_label: "OAuth Client Zendesk",
  },
  hubspot: {
    label: "HubSpot", icon: "HS", color: "#ff7a59", method: "oauth",
    desc: "CRM, Contacts, Deals, Tickets, Pipelines marketing",
    help_url: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide",
    help_label: "OAuth HubSpot",
  },
  // ── API Key / Credentials ─────────────────────────────────────────────────
  sap: {
    label: "SAP", icon: "S", color: "#0070b8", method: "apikey",
    desc: "ERP, Finance, Achats, Logistique, Ressources Humaines",
    help_url: "https://api.sap.com/",
    help_label: "SAP API Hub",
    fields: [
      { id: "api_url",    label: "URL de l'API SAP *",  placeholder: "https://<host>:<port>/sap/opu/odata/sap/" },
      { id: "client_id",  label: "Client ID (OAuth SAP)", placeholder: "client_id" },
      { id: "client_secret", label: "Client Secret",    placeholder: "••••••••",  type: "password" },
      { id: "username",   label: "Utilisateur SAP",     placeholder: "sapuser" },
      { id: "password",   label: "Mot de passe SAP",    placeholder: "••••••••",  type: "password" },
    ],
  },
  workday: {
    label: "Workday", icon: "W", color: "#f78b1f", method: "apikey",
    desc: "RH, Paie, Recrutement, Absences, Formation",
    help_url: "https://community.workday.com/articles/1087893",
    help_label: "API Workday (ISSG / REST)",
    fields: [
      { id: "tenant_url",    label: "URL du Tenant *",  placeholder: "https://wd3-impl-services1.workday.com/ccx/service/<tenant>" },
      { id: "client_id",    label: "Client ID *",       placeholder: "client_id" },
      { id: "client_secret",label: "Client Secret *",   placeholder: "••••••••", type: "password" },
      { id: "refresh_token",label: "Refresh Token",     placeholder: "refresh_token optionnel" },
    ],
  },
  autotask: {
    label: "Autotask (Datto)", icon: "AT", color: "#005a9e", method: "apikey",
    desc: "PSA, Tickets, Projets, Facturation, Temps — pour fournisseurs MSP",
    help_url: "https://ww1.autotask.net/help/Content/AdminSetup/2ExtensionsIntegrations/APIs/GenerateRESTAPIKey.htm",
    help_label: "API Keys Autotask",
    niche: true,
    niche_label: "Fournisseurs de services gérés (MSP)",
    fields: [
      { id: "username",   label: "Nom d'utilisateur *", placeholder: "user@domain.com" },
      { id: "api_key",    label: "Clé API secrète *",   placeholder: "••••••••",  type: "password" },
      { id: "zone_url",   label: "Zone URL *",           placeholder: "https://webservices24.autotask.net" },
    ],
  },
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
  const initials = (u?.email || "?")[0].toUpperCase();
  $("nav-user-email").textContent  = u?.email || "";
  $("nav-user-role").textContent   = u?.role  || "user";
  $("user-avatar").textContent     = initials;
  if ($("user-avatar-menu"))   $("user-avatar-menu").textContent   = initials;
  if ($("user-menu-email-text")) $("user-menu-email-text").textContent = u?.email || "";
  _updateLangLabel();

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

  // Quota
  loadQuota();

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
  } else {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const [tab, subtab] = hash.split("/");
      if (subtab && tab === "parc-it") _parcTab  = subtab;
      if (subtab && tab === "optim")   _optimTab = subtab;
      state.tab = tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      document.querySelectorAll(".tab-content").forEach(s => s.classList.toggle("hidden", s.id !== `tab-${tab}`));
      history.replaceState({ tab, parc: tab === "parc-it" ? subtab : undefined, optim: tab === "optim" ? subtab : undefined }, "", `#${hash}`);
      loadActiveTab();
    } else {
      loadActiveTab();
    }
  }

  loadDeptDashboard();
}

// Trial banner dismiss
$("trial-dismiss")?.addEventListener("click", () => {
  $("trial-banner").classList.add("hidden");
});

// ── Setup readiness banner ────────────────────────────────────────────────
let _readinessData = null;

function _isCheckOk(v) {
  return v === "set" || String(v).startsWith("ok");
}

async function loadReadiness() {
  const isAdmin = ["admin", "owner"].includes(state.user?.role);
  if (!isAdmin) return;
  try {
    const d = await apiCall("/api/readiness");
    _readinessData = d;
    if (d.ready) {
      $("setup-banner")?.classList.add("hidden");
    } else {
      const bad = Object.entries(d.checks || {})
        .filter(([, v]) => !_isCheckOk(v))
        .map(([k]) => k.replace("table_", ""));
      const txt = $("setup-banner-text");
      if (txt) txt.textContent = bad.length
        ? `Problème détecté : ${bad.join(", ")}. Vérifiez les scripts SQL et les variables d'env.`
        : "Configuration incomplète — cliquez pour vérifier.";
      $("setup-banner")?.classList.remove("hidden");
    }
  } catch { /* silent */ }
}

async function checkReadinessNow() {
  const checks = $("setup-checks");
  if (checks) checks.textContent = "Vérification en cours…";
  try {
    const d = await apiCall("/api/readiness");
    _readinessData = d;
    if (checks) {
      checks.textContent = Object.entries(d.checks || {})
        .map(([k, v]) => `${_isCheckOk(v) ? "✅" : "❌"} ${k}: ${v}`)
        .join("\n");
    }
    if (d.ready) {
      $("setup-banner")?.classList.add("hidden");
      alert("✅ Toutes les tables sont prêtes. Actualisez la page pour recharger.");
    }
  } catch (e) {
    if (checks) checks.textContent = `Erreur: ${e.message}`;
  }
}

function openSetupModal() {
  const modal = $("setup-modal");
  if (!modal) return;
  const checks = $("setup-checks");
  if (checks && _readinessData) {
    checks.textContent = Object.entries(_readinessData.checks || {})
      .map(([k, v]) => `${v === "ok" || v === "set" || String(v).startsWith("ok") ? "✅" : "❌"} ${k}: ${v}`)
      .join("\n");
  }
  modal.classList.remove("hidden");
}

function closeSetupModal() {
  $("setup-modal")?.classList.add("hidden");
}

$("setup-banner-dismiss")?.addEventListener("click", () => {
  $("setup-banner")?.classList.add("hidden");
});

$("setup-modal")?.addEventListener("click", e => {
  if (e.target === $("setup-modal")) closeSetupModal();
});

// ── User menu dropdown ────────────────────────────────────────────────────
function toggleUserMenu() {
  const wrap = $("user-menu-wrap");
  const drop = $("user-menu-dropdown");
  const btn  = $("user-chip-btn");
  const isOpen = !drop.classList.contains("hidden");
  if (isOpen) { closeUserMenu(); return; }
  drop.classList.remove("hidden");
  wrap.classList.add("open");
  btn.setAttribute("aria-expanded", "true");
  _updateLangLabel();
}
function closeUserMenu() {
  const wrap = $("user-menu-wrap");
  const drop = $("user-menu-dropdown");
  const btn  = $("user-chip-btn");
  drop.classList.add("hidden");
  wrap.classList.remove("open");
  btn?.setAttribute("aria-expanded", "false");
}
function _updateLangLabel() {
  const lbl = $("user-menu-lang-label");
  if (lbl) lbl.textContent = _lang === "fr" ? "Switch to English" : "Passer en français";
}
// Ferme le menu si on clique en dehors
document.addEventListener("click", e => {
  const wrap = $("user-menu-wrap");
  if (wrap && !wrap.contains(e.target)) closeUserMenu();
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
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 15000); // 15s timeout
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const opts = { method, headers, signal: ctrl.signal };
  if (body !== null) opts.body = JSON.stringify(body);
  let res;
  try {
    res = await fetch(path, opts);
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Délai dépassé — le serveur ne répond pas.");
    throw new Error("Erreur réseau — vérifiez la connexion.");
  } finally {
    clearTimeout(tid);
  }
  if (res.status === 401) { clearAuth(); showAuth("login"); throw new Error("Session expirée."); }
  const data = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
  if (!res.ok) {
    const err = new Error(data.detail || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
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
    const signupBody = {
      organization_name: $("signup-org").value.trim() || "Mon organisation",
      full_name: fullName,
      email: $("signup-email").value.trim(),
      password: $("signup-password").value,
    };
    const invToken = $("signup-invite-token")?.value;
    if (invToken) signupBody.invite_token = invToken;
    await apiCall("/api/auth/signup", "POST", signupBody);
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
  history.pushState({ tab: name }, "", `#${name}`);
  loadActiveTab();
}

window.addEventListener("popstate", (e) => {
  const s = e.state;
  if (!s || !s.tab) return;
  state.tab = s.tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === s.tab));
  document.querySelectorAll(".tab-content").forEach(sec => sec.classList.toggle("hidden", sec.id !== `tab-${s.tab}`));
  if (s.parc)  _parcTab  = s.parc;
  if (s.optim) _optimTab = s.optim;
  loadActiveTab();
});

function loadActiveTab() {
  const loaders = {
    "agent":      loadDeptDashboard,  // rafraîchit le dashboard département
    "connectors": loadConnectors,
    "org":        loadExecutiveDashboard,
    "audit":      loadAudit,
    "stats":      loadAnalytics,
    "settings":   loadSettings,
    "team":       loadTeam,
    "parc-it":    loadParcIT,
    "optim":      loadOptimization,
  };
  const fn = loaders[state.tab];
  if (fn) Promise.resolve().then(() => fn()).catch(err => console.warn(`[${state.tab}] load error:`, err));
}

// ── Quota indicator ────────────────────────────────────────────────────────

async function loadQuota() {
  try {
    const q = await apiCall("/api/agent/quota");
    const used  = q.used  || 0;
    const limit = q.limit || 1000;
    const pct   = Math.min(Math.round(used / limit * 100), 100);

    $("quota-text").textContent = `${used.toLocaleString("fr-CA")} / ${limit.toLocaleString("fr-CA")}`;

    const bar = $("quota-bar");
    bar.style.width = `${pct}%`;
    bar.className = "quota-bar " + (pct >= 95 ? "quota-critical" : pct >= 80 ? "quota-warn" : "quota-ok");

    const pill = $("quota-pill");
    pill.title = `${pct}% du quota mensuel utilisé (${used}/${limit} requêtes)`;
    pill.classList.toggle("quota-pill-warn",     pct >= 80);
    pill.classList.toggle("quota-pill-critical", pct >= 95);

    // Avertissement si > 90%
    if (pct >= 90) {
      const notif = { icon: "⚠️", title: "Quota presque atteint", body: `${used}/${limit} requêtes utilisées ce mois — contactez-nous pour augmenter la limite.` };
      // Inject into notification list
      const existing = $("notif-list").innerHTML;
      const item = `<div class="notif-item"><div class="notif-item-icon">⚠️</div><div class="notif-item-body"><strong>${notif.title}</strong><span>${notif.body}</span></div></div>`;
      $("notif-list").innerHTML = item + existing;
      $("notif-dot").classList.remove("hidden");
    }
  } catch { /* silent */ }
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
  $("agent-answer").innerHTML = _formatAnswer(data.answer || "(aucune réponse)");
  $("agent-tools-json").textContent = JSON.stringify(data.tools_called, null, 2);
  $("agent-result").classList.remove("hidden");
  $("agent-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  // Store last result for export
  window._lastAgentResult = data;
  window._lastAgentQuestion = $("agent-question").value;
  // Reset rating widget
  window._lastAuditId = data.audit_id || null;
  $("rating-thanks").classList.add("hidden");
  document.querySelectorAll(".star-btn").forEach(b => b.classList.remove("selected", "faded"));
  loadQuota();
}

// Formatter — converts plain AI text with markdown-like patterns into clean HTML
function _formatAnswer(text) {
  const lines = text.split("\n");
  let html = "";
  let inUl = false, inOl = false;

  const closeList = () => {
    if (inUl) { html += "</ul>"; inUl = false; }
    if (inOl) { html += "</ol>"; inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // --- H1/H2/H3 detected by leading # signs
    if (/^### /.test(line)) { closeList(); html += `<h4>${_inlineFormat(esc(line.slice(4)))}</h4>`; continue; }
    if (/^## /.test(line))  { closeList(); html += `<h3>${_inlineFormat(esc(line.slice(3)))}</h3>`; continue; }
    if (/^# /.test(line))   { closeList(); html += `<h3>${_inlineFormat(esc(line.slice(2)))}</h3>`; continue; }

    // --- Bullet list
    if (/^[-*•]\s/.test(line)) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${_inlineFormat(esc(line.replace(/^[-*•]\s/, "")))}</li>`;
      continue;
    }

    // --- Numbered list
    if (/^\d+\.\s/.test(line)) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += "<ol>"; inOl = true; }
      html += `<li>${_inlineFormat(esc(line.replace(/^\d+\.\s/, "")))}</li>`;
      continue;
    }

    closeList();

    // --- Empty line = paragraph break
    if (!line.trim()) { html += "<br>"; continue; }

    // --- Regular paragraph line
    html += `<p>${_inlineFormat(esc(line))}</p>`;
  }

  closeList();
  return html;
}

function _inlineFormat(s) {
  // Bold: **text** or __text__
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code: `code`
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  // Numbers at line-start coloured (like "93,7%")
  s = s.replace(/(\d[\d\s,.%$]+)/g, '<span class="num-highlight">$1</span>');
  return s;
}

// Extract structured chart data from tools_called
function _extractChartData(toolsResult) {
  if (!Array.isArray(toolsResult)) return [];
  const charts = [];
  toolsResult.forEach(t => {
    const src = (t.source || t.tool || t.connector || "").toLowerCase();
    const result = t.result || {};
    try {
      // SAP budget → pie chart
      if (src.includes("sap") && result.budget_breakdown) {
        const entries = Object.entries(result.budget_breakdown);
        charts.push({ type: "pie", title: "Budget par département (SAP)", labels: entries.map(e=>e[0]), values: entries.map(e=>Number(e[1])) });
      }
      // ServiceNow incidents → bar chart
      if (src.includes("servicenow") && result.open_incidents_count !== undefined) {
        const by_prio = result.by_priority || {};
        if (Object.keys(by_prio).length) {
          charts.push({ type: "bar", title: "Incidents par priorité (ServiceNow)", labels: Object.keys(by_prio), values: Object.values(by_prio).map(Number) });
        }
      }
      // Workday headcount → bar chart
      if (src.includes("workday") && result.departments) {
        const depts = result.departments;
        charts.push({ type: "bar", title: "Effectifs par département (Workday)", labels: depts.map(d=>d.name||d.department||"?"), values: depts.map(d=>Number(d.headcount||d.count||0)) });
      }
      // Salesforce contracts → bar chart
      if (src.includes("salesforce") && result.contracts) {
        const c = result.contracts.slice(0,6);
        charts.push({ type: "bar", title: "Valeur des contrats (Salesforce $)", labels: c.map(x=>x.name||x.account||"?"), values: c.map(x=>Number(x.value||x.amount||0)) });
      }
      // HubSpot deals pipeline → bar chart
      if (src.includes("hubspot") && result.deals) {
        const d = result.deals.slice(0,6);
        charts.push({ type: "bar", title: "Deals HubSpot ($)", labels: d.map(x=>x.name||x.dealname||"?"), values: d.map(x=>Number(x.amount||x.value||0)) });
      }
    } catch { /* skip */ }
  });
  return charts;
}

// Export report in requested format
async function exportReport(fmt) {
  const data = window._lastAgentResult;
  if (!data) return;
  const btn = document.querySelector(`.export-btn[onclick="exportReport('${fmt}')"]`);
  const origText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    const charts = _extractChartData(data.tools_called);
    const resp = await fetch("/api/agent/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` },
      body: JSON.stringify({
        question: window._lastAgentQuestion || "",
        answer:   data.answer || "",
        sources:  data.sources || [],
        format:   fmt,
        charts:   charts,
      }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); alert(e.detail || "Erreur export"); return; }
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const cd   = resp.headers.get("content-disposition") || "";
    const match = cd.match(/filename="(.+?)"/);
    a.href     = url;
    a.download = match ? match[1] : `nexhire-rapport.${fmt}`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Log export event
    apiCall("/api/analytics/event", "POST", { event_type: "export", meta: { format: fmt } }).catch(()=>{});
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

// ── Rating ──────────────────────────────────────────────────────────────────

// Hover effect on stars
document.querySelectorAll(".star-btn").forEach((btn, idx, all) => {
  btn.addEventListener("mouseenter", () => {
    all.forEach((b, i) => b.classList.toggle("hovered", i <= idx));
  });
  btn.addEventListener("mouseleave", () => {
    all.forEach(b => b.classList.remove("hovered"));
  });
});

async function sendRating(score) {
  const auditId = window._lastAuditId;
  if (!auditId) return;  // no audit id available
  document.querySelectorAll(".star-btn").forEach((b, i) => {
    b.classList.toggle("selected", i < score);
    b.classList.toggle("faded", i >= score);
  });
  $("rating-thanks").classList.remove("hidden");
  try {
    await apiCall("/api/analytics/rate", "POST", { audit_id: auditId, score });
  } catch { /* silent */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANISATION — DASHBOARD EXÉCUTIF
// ═══════════════════════════════════════════════════════════════════════════

const _HEALTH_LABELS = { green: "Sain", yellow: "Attention", red: "À risque" };
const _HEALTH_EMOJI  = { green: "🟢",   yellow: "🟡",        red: "🔴"       };

async function loadExecutiveDashboard() {
  const kpiGrid  = $("exec-kpi-grid");
  const deptGrid = $("exec-dept-grid");
  if (!kpiGrid || !deptGrid) return;

  kpiGrid.innerHTML  = `<div class="exec-kpi-loading"><div class="spinner" style="margin:auto"></div></div>`;
  deptGrid.innerHTML = `<p class="muted">Chargement…</p>`;

  let data;
  try {
    data = await apiCall("/api/dashboard/executive");
  } catch (e) {
    kpiGrid.innerHTML  = `<p class="error-text">Impossible de charger le dashboard : ${e.message}</p>`;
    deptGrid.innerHTML = "";
    return;
  }

  const k = data.kpis || {};
  const lang = state.lang || "fr";

  // ── KPIs globaux ────────────────────────────────────────────────────────
  const fmtCAD = v => (v || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const fmtPct = v => `${(v || 0).toFixed(1)} %`;

  const budgetPct = k.budget_pct || 0;
  const budgetColor = budgetPct >= 95 ? "#ef4444" : budgetPct >= 80 ? "#f59e0b" : "#22c55e";

  kpiGrid.innerHTML = `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon">💰</div>
      <div class="exec-kpi-body">
        <div class="exec-kpi-val">${fmtCAD(k.budget_spent)}</div>
        <div class="exec-kpi-label">Dépenses totales</div>
        <div class="exec-kpi-sub" style="color:${budgetColor}">${fmtPct(budgetPct)} du budget consommé</div>
      </div>
    </div>
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon">🏦</div>
      <div class="exec-kpi-body">
        <div class="exec-kpi-val">${fmtCAD(k.budget_total)}</div>
        <div class="exec-kpi-label">Budget total</div>
        <div class="exec-kpi-sub">${fmtCAD(k.budget_total - k.budget_spent)} restant</div>
      </div>
    </div>
    <div class="exec-kpi-card highlight">
      <div class="exec-kpi-icon">💡</div>
      <div class="exec-kpi-body">
        <div class="exec-kpi-val" style="color:#22c55e">${fmtCAD(k.savings_potential)}</div>
        <div class="exec-kpi-label">Économies potentielles</div>
        <div class="exec-kpi-sub">Identifiées par l'IA</div>
      </div>
    </div>
    <div class="exec-kpi-card ${k.depts_at_risk > 0 ? "exec-kpi-warn" : ""}">
      <div class="exec-kpi-icon">⚠️</div>
      <div class="exec-kpi-body">
        <div class="exec-kpi-val">${k.depts_at_risk || 0}</div>
        <div class="exec-kpi-label">Départements à risque</div>
        <div class="exec-kpi-sub">sur ${k.depts_total || 0} départements</div>
      </div>
    </div>
    <div class="exec-kpi-card ${k.contracts_due > 0 ? "exec-kpi-warn" : ""}">
      <div class="exec-kpi-icon">📋</div>
      <div class="exec-kpi-body">
        <div class="exec-kpi-val">${k.contracts_due || 0}</div>
        <div class="exec-kpi-label">Contrats à renouveler</div>
        <div class="exec-kpi-sub">dans les 90 prochains jours</div>
      </div>
    </div>`;

  // ── Accordéons santé par groupe ─────────────────────────────────────────
  const depts = data.departments || [];
  if (depts.length === 0) {
    deptGrid.innerHTML = `<p class="muted" style="padding:16px 0">Aucun département créé. Allez dans <strong>Équipe → Départements</strong> pour en ajouter.</p>`;
    return;
  }

  const groups = [
    { key: "red",    emoji: "🔴", label: "À risque",  color: "#ef4444", open: true,  depts: [] },
    { key: "yellow", emoji: "🟡", label: "Attention", color: "#f59e0b", open: true,  depts: [] },
    { key: "green",  emoji: "🟢", label: "Sain",      color: "#22c55e", open: false, depts: [] },
  ];
  depts.forEach(d => { const g = groups.find(g => g.key === (d.badge || "green")); if (g) g.depts.push(d); });

  deptGrid.innerHTML = groups.filter(g => g.depts.length > 0).map(g => `
    <div class="dept-acc-wrap">
      <button class="dept-acc-hd" onclick="toggleDeptAcc(this)" aria-expanded="${g.open}" style="--acc-color:${g.color}">
        <span class="dept-acc-title">${g.emoji} ${g.label}</span>
        <span class="dept-acc-count" style="background:${g.color}20;color:${g.color}">${g.depts.length} département${g.depts.length > 1 ? "s" : ""}</span>
        <span class="dept-acc-chevron">${g.open ? "▲" : "▼"}</span>
      </button>
      <div class="dept-acc-body${g.open ? "" : " dept-acc-closed"}">
        <div class="exec-dept-grid-inner">
          ${g.depts.map(d => {
            const score  = d.score || 0;
            const budPct = d.budget_pct !== null && d.budget_pct !== undefined ? `${d.budget_pct} %` : "—";
            return `
              <div class="exec-dept-card exec-dept-${g.key}" onclick="openDeptDetail('${d.id}','${d.name.replace(/'/g,"\\'")}')">
                <div class="exec-dept-head">
                  <span class="exec-dept-icon">${d.icon}</span>
                  <div class="exec-dept-titles">
                    <span class="exec-dept-name">${esc(d.name)}</span>
                    <span class="exec-dept-type">${esc(_deptTypeLabel(d.dept_type))}</span>
                  </div>
                </div>
                <div class="exec-score-bar-wrap">
                  <div class="exec-score-bar" style="width:${score}%;background:${g.color}"></div>
                </div>
                <div class="exec-dept-metrics">
                  <span>👤 ${d.members} membre${d.members !== 1 ? "s" : ""}</span>
                  <span>📱 ${d.apps} app${d.apps !== 1 ? "s" : ""}</span>
                  <span>💰 ${budPct} budget</span>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>
    </div>`).join("");
}

function toggleDeptAcc(btn) {
  const body = btn.nextElementSibling;
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  btn.querySelector(".dept-acc-chevron").textContent = open ? "▼" : "▲";
  body.classList.toggle("dept-acc-closed", open);
}

function _deptTypeLabel(t) {
  const labels = {
    finance:"Finance", hr:"Ressources Humaines", it:"Technologies de l'information",
    legal:"Juridique", operations:"Opérations", marketing:"Marketing / Communications",
    direction:"Direction générale", approvisionnement:"Approvisionnement", general:"Général",
  };
  return labels[t] || t;
}

function openDeptDetail(deptId, deptName) {
  // Ouvre un panel ou redirige vers l'onglet équipe sur ce département
  // Pour l'instant on peut filtrer l'onglet équipe
  switchTab("team");
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

  const standard = Object.entries(CONNECTORS).filter(([, m]) => !m.niche);
  const niche    = Object.entries(CONNECTORS).filter(([, m]) =>  m.niche);

  // Connecteurs standard
  const mainGrid = document.createElement("div");
  mainGrid.className = "connector-grid-inner";
  standard.forEach(([type, meta]) => mainGrid.appendChild(buildConnectorCard(type, meta, connected[type] || null)));
  grid.appendChild(mainGrid);

  // Connecteurs de niche — pliés par défaut, sauf si l'un est déjà connecté
  if (niche.length > 0) {
    const anyNicheConnected = niche.some(([t]) => connected[t]?.status === "connected");
    const section = document.createElement("div");
    section.className = "connector-niche-section";

    const groups = {};
    niche.forEach(([type, meta]) => {
      const label = meta.niche_label || "Spécialisé";
      if (!groups[label]) groups[label] = [];
      groups[label].push([type, meta]);
    });

    Object.entries(groups).forEach(([groupLabel, entries]) => {
      const toggle = document.createElement("button");
      toggle.className = "connector-niche-toggle";
      const isOpen = anyNicheConnected;
      toggle.innerHTML = `<span class="niche-toggle-icon">${isOpen ? "▾" : "▸"}</span> Connecteurs spécialisés — <em>${groupLabel}</em>`;
      toggle.setAttribute("aria-expanded", String(isOpen));

      const inner = document.createElement("div");
      inner.className = `connector-grid-inner connector-niche-inner${isOpen ? "" : " hidden"}`;
      entries.forEach(([type, meta]) => inner.appendChild(buildConnectorCard(type, meta, connected[type] || null)));

      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        toggle.querySelector(".niche-toggle-icon").textContent = !open ? "▾" : "▸";
        inner.classList.toggle("hidden", open);
      });

      section.appendChild(toggle);
      section.appendChild(inner);
    });

    grid.appendChild(section);
  }
}

function buildConnectorCard(type, meta, info) {
  const isConnected = info?.status === "connected";
  const connectedAt = info?.connected_at ? new Date(info.connected_at).toLocaleString("fr-CA") : null;
  const isOAuth     = meta.method === "oauth";
  const isApiKey    = meta.method === "apikey";

  const card = document.createElement("div");
  card.className = `connector-card${isConnected ? " connected" : ""}`;

  const methodBadge = isOAuth ? "OAuth 2.0" : "API Key";
  const statusText  = isConnected ? (isOAuth ? "OAuth ✓" : "Connecté") : "Déconnecté";
  const badgeCls    = isConnected ? (isOAuth ? "badge-oauth" : "badge-connected") : "badge-disconnected";

  card.innerHTML = `
    <div class="connector-head">
      <div class="connector-icon" style="background:${meta.color}">${meta.icon}</div>
      <div class="connector-head-info">
        <span class="connector-name">${meta.label}</span>
        <span class="connector-desc">${meta.desc || ""}</span>
      </div>
      <span class="connector-badge ${badgeCls}">${statusText}</span>
    </div>
    ${connectedAt ? `<p class="connector-meta">Connecté depuis le ${connectedAt}</p>` : ""}
    ${info?.last_error ? `<p class="connector-error">${info.last_error}</p>` : ""}
    <div class="connector-footer">
      <span class="connector-method-tag">${methodBadge}</span>
      ${meta.help_url ? `<a class="connector-help-link" href="${meta.help_url}" target="_blank" rel="noopener">${meta.help_label || "Documentation"} ↗</a>` : ""}
    </div>`;

  const actions = document.createElement("div");
  actions.className = "connector-actions";

  if (isConnected) {
    const disconnBtn = document.createElement("button");
    disconnBtn.className = "btn-disconnect";
    disconnBtn.textContent = "Déconnecter";
    disconnBtn.addEventListener("click", () => doDisconnect(type, disconnBtn));
    actions.appendChild(disconnBtn);

    if (isOAuth) {
      const reauth = document.createElement("button");
      reauth.className = "btn-connect real btn-sm";
      reauth.textContent = "Renouveler OAuth";
      reauth.style.marginLeft = "8px";
      reauth.addEventListener("click", () => doOAuthStart(type, reauth));
      actions.appendChild(reauth);
    }
  } else if (isOAuth) {
    const btn = document.createElement("button");
    btn.className = "btn-connect real";
    btn.textContent = `Connecter via OAuth`;
    btn.addEventListener("click", () => doOAuthStart(type, btn));
    actions.appendChild(btn);
  } else if (isApiKey) {
    const btn = document.createElement("button");
    btn.className = "btn-connect sim";
    btn.textContent = "Configurer les credentials";
    btn.addEventListener("click", () => openCredModal(type, meta));
    actions.appendChild(btn);
  } else {
    const btn = document.createElement("button");
    btn.className = "btn-connect sim";
    btn.textContent = "Connecter (simulé)";
    btn.addEventListener("click", () => doConnect(type, btn));
    actions.appendChild(btn);
  }
  card.appendChild(actions);
  return card;
}

async function doOAuthStart(type, btn) {
  const origText = btn.textContent;
  btn.disabled = true; btn.textContent = "Redirection OAuth…";
  try {
    const data = await apiCall(`/api/connectors/${type}/oauth/start`, "POST");
    window.location.href = data.authorization_url;
  } catch (ex) {
    btn.disabled = false; btn.textContent = origText;
    alert(`Erreur OAuth : ${ex.message}`);
  }
}

// ── Credential modal (API Key connectors) ─────────────────────────────────

function openCredModal(type, meta) {
  let modal = $("cred-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cred-modal";
    modal.className = "modal-overlay hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal) closeCredModal(); });
  }
  const fields = meta.fields || [
    { id: "api_key", label: "Clé API *", placeholder: "••••••••", type: "password" }
  ];
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px">
      <div class="modal-header">
        <h3><span style="background:${meta.color};color:#fff;padding:2px 8px;border-radius:4px;font-size:.8rem;margin-right:8px">${meta.icon}</span>${meta.label} — Credentials</h3>
        <button class="modal-close" onclick="closeCredModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:.85rem;color:var(--slate);margin-bottom:16px">
          Ces credentials sont chiffrés (Fernet AES-128) avant d'être stockés. Nexhire ne les affiche jamais en clair.
          ${meta.help_url ? `<br><a href="${meta.help_url}" target="_blank" rel="noopener" style="color:var(--primary)">${meta.help_label || "Documentation"} ↗</a>` : ""}
        </p>
        <form id="cred-form">
          ${fields.map(f => `
            <label class="auth-label">
              <span>${f.label}</span>
              <input id="cred-field-${f.id}" type="${f.type || "text"}" placeholder="${f.placeholder || ""}" autocomplete="off" />
            </label>`).join("")}
        </form>
        <div id="cred-error" class="error-text hidden" style="margin-top:8px"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeCredModal()">Annuler</button>
        <button class="btn btn-primary" id="cred-save-btn" onclick="saveCredentials('${type}')">Enregistrer</button>
      </div>
    </div>`;
  modal.classList.remove("hidden");
}

function closeCredModal() {
  $("cred-modal")?.classList.add("hidden");
}

async function saveCredentials(type) {
  const meta = CONNECTORS[type];
  if (!meta) return;
  const fields = meta.fields || [{ id: "api_key" }];
  const payload = {};
  for (const f of fields) {
    const el = $(`cred-field-${f.id}`);
    if (el) payload[f.id] = el.value.trim();
  }
  const saveBtn = $("cred-save-btn");
  const errEl   = $("cred-error");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Enregistrement…"; }
  if (errEl)   errEl.classList.add("hidden");
  try {
    await apiCall(`/api/connectors/${type}/credentials`, "POST", payload);
    closeCredModal();
    await loadConnectors();
  } catch (ex) {
    if (errEl) { errEl.textContent = ex.message; errEl.classList.remove("hidden"); }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Enregistrer"; }
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
// STATISTIQUES TAB
// ═══════════════════════════════════════════════════════════════════════════

let _chartDaily = null;
let _chartConn  = null;

async function loadAnalytics() {
  const days = $("stats-days")?.value || 30;
  // Update kpi placeholders
  ["kpi-queries","kpi-score","kpi-rated","kpi-util"].forEach(id => { const el=$(id); if(el) el.textContent = "…"; });
  try {
    const d = await apiCall(`/api/analytics/dashboard?days=${days}`);

    // KPI cards
    $("kpi-queries").textContent = d.total_queries.toLocaleString("fr-CA");
    $("kpi-score").textContent   = d.avg_satisfaction ? `${d.avg_satisfaction} / 5 ★` : "—";
    $("kpi-rated").textContent   = d.rated_count.toLocaleString("fr-CA");
    if ($("kpi-util") && d.utilization_pct !== null && d.utilization_pct !== undefined) {
      $("kpi-util").textContent = `${d.utilization_pct} %`;
      $("kpi-util").closest(".kpi-card").classList.remove("hidden");
    }

    // Daily chart
    const dailyLabels = d.queries_per_day.map(x => x.date.slice(5));  // MM-DD
    const dailyData   = d.queries_per_day.map(x => x.count);
    if (_chartDaily) { _chartDaily.destroy(); _chartDaily = null; }
    const ctxD = $("chart-daily")?.getContext("2d");
    if (ctxD) {
      _chartDaily = new Chart(ctxD, {
        type: "bar",
        data: {
          labels: dailyLabels,
          datasets: [{ label: "Requêtes", data: dailyData, backgroundColor: "#818CF8", borderRadius: 5, borderSkipped: false }],
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 } },
            y: { beginAtZero: true, grid: { color: "#e2e8f0" }, ticks: { precision: 0 } },
          },
        },
      });
    }

    // Connectors pie chart
    const connLabels = d.top_connectors.map(x => x.name);
    const connData   = d.top_connectors.map(x => x.count);
    const palette    = ["#818CF8","#6366f1","#4f46e5","#0ea5e9","#10b981","#f59e0b","#ef4444","#94a3b8"];
    if (_chartConn) { _chartConn.destroy(); _chartConn = null; }
    const ctxC = $("chart-connectors")?.getContext("2d");
    if (ctxC && connLabels.length) {
      _chartConn = new Chart(ctxC, {
        type: "doughnut",
        data: {
          labels: connLabels,
          datasets: [{ data: connData, backgroundColor: palette.slice(0, connLabels.length), borderWidth: 2, borderColor: "#fff" }],
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { position: "right", labels: { font: { size: 11 }, padding: 12 } },
          },
          cutout: "55%",
        },
      });
    } else if (ctxC) {
      const p = document.createElement("p");
      p.className = "muted";
      p.style.padding = "20px";
      p.textContent = "Aucune donnée de connecteur disponible.";
      $("chart-connectors").replaceWith(p);
    }

    // Satisfaction distribution bars
    const satWrap = $("sat-dist");
    if (satWrap && d.satisfaction_dist) {
      const total = Object.values(d.satisfaction_dist).reduce((a,b)=>a+Number(b),0) || 1;
      satWrap.innerHTML = [5,4,3,2,1].map(star => {
        const count = Number(d.satisfaction_dist[String(star)] || 0);
        const pct   = Math.round(count / total * 100);
        return `<div class="sat-row">
          <span class="sat-stars">${"★".repeat(star)}${"☆".repeat(5-star)}</span>
          <div class="sat-bar-wrap"><div class="sat-bar" style="width:${pct}%"></div></div>
          <span class="sat-count">${count}</span>
        </div>`;
      }).join("");
    }
  } catch (ex) {
    $("kpi-queries").textContent = "—";
    console.error("Analytics error:", ex.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT TAB
// ═══════════════════════════════════════════════════════════════════════════

$("refresh-audit")?.addEventListener("click", loadAudit);

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
// TEAM TAB
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_COLORS = { owner:"#0f172a", admin:"#6366f1", manager:"#0ea5e9", user:"#64748b" };
const ROLE_LABELS_FR = { owner:"Owner", admin:"Admin", manager:"Manager", user:"Utilisateur" };

async function loadTeam() {
  await Promise.all([_loadMembers(), _loadPendingInvitations()]);
  loadDepartments();
}

async function _loadMembers() {
  const wrap = $("team-table-wrap");
  wrap.innerHTML = "<p class='muted' style='padding:20px'>Chargement…</p>";
  try {
    const { members } = await apiCall("/api/members");
    if (!members.length) { wrap.innerHTML = "<p class='muted' style='padding:20px'>Aucun membre.</p>"; return; }

    const isOwner = ["admin","owner"].includes(state.user?.role);
    const rows = members.map(m => {
      const initials = (m.full_name || m.email || "?").slice(0,2).toUpperCase();
      const active = m.is_active !== false;
      const canEdit = isOwner && m.role !== "owner" && m.id !== state.user?.id;
      return `<tr class="${active ? "" : "row-inactive"}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="member-av" style="background:${ROLE_COLORS[m.role]||"#818CF8"}">${initials}</div>
            <div>
              <div style="font-weight:600;font-size:.9rem">${m.full_name || "—"}</div>
              <div style="font-size:.78rem;color:var(--slate)">${m.email}</div>
            </div>
          </div>
        </td>
        <td><span class="role-badge" style="background:${ROLE_COLORS[m.role]}22;color:${ROLE_COLORS[m.role]}">${ROLE_LABELS_FR[m.role]||m.role}</span></td>
        <td><span class="member-status ${active?"status-active":"status-inactive"}">${active?"Actif":"Inactif"}</span></td>
        <td style="font-size:.78rem;color:var(--slate)">${m.created_at ? new Date(m.created_at).toLocaleDateString("fr-CA") : "—"}</td>
        <td class="member-actions">
          ${canEdit ? `
            <select class="role-select-inline" onchange="changeMemberRole('${m.id}',this.value)" title="Changer le rôle">
              ${["user","manager","admin"].map(r=>`<option value="${r}"${r===m.role?" selected":""}>${ROLE_LABELS_FR[r]}</option>`).join("")}
            </select>
            <button class="btn-icon ${active?"btn-deactivate":"btn-activate"}" onclick="toggleMember('${m.id}')" title="${active?"Désactiver":"Activer"}">
              ${active ? "⊘" : "✓"}
            </button>
          ` : ""}
        </td>
      </tr>`;
    }).join("");

    wrap.innerHTML = `<table>
      <thead><tr><th>Membre</th><th>Rôle</th><th>Statut</th><th>Depuis</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (ex) {
    wrap.innerHTML = `<p class='error-text' style='padding:20px'>Erreur : ${ex.message}</p>`;
  }
}

async function _loadPendingInvitations() {
  const wrap = $("pending-inv-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  try {
    const { invitations } = await apiCall("/api/members/invitations");
    if (!invitations.length) { wrap.innerHTML = "<p class='muted' style='font-size:.85rem'>Aucune invitation en attente.</p>"; return; }
    wrap.innerHTML = invitations.map(inv => `
      <div class="pending-inv-item">
        <div>
          <span class="inv-email">${inv.email}</span>
          <span class="role-badge" style="margin-left:8px">${ROLE_LABELS_FR[inv.role]||inv.role}</span>
        </div>
        <span class="inv-expiry">Expire le ${new Date(inv.expires_at).toLocaleDateString("fr-CA")}</span>
      </div>
    `).join("");
  } catch { wrap.innerHTML = ""; }
}

async function changeMemberRole(memberId, role) {
  try {
    await apiCall(`/api/members/${memberId}/role`, "PATCH", { role });
    await _loadMembers();
  } catch (ex) { alert(`Erreur : ${ex.message}`); }
}

async function toggleMember(memberId) {
  try {
    await apiCall(`/api/members/${memberId}/active`, "PATCH");
    await _loadMembers();
  } catch (ex) { alert(`Erreur : ${ex.message}`); }
}

// Invite modal
function openInviteModal() {
  $("invite-modal").classList.remove("hidden");
  $("inv-email").focus();
  $("invite-link-wrap").classList.add("hidden");
  $("inv-error").classList.add("hidden");
  $("invite-form").reset();
  $("copy-confirm").classList.add("hidden");
}
function closeInviteModal() {
  $("invite-modal").classList.add("hidden");
}
$("invite-modal")?.addEventListener("click", e => { if (e.target === $("invite-modal")) closeInviteModal(); });

$("invite-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("inv-btn"); const err = $("inv-error");
  btn.disabled = true; err.classList.add("hidden");
  try {
    const data = await apiCall("/api/members/invite", "POST", {
      email: $("inv-email").value.trim(),
      role:  $("inv-role").value,
    });
    const fullUrl = `${window.location.origin}/?invite=${data.token}`;
    $("invite-link-input").value = fullUrl;
    $("invite-link-wrap").classList.remove("hidden");
    await _loadPendingInvitations();
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
});

function copyInviteLink() {
  const input = $("invite-link-input");
  input.select(); input.setSelectionRange(0, 99999);
  navigator.clipboard?.writeText(input.value).catch(() => document.execCommand("copy"));
  $("copy-confirm").classList.remove("hidden");
  setTimeout(() => $("copy-confirm").classList.add("hidden"), 3000);
}

// ─ Gestion du token d'invitation dans l'URL ──────────────────────────────
async function _handleInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get("invite");
  if (!token) return;
  try {
    const inv = await fetch(`/api/members/invite/validate?token=${encodeURIComponent(token)}`).then(r=>r.json());
    if (inv.detail) return;  // invalid
    // Pre-fill signup form
    showAuth("signup");
    $("signup-invite-token").value = token;
    $("signup-email").value = inv.email;
    $("signup-email").disabled = true;
    $("signup-org-wrap").classList.add("hidden");
    $("invite-org-name").textContent = inv.org_name;
    $("invite-role-label").textContent = ROLE_LABELS_FR[inv.role] || inv.role;
    $("invite-context").classList.remove("hidden");
    window.history.replaceState({}, "", "/");
  } catch { /* ignore invalid tokens */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════

async function loadSettings() {
  try {
    const p = await apiCall("/api/settings/profile");

    // Header avatar
    $("settings-avatar").textContent = (p.full_name || p.email || "?")[0].toUpperCase();
    $("settings-fullname").textContent = p.full_name || "—";
    $("settings-email").textContent    = p.email    || "—";
    $("settings-role").textContent     = p.role     || "";

    // Profile form
    $("sp-fullname").value = p.full_name || "";
    $("sp-email").value    = p.email    || "";
    $("sp-org").value      = p.organization_name || "";
    $("sp-since").value    = p.member_since || "";
    if ($("sp-org-type")) $("sp-org-type").value = p.org_type || "entreprise";
    state.orgType = p.org_type || "entreprise";

    // SSO
    const badge = $("sso-badge");
    const txt   = $("sso-status-text");
    const cta   = $("sso-cta-btn");
    const info  = $("sso-active-info");
    if (p.sso_enabled) {
      badge.classList.replace("inactive", "active");
      txt.textContent = T[_lang]["settings.sso.active"] || "SSO actif ✓";
      cta.classList.add("hidden");
      info.classList.remove("hidden");
    } else {
      badge.classList.remove("active"); badge.classList.add("inactive");
      txt.textContent = T[_lang]["settings.sso.inactive"] || "SSO non configuré";
      cta.classList.remove("hidden");
      info.classList.add("hidden");
    }

    // Plan
    const planBadge = $("plan-badge");
    const planDesc  = $("plan-desc");
    const plans = {
      trialing:  { label: "Essai gratuit",   desc: "14 jours d'accès complet — aucune carte requise.", cls: "plan-trial" },
      active:    { label: "Premium actif",   desc: "Accès complet à tous les connecteurs et fonctionnalités.", cls: "plan-active" },
      canceled:  { label: "Annulé",          desc: "Votre abonnement est annulé. Contactez-nous pour le réactiver.", cls: "plan-inactive" },
      suspended: { label: "Suspendu",        desc: "L'accès est suspendu. Contactez le support.", cls: "plan-inactive" },
    };
    const pl = plans[p.subscription_status] || { label: p.subscription_status || "—", desc: "", cls: "" };
    planBadge.textContent = pl.label;
    planBadge.className = `plan-badge ${pl.cls}`;
    planDesc.textContent = pl.desc;
  } catch (ex) {
    console.error("Settings load error:", ex.message);
  }
  loadServiceAccounts();
}

// Profile form submit
$("settings-profile-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("sp-save-btn");
  const suc = $("sp-success"); const err = $("sp-error");
  btn.disabled = true; suc.classList.add("hidden"); err.classList.add("hidden");
  try {
    await apiCall("/api/settings/profile", "PATCH", { full_name: $("sp-fullname").value.trim() });
    suc.classList.remove("hidden");
    $("settings-fullname").textContent = $("sp-fullname").value.trim();
    $("settings-avatar").textContent   = $("sp-fullname").value.trim()[0].toUpperCase();
    // Sync top nav avatar
    $("user-avatar").textContent = $("sp-fullname").value.trim()[0].toUpperCase();
    setTimeout(() => suc.classList.add("hidden"), 4000);
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
});

// Password form submit
$("settings-pwd-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("sp-pwd-btn");
  const suc = $("sp-pwd-success"); const err = $("sp-pwd-error");
  suc.classList.add("hidden"); err.classList.add("hidden");

  const np = $("sp-pwd-new").value;
  const cp = $("sp-pwd-confirm").value;
  if (np !== cp) {
    err.textContent = T[_lang]["settings.pwd.mismatch"] || "Les mots de passe ne correspondent pas.";
    err.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  try {
    await apiCall("/api/settings/password", "POST", {
      current_password: $("sp-pwd-current").value,
      new_password:     np,
    });
    suc.classList.remove("hidden");
    $("settings-pwd-form").reset();
    setTimeout(() => suc.classList.add("hidden"), 5000);
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  await _handleInviteToken();
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

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-LOGOUT après 10 min d'inactivité (avertissement à 8 min)
// L'état de l'onglet actif + la question en cours sont sauvegardés en session
// pour être restaurés après reconnexion.
// ═══════════════════════════════════════════════════════════════════════════

const IDLE_WARN_MS  = 8 * 60 * 1000;  // 8 min → avertissement
const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 min → déconnexion

let _idleWarnTimer  = null;
let _idleLogoutTimer = null;
let _warnBannerEl   = null;

function _createWarnBanner() {
  if (_warnBannerEl) return;
  const div = document.createElement("div");
  div.id = "idle-warn-banner";
  div.innerHTML = `
    <span id="idle-warn-msg">Votre session expire dans 2 minutes. Cliquez pour rester connecté.</span>
    <button class="btn btn-dark btn-sm" onclick="resetIdleTimer()">Rester connecté</button>
  `;
  document.body.appendChild(div);
  _warnBannerEl = div;
}

function _showWarnBanner() {
  _createWarnBanner();
  _warnBannerEl.classList.add("visible");
  // Translate if EN
  const msg = $("idle-warn-msg");
  if (msg && _lang === "en") msg.textContent = "Your session expires in 2 minutes. Click to stay connected.";
  else if (msg) msg.textContent = "Votre session expire dans 2 minutes. Cliquez pour rester connecté.";
}

function _hideWarnBanner() {
  if (_warnBannerEl) _warnBannerEl.classList.remove("visible");
}

function _saveWorkState() {
  // Save current tab + agent question so user can resume after re-login
  const work = {
    tab: state.tab,
    agentQuestion: $("agent-question")?.value || "",
    agentResult: window._lastAgentResult || null,
    agentQuestion2: window._lastAgentQuestion || "",
  };
  sessionStorage.setItem("nexhire_work_state", JSON.stringify(work));
}

function _restoreWorkState() {
  const raw = sessionStorage.getItem("nexhire_work_state");
  if (!raw) return;
  try {
    const work = JSON.parse(raw);
    if (work.tab) switchTab(work.tab);
    if (work.agentQuestion && $("agent-question")) $("agent-question").value = work.agentQuestion;
    if (work.agentResult) {
      window._lastAgentResult  = work.agentResult;
      window._lastAgentQuestion = work.agentQuestion2;
      renderAgentResult(work.agentResult);
    }
    sessionStorage.removeItem("nexhire_work_state");
  } catch { /* ignore */ }
}

function resetIdleTimer() {
  _hideWarnBanner();
  clearTimeout(_idleWarnTimer);
  clearTimeout(_idleLogoutTimer);
  if (!state.token) return;  // not logged in, don't restart
  _idleWarnTimer   = setTimeout(_showWarnBanner, IDLE_WARN_MS);
  _idleLogoutTimer = setTimeout(_autoLogout,     IDLE_LIMIT_MS);
}

function _autoLogout() {
  _hideWarnBanner();
  _saveWorkState();
  clearAuth();
  showAuth("login");
  // Add a message to the login form
  const err = $("login-error");
  if (err) {
    err.textContent = _lang === "en"
      ? "You were disconnected due to inactivity. Please sign in again."
      : "Vous avez été déconnecté pour inactivité. Veuillez vous reconnecter.";
    err.classList.remove("hidden");
  }
}

// Activity events reset the idle timer
["mousedown","mousemove","keydown","touchstart","scroll","click"].forEach(evt => {
  document.addEventListener(evt, () => { if (state.token) resetIdleTimer(); }, { passive: true });
});

// Patch showApp to start idle timer and restore work state
const _origShowApp = showApp;
showApp = function () {
  _origShowApp();
  resetIdleTimer();
  _restoreWorkState();
};

// ═══════════════════════════════════════════════════════════════════════════
// CATALOGUE D'APPLICATIONS (listes déroulantes avec auto-remplissage)
// ═══════════════════════════════════════════════════════════════════════════
const APP_CATALOG = [
  // Suite bureautique
  {name:"Microsoft 365",                vendor:"Microsoft",           category:"saas",     group:"Suite bureautique"},
  {name:"Google Workspace",             vendor:"Google",              category:"saas",     group:"Suite bureautique"},
  // Collaboration
  {name:"Microsoft Teams",              vendor:"Microsoft",           category:"saas",     group:"Collaboration"},
  {name:"Slack",                        vendor:"Salesforce",          category:"saas",     group:"Collaboration"},
  {name:"Zoom",                         vendor:"Zoom",                category:"saas",     group:"Collaboration"},
  {name:"Cisco Webex",                  vendor:"Cisco",               category:"saas",     group:"Collaboration"},
  {name:"SharePoint",                   vendor:"Microsoft",           category:"cloud",    group:"Collaboration"},
  {name:"OneDrive",                     vendor:"Microsoft",           category:"cloud",    group:"Collaboration"},
  {name:"Dropbox Business",             vendor:"Dropbox",             category:"saas",     group:"Collaboration"},
  // Gestion documentaire
  {name:"OpenText",                     vendor:"OpenText",            category:"on-prem",  group:"Gestion documentaire"},
  {name:"M-Files",                      vendor:"M-Files",             category:"saas",     group:"Gestion documentaire"},
  {name:"DocuWare",                     vendor:"DocuWare",            category:"saas",     group:"Gestion documentaire"},
  {name:"Laserfiche",                   vendor:"Laserfiche",          category:"saas",     group:"Gestion documentaire"},
  {name:"Alfresco",                     vendor:"Hyland",              category:"on-prem",  group:"Gestion documentaire"},
  // ERP
  {name:"SAP S/4HANA",                  vendor:"SAP",                 category:"saas",     group:"ERP"},
  {name:"Oracle ERP Cloud",             vendor:"Oracle",              category:"cloud",    group:"ERP"},
  {name:"Microsoft Dynamics 365",       vendor:"Microsoft",           category:"saas",     group:"ERP"},
  {name:"NetSuite",                     vendor:"Oracle",              category:"saas",     group:"ERP"},
  {name:"Infor CloudSuite",             vendor:"Infor",               category:"cloud",    group:"ERP"},
  {name:"Sage Intacct",                 vendor:"Sage",                category:"saas",     group:"ERP"},
  // Comptabilité
  {name:"QuickBooks Online",            vendor:"Intuit",              category:"saas",     group:"Comptabilité"},
  {name:"Xero",                         vendor:"Xero",                category:"saas",     group:"Comptabilité"},
  {name:"Sage 300",                     vendor:"Sage",                category:"on-prem",  group:"Comptabilité"},
  {name:"FreshBooks",                   vendor:"FreshBooks",          category:"saas",     group:"Comptabilité"},
  // Ressources humaines
  {name:"Workday",                      vendor:"Workday",             category:"saas",     group:"Ressources humaines"},
  {name:"UKG Pro",                      vendor:"UKG",                 category:"saas",     group:"Ressources humaines"},
  {name:"ADP Workforce Now",            vendor:"ADP",                 category:"saas",     group:"Ressources humaines"},
  {name:"BambooHR",                     vendor:"BambooHR",            category:"saas",     group:"Ressources humaines"},
  {name:"Ceridian Dayforce",            vendor:"Ceridian",            category:"saas",     group:"Ressources humaines"},
  {name:"SuccessFactors",               vendor:"SAP",                 category:"saas",     group:"Ressources humaines"},
  // Recrutement (ATS)
  {name:"Greenhouse",                   vendor:"Greenhouse",          category:"saas",     group:"Recrutement (ATS)"},
  {name:"Lever",                        vendor:"Lever",               category:"saas",     group:"Recrutement (ATS)"},
  {name:"iCIMS",                        vendor:"iCIMS",               category:"saas",     group:"Recrutement (ATS)"},
  {name:"SmartRecruiters",              vendor:"SmartRecruiters",     category:"saas",     group:"Recrutement (ATS)"},
  {name:"Workday Recruiting",           vendor:"Workday",             category:"saas",     group:"Recrutement (ATS)"},
  // CRM
  {name:"Salesforce",                   vendor:"Salesforce",          category:"saas",     group:"CRM"},
  {name:"HubSpot CRM",                  vendor:"HubSpot",             category:"saas",     group:"CRM"},
  {name:"Microsoft Dynamics CRM",       vendor:"Microsoft",           category:"saas",     group:"CRM"},
  {name:"Zoho CRM",                     vendor:"Zoho",                category:"saas",     group:"CRM"},
  {name:"Pipedrive",                    vendor:"Pipedrive",           category:"saas",     group:"CRM"},
  // Support TI (ITSM)
  {name:"ServiceNow",                   vendor:"ServiceNow",          category:"saas",     group:"Support TI (ITSM)"},
  {name:"Jira Service Management",      vendor:"Atlassian",           category:"saas",     group:"Support TI (ITSM)"},
  {name:"Freshservice",                 vendor:"Freshworks",          category:"saas",     group:"Support TI (ITSM)"},
  {name:"ManageEngine ServiceDesk Plus",vendor:"Zoho",                category:"saas",     group:"Support TI (ITSM)"},
  {name:"BMC Helix ITSM",               vendor:"BMC",                 category:"saas",     group:"Support TI (ITSM)"},
  // Gestion de projets
  {name:"Jira Software",                vendor:"Atlassian",           category:"saas",     group:"Gestion de projets"},
  {name:"Microsoft Project",            vendor:"Microsoft",           category:"saas",     group:"Gestion de projets"},
  {name:"Asana",                        vendor:"Asana",               category:"saas",     group:"Gestion de projets"},
  {name:"Monday.com",                   vendor:"Monday.com",          category:"saas",     group:"Gestion de projets"},
  {name:"Trello",                       vendor:"Atlassian",           category:"saas",     group:"Gestion de projets"},
  {name:"ClickUp",                      vendor:"ClickUp",             category:"saas",     group:"Gestion de projets"},
  // Cybersécurité
  {name:"Microsoft Defender",           vendor:"Microsoft",           category:"security", group:"Cybersécurité"},
  {name:"CrowdStrike",                  vendor:"CrowdStrike",         category:"security", group:"Cybersécurité"},
  {name:"SentinelOne",                  vendor:"SentinelOne",         category:"security", group:"Cybersécurité"},
  {name:"Palo Alto Networks",           vendor:"Palo Alto Networks",  category:"security", group:"Cybersécurité"},
  {name:"Fortinet",                     vendor:"Fortinet",            category:"security", group:"Cybersécurité"},
  // Gestion des identités
  {name:"Microsoft Entra ID",           vendor:"Microsoft",           category:"security", group:"Gestion des identités"},
  {name:"Okta",                         vendor:"Okta",                category:"security", group:"Gestion des identités"},
  {name:"Ping Identity",                vendor:"Ping Identity",       category:"security", group:"Gestion des identités"},
  // Business Intelligence
  {name:"Microsoft Power BI",           vendor:"Microsoft",           category:"saas",     group:"Business Intelligence"},
  {name:"Tableau",                      vendor:"Salesforce",          category:"saas",     group:"Business Intelligence"},
  {name:"Qlik Sense",                   vendor:"Qlik",                category:"saas",     group:"Business Intelligence"},
  {name:"Looker",                       vendor:"Google",              category:"saas",     group:"Business Intelligence"},
  // Cloud
  {name:"Amazon Web Services (AWS)",    vendor:"Amazon",              category:"cloud",    group:"Cloud"},
  {name:"Microsoft Azure",              vendor:"Microsoft",           category:"cloud",    group:"Cloud"},
  {name:"Google Cloud",                 vendor:"Google",              category:"cloud",    group:"Cloud"},
  // Hôpitaux / Santé
  {name:"Epic Systems",                 vendor:"Epic",                category:"on-prem",  group:"Hôpitaux / Santé"},
  {name:"Oracle Health (Cerner)",       vendor:"Oracle",              category:"saas",     group:"Hôpitaux / Santé"},
  {name:"MEDITECH",                     vendor:"MEDITECH",            category:"on-prem",  group:"Hôpitaux / Santé"},
  // Universités / Enseignement
  {name:"Ellucian Banner",              vendor:"Ellucian",            category:"saas",     group:"Universités"},
  {name:"PeopleSoft Campus Solutions",  vendor:"Oracle",              category:"on-prem",  group:"Universités"},
  {name:"Moodle",                       vendor:"Moodle",              category:"on-prem",  group:"Universités"},
  {name:"Canvas LMS",                   vendor:"Instructure",         category:"saas",     group:"Universités"},
];

function _buildAppSelect() {
  const sel = $("am-name-select");
  if (!sel) return;
  const groups = {};
  APP_CATALOG.forEach(a => { if (!groups[a.group]) groups[a.group] = []; groups[a.group].push(a); });
  sel.innerHTML =
    `<option value="">— Choisir une application —</option>` +
    Object.entries(groups).map(([grp, apps]) =>
      `<optgroup label="${grp}">${apps.map(a =>
        `<option value="${a.name}">${a.name}</option>`
      ).join("")}</optgroup>`
    ).join("") +
    `<optgroup label="━━━━━━━━━━━━"><option value="__autre__">✏️ Autre — saisie manuelle</option></optgroup>`;
}

function onAppSelectChange(val) {
  const manualWrap = $("am-name-manual-wrap");
  if (!manualWrap) return;
  if (val === "__autre__") {
    manualWrap.classList.remove("hidden");
    $("am-name-manual").focus();
  } else {
    manualWrap.classList.add("hidden");
    const app = APP_CATALOG.find(a => a.name === val);
    if (app) {
      const v = $("am-vendor"); const c = $("am-cat");
      if (v && !v.value) v.value = app.vendor;   // auto-fill seulement si vide
      if (c) c.value = app.category;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARC IT
// ═══════════════════════════════════════════════════════════════════════════

let _parcTab = "overview";
let _parcBudgetChart = null;
let _parcForecastChart = null;

function switchParcTab(name, push = true) {
  _parcTab = name;
  document.querySelectorAll(".parc-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.parc === name));
  document.querySelectorAll(".parc-content").forEach(el => el.classList.add("hidden"));
  const el = $(`parc-${name}`);
  if (el) el.classList.remove("hidden");
  if (push) history.pushState({ tab: "parc-it", parc: name }, "", `#parc-it/${name}`);
  _loadParcSection(name);
}

async function loadParcIT() {
  await _populateDeptSelects();
  switchParcTab(_parcTab, false);
}

function _loadParcSection(name) {
  if (name === "overview")  _loadParcOverview();
  if (name === "budget")    loadBudget();
  if (name === "licenses")  loadLicenses();
  if (name === "servers")   loadServers();
  if (name === "apps")      loadApps();
}

async function _populateDeptSelects() {
  try {
    const depts = await apiCall("/api/departments");
    const parcSel = $("parc-dept-select");
    const allOpt = `<option value="">${T[_lang]["parc.dept.all"] || "Tous les départements"}</option>`;
    const opts = depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
    [parcSel, $("bm-dept"), $("lm-dept"), $("sm-dept"), $("am-dept")].forEach(sel => {
      if (!sel) return;
      const baseOpt = sel === parcSel ? allOpt : `<option value="">— Aucun —</option>`;
      sel.innerHTML = baseOpt + opts;
    });
  } catch (_) {}
}

async function _loadParcOverview() {
  const deptId = $("parc-dept-select")?.value || "";
  try {
    const [summary, lics, srvs, apps] = await Promise.all([
      apiCall(`/api/budget/summary?year=${new Date().getFullYear()}${deptId ? `&dept_id=${deptId}` : ""}`),
      apiCall(`/api/licenses${deptId ? `?dept_id=${deptId}` : ""}`),
      apiCall(`/api/servers${deptId ? `?dept_id=${deptId}` : ""}`),
      apiCall(`/api/apps${deptId ? `?dept_id=${deptId}` : ""}`),
    ]);

    // KPIs
    const util = summary.total?.utilization_pct ?? 0;
    $("parc-kpi-budget-util").textContent = util.toFixed(1) + "%";
    $("parc-kpi-lic-expiring").textContent = lics.filter(l => l.computed_status === "expiring_soon").length;
    $("parc-kpi-srv-decom").textContent    = srvs.filter(s => s.status === "to_decommission").length;
    $("parc-kpi-apps-unused").textContent  = apps.filter(a => a.status === "unused").length;

    // Budget by category chart
    const cats = summary.by_category || [];
    if (_parcBudgetChart) _parcBudgetChart.destroy();
    _parcBudgetChart = new Chart($("parc-budget-chart"), {
      type: "bar",
      data: {
        labels: cats.map(c => c.category.toUpperCase()),
        datasets: [
          { label: "Alloué", data: cats.map(c => c.allocated), backgroundColor: "rgba(129,140,248,.4)", borderColor: "#818cf8", borderWidth: 1 },
          { label: "Réel",   data: cats.map(c => c.actual),    backgroundColor: "rgba(99,102,241,.8)",  borderColor: "#6366f1", borderWidth: 1 },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } },
    });

    // Forecast chart — masqué si toutes les valeurs sont nulles
    const fc = summary.forecast || [];
    const forecastPanel = $("parc-forecast-chart")?.closest(".chart-panel");
    const hasForecasts  = fc.some(f => f.predicted > 0);
    if (forecastPanel) forecastPanel.style.display = hasForecasts ? "" : "none";
    if (hasForecasts) {
      if (_parcForecastChart) _parcForecastChart.destroy();
      _parcForecastChart = new Chart($("parc-forecast-chart"), {
        type: "line",
        data: {
          labels: fc.map(f => f.period),
          datasets: [{ label: "Prévision", data: fc.map(f => f.predicted), borderColor: "#818cf8", backgroundColor: "rgba(129,140,248,.15)", fill: true, tension: .3 }],
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
      });
    } else if (_parcForecastChart) {
      _parcForecastChart.destroy();
      _parcForecastChart = null;
    }
  } catch (e) { console.error(e); }
}

async function loadBudget() {
  const wrap = $("budget-table-wrap");
  const summaryWrap = $("budget-summary-wrap");
  const deptId = $("parc-dept-select")?.value || "";
  const year   = $("budget-year-filter")?.value  || new Date().getFullYear();
  const cat    = $("budget-cat-filter")?.value   || "";
  try {
    const [entries, summary] = await Promise.all([
      apiCall(`/api/budget?year=${year}${cat ? `&category=${cat}` : ""}${deptId ? `&dept_id=${deptId}` : ""}`),
      apiCall(`/api/budget/summary?year=${year}${deptId ? `&dept_id=${deptId}` : ""}`),
    ]);

    if (!entries.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucune donnée budgétaire.</p>`; }
    else {
      wrap.innerHTML = `<table class="data-table"><thead><tr><th>Catégorie</th><th>Libellé</th><th>Période</th><th>Alloué</th><th>Réel</th><th>Écart</th><th>Département</th><th></th></tr></thead><tbody>` +
        entries.map(e => {
          const period = e.month ? `${e.year}-${String(e.month).padStart(2,"0")}` : String(e.year);
          const var_ = (e.allocated||0) - (e.actual||0);
          const varColor = var_ >= 0 ? "color:#15803d" : "color:#dc2626";
          const deptName = e.department_name || "—";
          return `<tr>
            <td><span class="badge badge-active">${esc(e.category.toUpperCase())}</span></td>
            <td>${esc(e.label||"")}</td><td>${period}</td>
            <td>${_fmt(e.allocated)} ${e.currency}</td>
            <td>${_fmt(e.actual)} ${e.currency}</td>
            <td style="${varColor}">${var_ >= 0 ? "+" : ""}${_fmt(var_)}</td>
            <td>${esc(deptName)}</td>
            <td><button class="btn-icon" onclick="editBudget('${e.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteBudget('${e.id}')">✕</button></td>
          </tr>`;
        }).join("") + `</tbody></table>`;
    }

    // Summary bar
    const total = summary.total || {};
    const by_cat = summary.by_category || [];
    const fc = summary.forecast || [];
    summaryWrap.innerHTML = `
      <div style="margin-bottom:8px;font-weight:700;color:var(--navy)">
        Total alloué : ${_fmt(total.allocated)} · Réel : ${_fmt(total.actual)} · Utilisation : <strong>${total.utilization_pct||0}%</strong>
      </div>
      ${by_cat.map(c => {
        const pct = c.allocated > 0 ? Math.min(100, c.actual / c.allocated * 100) : 0;
        const cls = pct > 100 ? "over" : pct > 85 ? "warn" : "";
        return `<div class="budget-summary-row">
          <div class="budget-cat-label">${c.category.toUpperCase()}</div>
          <div class="budget-bar-outer"><div class="budget-bar-inner ${cls}" style="width:${Math.min(100,pct)}%"></div></div>
          <div class="budget-amounts">${_fmt(c.actual)} / <strong>${_fmt(c.allocated)}</strong></div>
        </div>`;
      }).join("")}
      ${fc.length ? `<div class="forecast-row">${fc.map(f=>`<div class="forecast-pill"><div class="forecast-pill-period">${f.period}</div><div class="forecast-pill-val">${_fmt(f.predicted)}</div></div>`).join("")}</div>` : ""}
    `;
  } catch (e) { wrap.innerHTML = `<p class="muted" style="padding:20px">${e.message||"Erreur"}</p>`; }
}

async function loadLicenses() {
  const wrap = $("licenses-table-wrap");
  const deptId = $("parc-dept-select")?.value || "";
  const expDays = $("lic-filter")?.value || "";
  try {
    const url = `/api/licenses?${deptId ? `dept_id=${deptId}&` : ""}${expDays ? `expiring_days=${expDays}` : ""}`;
    const lics = await apiCall(url);
    if (!lics.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucune licence enregistrée.</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Produit</th><th>Fournisseur</th><th>Type</th><th>Qté / Assign.</th><th>Coût/unité</th><th>Expiration</th><th>Renouvellement</th><th>Statut</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      lics.map(l => {
        const st = l.computed_status;
        const badgeCls = st === "expired" ? "badge-expired" : st === "expiring_soon" ? "badge-expiring" : "badge-active";
        const stLabel  = st === "expired" ? "Expirée" : st === "expiring_soon" ? `Expire dans ${l.days_to_expiry}j` : st === "expiring_medium" ? `${l.days_to_expiry}j` : "Active";
        const deptName = l.department_name || "—";
        return `<tr class="${st==="expired"?"row-inactive":""}">
          <td><strong>${esc(l.product_name)}</strong></td>
          <td>${esc(l.vendor||"—")}</td>
          <td>${l.license_type||"—"}</td>
          <td>${l.assigned_count}/${l.quantity}</td>
          <td>${_fmt(l.cost_per_unit)}</td>
          <td>${l.expiration_date||"—"}</td>
          <td>${l.renewal_date||"—"}</td>
          <td><span class="badge ${badgeCls}">${stLabel}</span></td>
          <td>${esc(deptName)}</td>
          <td><button class="btn-icon" onclick="editLicense('${l.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteLicense('${l.id}')">✕</button></td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted" style="padding:20px">${e.message||"Erreur"}</p>`; }
}

async function loadServers() {
  const wrap = $("servers-table-wrap");
  const deptId = $("parc-dept-select")?.value || "";
  const status = $("srv-status-filter")?.value || "";
  try {
    const url = `/api/servers?${deptId ? `dept_id=${deptId}&` : ""}${status ? `status=${status}` : ""}`;
    const srvs = await apiCall(url);
    if (!srvs.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucun serveur enregistré.</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Hôte</th><th>IP</th><th>Env.</th><th>OS</th><th>CPU/RAM/Stockage</th><th>Emplacement</th><th>Dernier ping</th><th>Statut</th><th>Coût/mois</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      srvs.map(s => {
        const stMap = { active:"badge-active", idle:"badge-idle", to_decommission:"badge-decom", decommissioned:"badge-expired" };
        const stLbl = { active:"Actif", idle:"Inactif", to_decommission:"À décom.", decommissioned:"Décom." };
        const pingInfo = s.last_ping_at ? `${s.idle_days}j` : "Jamais";
        const spec = [s.cpu_cores ? `${s.cpu_cores}c` : null, s.ram_gb ? `${s.ram_gb}Go` : null, s.storage_gb ? `${s.storage_gb}Go` : null].filter(Boolean).join(" / ") || "—";
        const deptName = s.department_name || "—";
        return `<tr class="${s.status==="decommissioned"?"row-inactive":""}">
          <td><strong>${esc(s.hostname)}</strong></td>
          <td>${esc(s.ip_address||"—")}</td>
          <td>${esc(s.environment||"—")}</td>
          <td>${esc(s.os||"—")}</td>
          <td>${spec}</td>
          <td>${esc(s.location||"—")}</td>
          <td>${pingInfo}</td>
          <td><span class="badge ${stMap[s.status]||"badge-idle"}">${stLbl[s.status]||s.status}</span></td>
          <td>${_fmt(s.monthly_cost)}</td>
          <td>${esc(deptName)}</td>
          <td><button class="btn-icon" onclick="editServer('${s.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteServer('${s.id}')">✕</button></td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted" style="padding:20px">${e.message||"Erreur"}</p>`; }
}

async function loadApps() {
  const wrap = $("apps-table-wrap");
  const deptId = $("parc-dept-select")?.value || "";
  const status = $("app-status-filter")?.value || "";
  try {
    const url = `/api/apps?${deptId ? `dept_id=${deptId}&` : ""}${status ? `status=${status}` : ""}`;
    const apps = await apiCall(url);
    if (!apps.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucune application enregistrée.</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Nom</th><th>Fournisseur</th><th>Catégorie</th><th>Utilisateurs</th><th>Dernier usage</th><th>Coût/mois</th><th>Statut</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      apps.map(a => {
        const stMap = { active:"badge-active", unused:"badge-unused", decommissioned:"badge-expired" };
        const stLbl = { active:"Active", unused:"Inutilisée", decommissioned:"Décom." };
        const unusedInfo = a.days_unused !== null ? `${a.days_unused}j sans usage` : "—";
        const deptName = a.department_name || "—";
        return `<tr class="${a.status!=="active"?"row-inactive":""}">
          <td><strong>${esc(a.name)}</strong>${a.url ? ` <a href="${esc(a.url)}" target="_blank" style="font-size:.75rem;color:var(--indigo)">↗</a>` : ""}</td>
          <td>${esc(a.vendor||"—")}</td>
          <td>${esc(a.category||"—")}</td>
          <td>${a.user_count}</td>
          <td>${unusedInfo}</td>
          <td>${_fmt(a.monthly_cost)}</td>
          <td><span class="badge ${stMap[a.status]||"badge-active"}">${stLbl[a.status]||a.status}</span></td>
          <td>${esc(deptName)}</td>
          <td><button class="btn-icon" onclick="editApp('${a.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteApp('${a.id}')">✕</button></td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted" style="padding:20px">${e.message||"Erreur"}</p>`; }
}

// ── Budget CRUD ───────────────────────────────────────────────────────────────
function openBudgetModal(entry = null) {
  $("bm-id").value = entry?.id || "";
  $("bm-cat").value      = entry?.category   || "aws";
  $("bm-label").value    = entry?.label      || "";
  $("bm-year").value     = entry?.year       || new Date().getFullYear();
  $("bm-month").value    = entry?.month      || "";
  $("bm-currency").value = entry?.currency   || "CAD";
  $("bm-allocated").value = entry?.allocated || 0;
  $("bm-actual").value    = entry?.actual    || 0;
  $("bm-dept").value     = entry?.department_id || "";
  $("bm-notes").value    = entry?.notes      || "";
  $("bm-error").classList.add("hidden");
  $("budget-modal").classList.remove("hidden");
}
async function editBudget(id) {
  try { const e = (await apiCall(`/api/budget?year=2020`))[0]; openBudgetModal({id, ...e}); } catch(_) { openBudgetModal({id}); }
}
function closeParcModal(modalId) { $(modalId).classList.add("hidden"); }

document.addEventListener("DOMContentLoaded", () => {
  $("budget-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("bm-id").value;
    const body = { category:$("bm-cat").value, label:$("bm-label").value||null, year:+$("bm-year").value,
      month:$("bm-month").value ? +$("bm-month").value : null, currency:$("bm-currency").value,
      allocated:+$("bm-allocated").value, actual:+$("bm-actual").value,
      department_id:$("bm-dept").value||null, notes:$("bm-notes").value||null };
    try {
      if (id) await apiCall(`/api/budget/${id}`, "PATCH", body);
      else    await apiCall("/api/budget", "POST", body);
      closeParcModal("budget-modal"); loadBudget();
    } catch(ex) { const err=$("bm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });

  $("license-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("lm-id").value;
    const body = { product_name:$("lm-product").value, vendor:$("lm-vendor").value||null,
      license_type:$("lm-type").value, quantity:+$("lm-qty").value, assigned_count:+$("lm-assigned").value,
      cost_per_unit:+$("lm-cost").value, billing_cycle:$("lm-cycle").value,
      purchase_date:$("lm-purchase").value||null, expiration_date:$("lm-expiry").value||null,
      renewal_date:$("lm-renewal").value||null, auto_renew:$("lm-autorenew").checked,
      department_id:$("lm-dept").value||null, notes:$("lm-notes").value||null };
    try {
      if (id) await apiCall(`/api/licenses/${id}`, "PATCH", body);
      else    await apiCall("/api/licenses", "POST", body);
      closeParcModal("license-modal"); loadLicenses();
    } catch(ex) { const err=$("lm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });

  $("server-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("sm-id").value;
    const body = { hostname:$("sm-hostname").value, ip_address:$("sm-ip").value||null,
      environment:$("sm-env").value, status:$("sm-status").value, os:$("sm-os").value||null,
      cpu_cores:$("sm-cpu").value ? +$("sm-cpu").value : null, ram_gb:$("sm-ram").value ? +$("sm-ram").value : null,
      storage_gb:$("sm-storage").value ? +$("sm-storage").value : null,
      location:$("sm-location").value||null, monthly_cost:+($("sm-cost").value||0),
      department_id:$("sm-dept").value||null, notes:$("sm-notes").value||null };
    try {
      if (id) await apiCall(`/api/servers/${id}`, "PATCH", body);
      else    await apiCall("/api/servers", "POST", body);
      closeParcModal("server-modal"); loadServers();
    } catch(ex) { const err=$("sm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });

  _buildAppSelect();

  $("app-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id  = $("am-id").value;
    const sel = $("am-name-select");
    const nameVal = (sel?.value === "__autre__")
      ? ($("am-name-manual")?.value?.trim() || "")
      : (sel?.value || "");
    if (!nameVal) {
      const err = $("am-error");
      err.textContent = "Le nom de l'application est requis.";
      err.classList.remove("hidden");
      return;
    }
    const body = { name:nameVal, vendor:$("am-vendor").value||null,
      category:$("am-cat").value||null, status:$("am-status").value,
      monthly_cost:+($("am-cost").value||0), user_count:+($("am-users").value||0),
      url:$("am-url").value||null, department_id:$("am-dept").value||null,
      notes:$("am-notes").value||null };
    try {
      if (id) await apiCall(`/api/apps/${id}`, "PATCH", body);
      else    await apiCall("/api/apps", "POST", body);
      closeParcModal("app-modal"); loadApps();
    } catch(ex) { const err=$("am-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });
});

function openLicenseModal(lic = null) {
  $("lm-id").value = lic?.id || "";
  $("lm-product").value  = lic?.product_name  || "";
  $("lm-vendor").value   = lic?.vendor        || "";
  $("lm-type").value     = lic?.license_type  || "subscription";
  $("lm-qty").value      = lic?.quantity      || 1;
  $("lm-assigned").value = lic?.assigned_count|| 0;
  $("lm-cost").value     = lic?.cost_per_unit || 0;
  $("lm-cycle").value    = lic?.billing_cycle || "annual";
  $("lm-purchase").value = lic?.purchase_date || "";
  $("lm-expiry").value   = lic?.expiration_date || "";
  $("lm-renewal").value  = lic?.renewal_date  || "";
  $("lm-autorenew").checked = lic?.auto_renew || false;
  $("lm-dept").value     = lic?.department_id || "";
  $("lm-notes").value    = lic?.notes || "";
  $("lm-error").classList.add("hidden");
  $("license-modal").classList.remove("hidden");
}
async function editLicense(id) {
  try {
    const lics = await apiCall("/api/licenses");
    const l = lics.find(x => x.id === id);
    if (l) openLicenseModal(l);
  } catch(_) { openLicenseModal({id}); }
}
async function deleteLicense(id) {
  if (!confirm("Supprimer cette licence ?")) return;
  try { await apiCall(`/api/licenses/${id}`, "DELETE"); loadLicenses(); } catch(e) { alert(e.message); }
}

function openServerModal(srv = null) {
  $("sm-id").value = srv?.id || "";
  $("sm-hostname").value = srv?.hostname  || "";
  $("sm-ip").value       = srv?.ip_address || "";
  $("sm-env").value      = srv?.environment || "production";
  $("sm-status").value   = srv?.status    || "active";
  $("sm-os").value       = srv?.os        || "";
  $("sm-cpu").value      = srv?.cpu_cores || "";
  $("sm-ram").value      = srv?.ram_gb    || "";
  $("sm-storage").value  = srv?.storage_gb || "";
  $("sm-location").value = srv?.location  || "";
  $("sm-cost").value     = srv?.monthly_cost || 0;
  $("sm-dept").value     = srv?.department_id || "";
  $("sm-notes").value    = srv?.notes     || "";
  $("sm-error").classList.add("hidden");
  $("server-modal").classList.remove("hidden");
}
async function editServer(id) {
  try {
    const srvs = await apiCall("/api/servers");
    const s = srvs.find(x => x.id === id);
    if (s) openServerModal(s);
  } catch(_) { openServerModal({id}); }
}
async function deleteServer(id) {
  if (!confirm("Supprimer ce serveur ?")) return;
  try { await apiCall(`/api/servers/${id}`, "DELETE"); loadServers(); } catch(e) { alert(e.message); }
}

function openAppModal(app = null) {
  $("am-id").value = app?.id || "";

  // Nom : catalogue ou saisie manuelle
  const sel        = $("am-name-select");
  const manualWrap = $("am-name-manual-wrap");
  const manualInp  = $("am-name-manual");
  const appName    = app?.name || "";
  const inCatalog  = appName && APP_CATALOG.find(a => a.name === appName);
  if (sel) {
    if (inCatalog) {
      sel.value = appName;
      manualWrap?.classList.add("hidden");
    } else if (appName) {
      sel.value = "__autre__";
      manualWrap?.classList.remove("hidden");
      if (manualInp) manualInp.value = appName;
    } else {
      sel.value = "";
      manualWrap?.classList.add("hidden");
      if (manualInp) manualInp.value = "";
    }
  }

  $("am-vendor").value = app?.vendor       || "";
  $("am-cat").value    = app?.category     || "";
  $("am-status").value = app?.status       || "active";
  $("am-cost").value   = app?.monthly_cost || 0;
  $("am-users").value  = app?.user_count   || 0;
  $("am-url").value    = app?.url          || "";
  $("am-dept").value   = app?.department_id || "";
  $("am-notes").value  = app?.notes        || "";
  $("am-error").classList.add("hidden");
  $("app-modal").classList.remove("hidden");
}
async function editApp(id) {
  try {
    const apps = await apiCall("/api/apps");
    const a = apps.find(x => x.id === id);
    if (a) openAppModal(a);
  } catch(_) { openAppModal({id}); }
}
async function deleteApp(id) {
  if (!confirm("Supprimer cette application ?")) return;
  try { await apiCall(`/api/apps/${id}`, "DELETE"); loadApps(); } catch(e) { alert(e.message); }
}
async function deleteBudget(id) {
  if (!confirm("Supprimer cette entrée budgétaire ?")) return;
  try { await apiCall(`/api/budget/${id}`, "DELETE"); loadBudget(); } catch(e) { alert(e.message); }
}

// ── Comptes de service ────────────────────────────────────────────────────────
async function loadServiceAccounts() {
  const wrap = $("sa-list-wrap");
  if (!wrap) return;
  try {
    const sas = await apiCall("/api/service-accounts");
    if (!sas.length) { wrap.innerHTML = `<p class="muted">Aucun compte de service.</p>`; return; }
    wrap.innerHTML = sas.map(sa => `
      <div class="sa-row">
        <div class="sa-name">${esc(sa.name)}${sa.description ? ` <span class="sa-meta">— ${esc(sa.description)}</span>` : ""}</div>
        <span class="sa-prefix">${esc(sa.token_prefix)}****</span>
        <span class="badge ${sa.is_active?"badge-active":"badge-idle"}">${sa.role}</span>
        <span class="sa-meta">${sa.last_used_at ? "Vu : "+sa.last_used_at.slice(0,10) : "Jamais utilisé"}</span>
        <button class="btn-icon" onclick="toggleSA('${sa.id}',${!sa.is_active})" title="${sa.is_active?"Révoquer":"Réactiver"}">${sa.is_active?"⏸":"▶"}</button>
        <button class="btn-icon btn-deactivate" onclick="deleteSA('${sa.id}')" title="Supprimer">✕</button>
      </div>`).join("");
  } catch(e) { wrap.innerHTML = `<p class="muted">${e.message||"Erreur"}</p>`; }
}

function openSAModal() {
  $("sa-name").value = ""; $("sa-desc").value = ""; $("sa-role").value = "user";
  $("sa-error").classList.add("hidden");
  $("sa-token-wrap").classList.add("hidden");
  $("sa-modal-form").classList.remove("hidden");
  $("sa-modal").classList.remove("hidden");
}
async function copyToken() {
  const val = $("sa-token-input").value;
  try { await navigator.clipboard.writeText(val); } catch(_) { $("sa-token-input").select(); document.execCommand("copy"); }
}
async function toggleSA(id, active) {
  try { await apiCall(`/api/service-accounts/${id}`, "PATCH", { is_active: active }); loadServiceAccounts(); } catch(e) { alert(e.message); }
}
async function deleteSA(id) {
  if (!confirm("Supprimer définitivement ce compte de service ?")) return;
  try { await apiCall(`/api/service-accounts/${id}`, "DELETE"); loadServiceAccounts(); } catch(e) { alert(e.message); }
}

document.addEventListener("DOMContentLoaded", () => {
  $("sa-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const data = await apiCall("/api/service-accounts", "POST", { name:$("sa-name").value, description:$("sa-desc").value||null, role:$("sa-role").value });
      $("sa-token-input").value = data.token;
      $("sa-token-wrap").classList.remove("hidden");
      $("sa-modal-form").classList.add("hidden");
      loadServiceAccounts();
    } catch(ex) { const err=$("sa-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });
});

// ── Départements ──────────────────────────────────────────────────────────────
async function loadDepartments() {
  const wrap = $("dept-list-wrap");
  if (!wrap) return;
  try {
    const depts = await apiCall("/api/departments");
    if (!depts.length) {
      wrap.innerHTML = `<p class="muted">Aucun département. Cliquez sur <strong>⚡ Initialiser par secteur</strong> pour en créer automatiquement.</p>`;
      return;
    }
    const DEPT_TYPE_ICONS = { finance:"💰", hr:"👥", it:"🖥️", legal:"⚖️", operations:"⚙️", marketing:"📣", direction:"🏛️", approvisionnement:"📦", general:"🏢" };
    wrap.innerHTML = depts.map(d => `
      <div class="dept-card">
        <div class="dept-card-name">
          <span class="dept-type-icon">${DEPT_TYPE_ICONS[d.dept_type] || "🏢"}</span>
          ${esc(d.name)}
        </div>
        <div class="dept-card-meta">${d.member_count||0} membre(s) · Budget : ${_fmt(d.annual_budget)} ${d.currency}</div>
        ${d.description ? `<div class="dept-card-meta">${esc(d.description)}</div>` : ""}
        <div class="dept-actions">
          <button class="btn-icon" onclick="editDept('${d.id}','${esc(d.name)}','${esc(d.description||"")}',${d.annual_budget},'${d.currency}','${d.dept_type||"general"}')">✎</button>
          <button class="btn-icon btn-deactivate" onclick="deleteDept('${d.id}')">✕</button>
        </div>
      </div>`).join("");
  } catch(e) {
    const isDbMissing = e.status === 500;
    wrap.innerHTML = isDbMissing
      ? `<p class="muted" style="color:#dc2626">⚠️ Tables manquantes — exécutez <strong>phase9_enterprise.sql</strong> dans Supabase SQL Editor puis rechargez.</p>`
      : `<p class="muted">${e.message||"Erreur"}</p>`;
  }
}

function openDeptModal(dept = null) {
  $("dm-id").value = dept?.id || "";
  $("dm-name").value        = dept?.name         || "";
  $("dm-desc").value        = dept?.description  || "";
  $("dm-dept-type").value   = dept?.dept_type    || "general";
  $("dm-budget").value      = dept?.annual_budget|| 0;
  $("dm-currency").value    = dept?.currency     || "CAD";
  $("dm-error").classList.add("hidden");
  $("dept-modal").classList.remove("hidden");
}
function editDept(id, name, desc, budget, currency, deptType) {
  openDeptModal({ id, name, description:desc, annual_budget:budget, currency, dept_type:deptType || "general" });
}
async function deleteDept(id) {
  if (!confirm("Supprimer ce département ? Les données associées seront dissociées.")) return;
  try { await apiCall(`/api/departments/${id}`, "DELETE"); loadDepartments(); } catch(e) { alert(e.message); }
}

document.addEventListener("DOMContentLoaded", () => {
  $("dept-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("dm-id").value;
    const body = { name:$("dm-name").value, description:$("dm-desc").value||null,
      dept_type:$("dm-dept-type").value||"general",
      annual_budget:+($("dm-budget").value||0), currency:$("dm-currency").value };
    try {
      if (id) await apiCall(`/api/departments/${id}`, "PATCH", body);
      else    await apiCall("/api/departments", "POST", body);
      closeParcModal("dept-modal"); loadDepartments();
    } catch(ex) { const err=$("dm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });
});

// Helper formatter
function _fmt(v) {
  if (v == null) return "0.00";
  return Number(v).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE D'ORGANISATION & INITIALISATION DÉPARTEMENTS
// ═══════════════════════════════════════════════════════════════════════════

async function saveOrgType(type) {
  // Enregistre le type d'org sans créer les départements (juste la colonne organizations.org_type)
  // On réutilise l'endpoint initialize qui met à jour la colonne avant d'insérer
  try {
    await apiCall(`/api/departments/initialize?org_type=${type}`, "POST");
    state.orgType = type;
  } catch (_) {
    state.orgType = type; // garde en mémoire locale même si appel échoue
  }
}

let _selectedSector = null;

function openInitDeptsModal() {
  _selectedSector = null;
  document.querySelectorAll(".sector-card").forEach(c => c.classList.remove("selected"));
  $("sector-preview").classList.add("hidden");
  $("init-depts-confirm-btn").disabled = true;
  $("init-depts-error").classList.add("hidden");
  $("init-depts-modal").classList.remove("hidden");
}

function closeInitDeptsModal() {
  $("init-depts-modal").classList.add("hidden");
}

async function selectSector(type) {
  _selectedSector = type;
  document.querySelectorAll(".sector-card").forEach(c => c.classList.toggle("selected", c.dataset.type === type));
  $("init-depts-confirm-btn").disabled = false;

  try {
    const data = await apiCall(`/api/departments/templates?org_type=${type}`);
    const depts = data.departments || [];
    $("sector-preview-list").innerHTML = depts.map(d =>
      `<span class="badge badge-idle" title="${esc(d.description||"")}">${esc(d.name)}</span>`
    ).join("");
    $("sector-preview").classList.remove("hidden");
  } catch (_) {}
}

async function confirmInitDepts() {
  if (!_selectedSector) return;
  const btn = $("init-depts-confirm-btn");
  btn.disabled = true; btn.textContent = "Création en cours…";
  $("init-depts-error").classList.add("hidden");
  try {
    const res = await apiCall(`/api/departments/initialize?org_type=${_selectedSector}`, "POST");
    state.orgType = _selectedSector;
    if ($("sp-org-type")) $("sp-org-type").value = _selectedSector;
    closeInitDeptsModal();
    loadDepartments();
    _populateDeptSelects();
    alert(`✅ ${res.created} département(s) créé(s), ${res.skipped} déjà existant(s).`);
  } catch (ex) {
    const err = $("init-depts-error");
    err.textContent = ex.message || "Erreur lors de la création.";
    err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Créer les départements";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMISATION IA
// ═══════════════════════════════════════════════════════════════════════════

let _optimTab = "dashboard";
const OPTIM_ICONS = { license: "🔑", duplicate: "📋", contract: "📄", process: "⚙️" };

function switchOptimTab(name, push = true) {
  _optimTab = name;
  document.querySelectorAll("[data-optim]").forEach(b => b.classList.toggle("active", b.dataset.optim === name));
  document.querySelectorAll("#tab-optim .parc-content").forEach(el => el.classList.add("hidden"));
  const el = $(`optim-${name}`);
  if (el) el.classList.remove("hidden");
  if (push) history.pushState({ tab: "optim", optim: name }, "", `#optim/${name}`);
  _loadOptimSection(name);
}

const SECTOR_BADGE_LABELS = { entreprise: "🏢 Entreprise", hopital: "🏥 Hôpital", municipalite: "🏛️ Municipalité", universite: "🎓 Université" };

async function loadOptimization() {
  await _populateOptimDeptSelects();
  // Affiche le badge sectoriel
  const badge = $("optim-sector-badge");
  if (badge) {
    const type = state.orgType || "entreprise";
    badge.textContent = SECTOR_BADGE_LABELS[type] || type;
    badge.classList.remove("hidden");
  }
  switchOptimTab(_optimTab, false);
}

function _loadOptimSection(name) {
  if (name === "dashboard")  _loadOptimDashboard();
  if (name === "licenses")   _loadUnusedLicenses();
  if (name === "duplicates") _loadDuplicateTools();
  if (name === "contracts")  loadContracts();
  if (name === "processes")  loadProcesses();
}

async function _populateOptimDeptSelects() {
  try {
    const depts = await apiCall("/api/departments");
    const opt = `<option value="">— Aucun —</option>` + depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
    [$("cm-dept"), $("pm-dept")].forEach(sel => { if (sel) sel.innerHTML = opt; });
  } catch (_) {}
}

async function _loadOptimDashboard() {
  try {
    const data = await apiCall("/api/optimization/overview");

    // Efficiency score
    const score = data.efficiency_score || {};
    const overall = score.overall || 0;
    const circle = $("score-circle-main");
    if (circle) {
      circle.style.setProperty("--pct", overall);
      $("score-val-main").textContent = overall.toFixed(0);
    }
    _setScoreDim("software",    score.software    ?? 0, "sdim-sw-val");
    _setScoreDim("licenses",    score.licenses    ?? 0, "sdim-lic-val");
    _setScoreDim("infra",       score.infrastructure ?? 0, "sdim-infra-val");
    _setScoreDim("process",     score.process     ?? 0, "sdim-proc-val");

    // Savings
    const s = data.savings || {};
    if ($("savings-total")) $("savings-total").textContent = `${_fmt(s.total)} $`;
    if ($("savings-breakdown")) $("savings-breakdown").innerHTML = [
      { label: "Licences",       val: s.licenses  },
      { label: "Logiciels",      val: s.software  },
      { label: "Contrats",       val: s.contracts },
      { label: "Processus",      val: s.processes },
    ].map(r => `<div class="savings-row"><span class="savings-row-label">${r.label}</span><span class="savings-row-val">${_fmt(r.val)} $</span></div>`).join("");

    // Top opportunities
    const opps = data.top_opportunities || [];
    const wrap = $("optim-top-opps");
    if (wrap) {
      if (!opps.length) { wrap.innerHTML = `<p class="muted">Ajoutez des licences, applications et contrats pour voir les opportunités d'économies.</p>`; }
      else wrap.innerHTML = opps.map(o => `
        <div class="opp-card">
          <div class="opp-icon ${o.type}">${OPTIM_ICONS[o.type] || "💡"}</div>
          <div class="opp-body">
            <div class="opp-title">${esc(o.title)}</div>
            <div class="opp-meta">Confiance : ${o.confidence}%</div>
          </div>
          <div class="opp-savings">
            <div class="opp-savings-val">${_fmt(o.savings)} $</div>
            <div class="opp-confidence">économies/an</div>
          </div>
        </div>`).join("");
    }
  } catch (e) { console.error(e); }
}

function _setScoreDim(id, val, lblId) {
  const bar = $(`sdim-${id}`);
  if (bar) bar.style.width = val + "%";
  const lbl = $(lblId);
  if (lbl) lbl.textContent = val.toFixed(0) + "%";
}

async function _loadUnusedLicenses() {
  const wrap = $("optim-lic-table");
  try {
    const lics = await apiCall("/api/optimization/unused-licenses");
    if (!lics.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucune licence sous-utilisée détectée. Excellent !</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Produit</th><th>Fournisseur</th><th>Qté totale</th><th>Assignées</th><th>Utilisation</th><th>Coût/unité</th><th>Économies/an</th><th>Confiance</th><th>Département</th></tr></thead><tbody>` +
      lics.map(l => {
        const pct = l.usage_pct;
        const color = pct < 30 ? "#dc2626" : pct < 60 ? "#d97706" : "#2563eb";
        return `<tr>
          <td><strong>${esc(l.product_name)}</strong></td>
          <td>${esc(l.vendor||"—")}</td>
          <td>${l.quantity}</td>
          <td>${l.assigned_count}</td>
          <td style="color:${color};font-weight:700">${pct}%</td>
          <td>${_fmt(l.cost_per_unit)}</td>
          <td style="color:#15803d;font-weight:700">${_fmt(l.annual_savings_potential)} $</td>
          <td><span class="badge ${l.confidence>=90?"badge-active":l.confidence>=75?"badge-expiring":"badge-idle"}">${l.confidence}%</span></td>
          <td>${esc(l.department||"—")}</td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted">${e.message}</p>`; }
}

async function _loadDuplicateTools() {
  const wrap = $("optim-dup-list");
  try {
    const dups = await apiCall("/api/optimization/duplicate-tools");
    if (!dups.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucun doublon détecté dans vos applications IT.</p>`; return; }
    wrap.innerHTML = dups.map(d => `
      <div class="opp-card" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div class="opp-icon duplicate">📋</div>
          <div class="opp-body">
            <div class="opp-title">${d.tool_count} outils — catégorie : <strong>${esc(d.category)}</strong></div>
            <div class="opp-meta">${esc(d.recommendation)}</div>
          </div>
          <div class="opp-savings">
            <div class="opp-savings-val">${_fmt(d.annual_savings_potential)} $</div>
            <div class="opp-confidence">économies/an · confiance ${d.confidence}%</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${d.tools.map(t => `<span class="badge badge-idle">${esc(t.name)}${t.monthly_cost > 0 ? ` — ${_fmt(t.monthly_cost)}$/mois` : ""}</span>`).join("")}
        </div>
      </div>`).join("");
  } catch (e) { wrap.innerHTML = `<p class="muted">${e.message}</p>`; }
}

// ── Contrats ──────────────────────────────────────────────────────────────────
async function loadContracts() {
  const wrap = $("contracts-table-wrap");
  const renewing = $("contract-renew-filter")?.value || "";
  const cat      = $("contract-cat-filter")?.value   || "";
  try {
    const url = `/api/contracts?${renewing ? `renewing=${renewing}&` : ""}${cat ? `status=active&` : ""}`;
    let contracts = await apiCall(url);
    if (cat) contracts = contracts.filter(c => c.category === cat);
    if (!contracts.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucun contrat enregistré.</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Valeur annuelle</th><th>Renouvellement</th><th>Potentiel négo.</th><th>Économies</th><th>Statut</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      contracts.map(c => {
        const urgCls = c.urgency === "critical" ? "badge-expired" : c.urgency === "warning" ? "badge-expiring" : "badge-active";
        const daysLbl = c.days_to_renewal != null ? (c.days_to_renewal <= 0 ? "Expiré" : `${c.days_to_renewal}j`) : c.renewal_date || "—";
        const stLbl = { active:"Actif", expired:"Expiré", cancelled:"Annulé", under_negotiation:"En négociation" };
        return `<tr>
          <td><strong>${esc(c.vendor)}</strong>${c.description ? `<br><span class="sa-meta">${esc(c.description)}</span>` : ""}</td>
          <td>${esc(c.category||"—")}</td>
          <td>${_fmt(c.annual_value)} ${c.currency}</td>
          <td><span class="badge ${urgCls}">${daysLbl}</span></td>
          <td>${c.negotiation_potential||0}%</td>
          <td style="color:#15803d;font-weight:700">${_fmt(c.potential_savings)} $</td>
          <td><span class="badge ${c.status==="active"?"badge-active":"badge-idle"}">${stLbl[c.status]||c.status}</span></td>
          <td>${esc((c.department)||"—")}</td>
          <td><button class="btn-icon" onclick="editContract('${c.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteContract('${c.id}')">✕</button></td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted">${e.message}</p>`; }
}

function openContractModal(c = null) {
  $("cm-id").value = c?.id || "";
  $("cm-vendor").value   = c?.vendor        || "";
  $("cm-cat").value      = c?.category      || "other";
  $("cm-desc").value     = c?.description   || "";
  $("cm-value").value    = c?.annual_value  || 0;
  $("cm-currency").value = c?.currency      || "CAD";
  $("cm-start").value    = c?.start_date    || "";
  $("cm-end").value      = c?.end_date      || "";
  $("cm-renewal").value  = c?.renewal_date  || "";
  $("cm-negot").value    = c?.negotiation_potential || 0;
  $("cm-status").value   = c?.status        || "active";
  $("cm-autorenew").checked = c?.auto_renew || false;
  $("cm-notes").value    = c?.notes         || "";
  $("cm-dept").value     = c?.department_id || "";
  $("cm-error").classList.add("hidden");
  $("contract-modal").classList.remove("hidden");
}
async function editContract(id) {
  try { const all = await apiCall("/api/contracts"); const c = all.find(x => x.id === id); if (c) openContractModal(c); } catch(_) { openContractModal({id}); }
}
async function deleteContract(id) {
  if (!confirm("Supprimer ce contrat ?")) return;
  try { await apiCall(`/api/contracts/${id}`, "DELETE"); loadContracts(); } catch(e) { alert(e.message); }
}

document.addEventListener("DOMContentLoaded", () => {
  $("contract-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("cm-id").value;
    const body = { vendor:$("cm-vendor").value, category:$("cm-cat").value, description:$("cm-desc").value||null,
      annual_value:+$("cm-value").value, currency:$("cm-currency").value,
      start_date:$("cm-start").value||null, end_date:$("cm-end").value||null, renewal_date:$("cm-renewal").value||null,
      negotiation_potential:+$("cm-negot").value, status:$("cm-status").value,
      auto_renew:$("cm-autorenew").checked, department_id:$("cm-dept").value||null, notes:$("cm-notes").value||null };
    try {
      if (id) await apiCall(`/api/contracts/${id}`, "PATCH", body);
      else    await apiCall("/api/contracts", "POST", body);
      closeParcModal("contract-modal"); loadContracts();
    } catch(ex) { const err=$("cm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });
});

// ── Processus RH ─────────────────────────────────────────────────────────────
async function loadProcesses() {
  const wrap = $("processes-table-wrap");
  try {
    const procs = await apiCall("/api/workforce");
    if (!procs.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucun processus enregistré.</p>`; return; }
    const totalSavings = procs.reduce((s, p) => s + (p.annual_savings_potential||0), 0);
    wrap.innerHTML = `<div style="padding:12px 0 16px;font-size:.85rem;color:var(--navy-light)">Total économies potentielles : <strong style="color:#15803d">${_fmt(totalSavings)} $/an</strong> · ${procs.reduce((s,p) => s + (p.automatable_hours_monthly||0), 0).toFixed(0)}h automatisables/mois</div>` +
      `<table class="data-table"><thead><tr><th>Processus</th><th>Équipe</th><th>Heures/mois</th><th>Automation pot.</th><th>H. automatisables</th><th>Coût horaire</th><th>Économies/an</th><th>Statut</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      procs.map(p => {
        const stMap = { manual:"badge-expired", semi_automated:"badge-expiring", automated:"badge-active" };
        const stLbl = { manual:"Manuel", semi_automated:"Semi-auto", automated:"Automatisé" };
        return `<tr>
          <td><strong>${esc(p.name)}</strong>${p.description ? `<br><span class="sa-meta">${esc(p.description)}</span>` : ""}</td>
          <td>${p.team_size}</td>
          <td>${p.manual_hours_per_month}h</td>
          <td style="color:${p.automation_potential>=60?"#15803d":"#d97706"};font-weight:700">${p.automation_potential}%</td>
          <td>${p.automatable_hours_monthly}h</td>
          <td>${_fmt(p.hourly_cost)} $</td>
          <td style="color:#15803d;font-weight:700">${_fmt(p.annual_savings_potential)} $</td>
          <td><span class="badge ${stMap[p.status]||"badge-idle"}">${stLbl[p.status]||p.status}</span></td>
          <td>${esc((p.department)||"—")}</td>
          <td><button class="btn-icon" onclick="editProcess('${p.id}')">✎</button> <button class="btn-icon btn-deactivate" onclick="deleteProcess('${p.id}')">✕</button></td>
        </tr>`;
      }).join("") + `</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p class="muted">${e.message}</p>`; }
}

function openProcessModal(p = null) {
  $("pm-id").value = p?.id || "";
  $("pm-name").value   = p?.name                   || "";
  $("pm-desc").value   = p?.description             || "";
  $("pm-team").value   = p?.team_size               || 1;
  $("pm-hours").value  = p?.manual_hours_per_month  || 0;
  $("pm-auto").value   = p?.automation_potential    || 0;
  $("pm-hourly").value = p?.hourly_cost             || 50;
  $("pm-status").value = p?.status                  || "manual";
  $("pm-dept").value   = p?.department_id           || "";
  $("pm-notes").value  = p?.notes                   || "";
  $("pm-error").classList.add("hidden");
  $("process-modal").classList.remove("hidden");
}
async function editProcess(id) {
  try { const all = await apiCall("/api/workforce"); const p = all.find(x => x.id === id); if (p) openProcessModal(p); } catch(_) { openProcessModal({id}); }
}
async function deleteProcess(id) {
  if (!confirm("Supprimer ce processus ?")) return;
  try { await apiCall(`/api/workforce/${id}`, "DELETE"); loadProcesses(); } catch(e) { alert(e.message); }
}

document.addEventListener("DOMContentLoaded", () => {
  $("process-modal-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("pm-id").value;
    const body = { name:$("pm-name").value, description:$("pm-desc").value||null,
      team_size:+$("pm-team").value, manual_hours_per_month:+$("pm-hours").value,
      automation_potential:+$("pm-auto").value, hourly_cost:+$("pm-hourly").value,
      status:$("pm-status").value, department_id:$("pm-dept").value||null, notes:$("pm-notes").value||null };
    try {
      if (id) await apiCall(`/api/workforce/${id}`, "PATCH", body);
      else    await apiCall("/api/workforce", "POST", body);
      closeParcModal("process-modal"); loadProcesses();
    } catch(ex) { const err=$("pm-error"); err.textContent=ex.message||"Erreur"; err.classList.remove("hidden"); }
  });
});

// ── Tableau de bord département (Phase 12) ────────────────────────────────────
async function loadDeptDashboard() {
  const section = $("dept-dashboard-section");
  const grid    = $("dept-kpi-grid");
  if (!section || !grid) return;

  try {
    const d = await apiCall("/api/departments/dashboard");
    if (!d || !d.kpis || d.kpis.length === 0) {
      // Pas de département assigné → invite à en créer un
      const icon  = $("dept-dash-icon");  if (icon)  icon.textContent = "📋";
      const label = $("dept-dash-label"); if (label) label.textContent = "Tableau de bord";
      const name  = $("dept-dash-name");  if (name)  name.textContent = "";
      const cta   = $("dept-dash-cta");
      if (cta) { cta.textContent = "Créer des départements"; cta.onclick = () => { switchTab("team"); }; }
      grid.innerHTML = `<div style="grid-column:1/-1;padding:12px 0;color:var(--slate);font-size:.85rem">
        Aucun département configuré. Allez dans <strong>Équipe → Départements</strong> pour en créer ou initialiser par secteur.
      </div>`;
      section.classList.remove("hidden");
      return;
    }

    // Header
    const icon  = $("dept-dash-icon");
    const label = $("dept-dash-label");
    const name  = $("dept-dash-name");
    const cta   = $("dept-dash-cta");

    if (icon)  icon.textContent  = d.icon  || "📊";
    if (label) label.textContent = d.label || "Mon département";
    if (name)  name.textContent  = d.dept_name || "";

    // CTA button — navigate to the recommended tab
    if (cta && d.primary_tab) {
      cta.onclick = () => {
        switchTab(d.primary_tab);
        if (d.primary_subtab) {
          setTimeout(() => {
            const parcMap  = { budget:"budget", licenses:"licenses", servers:"servers", apps:"apps", overview:"overview" };
            const optimMap = { dashboard:"dashboard", licenses:"licenses", duplicates:"duplicates", contracts:"contracts", processes:"processes", aiplan:"aiplan" };
            if (parcMap[d.primary_subtab])  switchParcTab(d.primary_subtab);
            if (optimMap[d.primary_subtab]) switchOptimTab(d.primary_subtab);
          }, 150);
        }
      };
    }

    // KPI cards
    grid.innerHTML = d.kpis.map(k => `
      <div class="dept-kpi-card" style="border-top:3px solid ${k.color || "#818CF8"}">
        <div class="dept-kpi-icon">${k.icon || "📊"}</div>
        <div class="dept-kpi-val" style="color:${k.color || "#1e293b"}">${esc(k.value)}</div>
        <div class="dept-kpi-label">${esc(k.label)}</div>
        ${k.sub ? `<div class="dept-kpi-sub">${esc(k.sub)}</div>` : ""}
      </div>`).join("");

    // Style header accent
    if (d.color) section.style.setProperty("--dept-color", d.color);

    section.classList.remove("hidden");
  } catch (_) {
    // Silently hide — dashboard is non-critical
    if (section) section.classList.add("hidden");
  }
}

// ── Plan IA ───────────────────────────────────────────────────────────────────
async function runAIAnalysis() {
  const btn = $("optim-analyze-btn");
  const question = $("ai-question")?.value || "Comment réduire nos dépenses IT de 10% sans affecter les opérations ?";
  const resultWrap = $("ai-plan-result");

  // Switch to AI plan tab
  switchOptimTab("aiplan");

  if (btn) { btn.disabled = true; btn.textContent = "Analyse en cours…"; }
  if (resultWrap) resultWrap.innerHTML = `<div style="padding:40px;text-align:center"><div class="spinner" style="margin:auto"></div><p class="muted" style="margin-top:12px">Analyse de vos données IT…</p></div>`;

  try {
    const lang    = _lang || "fr";
    const orgType = state.orgType || "entreprise";
    const enc     = encodeURIComponent(question);
    const data    = await apiCall(`/api/optimization/analyze?question=${enc}&language=${lang}&org_type=${orgType}`, "POST");
    const a    = data.analysis || {};

    if (resultWrap) resultWrap.innerHTML = `
      <div class="ai-plan-card">
        ${!data.success ? `<p class="badge badge-expiring" style="margin-bottom:12px">Analyse basée sur les règles (IA indisponible)</p>` : ""}
        <div class="ai-plan-summary">${esc(a.summary || "")}</div>
        <div class="ai-plan-total">${_fmt(a.total_potential_savings)} $</div>
        <div class="ai-plan-confidence">Confiance : ${a.confidence||0}%</div>
        <div class="ai-steps">
          ${(a.steps||[]).map(s => `
            <div class="ai-step">
              <div class="ai-step-num">${s.step}</div>
              <div class="ai-step-body">
                <div class="ai-step-action">${esc(s.action||"")}</div>
                <div class="ai-step-meta">
                  <span class="badge ${s.impact==="high"?"impact-high":s.impact==="medium"?"impact-medium":"impact-low"} badge">${s.impact||"—"}</span>
                  &nbsp;${esc(s.timeline||"")}
                  &nbsp;·&nbsp;<span class="ai-step-savings">${_fmt(s.savings||0)} $ économisés</span>
                </div>
              </div>
            </div>`).join("")}
        </div>
        ${a.insights?.length ? `<div class="ai-insights"><ul>${a.insights.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>` : ""}
      </div>`;
  } catch (ex) {
    if (resultWrap) resultWrap.innerHTML = `<p class="muted" style="padding:20px">Erreur : ${esc(ex.message || "Analyse échouée.")}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = T[_lang]["optim.analyze"] || "Analyser avec l'IA"; }
  }
}

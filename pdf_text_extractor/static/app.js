/* ═══════════════════════════════════════════════════════════════════════════
   NexHire Enterprise Assistant — SPA
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  token:    null,
  user:     null,
  tab:      "agent",
  docId:    null,
  deptType: null,
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
    'agent.send':"Envoyer à l'agent",'agent.loading':'L\'agent analyse vos systèmes connectés…',
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
    'parc.tab.licenses':'Licences','parc.tab.servers':'Équipements TI','parc.tab.apps':'Applications',
    'parc.kpi.budget':'Budget utilisé','parc.kpi.lic':'Licences expirant <30j',
    'parc.kpi.srv':'Équipements à décommissionner','parc.kpi.apps':'Applications inutilisées',
    'parc.chart.budget':'Budget par catégorie','parc.chart.forecast':'Prévision 3 mois',
    'parc.all':'Tout','parc.budget.add':'+ Entrée','parc.budget.label':'Libellé',
    'parc.budget.allocated':'Alloué ($)','parc.budget.actual':'Réel ($)',
    'parc.lic.add':'+ Licence','parc.lic.expiring30':'Expirent <30j','parc.lic.expiring90':'Expirent <90j',
    'parc.srv.add':'+ Équipement','parc.srv.active':'Actifs','parc.srv.idle':'Inactifs','parc.srv.decom':'À décommissionner',
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
    'app.tab.marketplace':'Marketplace',
    'settings.webhooks.title':'Notifications Slack / Teams','settings.webhooks.desc':'Envoyez des notifications automatiques sur un canal Slack ou Teams quand un événement survient.',
    'settings.webhooks.slack':'URL Webhook Slack','settings.webhooks.teams':'URL Webhook Teams',
    'settings.webhooks.events':'Événements','settings.webhooks.save':'Enregistrer','settings.webhooks.test':'Envoyer un test','settings.webhooks.delete':'Supprimer',
    'settings.report.title':'Rapport mensuel','settings.report.desc':'Envoyez un rapport mensuel d\'activité par courriel aux admins de l\'organisation.',
    'settings.report.send':'Envoyer le rapport maintenant',
    'land.nav.workspaces':"Espaces de travail",'land.nav.demo':"Démo",'land.nav.contact':"Contact",
    'land.stats.tag':"Cette plateforme ne se contente pas d'analyser vos données. <strong>Elle identifie des opportunités d'économies et d'optimisation mesurables.</strong>",
    'land.stats.s1.lbl':"Économies potentielles identifiées",'land.stats.s2.lbl':"Score d'efficacité organisationnelle",
    'land.stats.s3.lbl':"Systèmes connectés",'land.stats.s4.lbl':"Risques critiques détectés",
    'land.flow.label':"Intelligence Engine",'land.flow.title':"What EIP Sees",
    'land.flow.sub':"EIP ne remplace pas vos systèmes. EIP les comprend.",
    'land.flow.out1':"Économies identifiées",'land.flow.out2':"Recommandations",
    'land.flow.out3':"Détection de risques",'land.flow.out4':"Automatisation",
    'land.exec.label':"Pour les dirigeants",'land.exec.title':"Executive Dashboard",
    'land.exec.sub':"Ce que voit un CEO en ouvrant NexHire EIP chaque matin.",
    'land.exec.kpi1':"Budget Total",'land.exec.kpi2':"Current Spend",
    'land.exec.kpi3':"Potential Savings",'land.exec.kpi4':"Efficiency Score",
    'land.exec.kpi1.sub':"92.6% consommé",'land.exec.kpi2.sub':"vs 44.1M$ an dernier",
    'land.exec.kpi3.sub':"détectés par EIP ✓",'land.exec.kpi4.sub':"+4pts vs mois passé",
    'land.exec.rec.title':"Top Recommendations",
    'land.ws.label':"Intelligence par département",'land.ws.title':"Espaces de travail intelligents",
    'land.ws.sub':"Chaque département dispose de son propre espace IA, alimenté par ses systèmes spécifiques.",
    'land.ws.hr.name':"HR Workspace",'land.ws.hr.1':"Recrutement & onboarding",'land.ws.hr.2':"Paie & avantages",
    'land.ws.hr.3':"Absences & congés",'land.ws.hr.4':"Formation & développement",
    'land.ws.fin.name':"Finance Workspace",'land.ws.fin.1':"Budget & prévisions",'land.ws.fin.2':"Contrats & fournisseurs",
    'land.ws.fin.3':"Dépenses & charges",'land.ws.fin.4':"Rapports financiers",
    'land.ws.it.name':"IT Workspace",'land.ws.it.1':"Actifs & inventaire",'land.ws.it.2':"Licences logicielles",
    'land.ws.it.3':"Tickets & incidents",'land.ws.it.4':"Cybersécurité",
    'land.ws.exec.name':"Executive Workspace",'land.ws.exec.badge':"Pour les dirigeants",
    'land.ws.exec.1':"Performance globale",'land.ws.exec.2':"Économies détectées",
    'land.ws.exec.3':"Risques opérationnels",'land.ws.exec.4':"Prévisions stratégiques",
    'land.uc.label':"Cas d'utilisation",'land.uc.title':"How organizations use EIP",
    'land.uc.sub':"Des questions concrètes. Des réponses en secondes. Depuis tous vos systèmes à la fois.",
    'land.uc.ceo.q':'"Where can we reduce costs by 5%?"','land.uc.cfo.q':'"We pay for Salesforce AND HubSpot. Which to keep?"',
    'land.uc.cio.q':'"Which licenses are underutilized?"','land.uc.hr.q':'"Which teams are at risk of turnover?"',
    'land.int.label':"Intégrations certifiées",'land.int.title':"Connect to your existing systems in minutes",
    'land.int.tag1':"No migration required.",'land.int.tag2':"No infrastructure changes.",'land.int.tag3':"No disruption to your operations.",
    'land.sec.label':"Confiance & conformité",'land.sec.title':"Enterprise Security",
    'land.sec.sub':"Conçu pour les organisations qui ne font aucun compromis sur la sécurité.",
    'land.sec.1.name':"OAuth 2.0",'land.sec.1.desc':"Authentification standard industrie pour tous les connecteurs",
    'land.sec.2.name':"Role-Based Access Control",'land.sec.2.desc':"Permissions granulaires : user, manager, admin, owner",
    'land.sec.3.name':"Immutable Audit Logs",'land.sec.3.desc':"Chaque action tracée avec IP, utilisateur et timestamp",
    'land.sec.4.name':"Encrypted Credentials",'land.sec.4.desc':"Tokens et clés API chiffrés Fernet AES-128 au repos",
    'land.sec.5.name':"Multi-Tenant Architecture",'land.sec.5.desc':"Isolation complète des données par organisation",
    'land.sec.6.name':"Bilingual FR / EN",'land.sec.6.desc':"Interface et réponses disponibles en français et anglais",
    'land.roi.label':"Retour sur investissement",'land.roi.title':"Calculate your ROI",
    'land.roi.sub':"Basé sur les économies moyennes détectées pour une organisation de 200–500 employés.",
    'land.roi.1.lbl':"Investment in EIP",'land.roi.2.lbl':"Annual Cost",
    'land.roi.3.lbl':"Potential Savings",'land.roi.4.lbl':"ROI",
    'land.roi.disclaimer':"* Chiffres à titre illustratif. Les résultats réels varient selon l'organisation.",
    'land.roi.cta':"Commencer l'essai gratuit — 14 jours",
    'land.demo.label':"Démo interactive",'land.demo.title':"Voyez EIP en action",
    'land.demo.sub':"60 secondes pour comprendre comment EIP transforme votre organisation.",
    'land.contact.label':"Parlons de votre projet",'land.contact.title':"Prêt à transformer votre organisation ?",
    'land.contact.sub':"Notre équipe vous contacte sous 24h pour une démonstration personnalisée de NexHire EIP avec vos propres systèmes.",
    'land.contact.b1':"Démo personnalisée avec vos connecteurs",
    'land.contact.b2':"Analyse des économies potentielles pour votre org",
    'land.contact.b3':"Aucun accès à vos données sans votre autorisation",
    'land.contact.b4':"Support bilingue FR / EN · Équipe canadienne",
    'land.contact.f.name':"Prénom & Nom *",'land.contact.f.org':"Organisation *",
    'land.contact.f.email':"Adresse courriel *",'land.contact.f.msg':"Message (optionnel)",
    'land.contact.f.ph.name':"Marie Tremblay",'land.contact.f.ph.org':"Ville de Montréal",
    'land.contact.f.ph.email':"marie@organisation.ca",'land.contact.f.ph.msg':"Décrivez brièvement votre besoin…",
    'land.contact.f.submit':"Demander une démonstration →",
    'land.contact.success.title':"Message envoyé !",'land.contact.success.sub':"Notre équipe vous contacte sous 24 heures.",
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
    'agent.send':'Send to agent','agent.loading':'Agent is analyzing your connected systems…',
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
    'parc.tab.licenses':'Licenses','parc.tab.servers':'IT Equipment','parc.tab.apps':'Applications',
    'parc.kpi.budget':'Budget used','parc.kpi.lic':'Licenses expiring <30d',
    'parc.kpi.srv':'Servers to decommission','parc.kpi.apps':'Unused applications',
    'parc.chart.budget':'Budget by category','parc.chart.forecast':'3-month forecast',
    'parc.all':'All','parc.budget.add':'+ Entry','parc.budget.label':'Label',
    'parc.budget.allocated':'Allocated ($)','parc.budget.actual':'Actual ($)',
    'parc.lic.add':'+ License','parc.lic.expiring30':'Expiring <30d','parc.lic.expiring90':'Expiring <90d',
    'parc.srv.add':'+ Equipment','parc.srv.active':'Active','parc.srv.idle':'Idle','parc.srv.decom':'To decommission',
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
    'app.tab.marketplace':'Marketplace',
    'settings.webhooks.title':'Slack / Teams Notifications','settings.webhooks.desc':'Send automatic notifications to a Slack or Teams channel when an event occurs.',
    'settings.webhooks.slack':'Slack Webhook URL','settings.webhooks.teams':'Teams Webhook URL',
    'settings.webhooks.events':'Events','settings.webhooks.save':'Save','settings.webhooks.test':'Send test','settings.webhooks.delete':'Delete',
    'settings.report.title':'Monthly Report','settings.report.desc':'Send a monthly activity report by email to the organization admins.',
    'settings.report.send':'Send report now',
    'land.nav.workspaces':"Workspaces",'land.nav.demo':"Demo",'land.nav.contact':"Contact",
    'land.stats.tag':"This platform doesn't just analyze your data. <strong>It identifies measurable savings and optimization opportunities.</strong>",
    'land.stats.s1.lbl':"Potential Savings Identified",'land.stats.s2.lbl':"Organizational Efficiency Score",
    'land.stats.s3.lbl':"Connected Systems",'land.stats.s4.lbl':"Critical Risks Detected",
    'land.flow.label':"Intelligence Engine",'land.flow.title':"What EIP Sees",
    'land.flow.sub':"EIP doesn't replace your systems. EIP understands them.",
    'land.flow.out1':"Savings Identified",'land.flow.out2':"Recommendations",
    'land.flow.out3':"Risk Detection",'land.flow.out4':"Automation",
    'land.exec.label':"For executives",'land.exec.title':"Executive Dashboard",
    'land.exec.sub':"What a CEO sees when opening NexHire EIP each morning.",
    'land.exec.kpi1':"Total Budget",'land.exec.kpi2':"Current Spend",
    'land.exec.kpi3':"Potential Savings",'land.exec.kpi4':"Efficiency Score",
    'land.exec.kpi1.sub':"92.6% consumed",'land.exec.kpi2.sub':"vs $44.1M last year",
    'land.exec.kpi3.sub':"detected by EIP ✓",'land.exec.kpi4.sub':"+4pts vs last month",
    'land.exec.rec.title':"Top Recommendations",
    'land.ws.label':"Department Intelligence",'land.ws.title':"Intelligent Workspaces",
    'land.ws.sub':"Each department has its own AI workspace, powered by its specific systems.",
    'land.ws.hr.name':"HR Workspace",'land.ws.hr.1':"Recruitment & onboarding",'land.ws.hr.2':"Payroll & benefits",
    'land.ws.hr.3':"Leave & absences",'land.ws.hr.4':"Training & development",
    'land.ws.fin.name':"Finance Workspace",'land.ws.fin.1':"Budget & forecasting",'land.ws.fin.2':"Contracts & vendors",
    'land.ws.fin.3':"Expenses & costs",'land.ws.fin.4':"Financial reports",
    'land.ws.it.name':"IT Workspace",'land.ws.it.1':"Assets & inventory",'land.ws.it.2':"Software licenses",
    'land.ws.it.3':"Tickets & incidents",'land.ws.it.4':"Cybersecurity",
    'land.ws.exec.name':"Executive Workspace",'land.ws.exec.badge':"For executives",
    'land.ws.exec.1':"Global performance",'land.ws.exec.2':"Savings detected",
    'land.ws.exec.3':"Operational risks",'land.ws.exec.4':"Strategic forecasts",
    'land.uc.label':"Use cases",'land.uc.title':"How organizations use EIP",
    'land.uc.sub':"Concrete questions. Answers in seconds. From all your systems at once.",
    'land.uc.ceo.q':'"Where can we reduce costs by 5%?"','land.uc.cfo.q':'"We pay for Salesforce AND HubSpot. Which to keep?"',
    'land.uc.cio.q':'"Which licenses are underutilized?"','land.uc.hr.q':'"Which teams are at risk of turnover?"',
    'land.int.label':"Certified integrations",'land.int.title':"Connect to your existing systems in minutes",
    'land.int.tag1':"No migration required.",'land.int.tag2':"No infrastructure changes.",'land.int.tag3':"No disruption to your operations.",
    'land.sec.label':"Trust & compliance",'land.sec.title':"Enterprise Security",
    'land.sec.sub':"Designed for organizations that make no compromises on security.",
    'land.sec.1.name':"OAuth 2.0",'land.sec.1.desc':"Industry-standard authentication for all connectors",
    'land.sec.2.name':"Role-Based Access Control",'land.sec.2.desc':"Granular permissions: user, manager, admin, owner",
    'land.sec.3.name':"Immutable Audit Logs",'land.sec.3.desc':"Every action tracked with IP, user and timestamp",
    'land.sec.4.name':"Encrypted Credentials",'land.sec.4.desc':"Tokens and API keys Fernet AES-128 encrypted at rest",
    'land.sec.5.name':"Multi-Tenant Architecture",'land.sec.5.desc':"Complete data isolation per organization",
    'land.sec.6.name':"Bilingual FR / EN",'land.sec.6.desc':"Interface and responses available in French and English",
    'land.roi.label':"Return on investment",'land.roi.title':"Calculate your ROI",
    'land.roi.sub':"Based on average savings detected for an organization of 200–500 employees.",
    'land.roi.1.lbl':"Investment in EIP",'land.roi.2.lbl':"Annual Cost",
    'land.roi.3.lbl':"Potential Savings",'land.roi.4.lbl':"ROI",
    'land.roi.disclaimer':"* Illustrative figures. Actual results vary by organization.",
    'land.roi.cta':"Start free trial — 14 days",
    'land.demo.label':"Interactive demo",'land.demo.title':"See EIP in action",
    'land.demo.sub':"60 seconds to understand how EIP transforms your organization.",
    'land.contact.label':"Let's talk about your project",'land.contact.title':"Ready to transform your organization?",
    'land.contact.sub':"Our team will contact you within 24h for a personalized demo of NexHire EIP with your own systems.",
    'land.contact.b1':"Personalized demo with your connectors",
    'land.contact.b2':"Potential savings analysis for your org",
    'land.contact.b3':"No access to your data without your authorization",
    'land.contact.b4':"Bilingual support FR / EN · Canadian team",
    'land.contact.f.name':"First & Last Name *",'land.contact.f.org':"Organization *",
    'land.contact.f.email':"Email address *",'land.contact.f.msg':"Message (optional)",
    'land.contact.f.ph.name':"John Smith",'land.contact.f.ph.org':"City of Montreal",
    'land.contact.f.ph.email':"john@organization.ca",'land.contact.f.ph.msg':"Briefly describe your need…",
    'land.contact.f.submit':"Request a demonstration →",
    'land.contact.success.title':"Message sent!",'land.contact.success.sub':"Our team will contact you within 24 hours.",
  },
  es: {
    'nav.features':'Funcionalidades','nav.pricing':'Precios','nav.connectors':'Conectores',
    'nav.login':'Iniciar sesión','nav.trial':'Prueba gratuita 14 días',
    'hero.eyebrow':'Inteligencia artificial · Bilingüe FR/EN',
    'hero.title':'Un asistente IA para <em>todos</em> tus sistemas',
    'hero.sub':'Nexhire conecta tus herramientas — Microsoft 365, Salesforce, Jira, ServiceNow, SAP, Workday — en un único agente conversacional inteligente para tus equipos.',
    'hero.cta':'Empezar prueba gratuita','hero.login':'Iniciar sesión',
    'hero.trust1':'14 días gratis','hero.trust2':'Sin tarjeta requerida','hero.trust3':'Bilingüe FR / EN',
    'hero.demo.q':'¿Incidentes críticos + correos no leídos + presupuesto?',
    'hero.demo.a1':'3 incidentes críticos abiertos','hero.demo.a2':'2 correos prioritarios',
    'hero.demo.a3':'Presupuesto junio 2026 — 93,7% consumido',
    'strip.label':'Conectores disponibles',
    'feat.label':'Por qué Nexhire','feat.title':'Todo lo que su organización necesita',
    'feat.sub':'Un agente de IA que consulta todos sus sistemas en tiempo real y responde en francés o inglés.',
    'feat1.title':'6 conectores integrados','feat1.desc':'Microsoft 365, Salesforce, Jira, ServiceNow, SAP y Workday — conectados en pocos clics via OAuth seguro.',
    'feat2.title':'Agente IA conversacional','feat2.desc':'Haga preguntas en lenguaje natural. El agente consulta los sistemas correctos automáticamente y sintetiza los resultados.',
    'feat3.title':'Seguridad empresarial','feat3.desc':'Tokens OAuth cifrados Fernet, JWT ES256, registro de auditoría inmutable y control de acceso por rol (RBAC).',
    'feat4.title':'Bilingüe FR / EN','feat4.desc':'Interfaz y respuestas del agente disponibles en francés e inglés, adaptado para organizaciones canadienses.',
    'feat5.title':'Análisis de documentos','feat5.desc':'Suba PDFs — políticas, licitaciones, informes — y haga preguntas directamente sobre su contenido.',
    'feat6.title':'Registro de auditoría completo','feat6.desc':'Cada consulta, conexión y acción se registra con IP, usuario, fuente y resultado — de solo anexar.',
    'price.label':'Precios simples','price.title':'Empieza gratis. Paga cuando estés listo.',
    'price.sub':'14 días de prueba completa incluidos, sin tarjeta de crédito.',
    'price.trial':'14 días de prueba gratuita','price.trial.desc':'— acceso completo a todos los conectores y funcionalidades. Sin tarjeta requerida.',
    'price.monthly':'Mensual','price.monthly.unit':'/mes',
    'price.f1':'9 conectores (M365, Zendesk, Autotask…)','price.f2':'Agente IA — 1.000 consultas / mes',
    'price.f3':'Análisis de documentos PDF ilimitado','price.f4':'Registro de auditoría completo',
    'price.f5':'Soporte por correo prioritario','price.f6':'Bilingüe FR / EN',
    'price.cta':'Empezar prueba','price.monthly.note':'Sin compromiso · Cancela en cualquier momento',
    'price.best':'🏆 Mejor valor — ahorra 198 $','price.annual':'Anual','price.annual.unit':'/año',
    'price.annual.saving':'Equivale a 82,50 $ / mes — ahorra 2 meses gratis',
    'price.annual.f1':'Todo el plan Mensual incluido','price.annual.f2':'Agente IA — 12.000 consultas / año',
    'price.annual.f3':'Acceso prioritario a nuevos conectores','price.annual.f4':'Informe de uso mensual',
    'price.annual.f5':'Soporte telefónico dedicado','price.annual.f6':'Onboarding personalizado',
    'price.annual.note':'Facturado anualmente · Cancela en cualquier momento',
    'footer.desc':'Un asistente IA empresarial para organizaciones canadienses — bilingüe, seguro, multi-conector.',
    'footer.product':'Producto','footer.support':'Soporte','footer.legal':'Legal',
    'footer.features':'Funcionalidades','footer.connectors':'Conectores','footer.pricing':'Precios',
    'footer.docs':'Documentación','footer.help':'Centro de ayuda','footer.contact':'Contacto',
    'footer.terms':'Términos de uso','footer.privacy':'Política de privacidad','footer.security':'Seguridad',
    'footer.copyright':'© 2026 Nexhire Inc. Todos los derechos reservados.','footer.tagline':'Diseñado para organizaciones canadienses 🍁',
    'auth.back':'← Volver al inicio','auth.login.title':'Iniciar sesión','auth.login.sub':'Accede a tu espacio Nexhire.',
    'auth.email':'Correo electrónico','auth.email.ph':'tu@organizacion.ca','auth.password':'Contraseña',
    'auth.login.btn':'Iniciar sesión','auth.login.switch':'¿Aún no tienes cuenta?','auth.login.switch.link':'Prueba gratuita 14 días',
    'auth.signup.title':'Crear cuenta','auth.signup.sub':'14 días de prueba gratuita — sin tarjeta requerida.',
    'auth.org':'Nombre de la organización','auth.fname':'Nombre','auth.lname':'Apellido',
    'auth.password.new':'Contraseña (mín. 8 caracteres)','auth.signup.btn':'Crear mi cuenta gratuita',
    'auth.signup.switch':'¿Ya tienes cuenta?','auth.signup.switch.link':'Iniciar sesión',
    'app.trial':'Tu prueba gratuita termina pronto.','app.trial.cta':'Pasar a Premium — 99 $/mes',
    'app.tab.agent':'Asistente IA','app.tab.connectors':'Conectores','app.tab.documents':'Documentos','app.tab.audit':'Auditoría','app.tab.settings':'Configuración',
    'app.tab.stats':'Estadísticas','app.tab.team':'Equipo','app.tab.parc':'Activos TI','app.tab.optim':'Optimización IA','app.tab.marketplace':'Marketplace',
    'app.logout':'Cerrar sesión','app.notif.title':'Notificaciones',
    'agent.title':'Haz tu pregunta','agent.mode.ent':'Empresa','agent.mode.mun':'Municipal / Organismo','agent.mode.rec':'Reclutamiento',
    'agent.chip1':'Incidentes + proyectos + presupuesto','agent.chip2':'Correos no leídos','agent.chip3':'Contratos a renovar','agent.chip4':'Plantilla RRHH','agent.chip5':'Presupuesto del mes',
    'agent.placeholder':'Ej.: Muéstrame los incidentes críticos y los correos no leídos relacionados con la interrupción de esta mañana.',
    'agent.send':'Enviar al agente','agent.loading':'El agente analiza tus sistemas conectados…',
    'conn.title':'Conectores empresariales','conn.refresh':'↻ Actualizar',
    'conn.desc':'Conecta tus sistemas para que el agente pueda consultarlos en tiempo real. Los tokens OAuth se cifran (Fernet) antes de almacenarse.',
    'docs.title':'Análisis de documentos PDF','docs.upload.title':'Subir un PDF','docs.upload.label':'Elegir un archivo PDF',
    'docs.upload.btn':'Extraer texto','docs.summary.title':'Resumen IA','docs.summary.btn':'Generar resumen',
    'docs.summary.empty':'Sube un PDF para activar el resumen.','docs.chat.title':'Chat sobre el documento',
    'docs.chat.placeholder':'Ej.: ¿Cuál es el proceso de compras?','docs.chat.send':'Enviar',
    'docs.chat.init':'Haz una pregunta después de subir el archivo. Ask in French or English.',
    'docs.preview.title':'Vista previa del texto extraído','docs.preview.empty':'Ningún documento subido.',
    'audit.title':'Registro de auditoría','audit.refresh':'↻ Actualizar',
    'export.label':'Descargar este informe:',
    'rating.label':'¿Esta respuesta te fue útil?','rating.thanks':'¡Gracias por tu opinión!',
    'stats.title':'Estadísticas de uso',
    'stats.queries':'Consultas','stats.score':'Satisfacción media','stats.rated':'Respuestas valoradas','stats.util':'Usuarios activos',
    'stats.chart.daily':'Actividad diaria','stats.chart.connectors':'Conectores usados','stats.chart.sat':'Distribución de satisfacción',
    'team.title':'Gestión del equipo','team.invite.btn':'+ Invitar miembro',
    'team.desc':'Los miembros invitados se unen a tu organización y comparten la cuota mensual de consultas.',
    'team.pending':'Invitaciones pendientes',
    'team.invite.title':'Invitar un miembro','team.invite.desc':'Se generará un enlace de invitación válido por 7 días.',
    'team.invite.role':'Rol','team.role.user':'Usuario','team.role.manager':'Manager','team.role.admin':'Admin',
    'team.invite.generate':'Generar enlace','team.invite.ready':'Enlace listo — cópialo y compártelo:',
    'team.invite.copy':'Copiar','team.invite.copied':'¡Enlace copiado!',
    'auth.invite.joining':'Te unes a esta organización como',
    'settings.title':'Configuración',
    'settings.profile.title':'Información de cuenta',
    'settings.fullname':'Nombre completo','settings.email.label':'Correo electrónico',
    'settings.org':'Organización','settings.member.since':'Miembro desde',
    'settings.save':'Guardar','settings.saved':'Perfil actualizado.',
    'settings.password.title':'Seguridad',
    'settings.pwd.current':'Contraseña actual','settings.pwd.new':'Nueva contraseña',
    'settings.pwd.confirm':'Confirmar nueva contraseña',
    'settings.pwd.btn':'Cambiar contraseña','settings.pwd.success':'Contraseña cambiada con éxito.',
    'settings.pwd.mismatch':'Las dos contraseñas no coinciden.',
    'settings.sso.title':'Autenticación SSO',
    'settings.sso.inactive':'SSO no configurado','settings.sso.active':'SSO activo ✓',
    'settings.sso.desc':'El inicio de sesión único (SSO) vía SAML 2.0 u OpenID Connect permite a tu equipo iniciar sesión con las credenciales de tu organización.',
    'settings.sso.cta':'Activar SSO — contactar soporte',
    'settings.sso.active.msg':'SSO activo — tus usuarios inician sesión a través de tu proveedor de identidad.',
    'settings.plan.title':'Suscripción','settings.plan.manage':'Gestionar suscripción',
    'settings.webhooks.title':'Notificaciones Slack / Teams','settings.webhooks.desc':'Envía notificaciones automáticas a un canal Slack o Teams cuando ocurre un evento.',
    'settings.webhooks.slack':'URL Webhook Slack','settings.webhooks.teams':'URL Webhook Teams',
    'settings.webhooks.events':'Eventos','settings.webhooks.save':'Guardar','settings.webhooks.test':'Enviar prueba','settings.webhooks.delete':'Eliminar',
    'settings.report.title':'Informe mensual','settings.report.desc':'Envía un informe mensual de actividad por correo a los admins de la organización.',
    'settings.report.send':'Enviar informe ahora',
    'loading':'Cargando…',
    'app.tab.parc':'Activos TI',
    'parc.title':'Activos TI','parc.dept.all':'Todos los departamentos',
    'parc.tab.overview':'Vista general','parc.tab.budget':'Presupuesto',
    'parc.tab.licenses':'Licencias','parc.tab.servers':'Equipos TI','parc.tab.apps':'Aplicaciones',
    'parc.kpi.budget':'Presupuesto usado','parc.kpi.lic':'Licencias expiran <30d',
    'parc.kpi.srv':'Servidores a decomisionar','parc.kpi.apps':'Aplicaciones sin uso',
    'parc.chart.budget':'Presupuesto por categoría','parc.chart.forecast':'Previsión 3 meses',
    'parc.all':'Todo','parc.budget.add':'+ Entrada','parc.budget.label':'Etiqueta',
    'parc.budget.allocated':'Asignado ($)','parc.budget.actual':'Real ($)',
    'parc.lic.add':'+ Licencia','parc.lic.expiring30':'Expiran <30d','parc.lic.expiring90':'Expiran <90d',
    'parc.srv.add':'+ Equipo','parc.srv.active':'Activos','parc.srv.idle':'Inactivos','parc.srv.decom':'A decomisionar',
    'parc.app.add':'+ Aplicación','parc.app.active':'Activas','parc.app.unused':'Sin uso','parc.app.decom':'Decomisionadas',
    'sa.title':'Cuentas de servicio','sa.add':'+ Crear','sa.name':'Nombre','sa.role':'Rol',
    'sa.desc':'Tokens de larga duración no vinculados a una cuenta de usuario.',
    'dept.title':'Departamentos','dept.add':'+ Departamento','dept.name':'Nombre','dept.budget':'Presupuesto anual ($)',
    'app.tab.optim':'Optimización IA',
    'optim.title':'Optimización IA','optim.analyze':'Analizar con IA',
    'optim.tab.dashboard':'Panel','optim.tab.licenses':'Licencias sin uso',
    'optim.tab.duplicates':'Herramientas duplicadas','optim.tab.contracts':'Contratos',
    'optim.tab.processes':'Procesos RRHH','optim.tab.aiplan':'Plan IA',
    'optim.score.title':'Puntuación de eficiencia organizacional',
    'optim.score.sw':'Software','optim.score.lic':'Licencias',
    'optim.score.infra':'Infraestructura','optim.score.proc':'Procesos',
    'optim.savings.title':'Ahorros identificados',
    'optim.top':'10 mejores oportunidades',
    'optim.lic.desc':'Licencias con uso < 80% — ahorros inmediatos posibles.',
    'optim.dup.desc':'Categorías de herramientas duplicadas — consolidación recomendada.',
    'optim.contract.add':'+ Contrato',
    'optim.proc.desc':'Procesos manuales y su potencial de automatización.',
    'optim.proc.add':'+ Proceso',
    'optim.aiplan.hint':'Haz una pregunta para generar un plan de ahorro personalizado.',
    'land.nav.workspaces':"Espacios de trabajo",'land.nav.demo':"Demo",'land.nav.contact':"Contacto",
    'land.stats.tag':"Esta plataforma no solo analiza tus datos. <strong>Identifica oportunidades de ahorro y optimización medibles.</strong>",
    'land.stats.s1.lbl':"Ahorros potenciales identificados",'land.stats.s2.lbl':"Puntuación de eficiencia organizacional",
    'land.stats.s3.lbl':"Sistemas conectados",'land.stats.s4.lbl':"Riesgos críticos detectados",
    'land.flow.label':"Motor de inteligencia",'land.flow.title':"What EIP Sees",
    'land.flow.sub':"EIP no reemplaza tus sistemas. EIP los comprende.",
    'land.flow.out1':"Ahorros identificados",'land.flow.out2':"Recomendaciones",
    'land.flow.out3':"Detección de riesgos",'land.flow.out4':"Automatización",
    'land.exec.label':"Para directivos",'land.exec.title':"Panel Ejecutivo",
    'land.exec.sub':"Lo que ve un CEO al abrir NexHire EIP cada mañana.",
    'land.exec.kpi1':"Presupuesto Total",'land.exec.kpi2':"Gasto Actual",
    'land.exec.kpi3':"Ahorros Potenciales",'land.exec.kpi4':"Índice de Eficiencia",
    'land.exec.kpi1.sub':"92.6% consumido",'land.exec.kpi2.sub':"vs 44.1M$ año pasado",
    'land.exec.kpi3.sub':"detectados por EIP ✓",'land.exec.kpi4.sub':"+4pts vs mes pasado",
    'land.exec.rec.title':"Principales Recomendaciones",
    'land.ws.label':"Inteligencia por departamento",'land.ws.title':"Espacios de trabajo inteligentes",
    'land.ws.sub':"Cada departamento tiene su propio espacio de IA, alimentado por sus sistemas específicos.",
    'land.ws.hr.name':"Espacio RRHH",'land.ws.hr.1':"Reclutamiento & incorporación",'land.ws.hr.2':"Nómina & beneficios",
    'land.ws.hr.3':"Ausencias & vacaciones",'land.ws.hr.4':"Formación & desarrollo",
    'land.ws.fin.name':"Espacio Finanzas",'land.ws.fin.1':"Presupuesto & previsiones",'land.ws.fin.2':"Contratos & proveedores",
    'land.ws.fin.3':"Gastos & cargas",'land.ws.fin.4':"Informes financieros",
    'land.ws.it.name':"Espacio TI",'land.ws.it.1':"Activos & inventario",'land.ws.it.2':"Licencias de software",
    'land.ws.it.3':"Tickets & incidentes",'land.ws.it.4':"Ciberseguridad",
    'land.ws.exec.name':"Espacio Dirección",'land.ws.exec.badge':"Para directivos",
    'land.ws.exec.1':"Rendimiento global",'land.ws.exec.2':"Ahorros detectados",
    'land.ws.exec.3':"Riesgos operacionales",'land.ws.exec.4':"Previsiones estratégicas",
    'land.uc.label':"Casos de uso",'land.uc.title':"How organizations use EIP",
    'land.uc.sub':"Preguntas concretas. Respuestas en segundos. Desde todos tus sistemas a la vez.",
    'land.uc.ceo.q':'"¿Dónde podemos reducir costos un 5%?"','land.uc.cfo.q':'"Pagamos Salesforce Y HubSpot. ¿Cuál conservar?"',
    'land.uc.cio.q':'"¿Qué licencias están infrautilizadas?"','land.uc.hr.q':'"¿Qué equipos están en riesgo de rotación?"',
    'land.int.label':"Integraciones certificadas",'land.int.title':"Conecta con tus sistemas existentes en minutos",
    'land.int.tag1':"Sin migración requerida.",'land.int.tag2':"Sin cambios de infraestructura.",'land.int.tag3':"Sin interrupción de operaciones.",
    'land.sec.label':"Confianza y cumplimiento",'land.sec.title':"Seguridad Empresarial",
    'land.sec.sub':"Diseñado para organizaciones que no hacen concesiones en seguridad.",
    'land.sec.1.name':"OAuth 2.0",'land.sec.1.desc':"Autenticación estándar de la industria para todos los conectores",
    'land.sec.2.name':"Control de acceso basado en roles",'land.sec.2.desc':"Permisos granulares: usuario, manager, admin, propietario",
    'land.sec.3.name':"Registros de auditoría inmutables",'land.sec.3.desc':"Cada acción registrada con IP, usuario y timestamp",
    'land.sec.4.name':"Credenciales cifradas",'land.sec.4.desc':"Tokens y claves API cifrados Fernet AES-128 en reposo",
    'land.sec.5.name':"Arquitectura Multi-Tenant",'land.sec.5.desc':"Aislamiento completo de datos por organización",
    'land.sec.6.name':"Bilingüe FR / EN",'land.sec.6.desc':"Interfaz y respuestas disponibles en francés e inglés",
    'land.roi.label':"Retorno de inversión",'land.roi.title':"Calcula tu ROI",
    'land.roi.sub':"Basado en los ahorros promedio detectados para una organización de 200–500 empleados.",
    'land.roi.1.lbl':"Inversión en EIP",'land.roi.2.lbl':"Costo Anual",
    'land.roi.3.lbl':"Ahorros Potenciales",'land.roi.4.lbl':"ROI",
    'land.roi.disclaimer':"* Cifras ilustrativas. Los resultados reales varían según la organización.",
    'land.roi.cta':"Empezar prueba gratuita — 14 días",
    'land.demo.label':"Demo interactiva",'land.demo.title':"Ve EIP en acción",
    'land.demo.sub':"60 segundos para entender cómo EIP transforma tu organización.",
    'land.contact.label':"Hablemos de tu proyecto",'land.contact.title':"¿Listo para transformar tu organización?",
    'land.contact.sub':"Nuestro equipo te contactará en 24h para una demostración personalizada de NexHire EIP con tus propios sistemas.",
    'land.contact.b1':"Demo personalizada con tus conectores",
    'land.contact.b2':"Análisis de ahorros potenciales para tu org",
    'land.contact.b3':"Sin acceso a tus datos sin tu autorización",
    'land.contact.b4':"Soporte bilingüe FR / EN · Equipo canadiense",
    'land.contact.f.name':"Nombre y Apellido *",'land.contact.f.org':"Organización *",
    'land.contact.f.email':"Correo electrónico *",'land.contact.f.msg':"Mensaje (opcional)",
    'land.contact.f.ph.name':"María García",'land.contact.f.ph.org':"Ciudad de Montreal",
    'land.contact.f.ph.email':"maria@organizacion.ca",'land.contact.f.ph.msg':"Describe brevemente tu necesidad…",
    'land.contact.f.submit':"Solicitar una demostración →",
    'land.contact.success.title':"¡Mensaje enviado!",'land.contact.success.sub':"Nuestro equipo te contactará en 24 horas.",
  },
};

let _lang = localStorage.getItem("nexhire_lang") || "fr";

function setLang(l) {
  _lang = l;
  localStorage.setItem("nexhire_lang", l);
  document.getElementById("html-root").lang = l;
  // Update lang switcher active button
  document.querySelectorAll(".lang-sw-btn").forEach(b => {
    b.classList.toggle("lang-sw-active", b.dataset.lang === l);
  });
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
  setLang(_lang === "fr" ? "en" : _lang === "en" ? "es" : "fr");
  if (state.token) loadActiveTab();
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
      { id: "api_url",  label: "URL de l'API SAP *", placeholder: "https://<host>:<port>/sap/opu/odata/sap/" },
      { id: "username", label: "Utilisateur SAP *",  placeholder: "sapuser" },
      { id: "password", label: "Mot de passe SAP *", placeholder: "••••••••", type: "password" },
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
      { id: "username",             label: "Nom d'utilisateur *",       placeholder: "user@domain.com" },
      { id: "api_key",              label: "Clé API secrète *",         placeholder: "••••••••",  type: "password" },
      { id: "api_integration_code", label: "Code d'intégration API *",  placeholder: "Code généré dans Admin > API" },
      { id: "zone_url",             label: "Zone URL *",                placeholder: "https://webservices24.autotask.net" },
    ],
  },

  // ── Collaboration ──────────────────────────────────────────────────────────
  google_workspace: {
    label: "Google Workspace", icon: "G", color: "#4285f4", method: "oauth",
    desc: "Gmail, Google Drive, Agenda, Meet, Google Docs — alternative à Microsoft 365",
    help_url: "https://console.cloud.google.com/",
    help_label: "Google Cloud Console",
  },
  slack: {
    label: "Slack", icon: "SL", color: "#4a154b", method: "oauth",
    desc: "Messages, canaux, fichiers partagés, alertes d'équipe",
    help_url: "https://api.slack.com/apps",
    help_label: "Slack Apps Dashboard",
  },

  // ── Ressources Humaines ───────────────────────────────────────────────────
  bamboohr: {
    label: "BambooHR", icon: "BH", color: "#73c41d", method: "apikey",
    desc: "Effectifs, congés, onboarding, évaluations de performance, roulement",
    help_url: "https://documentation.bamboohr.com/docs/getting-started",
    help_label: "BambooHR API",
    niche: true,
    niche_label: "Ressources Humaines",
    fields: [
      { id: "subdomain", label: "Sous-domaine BambooHR *", placeholder: "monentreprise" },
      { id: "api_key",   label: "Clé API *",               placeholder: "••••••••", type: "password" },
    ],
  },
  adp: {
    label: "ADP Workforce Now", icon: "AP", color: "#d22630", method: "apikey",
    desc: "Paie, effectifs, avantages sociaux, absences, gestion du temps",
    help_url: "https://developers.adp.com/",
    help_label: "ADP Developer Portal",
    niche: true,
    niche_label: "Ressources Humaines",
    fields: [
      { id: "client_id",     label: "Client ID *",     placeholder: "client_id" },
      { id: "client_secret", label: "Client Secret *", placeholder: "••••••••", type: "password" },
      { id: "org_oid",       label: "Organization OID", placeholder: "G3349XXXXXXXXXXXX" },
    ],
  },

  // ── Gestion de projets ────────────────────────────────────────────────────
  asana: {
    label: "Asana", icon: "AS", color: "#f06a6a", method: "apikey",
    desc: "Tâches, projets, équipes, jalons, rapports d'avancement",
    help_url: "https://app.asana.com/0/my-apps",
    help_label: "Asana My Apps",
    niche: true,
    niche_label: "Gestion de projets",
    fields: [
      { id: "api_key", label: "Personal Access Token *", placeholder: "1/••••••••", type: "password" },
    ],
  },
  monday: {
    label: "Monday.com", icon: "MO", color: "#ff3d57", method: "apikey",
    desc: "Tableaux, éléments, automatisations, suivi de projets et opérations",
    help_url: "https://developer.monday.com/apps/docs/authentication",
    help_label: "Monday Developer",
    niche: true,
    niche_label: "Gestion de projets",
    fields: [
      { id: "api_key", label: "API Token *", placeholder: "eyJhbGciOi…", type: "password" },
    ],
  },
  clickup: {
    label: "ClickUp", icon: "CU", color: "#7b68ee", method: "apikey",
    desc: "Tâches, espaces, objectifs, time tracking, documents",
    help_url: "https://clickup.com/api/developer-portal/authentication/",
    help_label: "ClickUp API",
    niche: true,
    niche_label: "Gestion de projets",
    fields: [
      { id: "api_key", label: "Personal API Token *", placeholder: "pk_••••••••", type: "password" },
    ],
  },

  // ── Finance & Comptabilité ────────────────────────────────────────────────
  quickbooks: {
    label: "QuickBooks Online", icon: "QB", color: "#2ca01c", method: "oauth",
    desc: "Facturation, dépenses, comptes, bilan, rapport P&L, clients",
    help_url: "https://developer.intuit.com/app/developer/appdetail",
    help_label: "Intuit Developer",
    niche: true,
    niche_label: "Finance & Comptabilité",
  },
  netsuite: {
    label: "NetSuite ERP", icon: "NS", color: "#009cde", method: "apikey",
    desc: "Finances, stocks, commandes, fournisseurs, rapports consolidés",
    help_url: "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4636720383.html",
    help_label: "NetSuite REST API",
    niche: true,
    niche_label: "Finance & Comptabilité",
    fields: [
      { id: "account_id",    label: "Account ID *",    placeholder: "1234567" },
      { id: "consumer_key",  label: "Consumer Key *",  placeholder: "••••••••", type: "password" },
      { id: "consumer_secret", label: "Consumer Secret *", placeholder: "••••••••", type: "password" },
      { id: "token_id",      label: "Token ID *",      placeholder: "••••••••", type: "password" },
      { id: "token_secret",  label: "Token Secret *",  placeholder: "••••••••", type: "password" },
    ],
  },
  epicor: {
    label: "Epicor ERP", icon: "EP", color: "#c8102e", method: "apikey",
    desc: "Finance, fabrication, stocks, achats, commandes clients, chaîne d'approvisionnement — ERP de référence pour les PME et ETI industrielles canadiennes",
    help_url: "https://epicor.com/en-ca/resources/",
    help_label: "Epicor API Docs",
    niche: true,
    niche_label: "Finance & Comptabilité",
    fields: [
      { id: "api_url",    label: "URL de l'API *",      placeholder: "https://votreserveur/api/v1/" },
      { id: "username",  label: "Utilisateur *",        placeholder: "epicor_user" },
      { id: "password",  label: "Mot de passe *",       placeholder: "••••••••", type: "password" },
      { id: "api_key",   label: "API Key (optionnel)",  placeholder: "••••••••", type: "password" },
      { id: "company_id", label: "Company ID *",        placeholder: "EPIC06" },
    ],
  },

  // ── IT & Sécurité ─────────────────────────────────────────────────────────
  intune: {
    label: "Microsoft Intune", icon: "IN", color: "#0078d4", method: "apikey",
    desc: "Gestion des appareils, conformité, mises à jour, politiques IT, inventaire",
    help_url: "https://learn.microsoft.com/en-us/mem/intune/developer/intune-graph-apis",
    help_label: "Intune Graph API",
    niche: true,
    niche_label: "IT & Sécurité",
    fields: [
      { id: "tenant_id",     label: "Tenant ID (Azure AD) *", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx" },
      { id: "client_id",     label: "Client ID *",            placeholder: "xxxxxxxx-xxxx-xxxx-xxxx" },
      { id: "client_secret", label: "Client Secret *",        placeholder: "••••••••", type: "password" },
    ],
  },
  crowdstrike: {
    label: "CrowdStrike Falcon", icon: "CS", color: "#e8202a", method: "apikey",
    desc: "Détections de menaces, alertes cybersécurité, appareils à risque, vulnérabilités",
    help_url: "https://falcon.crowdstrike.com/documentation/",
    help_label: "CrowdStrike API Docs",
    niche: true,
    niche_label: "IT & Sécurité",
    fields: [
      { id: "client_id",     label: "Client ID *",     placeholder: "••••••••" },
      { id: "client_secret", label: "Client Secret *", placeholder: "••••••••", type: "password" },
      { id: "base_url",      label: "Base URL",        placeholder: "https://api.crowdstrike.com" },
    ],
  },

  // ── Cloud ─────────────────────────────────────────────────────────────────
  aws: {
    label: "Amazon Web Services", icon: "AW", color: "#ff9900", method: "apikey",
    desc: "Coûts cloud, instances EC2, S3, RDS, Lambda — Cost Explorer + CloudWatch",
    help_url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    help_label: "AWS Access Keys",
    niche: true,
    niche_label: "Cloud",
    fields: [
      { id: "access_key_id",     label: "Access Key ID *",     placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { id: "secret_access_key", label: "Secret Access Key *", placeholder: "••••••••", type: "password" },
      { id: "region",            label: "Région AWS",          placeholder: "ca-central-1" },
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

  // Super-admin tab
  const saBtn = $("superadmin-tab-btn");
  if (saBtn) saBtn.classList.toggle("hidden", !u?.is_superadmin);

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
  _updateWorkspaceBar();
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
  if (!lbl) return;
  if (_lang === "fr")  lbl.textContent = "Switch to English";
  else if (_lang === "en") lbl.textContent = "Cambiar a Español";
  else                 lbl.textContent = "Passer en français";
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
    "agent":       loadDeptDashboard,  // rafraîchit le dashboard département
    "connectors":  loadConnectors,
    "org":         loadExecutiveDashboard,
    "audit":       loadAudit,
    "stats":       loadAnalytics,
    "settings":    loadSettings,
    "team":        loadTeam,
    "parc-it":     loadParcIT,
    "optim":       loadOptimization,
    "marketplace": buildMarketplace,
    "superadmin":  loadSuperAdmin,
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
      question:       q,
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

  const depts = info?.departments || [];
  const deptBadges = depts.length
    ? `<div class="connector-dept-badges">${depts.map(d => `<span class="connector-dept-badge">${esc(d.name)}</span>`).join("")}</div>`
    : isConnected
      ? `<div class="connector-dept-badges"><span class="connector-dept-badge org-wide">🌐 Accès org-wide</span></div>`
      : "";

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
    ${deptBadges}
    <div class="connector-footer">
      <span class="connector-method-tag">${methodBadge}</span>
      ${meta.help_url ? `<a class="connector-help-link" href="${meta.help_url}" target="_blank" rel="noopener">${meta.help_label || "Documentation"} ↗</a>` : ""}
    </div>`;

  const actions = document.createElement("div");
  actions.className = "connector-actions";

  const isAdmin = ["admin","owner"].includes(state.user?.role);
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

  if (isAdmin) {
    const accessBtn = document.createElement("button");
    accessBtn.className = "btn-access-dept";
    accessBtn.textContent = "🔒 Accès département";
    accessBtn.addEventListener("click", () => openConnectorDeptModal(type, meta.label, info?.departments || []));
    actions.appendChild(accessBtn);
  }

  card.appendChild(actions);
  return card;
}

async function openConnectorDeptModal(type, label, currentDepts) {
  let modal = $("connector-dept-modal");
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = "connector-dept-modal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <div class="modal-header">
        <h3>🔒 Accès département — ${esc(label)}</h3>
        <button class="modal-close" onclick="$('connector-dept-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p class="muted" style="font-size:.82rem;margin-bottom:12px">
          Sans restriction : accès <strong>org-wide</strong>.<br>
          Avec départements : accès réservé aux membres listés + admins.
        </p>
        <div id="cdm-dept-list" style="display:flex;flex-wrap:wrap;gap:8px;min-height:36px;margin-bottom:16px">
          <span class="muted" style="font-size:.8rem">Chargement…</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="cdm-dept-select" class="form-control" style="flex:1">
            <option value="">— Ajouter un département —</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="_cdmAdd('${type}')">Ajouter</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  await _cdmRefresh(type, currentDepts);

  try {
    const depts = await apiCall("/api/departments");
    const sel = $("cdm-dept-select");
    if (sel) sel.innerHTML = `<option value="">— Ajouter un département —</option>` +
      depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  } catch (_) {}
}

async function _cdmRefresh(type, depts) {
  const list = $("cdm-dept-list");
  if (!list) return;
  try {
    const assigned = depts || await apiCall(`/api/connectors/${type}/departments`);
    if (!assigned.length) {
      list.innerHTML = `<span class="connector-dept-badge org-wide">🌐 Accès org-wide (aucune restriction)</span>`;
      return;
    }
    list.innerHTML = assigned.map(d => `
      <span class="connector-dept-badge removable">
        ${esc(d.name)}
        <button onclick="_cdmRemove('${type}','${d.id}')" title="Retirer" style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:.9em">✕</button>
      </span>`).join("");
  } catch (_) {}
}

async function _cdmAdd(type) {
  const sel = $("cdm-dept-select");
  if (!sel?.value) return;
  try {
    await apiCall(`/api/connectors/${type}/departments/${sel.value}`, "POST");
    sel.value = "";
    await _cdmRefresh(type, null);
    loadConnectors();
  } catch (e) { alert(e.message); }
}

async function _cdmRemove(type, deptId) {
  try {
    await apiCall(`/api/connectors/${type}/departments/${deptId}`, "DELETE");
    await _cdmRefresh(type, null);
    loadConnectors();
  } catch (e) { alert(e.message); }
}

async function doOAuthStart(type, btn) {
  // ServiceNow et Zendesk nécessitent des credentials per-org avant le OAuth
  if (type === "servicenow") {
    const creds = await _promptSnowCredentials();
    if (!creds) return;
    return _doOAuthStartWithBody(type, btn, creds);
  }
  if (type === "zendesk") {
    const creds = await _promptZendeskCredentials();
    if (!creds) return;
    return _doOAuthStartWithBody(type, btn, creds);
  }
  return _doOAuthStartWithBody(type, btn, {});
}

function _promptSnowCredentials() {
  return new Promise(resolve => {
    let modal = $("snow-cred-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "snow-cred-modal";
      modal.className = "modal-overlay";
      modal.setAttribute("role", "dialog");
      modal.innerHTML = `
        <div class="modal-box" style="max-width:440px">
          <h3 style="margin:0 0 16px;color:var(--navy)">🔧 Connexion ServiceNow</h3>
          <p style="font-size:.85rem;color:var(--slate);margin:0 0 16px">
            ServiceNow utilise votre propre application OAuth. Entrez les credentials que votre client a configurés sur son instance.
          </p>
          <label class="auth-label">
            <span>URL de l'instance *</span>
            <input id="snow-modal-url" type="url" placeholder="https://votreclient.service-now.com" />
          </label>
          <label class="auth-label">
            <span>Client ID *</span>
            <input id="snow-modal-cid" type="text" placeholder="Client ID enregistré dans ServiceNow" />
          </label>
          <label class="auth-label">
            <span>Client Secret *</span>
            <input id="snow-modal-csec" type="password" placeholder="••••••••" />
          </label>
          <p style="font-size:.75rem;color:var(--slate);margin:8px 0 16px">
            URL de callback à configurer dans ServiceNow :<br>
            <code style="background:var(--surface2);padding:2px 6px;border-radius:4px">https://agenthub.nexhire.ca/api/connectors/oauth/callback</code>
          </p>
          <div style="display:flex;gap:8px">
            <button id="snow-modal-ok"  class="btn btn-primary btn-sm">Connecter via OAuth →</button>
            <button id="snow-modal-cancel" class="btn btn-outline btn-sm">Annuler</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.classList.remove("hidden");
    $("snow-modal-url").focus();

    const ok     = $("snow-modal-ok");
    const cancel = $("snow-modal-cancel");
    const cleanup = () => { modal.classList.add("hidden"); ok.onclick = null; cancel.onclick = null; };

    ok.onclick = () => {
      const instance_url    = $("snow-modal-url")?.value.trim();
      const client_id       = $("snow-modal-cid")?.value.trim();
      const client_secret   = $("snow-modal-csec")?.value.trim();
      if (!instance_url || !client_id || !client_secret) {
        alert("Tous les champs sont requis."); return;
      }
      cleanup();
      resolve({ snow_instance_url: instance_url, snow_client_id: client_id, snow_client_secret: client_secret });
    };
    cancel.onclick = () => { cleanup(); resolve(null); };
  });
}

function _promptZendeskCredentials() {
  return new Promise(resolve => {
    let modal = $("zdsk-cred-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "zdsk-cred-modal";
      modal.className = "modal-overlay";
      modal.setAttribute("role", "dialog");
      modal.innerHTML = `
        <div class="modal-box" style="max-width:440px">
          <h3 style="margin:0 0 16px;color:var(--navy)">🔧 Connexion Zendesk</h3>
          <p style="font-size:.85rem;color:var(--slate);margin:0 0 16px">
            Zendesk utilise votre propre application OAuth. Entrez les credentials que votre client a configurés sur son instance.
          </p>
          <label class="auth-label">
            <span>Sous-domaine *</span>
            <input id="zdsk-modal-sub" type="text" placeholder="monentreprise  (de monentreprise.zendesk.com)" />
          </label>
          <label class="auth-label">
            <span>Client ID (Unique identifier) *</span>
            <input id="zdsk-modal-cid" type="text" placeholder="Unique identifier enregistré dans Zendesk" />
          </label>
          <label class="auth-label">
            <span>Client Secret *</span>
            <input id="zdsk-modal-csec" type="password" placeholder="••••••••" />
          </label>
          <p style="font-size:.75rem;color:var(--slate);margin:8px 0 16px">
            URL de callback à configurer dans Zendesk :<br>
            <code style="background:var(--surface2);padding:2px 6px;border-radius:4px">https://agenthub.nexhire.ca/api/connectors/oauth/callback</code>
          </p>
          <div style="display:flex;gap:8px">
            <button id="zdsk-modal-ok" class="btn btn-primary btn-sm">Connecter via OAuth →</button>
            <button id="zdsk-modal-cancel" class="btn btn-outline btn-sm">Annuler</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.classList.remove("hidden");
    $("zdsk-modal-sub").focus();

    const ok     = $("zdsk-modal-ok");
    const cancel = $("zdsk-modal-cancel");
    const cleanup = () => { modal.classList.add("hidden"); ok.onclick = null; cancel.onclick = null; };

    ok.onclick = () => {
      const subdomain     = $("zdsk-modal-sub")?.value.trim();
      const client_id     = $("zdsk-modal-cid")?.value.trim();
      const client_secret = $("zdsk-modal-csec")?.value.trim();
      if (!subdomain || !client_id || !client_secret) {
        alert("Tous les champs sont requis."); return;
      }
      cleanup();
      resolve({ zendesk_subdomain: subdomain, zendesk_client_id: client_id, zendesk_client_secret: client_secret });
    };
    cancel.onclick = () => { cleanup(); resolve(null); };
  });
}

async function _doOAuthStartWithBody(type, btn, body) {
  const origText = btn.textContent;
  btn.disabled = true; btn.textContent = "Redirection OAuth…";
  try {
    const data = await apiCall(`/api/connectors/${type}/oauth/start`, "POST", body);
    window.location.href = data.authorization_url;
  } catch (ex) {
    btn.disabled = false; btn.textContent = origText;
    alert(`Erreur OAuth : ${ex.message}`);
  }
}

// ── Demo Player ───────────────────────────────────────────────────────────

(function initDemoPlayer() {
  const TOTAL = 13;
  const SLIDE_MS = 5000;
  let current = 0;
  let playing = true;
  let timer = null;
  let elapsed = 0;
  let tickInterval = null;

  function getSlides() { return document.querySelectorAll('#demo-stage .demo-slide'); }
  function getDots()   { return document.querySelectorAll('#demo-slide-dots .demo-sdot'); }

  function goTo(idx) {
    const slides = getSlides();
    const dots   = getDots();
    if (!slides.length) return;
    slides[current]?.classList.add('demo-slide-hidden');
    dots[current]?.classList.remove('active');
    current = ((idx % TOTAL) + TOTAL) % TOTAL;
    slides[current]?.classList.remove('demo-slide-hidden');
    dots[current]?.classList.add('active');
    elapsed = 0;
    updateUI();
    if (current === 3) animateSavings();
  }

  function updateUI() {
    const fill = document.getElementById('demo-fill');
    const time = document.getElementById('demo-time');
    if (fill) fill.style.width = ((elapsed / SLIDE_MS) * 100) + '%';
    if (time) {
      const totalSec = current * 5 + Math.floor(elapsed / 1000);
      const m = Math.floor(totalSec / 60), s = totalSec % 60;
      time.textContent = `${m}:${s.toString().padStart(2,'0')} / 1:05`;
    }
  }

  function startTimer() {
    clearInterval(timer);
    clearInterval(tickInterval);
    const startTime = Date.now() - elapsed;
    tickInterval = setInterval(() => {
      elapsed = Date.now() - startTime;
      if (elapsed >= SLIDE_MS) {
        elapsed = 0;
        goTo(current + 1);
        if (!playing) { clearInterval(tickInterval); return; }
        startTimer();
      }
      updateUI();
    }, 50);
  }

  function pause() {
    playing = false;
    clearInterval(timer);
    clearInterval(tickInterval);
    const btn = document.getElementById('demo-play');
    if (btn) btn.textContent = '▶';
  }

  function play() {
    playing = true;
    const btn = document.getElementById('demo-play');
    if (btn) btn.textContent = '⏸';
    startTimer();
  }

  function animateSavings() {
    const el = document.getElementById('demo-kpi-savings');
    if (!el) return;
    const target = 2846217;
    const dur = 1800;
    const start = Date.now();
    const step = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = '$' + Math.floor(eased * target).toLocaleString('en-CA');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('demo-play');
    const prevBtn = document.getElementById('demo-prev');
    const nextBtn = document.getElementById('demo-next');
    const track   = document.querySelector('.demo-progress-track');
    const dots    = getDots();

    if (!playBtn) return;

    playBtn.addEventListener('click', () => playing ? pause() : play());
    prevBtn?.addEventListener('click', () => { goTo(current - 1); if (playing) startTimer(); });
    nextBtn?.addEventListener('click', () => { goTo(current + 1); if (playing) startTimer(); });

    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); if (playing) startTimer(); }));

    track?.addEventListener('click', e => {
      const pct = e.offsetX / track.offsetWidth;
      const idx = Math.floor(pct * TOTAL);
      goTo(idx);
      if (playing) startTimer();
    });

    // Auto-start when player scrolls into view
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !playing) play();
      else if (!entries[0].isIntersecting) pause();
    }, { threshold: 0.3 });
    const player = document.getElementById('demo-player');
    if (player) observer.observe(player);

    play();
  });
})();

// ── Contact form ──────────────────────────────────────────────────────────

async function submitContact(e) {
  e.preventDefault();
  const btn = document.getElementById('cf-btn');
  const err = document.getElementById('cf-error');
  const name    = document.getElementById('cf-name')?.value.trim();
  const company = document.getElementById('cf-company')?.value.trim();
  const email   = document.getElementById('cf-email')?.value.trim();
  const message = document.getElementById('cf-message')?.value.trim();
  if (!name || !company || !email) return;
  btn.disabled = true;
  btn.textContent = 'Envoi en cours…';
  err.classList.add('hidden');
  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, company, email, message }),
    });
    document.getElementById('contact-form-wrap').querySelector('form').classList.add('hidden');
    document.getElementById('contact-success').classList.remove('hidden');
  } catch {
    err.textContent = 'Erreur réseau. Réessayez ou contactez-nous par courriel.';
    err.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Demander une démonstration →';
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
    table.className = "data-table";
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>Connecteur</th><th>Statut</th><th>IP</th><th></th></tr></thead>
      <tbody>${logs.map((l,i) => `<tr style="cursor:pointer" onclick="openAuditDetail(${i})" title="Voir les détails">
        <td>${l.created_at ? new Date(l.created_at).toLocaleString("fr-CA") : "—"}</td>
        <td>${esc(l.action || "—")}</td>
        <td style="font-size:.78rem;color:var(--slate)">${l.user_id ? l.user_id.slice(0,8)+"…" : "—"}</td>
        <td>${esc(l.connector || "—")}</td>
        <td><span class="badge ${l.success !== false ? "badge-active" : "badge-expired"}">${l.success !== false ? "✓ OK" : "✗ Erreur"}</span></td>
        <td style="font-size:.78rem;color:var(--slate)">${esc(l.ip_address || "—")}</td>
        <td style="color:var(--slate);font-size:.8rem">›</td>
      </tr>`).join("")}</tbody>`;
    wrap.innerHTML = ""; wrap.appendChild(table);
    window._auditLogs = logs;
  } catch (ex) {
    wrap.innerHTML = `<p class='error-text' style='padding:20px'>Erreur : ${ex.message}</p>`;
  }
}

function openAuditDetail(idx) {
  const l = (window._auditLogs || [])[idx];
  if (!l) return;
  const row = (label, value) => value
    ? `<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-weight:700;color:var(--slate);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em">${label}</span>
        <span style="word-break:break-all">${value}</span>
       </div>`
    : "";
  let meta = "";
  if (l.metadata && typeof l.metadata === "object") {
    try { meta = JSON.stringify(l.metadata, null, 2); } catch(_) { meta = String(l.metadata); }
  }
  $("audit-detail-body").innerHTML = [
    row("Date",        l.created_at ? new Date(l.created_at).toLocaleString("fr-CA") : null),
    row("Action",      l.action),
    row("Utilisateur", l.user_id),
    row("Email",       l.user_email),
    row("Organisation",l.organization_id),
    row("Connecteur",  l.connector),
    row("Requête",     l.query ? `<em>${esc(l.query)}</em>` : null),
    row("Statut HTTP", l.http_status),
    row("Succès",      l.success !== undefined ? (l.success !== false ? "✓ Oui" : "✗ Non") : null),
    row("Erreur",      l.error_detail ? `<span style="color:#dc2626">${esc(l.error_detail)}</span>` : null),
    row("IP",          l.ip_address),
    row("Source",      l.source),
    row("Ressources",  l.resource_ids?.length ? l.resource_ids.join(", ") : null),
    row("Métadonnées", meta ? `<pre style="font-size:.75rem;background:var(--bg);padding:8px;border-radius:6px;overflow-x:auto;margin:0">${esc(meta)}</pre>` : null),
  ].filter(Boolean).join("");
  $("audit-detail-modal").classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_COLORS = { owner:"#0f172a", admin:"#6366f1", manager:"#0ea5e9", user:"#64748b" };
const ROLE_LABELS_FR = { owner:"Owner", admin:"Admin", manager:"Manager", user:"Utilisateur" };

const HIERARCHY_TITLES = [
  "Direction Générale",
  "Vice-président / Directeur Exécutif",
  "Directeur de Département",
  "Gestionnaire / Chef d'équipe",
  "Superviseur",
  "Employé",
];
const HIERARCHY_COLORS = ["#7c3aed","#2563eb","#0891b2","#16a34a","#d97706","#64748b"];
const HIERARCHY_ICONS  = ["🏛️","🎯","🗂️","👔","🔍","👤"];

async function loadTeam() {
  await Promise.all([_loadMembers(), _loadPendingInvitations()]);
  loadDepartments();
  loadOrgChart();
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

    // Logo & branding
    const isAdmin = ["admin", "owner"].includes(p.role);
    const orgLogoSection = $("org-logo-section");
    if (orgLogoSection && isAdmin) orgLogoSection.classList.remove("hidden");
    if (p.logo_url) {
      if ($("sp-logo-url")) $("sp-logo-url").value = p.logo_url;
      _showLogoPreview(p.logo_url);
      _applyOrgLogo(p.logo_url);
    }
    if (p.brand_color) {
      if ($("sp-brand-color")) { $("sp-brand-color").value = p.brand_color; $("sp-brand-color-val").textContent = p.brand_color; }
    }

    // SSO
    const badge = $("sso-badge");
    const txt   = $("sso-status-text");
    const cta   = $("sso-cta-btn");
    const info  = $("sso-active-info");
    if (p.sso_enabled) {
      badge.classList.replace("inactive", "active");
      txt.textContent = T[_lang]["settings.sso.active"] || "SSO actif ✓";
      cta?.classList.add("hidden");
      info?.classList.remove("hidden");
    } else {
      badge.classList.remove("active"); badge.classList.add("inactive");
      txt.textContent = T[_lang]["settings.sso.inactive"] || "SSO non configuré";
      cta?.classList.remove("hidden");
      info?.classList.add("hidden");
    }

    // Plan
    const planDesc  = $("plan-desc");
    const plans = {
      trialing:  { desc: "14 jours d'accès complet — aucune carte requise." },
      active:    { desc: "Accès complet à tous les connecteurs et fonctionnalités." },
      canceled:  { desc: "Votre abonnement est annulé. Contactez-nous pour le réactiver." },
      cancelled: { desc: "Votre abonnement est annulé. Contactez-nous pour le réactiver." },
      suspended: { desc: "L'accès est suspendu. Contactez le support." },
      past_due:  { desc: "Mettez à jour votre mode de paiement pour continuer." },
    };
    const pl = plans[p.subscription_status] || { desc: "" };
    if (planDesc) planDesc.textContent = pl.desc;

    // SSO config form (admin only)
    await _loadSSOConfig();
  } catch (ex) {
    console.error("Settings load error:", ex.message);
  }
  loadServiceAccounts();
  await _loadBillingStatus();
  await _loadWebhookConfig();
}

async function _loadBillingStatus() {
  try {
    const b = await apiCall("/api/billing/status");
    const subscribeWrap = $("billing-subscribe-wrap");
    const portalBtn     = $("billing-portal-btn");
    const billingBadge  = $("billing-status-badge");

    if (billingBadge) {
      const labels = { active:"Premium actif", trialing:"Essai gratuit", canceled:"Annulé", past_due:"Paiement en retard", cancelled:"Annulé" };
      billingBadge.textContent = labels[b.status] || b.status || "—";
      billingBadge.className = "plan-badge " + (b.status === "active" ? "plan-active" : b.status === "trialing" ? "plan-trial" : "plan-inactive");
    }

    // Affiche les boutons selon l'état
    if (b.status === "active" && b.has_stripe) {
      if (subscribeWrap) subscribeWrap.classList.add("hidden");
      if (portalBtn)     portalBtn.classList.remove("hidden");
    } else if (b.stripe_configured) {
      if (subscribeWrap) subscribeWrap.classList.remove("hidden");
      if (portalBtn && b.has_stripe) portalBtn.classList.remove("hidden");
    } else {
      // Stripe pas encore configuré — affiche lien contact
      if (subscribeWrap) subscribeWrap.innerHTML = `<p class="muted" style="font-size:.82rem">Pour souscrire, contactez-nous à <a href="mailto:contact@nexhire.ca">contact@nexhire.ca</a>.</p>`;
    }
  } catch (_) {}
}

async function subscribeStripe(plan) {
  const btn = $(`stripe-btn-${plan}`);
  if (btn) { btn.disabled = true; btn.textContent = "Redirection…"; }
  try {
    const res = await apiCall("/api/billing/checkout", "POST", { plan });
    window.location.href = res.checkout_url;
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = plan === "monthly" ? "Mensuel — 99 $/mois" : "Annuel — 990 $/an"; }
    alert(e.message || "Erreur Stripe.");
  }
}

async function openBillingPortal() {
  const btn = $("billing-portal-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Ouverture…"; }
  try {
    const res = await apiCall("/api/billing/portal", "POST");
    window.open(res.portal_url, "_blank");
  } catch (e) {
    alert(e.message || "Portail indisponible.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Gérer l'abonnement"; }
  }
}

// ── Webhooks Slack/Teams (admin) ──────────────────────────────────────────────

async function _loadWebhookConfig() {
  const isAdmin = ["admin", "owner"].includes(state.user?.role);
  if (!isAdmin) return;
  try {
    const cfg = await apiCall("/api/webhooks/config");
    const slackInput = $("wh-slack-url");
    const teamsInput = $("wh-teams-url");
    if (slackInput) slackInput.value = cfg.slack_url || "";
    if (teamsInput) teamsInput.value = cfg.teams_url || "";
    const events = cfg.events || [];
    ["member", "license", "budget", "subscription"].forEach(k => {
      const el = $(`wh-ev-${k}`);
      if (el) el.checked = events.includes(el.value);
    });
    const delBtn = $("wh-delete-btn");
    if (delBtn && (cfg.slack_url || cfg.teams_url)) delBtn.classList.remove("hidden");
  } catch (_) {}
}

async function saveWebhookConfig(e) {
  e.preventDefault();
  const msg = $("wh-msg");
  const whIds = ["wh-ev-member","wh-ev-license","wh-ev-budget","wh-ev-subscription"];
  const events = whIds.filter(id => $(`${id}`)?.checked).map(id => $(`${id}`).value);
  try {
    await apiCall("/api/webhooks/config", "POST", {
      slack_url: $("wh-slack-url")?.value || null,
      teams_url: $("wh-teams-url")?.value || null,
      events,
    });
    if (msg) { msg.textContent = "✓ Configuration sauvegardée."; msg.classList.remove("hidden"); }
    const delBtn = $("wh-delete-btn");
    if (delBtn) delBtn.classList.remove("hidden");
    setTimeout(() => msg?.classList.add("hidden"), 3000);
  } catch (err) {
    if (msg) { msg.textContent = err.message || "Erreur."; msg.style.color = "var(--error)"; msg.classList.remove("hidden"); }
  }
}

async function testWebhook() {
  const msg = $("wh-msg");
  try {
    const res = await apiCall("/api/webhooks/test", "POST");
    if (msg) {
      msg.textContent = `✓ Test envoyé sur : ${(res.sent || []).join(", ")}`;
      msg.style.color = "var(--success)";
      msg.classList.remove("hidden");
    }
    setTimeout(() => msg?.classList.add("hidden"), 4000);
  } catch (err) {
    if (msg) { msg.textContent = err.message || "Erreur."; msg.style.color = "var(--error)"; msg.classList.remove("hidden"); }
  }
}

async function deleteWebhookConfig() {
  if (!confirm("Supprimer la configuration webhook ?")) return;
  try {
    await apiCall("/api/webhooks/config", "DELETE");
    ["wh-slack-url","wh-teams-url"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    const delBtn = $("wh-delete-btn");
    if (delBtn) delBtn.classList.add("hidden");
    const msg = $("wh-msg");
    if (msg) { msg.textContent = "Webhook supprimé."; msg.style.color = "var(--slate)"; msg.classList.remove("hidden"); }
    setTimeout(() => $("wh-msg")?.classList.add("hidden"), 3000);
  } catch (err) { alert(err.message); }
}

// ── Rapport mensuel ───────────────────────────────────────────────────────────

async function sendMonthlyReport() {
  const btn = $("report-send-btn");
  const msg = $("report-msg");
  if (btn) { btn.disabled = true; btn.textContent = "Envoi…"; }
  try {
    const res = await apiCall("/api/webhooks/reports/monthly", "POST");
    if (msg) { msg.textContent = `✓ Rapport envoyé à ${res.to}.`; msg.classList.remove("hidden"); }
  } catch (err) {
    if (msg) { msg.textContent = err.message || "Erreur."; msg.style.color = "var(--error)"; msg.classList.remove("hidden"); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Envoyer le rapport maintenant"; }
  }
}

// ── SSO Config (admin) ────────────────────────────────────────────────────────
async function _loadSSOConfig() {
  const isAdmin = ["admin", "owner"].includes(state.user?.role);
  const form = $("sso-config-form");
  if (!form || !isAdmin) return;
  form.classList.remove("hidden");

  try {
    const cfg = await apiCall("/api/sso/config");
    if (cfg.configured) {
      $("sso-provider-select").value = cfg.provider || "microsoft";
      if ($("sso-client-id"))  $("sso-client-id").value   = cfg.client_id  || "";
      if ($("sso-tenant-id"))  $("sso-tenant-id").value   = cfg.tenant_id  || "";
      if ($("sso-client-secret")) $("sso-client-secret").value = "";  // jamais pré-rempli
      const badge = $("sso-badge");
      const txt   = $("sso-status-text");
      if (badge) { badge.classList.replace("inactive", "active"); }
      if (txt)   txt.textContent = "SSO actif ✓";
      if ($("sso-delete-btn")) $("sso-delete-btn").classList.remove("hidden");
    }
    _updateSSOTenantVisibility();
  } catch (_) {}
}

function _updateSSOTenantVisibility() {
  const provider = $("sso-provider-select")?.value;
  const tenantRow = $("sso-tenant-row");
  if (tenantRow) tenantRow.classList.toggle("hidden", provider === "google");
}

$("sso-provider-select")?.addEventListener("change", _updateSSOTenantVisibility);

async function saveSSOConfig(e) {
  e.preventDefault();
  const btn = $("sso-save-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Enregistrement…"; }
  try {
    await apiCall("/api/sso/config", "POST", {
      provider:      $("sso-provider-select")?.value,
      client_id:     $("sso-client-id")?.value?.trim(),
      client_secret: $("sso-client-secret")?.value?.trim(),
      tenant_id:     $("sso-tenant-id")?.value?.trim() || null,
    });
    $("sso-save-success")?.classList.remove("hidden");
    setTimeout(() => $("sso-save-success")?.classList.add("hidden"), 4000);
    await _loadSSOConfig();
  } catch (ex) {
    alert(ex.message || "Erreur lors de la configuration SSO.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Enregistrer"; }
  }
}

async function deleteSSOConfig() {
  if (!confirm("Supprimer la configuration SSO ? Les utilisateurs ne pourront plus se connecter via SSO.")) return;
  try {
    await apiCall("/api/sso/config", "DELETE");
    location.reload();
  } catch (e) { alert(e.message); }
}

// ── Org branding helpers ──────────────────────────────────────────────────────

function _showLogoPreview(url) {
  const preview = $("sp-logo-preview");
  const wrap    = $("sp-logo-preview-wrap");
  if (!preview || !wrap) return;
  if (url) { preview.src = url; wrap.classList.remove("hidden"); }
  else      { wrap.classList.add("hidden"); }
}

function _applyOrgLogo(url) {
  const img = $("org-logo-topnav");
  const sep = $("org-logo-sep");
  if (!img) return;
  if (url) {
    img.src = url;
    img.classList.remove("hidden");
    sep?.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
    sep?.classList.add("hidden");
  }
}

$("sp-logo-url")?.addEventListener("input", e => _showLogoPreview(e.target.value.trim()));
$("sp-brand-color")?.addEventListener("input", e => {
  if ($("sp-brand-color-val")) $("sp-brand-color-val").textContent = e.target.value;
});

async function saveOrgBranding() {
  const btn = $("sp-org-save-btn");
  const suc = $("sp-org-success");
  if (btn) { btn.disabled = true; btn.textContent = "Enregistrement…"; }
  try {
    const logo_url    = $("sp-logo-url")?.value.trim() || null;
    const brand_color = $("sp-brand-color")?.value || null;
    await apiCall("/api/settings/org", "PATCH", { logo_url, brand_color });
    _applyOrgLogo(logo_url || "");
    suc?.classList.remove("hidden");
    setTimeout(() => suc?.classList.add("hidden"), 3000);
  } catch (ex) {
    alert(ex.message || "Erreur lors de la sauvegarde du branding.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Enregistrer le branding"; }
  }
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
  {name:"Epicor ERP",                   vendor:"Epicor",              category:"on-prem",  group:"ERP"},
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
    const _deviceLabel = { server:"🖥 Serveur", switch:"🔀 Switch", router:"📡 Routeur", firewall:"🛡 Pare-feu",
      laptop:"💻 Laptop", desktop:"🖥 Desktop", tablet:"📱 Tablette", phone_mobile:"📞 Tél. mobile", phone_ip:"☎ Tél. IP",
      docking_station:"🔌 Docking", monitor:"🖵 Écran", printer:"🖨 Imprimante", scanner:"🔍 Scanner",
      cable_network:"🌐 Câble réseau", cable_hdmi:"📺 HDMI", cable_vga:"📺 VGA", cable_displayport:"📺 DisplayPort",
      usb_key:"💾 Clé USB", usb_adapter:"🔌 Adapt. USB", charger:"🔋 Chargeur", ups:"⚡ UPS", other:"📦 Autre" };
    if (!srvs.length) { wrap.innerHTML = `<p class="muted" style="padding:20px">Aucun équipement enregistré.</p>`; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Type</th><th>Nom / Hôte</th><th>IP / N° série</th><th>Env.</th><th>OS / Spec</th><th>Emplacement</th><th>Statut</th><th>Coût/mois</th><th>Dép.</th><th></th></tr></thead><tbody>` +
      srvs.map(s => {
        const stMap = { active:"badge-active", idle:"badge-idle", to_decommission:"badge-decom", decommissioned:"badge-expired" };
        const stLbl = { active:"Actif", idle:"Inactif", to_decommission:"À décom.", decommissioned:"Décom." };
        const spec = [s.cpu_cores ? `${s.cpu_cores}c` : null, s.ram_gb ? `${s.ram_gb}Go` : null, s.storage_gb ? `${s.storage_gb}Go` : null].filter(Boolean).join(" / ") || (s.os || "—");
        const deptName = s.department_name || "—";
        const typeLabel = _deviceLabel[s.device_type || "server"] || s.device_type || "Serveur";
        return `<tr class="${s.status==="decommissioned"?"row-inactive":""}">
          <td style="white-space:nowrap;font-size:.82rem">${typeLabel}</td>
          <td><strong>${esc(s.hostname)}</strong></td>
          <td style="font-size:.78rem;color:var(--slate)">${esc(s.ip_address||"—")}</td>
          <td style="font-size:.78rem">${esc(s.environment||"—")}</td>
          <td style="font-size:.78rem">${spec}</td>
          <td>${esc(s.location||"—")}</td>
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
    const body = { device_type:$("sm-device-type").value, hostname:$("sm-hostname").value, ip_address:$("sm-ip").value||null,
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
  $("sm-device-type").value = srv?.device_type || "server";
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
// ── Organigramme ──────────────────────────────────────────────────────────────

async function loadOrgChart() {
  const wrap = $("orgchart-wrap");
  if (!wrap) return;
  wrap.innerHTML = `<p class="muted">Chargement…</p>`;
  try {
    const depts = await apiCall("/api/members/orgchart");
    if (!depts.length) {
      wrap.innerHTML = `<p class="muted">Aucun département configuré.</p>`;
      return;
    }
    const DEPT_ICONS = { finance:"💰",hr:"👥",it:"💻",legal:"⚖️",operations:"⚙️",marketing:"📣",direction:"🏛️",approvisionnement:"📦",general:"🏢" };
    wrap.innerHTML = depts.map(dept => {
      const icon = DEPT_ICONS[dept.dept_type] || "🏢";
      const members = dept.members || [];
      if (!members.length) return `
        <div class="org-dept-block">
          <div class="org-dept-hd">${icon} ${esc(dept.name)} <span class="org-dept-count muted">— aucun membre</span></div>
        </div>`;

      const rows = members.map(m => {
        const lvl   = (m.hierarchy_level || 6) - 1;
        const color = HIERARCHY_COLORS[lvl] || "#64748b";
        const hicon = HIERARCHY_ICONS[lvl] || "👤";
        const initials = (m.full_name || m.email || "?").slice(0,2).toUpperCase();
        const isAdmin = ["admin","owner"].includes(state.user?.role);
        return `
          <div class="org-member-row" style="--lvl:${lvl};--color:${color}">
            <div class="org-member-indent"></div>
            <div class="org-member-av" style="background:${color}22;color:${color}">${initials}</div>
            <div class="org-member-info">
              <span class="org-member-name">${esc(m.full_name || m.email)}</span>
              <span class="org-member-title" style="color:${color}">${hicon} ${esc(m.title)}</span>
            </div>
            ${isAdmin ? `
              <select class="org-title-select" onchange="setMemberTitle('${dept.id}','${m.id}',this.value)"
                      title="Changer le titre">
                ${HIERARCHY_TITLES.map((t,i) => `<option value="${t}" ${t===m.title?"selected":""}>${t}</option>`).join("")}
              </select>` : ""}
          </div>`;
      }).join("");

      return `
        <div class="org-dept-block">
          <div class="org-dept-hd" onclick="this.nextElementSibling.classList.toggle('hidden')">
            ${icon} ${esc(dept.name)}
            <span class="org-dept-count">${members.length} membre${members.length>1?"s":""}</span>
            <span class="org-chevron">▾</span>
          </div>
          <div class="org-members-list">${rows}</div>
        </div>`;
    }).join("");
  } catch(e) {
    wrap.innerHTML = `<p class="muted">Erreur : ${esc(e.message)}</p>`;
  }
}

async function setMemberTitle(deptId, memberId, title) {
  try {
    await apiCall(`/api/departments/${deptId}/members/${memberId}/title`, "PATCH", { title });
  } catch(e) { alert(e.message); }
}

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

// ── Chips de l'agent IA adaptées au type de département ──────────────────────
const _DEPT_CHIPS = {

  // ── Finance ────────────────────────────────────────────────────────────────
  // Comptabilité, trésorerie, budgets, factures, prévisions financières
  finance: [
    { fr: "Quelles factures fournisseurs sont en retard de paiement ?",                en: "Which supplier invoices are overdue?" },
    { fr: "Budget vs réel par département ce trimestre",                               en: "Budget vs actual by department this quarter" },
    { fr: "Quels contrats fournisseurs arrivent à échéance dans 90 jours ?",           en: "Which supplier contracts expire in 90 days?" },
    { fr: "Prévisions de trésorerie pour le prochain trimestre",                       en: "Cash flow forecast for next quarter" },
    { fr: "Quels postes de dépenses dépassent le budget alloué ce mois ?",             en: "Which expense lines exceed the allocated budget this month?" },
  ],

  // ── Ressources humaines ────────────────────────────────────────────────────
  // Recrutement, absences, paie, performance, onboarding, rétention
  hr: [
    { fr: "Quels postes sont vacants et depuis combien de temps ?",                    en: "Which positions are open and for how long?" },
    { fr: "Quelles absences et congés sont prévus cette semaine ?",                    en: "What absences and leaves are scheduled this week?" },
    { fr: "Quelles évaluations de performance sont en attente de complétion ?",        en: "Which performance reviews are pending completion?" },
    { fr: "Quel est le taux de roulement du personnel ces 6 derniers mois ?",          en: "What is the staff turnover rate over the last 6 months?" },
    { fr: "Quels nouveaux employés ont des tâches d'onboarding en retard ?",           en: "Which new employees have overdue onboarding tasks?" },
  ],

  // ── Technologies de l'information ─────────────────────────────────────────
  // Incidents, licences, sécurité, infrastructure, appareils, cloud
  it: [
    { fr: "Quels incidents critiques sont ouverts et non assignés ?",                  en: "Which critical incidents are open and unassigned?" },
    { fr: "Quelles licences logicielles expirent dans les 30 prochains jours ?",       en: "Which software licenses expire in the next 30 days?" },
    { fr: "Quels appareils ne respectent pas les politiques de sécurité IT ?",         en: "Which devices are non-compliant with IT security policies?" },
    { fr: "Quelles alertes de cybersécurité critiques ont été détectées cette semaine ?", en: "What critical cybersecurity alerts were detected this week?" },
    { fr: "Quelles mises à jour critiques sont en attente de déploiement ?",           en: "Which critical updates are pending deployment?" },
  ],

  // ── Opérations ────────────────────────────────────────────────────────────
  // Gestion de projets, livrables, équipes, capacité, processus
  operations: [
    { fr: "Quels projets sont en retard et quels sont les blocages identifiés ?",      en: "Which projects are delayed and what blockers are identified?" },
    { fr: "Quelles tâches critiques n'ont pas encore été assignées cette semaine ?",   en: "Which critical tasks have not been assigned this week?" },
    { fr: "Quels membres de l'équipe sont surchargés ou sous-utilisés ?",              en: "Which team members are overloaded or underutilized?" },
    { fr: "Quels processus opérationnels génèrent le plus de délais récurrents ?",     en: "Which operational processes generate the most recurring delays?" },
    { fr: "Quel est le taux de complétion des livrables du mois en cours ?",           en: "What is the completion rate of deliverables for the current month?" },
  ],

  // ── Marketing & Ventes ────────────────────────────────────────────────────
  // Campagnes, leads, pipeline CRM, opportunités, acquisition client
  marketing: [
    { fr: "Quelle est la performance des campagnes marketing actives ce mois ?",       en: "What is the performance of active marketing campaigns this month?" },
    { fr: "Quels leads entrants cette semaine n'ont pas encore été qualifiés ?",       en: "Which incoming leads this week have not been qualified yet?" },
    { fr: "Quelles opportunités CRM sont sans suivi depuis plus de 7 jours ?",         en: "Which CRM opportunities have had no follow-up in over 7 days?" },
    { fr: "Quel est le pipeline commercial actuel et les opportunités à risque ?",     en: "What is the current sales pipeline and at-risk opportunities?" },
    { fr: "Quel est le coût d'acquisition client ce trimestre vs l'objectif ?",        en: "What is the customer acquisition cost this quarter vs target?" },
  ],

  // ── Direction générale ────────────────────────────────────────────────────
  // Vue consolidée multi-département : finances, RH, IT, projets, risques
  direction: [
    { fr: "Quel est l'état de santé global de l'organisation — risques et alertes ?",  en: "What is the overall health of the organization — risks and alerts?" },
    { fr: "Quelles économies potentielles ont été identifiées ce mois-ci ?",           en: "What potential savings have been identified this month?" },
    { fr: "Performance financière consolidée : budget vs réel par département",        en: "Consolidated financial performance: budget vs actual by department" },
    { fr: "Résumé exécutif : incidents IT + projets en retard + alertes RH",          en: "Executive summary: IT incidents + late projects + HR alerts" },
    { fr: "Quels sont les 3 principaux risques opérationnels à adresser en priorité ?", en: "What are the top 3 operational risks to address as a priority?" },
  ],

  // ── Juridique & Conformité ────────────────────────────────────────────────
  // Contrats, obligations légales, conformité, litiges, NDA, LPRPDE
  legal: [
    { fr: "Quels contrats actifs contiennent des clauses de renouvellement automatique ?", en: "Which active contracts contain auto-renewal clauses?" },
    { fr: "Quelles obligations réglementaires ont une date limite dans les 30 prochains jours ?", en: "Which regulatory obligations have a deadline in the next 30 days?" },
    { fr: "Quels contrats fournisseurs peuvent être renégociés à notre avantage ?",    en: "Which vendor contracts can be renegotiated in our favor?" },
    { fr: "Quels risques juridiques ont été identifiés dans les contrats actifs ?",    en: "What legal risks have been identified in active contracts?" },
    { fr: "Quel est l'état de conformité LPRPDE / RGPD de l'organisation ?",          en: "What is the organization's PIPEDA / GDPR compliance status?" },
  ],

  // ── Approvisionnement ────────────────────────────────────────────────────
  // Fournisseurs, achats, appels d'offres, commandes, coûts d'acquisition
  approvisionnement: [
    { fr: "Quels fournisseurs offrent des services en doublon — consolidation possible ?", en: "Which vendors offer duplicate services — consolidation possible?" },
    { fr: "Quels contrats d'achat ont le plus fort potentiel de renégociation ?",      en: "Which purchase contracts have the highest renegotiation potential?" },
    { fr: "Quelles commandes sont en attente de livraison avec retard ?",              en: "Which orders are pending delivery with delays?" },
    { fr: "Quelles économies ont été réalisées sur les achats ce trimestre ?",         en: "What savings were achieved on purchases this quarter?" },
    { fr: "Quels sont les top 5 fournisseurs par volume de dépenses annuelles ?",      en: "What are the top 5 vendors by annual spend volume?" },
  ],

  // ── Fabrication & Supply Chain ────────────────────────────────────────────
  // Production, stocks, qualité, ordres de fabrication, chaîne logistique
  manufacturing: [
    { fr: "Quels ordres de production sont en retard sur le calendrier prévu ?",       en: "Which production orders are behind schedule?" },
    { fr: "Quels articles sont en rupture de stock critique ou en alerte ?",           en: "Which items are in critical stockout or alert status?" },
    { fr: "Quels fournisseurs ont des délais de livraison qui impactent la production ?", en: "Which suppliers have delivery delays impacting production?" },
    { fr: "Quel est le coût de production par unité ce mois vs l'objectif ?",          en: "What is the production cost per unit this month vs target?" },
    { fr: "Quel est le taux de rebut et les non-conformités qualité de cette semaine ?", en: "What is the scrap rate and quality non-conformances this week?" },
  ],

  // ── Communication & Relations publiques ───────────────────────────────────
  // Relations médias, image de marque, communications internes/externes, RP
  communication: [
    { fr: "Quelles mentions de notre organisation dans les médias cette semaine ?",    en: "What mentions of our organization appeared in the media this week?" },
    { fr: "Quelles communications internes ont été publiées et leur taux de lecture ?", en: "Which internal communications were published and what was their read rate?" },
    { fr: "Quels événements ou conférences de presse sont prévus ce mois ?",           en: "What events or press conferences are scheduled this month?" },
    { fr: "Quel est l'état des demandes médias en attente de réponse ?",               en: "What is the status of pending media requests awaiting response?" },
    { fr: "Quelles campagnes de communication ont le meilleur engagement ?",           en: "Which communication campaigns have the best engagement?" },
  ],

  // ── Service client & Support ──────────────────────────────────────────────
  // Tickets, satisfaction client, SLA, résolution, escalades
  support: [
    { fr: "Quels tickets clients sont ouverts depuis plus de 48 heures ?",             en: "Which customer tickets have been open for more than 48 hours?" },
    { fr: "Quel est le score de satisfaction client (CSAT) de cette semaine ?",        en: "What is the customer satisfaction score (CSAT) this week?" },
    { fr: "Quels SLA risquent d'être dépassés dans les prochaines 24 heures ?",        en: "Which SLAs are at risk of being exceeded in the next 24 hours?" },
    { fr: "Quels types de problèmes génèrent le plus de tickets récurrents ?",         en: "What types of issues generate the most recurring tickets?" },
    { fr: "Quels clients prioritaires ont des tickets en attente de résolution ?",     en: "Which priority clients have tickets pending resolution?" },
  ],

  // ── Recherche & Développement ────────────────────────────────────────────
  // Projets R&D, innovation, brevets, prototypes, budgets de recherche
  rd: [
    { fr: "Quels projets R&D sont en phase de test ou de validation ?",                en: "Which R&D projects are in testing or validation phase?" },
    { fr: "Quel est le budget R&D consommé vs alloué ce trimestre ?",                  en: "What is the R&D budget consumed vs allocated this quarter?" },
    { fr: "Quels livrables de recherche sont en retard sur le calendrier ?",           en: "Which research deliverables are behind schedule?" },
    { fr: "Quels jalons de développement sont prévus dans les 30 prochains jours ?",   en: "Which development milestones are planned in the next 30 days?" },
    { fr: "Quelles innovations brevetées ou en cours de brevet avons-nous ce trimestre ?", en: "Which innovations are patented or pending patent this quarter?" },
  ],
};

const _DEFAULT_CHIPS = [
  { fr: "Montre-moi les incidents critiques ouverts, les projets en retard et les dépenses du mois.", en: "Show me open critical incidents, delayed projects and this month's expenses." },
  { fr: "Quels emails importants n'ont pas été lus depuis hier ?", en: "Which important emails haven't been read since yesterday?" },
  { fr: "Quels contrats arrivent à échéance dans les 90 prochains jours ?", en: "Which contracts are expiring in the next 90 days?" },
  { fr: "Combien de postes sont vacants et quelles absences sont prévues cette semaine ?", en: "How many positions are vacant and what absences are scheduled this week?" },
  { fr: "Quel est le statut du budget du mois courant par département ?", en: "What is the current month's budget status by department?" },
];

function _updateAgentChips(deptType) {
  const chips = (deptType && _DEPT_CHIPS[deptType]) ? _DEPT_CHIPS[deptType] : _DEFAULT_CHIPS;
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  document.querySelectorAll(".prompt-chip").forEach((btn, i) => {
    const chip = chips[i];
    if (!chip) return;
    const text = chip[lang] || chip.fr;
    btn.dataset.promptFr = chip.fr;
    btn.dataset.promptEn = chip.en;
    btn.dataset.prompt   = chip[lang] || chip.fr;
    btn.textContent      = text;
  });
}

// ── Workspace Marketplace ────────────────────────────────────────────────────
const WORKSPACE_TEMPLATES = [
  {
    id: "finance", icon: "💰", color: "#16a34a", dept_type: "finance",
    name: { fr: "Finance Workspace",       en: "Finance Workspace" },
    desc: { fr: "Budgets, prévisions financières, contrats fournisseurs et comptabilité centralisée.", en: "Budget management, financial forecasts, vendor contracts, and centralized accounting." },
    connectors: ["quickbooks", "netsuite", "microsoft_365", "hubspot"],
  },
  {
    id: "hr", icon: "👥", color: "#7c3aed", dept_type: "hr",
    name: { fr: "RH Workspace",            en: "HR Workspace" },
    desc: { fr: "Recrutement, absences, performance et conformité RH dans un seul espace.", en: "Recruitment, leave management, performance, and HR compliance in one place." },
    connectors: ["bamboohr", "adp", "microsoft_365", "slack"],
  },
  {
    id: "it", icon: "💻", color: "#2563eb", dept_type: "it",
    name: { fr: "IT Workspace",            en: "IT Workspace" },
    desc: { fr: "Incidents, licences, inventaire matériel et cybersécurité — tout sous contrôle.", en: "Incidents, software licenses, hardware inventory, and cybersecurity in one dashboard." },
    connectors: ["servicenow", "intune", "crowdstrike", "aws"],
  },
  {
    id: "operations", icon: "⚙️", color: "#d97706", dept_type: "operations",
    name: { fr: "Operations Workspace",    en: "Operations Workspace" },
    desc: { fr: "Projets, ticketing, processus opérationnels et suivi de livraison unifiés.", en: "Projects, ticketing, operational processes, and delivery tracking unified." },
    connectors: ["asana", "monday", "clickup", "jira"],
  },
  {
    id: "legal", icon: "⚖️", color: "#dc2626", dept_type: "legal",
    name: { fr: "Juridique Workspace",     en: "Legal Workspace" },
    desc: { fr: "Contrats actifs, conformité, obligations réglementaires et risques légaux.", en: "Active contracts, compliance, regulatory obligations, and legal risks." },
    connectors: ["salesforce", "microsoft_365", "servicenow"],
  },
  {
    id: "direction", icon: "🏛️", color: "#1e293b", dept_type: "direction",
    name: { fr: "Executive Workspace",     en: "Executive Workspace" },
    desc: { fr: "Vue consolidée de l'organisation : performance globale, coûts, projets et ressources.", en: "Consolidated org view: overall performance, costs, projects, and resources." },
    connectors: ["microsoft_365", "salesforce", "hubspot", "slack"],
  },
  {
    id: "approvisionnement", icon: "🛒", color: "#0891b2", dept_type: "approvisionnement",
    name: { fr: "Procurement Workspace",   en: "Procurement Workspace" },
    desc: { fr: "Appels d'offres, gestion fournisseurs, contrats d'achat et suivi des économies.", en: "RFPs, vendor management, purchase contracts, and savings tracking." },
    connectors: ["netsuite", "sap", "workday", "microsoft_365"],
  },
  {
    id: "manufacturing", icon: "🏭", color: "#c8102e", dept_type: "manufacturing",
    name: { fr: "Manufacturing Workspace",  en: "Manufacturing Workspace" },
    desc: { fr: "Fabrication, stocks, ordres de production, achats et chaîne d'approvisionnement pour les PME et ETI industrielles canadiennes.", en: "Manufacturing, inventory, production orders, procurement, and supply chain for Canadian industrial SMEs." },
    connectors: ["epicor", "netsuite", "sap", "microsoft_365"],
  },
  {
    id: "municipal", icon: "🏙️", color: "#0f766e", dept_type: "operations",
    name: { fr: "Municipal Workspace",     en: "Municipal Workspace" },
    desc: { fr: "Conçu pour les villes et organismes publics : services aux citoyens, finances municipales.", en: "Built for cities and public bodies: citizen services, municipal finance, public works." },
    connectors: ["microsoft_365", "servicenow", "zendesk", "jira"],
  },
  {
    id: "hospital", icon: "🏥", color: "#9333ea", dept_type: "hr",
    name: { fr: "Hospital Workspace",      en: "Hospital Workspace" },
    desc: { fr: "Approvisionnement médical, RH cliniques, dossiers et conformité santé centralisés.", en: "Medical procurement, clinical HR, records, and healthcare compliance centralized." },
    connectors: ["microsoft_365", "bamboohr", "servicenow", "netsuite"],
  },
];

let _marketplaceBuilt = false;
let _installedWorkspaces = new Set();
let _installedDeptIds = {};  // dept_type → dept_id

async function buildMarketplace() {
  if (_marketplaceBuilt) return;
  _marketplaceBuilt = true;

  const grid = $("marketplace-grid");
  if (!grid) return;

  const lang = document.documentElement.lang === "en" ? "en" : "fr";

  // Fetch existing departments to mark already-installed types
  try {
    const depts = await apiCall("/api/departments");
    _installedWorkspaces.clear();
    _installedDeptIds = {};
    (depts || []).forEach(d => {
      if (d.dept_type) {
        _installedWorkspaces.add(d.dept_type);
        _installedDeptIds[d.dept_type] = d.id;
      }
    });
  } catch (_) {}

  grid.innerHTML = WORKSPACE_TEMPLATES.map(tpl => {
    const isInstalled = _installedWorkspaces.has(tpl.dept_type);
    const connBadges  = tpl.connectors.map(c => {
      const label = CONNECTORS[c]?.label || c;
      return `<span class="marketplace-conn-badge">${esc(label)}</span>`;
    }).join("");
    return `
    <div class="marketplace-card">
      <div class="marketplace-card-header">
        <div class="marketplace-icon" style="background:${tpl.color}20;color:${tpl.color}">${tpl.icon}</div>
        <div>
          <div class="marketplace-card-title">${esc(tpl.name[lang] || tpl.name.fr)}</div>
          ${isInstalled ? `<div class="marketplace-installed">✓ ${lang === "en" ? "Installed" : "Installé"}</div>` : `<div class="marketplace-card-badge">${lang === "en" ? "Available" : "Disponible"}</div>`}
        </div>
      </div>
      <div class="marketplace-card-desc">${esc(tpl.desc[lang] || tpl.desc.fr)}</div>
      <div class="marketplace-connectors">${connBadges}</div>
      <div class="marketplace-card-footer">
        <span style="font-size:.75rem;color:var(--slate)">${tpl.connectors.length} ${lang === "en" ? "connectors" : "connecteurs"}</span>
        ${isInstalled
          ? `<div style="display:flex;gap:6px">
               <button class="btn btn-outline btn-sm" onclick="switchTab('org')">${lang === "en" ? "Manage" : "Gérer"}</button>
               <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca" onclick="uninstallWorkspace('${tpl.id}')" id="uninstall-${tpl.id}" title="${lang === "en" ? "Remove workspace" : "Retirer le workspace"}">✕</button>
             </div>`
          : `<button class="btn btn-primary btn-sm" onclick="installWorkspace('${tpl.id}')" id="install-${tpl.id}">${lang === "en" ? "Install" : "Installer"}</button>`
        }
      </div>
    </div>`;
  }).join("");
}

async function uninstallWorkspace(templateId) {
  const tpl  = WORKSPACE_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const deptId = _installedDeptIds[tpl.dept_type];
  if (!deptId) return;
  const confirm_msg = lang === "en"
    ? `Remove "${tpl.name.en}" workspace? This will delete the department and its members.`
    : `Retirer le workspace "${tpl.name.fr}" ? Cela supprimera le département et ses membres.`;
  if (!window.confirm(confirm_msg)) return;
  const btn = $(`uninstall-${templateId}`);
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    await apiCall(`/api/departments/${deptId}`, "DELETE");
    _installedWorkspaces.delete(tpl.dept_type);
    delete _installedDeptIds[tpl.dept_type];
    _marketplaceBuilt = false;
    buildMarketplace();
    _updateWorkspaceBar();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = "✕"; }
    alert(e.message || (lang === "en" ? "Could not remove workspace." : "Impossible de retirer le workspace."));
  }
}

async function installWorkspace(templateId) {
  const tpl  = WORKSPACE_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const btn  = $(`install-${templateId}`);
  if (btn) { btn.disabled = true; btn.textContent = lang === "en" ? "Installing…" : "Installation…"; }

  try {
    const created = await apiCall("/api/departments", "POST", {
      name: tpl.name.fr,
      description: tpl.desc?.fr || "",
      dept_type: tpl.dept_type,
      annual_budget: 0,
      currency: "CAD",
    });
    _installedWorkspaces.add(tpl.dept_type);
    if (created?.id) _installedDeptIds[tpl.dept_type] = created.id;
    _marketplaceBuilt = false;
    buildMarketplace();
    _updateWorkspaceBar();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = lang === "en" ? "Install" : "Installer"; }
    // 409 = déjà installé : marquer comme tel silencieusement
    if (e.message?.includes("existe déjà") || e.status === 409) {
      _installedWorkspaces.add(tpl.dept_type);
      _marketplaceBuilt = false;
      buildMarketplace();
    } else {
      alert(e.message || "Erreur lors de l'installation.");
    }
  }
}

// ── Workspace activation ──────────────────────────────────────────────────────
let _activeWorkspaceDeptType = null;

function activateWorkspace(deptId, deptType, deptName) {
  _activeWorkspaceDeptType = deptType;
  switchTab("agent");

  // Find template for this dept_type to get icon + connectors
  const tpl = WORKSPACE_TEMPLATES.find(t => t.dept_type === deptType);
  const cfg = {
    finance:           { icon: "💰" }, hr:                { icon: "👥" },
    it:                { icon: "💻" }, legal:             { icon: "⚖️" },
    operations:        { icon: "⚙️" }, marketing:         { icon: "📣" },
    approvisionnement: { icon: "🛒" }, direction:         { icon: "🏛️" },
    manufacturing:     { icon: "🏭" }, general:           { icon: "📊" },
  };
  const icon = tpl?.icon || cfg[deptType]?.icon || "📊";

  // Show banner
  const banner = $("ws-context-banner");
  if (banner) {
    $("ws-ctx-icon").textContent = icon;
    $("ws-ctx-name").textContent = deptName;
    const connDiv = $("ws-ctx-connectors");
    if (connDiv && tpl?.connectors?.length) {
      connDiv.innerHTML = tpl.connectors.map(c =>
        `<span class="ws-ctx-badge">${esc(CONNECTORS[c]?.label || c)}</span>`
      ).join("");
    } else if (connDiv) {
      connDiv.innerHTML = "";
    }
    banner.classList.remove("hidden");
  }

  // Update prompt chips for this dept_type
  _updateAgentChips(deptType);

  // Highlight active chip in workspace bar
  document.querySelectorAll(".ws-chip").forEach(el => {
    el.classList.toggle("ws-chip-active", el.dataset.deptId === String(deptId));
  });
}

function deactivateWorkspace() {
  _activeWorkspaceDeptType = null;
  const banner = $("ws-context-banner");
  if (banner) banner.classList.add("hidden");
  // Reset chips to default
  _updateAgentChips(null);
  // Remove active highlight
  document.querySelectorAll(".ws-chip").forEach(el => el.classList.remove("ws-chip-active"));
}

// ── Workspace bar ─────────────────────────────────────────────────────────────
async function _updateWorkspaceBar() {
  const bar   = $("workspace-bar");
  const dot   = $("ws-dot");
  const label = $("ws-label");
  const chips = $("ws-chips");
  if (!bar) return;

  const isAdmin = ["admin", "owner"].includes(state.user?.role);
  const lang    = document.documentElement.lang === "en" ? "en" : "fr";

  const _typeConfig = {
    finance:           { icon: "💰", color: "#16a34a", label: { fr: "Finance",           en: "Finance" } },
    hr:                { icon: "👥", color: "#7c3aed", label: { fr: "Ressources Humaines", en: "Human Resources" } },
    it:                { icon: "💻", color: "#2563eb", label: { fr: "Technologies de l'information", en: "IT" } },
    legal:             { icon: "⚖️", color: "#dc2626", label: { fr: "Juridique",          en: "Legal" } },
    operations:        { icon: "⚙️", color: "#d97706", label: { fr: "Opérations",         en: "Operations" } },
    marketing:         { icon: "📣", color: "#db2777", label: { fr: "Marketing",           en: "Marketing" } },
    approvisionnement: { icon: "🛒", color: "#0891b2", label: { fr: "Approvisionnement",   en: "Procurement" } },
    direction:         { icon: "🏛️", color: "#1e293b", label: { fr: "Direction",           en: "Executive" } },
    manufacturing:     { icon: "🏭", color: "#c8102e", label: { fr: "Fabrication",         en: "Manufacturing" } },
    communication:     { icon: "📢", color: "#db2777", label: { fr: "Communication",       en: "Communication" } },
    support:           { icon: "🎧", color: "#0891b2", label: { fr: "Support client",      en: "Customer Support" } },
    rd:                { icon: "🔬", color: "#7c3aed", label: { fr: "R&D",                 en: "R&D" } },
    general:           { icon: "📊", color: "#64748b", label: { fr: "Général",             en: "General" } },
  };

  if (isAdmin) {
    // Admin: load all departments and show chips
    try {
      const depts = await apiCall("/api/departments");
      if (!depts || !depts.length) { bar.classList.add("hidden"); return; }

      if (dot)   { dot.style.background = "#818CF8"; }
      if (label) { label.textContent = lang === "en" ? "All Workspaces" : "Tous les Workspaces"; }

      if (chips) {
        // Déduplication par nom (insensible à la casse)
        const seen = new Set();
        const unique = depts.filter(d => {
          const k = (d.name || "").toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k); return true;
        });
        chips.innerHTML = unique.map(d => {
          const cfg = _typeConfig[d.dept_type] || _typeConfig.general;
          return `<span class="ws-chip" style="background:${cfg.color}" title="${esc(d.name)}"
                        data-dept-id="${d.id}"
                        onclick="activateWorkspace('${d.id}','${d.dept_type}','${esc(d.name)}')">${cfg.icon} ${esc(d.name)}</span>`;
        }).join("");
      }

      bar.classList.remove("hidden");
    } catch (_) {
      bar.classList.add("hidden");
    }
  } else if (state.deptType) {
    // Regular user: show their workspace
    const cfg = _typeConfig[state.deptType] || _typeConfig.general;
    if (dot)   { dot.style.background = cfg.color; }
    if (label) { label.textContent = `${cfg.icon} Workspace ${cfg.label[lang] || cfg.label.fr}`; }
    if (chips) { chips.innerHTML = ""; }
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
}

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

    // Mémorise le type de département pour l'agent IA
    if (d.dept_type) {
      state.deptType = d.dept_type;
      _updateAgentChips(d.dept_type);
    }
    _updateWorkspaceBar();

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
    const computedTotal = (a.steps||[]).reduce((sum, s) => sum + (s.savings||0), 0);

    if (resultWrap) resultWrap.innerHTML = `
      <div class="ai-plan-card">
        ${!data.success ? `<p class="badge badge-expiring" style="margin-bottom:12px">Analyse basée sur les règles (IA indisponible)</p>` : ""}
        <div class="ai-plan-summary">${esc(a.summary || "")}</div>
        <div class="ai-plan-total">${_fmt(computedTotal)} $</div>
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

// ── Legal modals (CGU / Privacy / Security) ──────────────────────────────────
const _LEGAL_CONTENT = {
  cgu: {
    title: { fr: "Conditions d'utilisation", en: "Terms of Service" },
    body: { fr: `
<h4>1. Acceptation des conditions</h4>
<p>En accédant à NexHire Enterprise Assistant ("le Service"), vous acceptez les présentes Conditions d'utilisation. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le Service.</p>
<h4>2. Description du Service</h4>
<p>NexHire est une plateforme SaaS d'intelligence artificielle qui connecte vos systèmes d'entreprise (Microsoft 365, Salesforce, Jira, etc.) à un agent conversationnel bilingue français/anglais. Le Service est destiné aux organisations canadiennes.</p>
<h4>3. Compte et accès</h4>
<p>Vous êtes responsable de la confidentialité de vos identifiants de connexion. Vous vous engagez à notifier immédiatement NexHire de toute utilisation non autorisée de votre compte. Chaque organisation bénéficie d'un essai gratuit de 14 jours, après quoi un abonnement payant est requis.</p>
<h4>4. Utilisation acceptable</h4>
<p>Vous acceptez de ne pas : (a) utiliser le Service à des fins illégales ; (b) tenter de compromettre la sécurité du Service ; (c) revendre ou redistribuer l'accès au Service sans autorisation écrite.</p>
<h4>5. Données et confidentialité</h4>
<p>NexHire traite vos données conformément à sa Politique de confidentialité. Les tokens d'accès OAuth sont chiffrés (Fernet AES-128) avant tout stockage. NexHire ne stocke ni ne lit le contenu de vos systèmes connectés au-delà de ce qui est nécessaire pour répondre à vos questions.</p>
<h4>6. Propriété intellectuelle</h4>
<p>Le Service, incluant son interface, son code et sa documentation, est la propriété exclusive de Nexhire Inc. Vous bénéficiez d'une licence d'utilisation limitée, non exclusive et non transférable.</p>
<h4>7. Limitation de responsabilité</h4>
<p>NexHire ne peut être tenu responsable des dommages indirects, consécutifs ou accessoires résultant de l'utilisation du Service. La responsabilité totale de NexHire est limitée au montant payé par l'organisation au cours des 3 derniers mois.</p>
<h4>8. Résiliation</h4>
<p>Vous pouvez résilier votre abonnement à tout moment. NexHire se réserve le droit de suspendre ou de résilier l'accès en cas de violation des présentes conditions.</p>
<h4>9. Modifications</h4>
<p>NexHire peut modifier ces conditions avec un préavis de 30 jours. L'utilisation continue du Service après notification constitue une acceptation des nouvelles conditions.</p>
<h4>10. Droit applicable</h4>
<p>Les présentes conditions sont régies par les lois de la province de Québec et les lois fédérales du Canada. Tout litige sera soumis à la juridiction exclusive des tribunaux de Montréal, Québec.</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Dernière mise à jour : Juin 2026 · contact@nexhire.ca</p>
    `, en: `
<h4>1. Acceptance of Terms</h4>
<p>By accessing NexHire Enterprise Assistant ("the Service"), you agree to these Terms of Service. If you do not accept these terms, you must not use the Service.</p>
<h4>2. Service Description</h4>
<p>NexHire is an AI SaaS platform that connects your enterprise systems (Microsoft 365, Salesforce, Jira, etc.) to a bilingual French/English conversational agent. The Service is designed for Canadian organizations.</p>
<h4>3. Account and Access</h4>
<p>You are responsible for the confidentiality of your login credentials. You agree to immediately notify NexHire of any unauthorized use of your account. Each organization receives a 14-day free trial, after which a paid subscription is required.</p>
<h4>4. Acceptable Use</h4>
<p>You agree not to: (a) use the Service for illegal purposes; (b) attempt to compromise the security of the Service; (c) resell or redistribute access to the Service without written authorization.</p>
<h4>5. Data and Privacy</h4>
<p>NexHire processes your data in accordance with its Privacy Policy. OAuth access tokens are encrypted (Fernet AES-128) before storage. NexHire does not store or read your connected systems' content beyond what is necessary to answer your questions.</p>
<h4>6. Intellectual Property</h4>
<p>The Service, including its interface, code, and documentation, is the exclusive property of Nexhire Inc. You receive a limited, non-exclusive, non-transferable license to use the Service.</p>
<h4>7. Limitation of Liability</h4>
<p>NexHire shall not be liable for indirect, consequential, or incidental damages arising from the use of the Service. NexHire's total liability is limited to the amount paid by the organization in the past 3 months.</p>
<h4>8. Termination</h4>
<p>You may cancel your subscription at any time. NexHire reserves the right to suspend or terminate access in case of violation of these terms.</p>
<h4>9. Modifications</h4>
<p>NexHire may modify these terms with 30 days notice. Continued use of the Service after notification constitutes acceptance of the new terms.</p>
<h4>10. Governing Law</h4>
<p>These terms are governed by the laws of the Province of Quebec and federal laws of Canada. Any dispute will be submitted to the exclusive jurisdiction of the courts of Montreal, Quebec.</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Last updated: June 2026 · contact@nexhire.ca</p>
    `},
  },
  privacy: {
    title: { fr: "Politique de confidentialité", en: "Privacy Policy" },
    body: { fr: `
<h4>1. Responsable du traitement</h4>
<p>Nexhire Inc., société enregistrée au Québec, Canada, est responsable du traitement des données personnelles collectées via le Service.</p>
<h4>2. Données collectées</h4>
<ul>
<li><strong>Données de compte :</strong> adresse courriel, nom complet, nom de l'organisation</li>
<li><strong>Données d'utilisation :</strong> requêtes posées à l'agent IA, connecteurs utilisés, actions effectuées (journal d'audit)</li>
<li><strong>Données techniques :</strong> adresse IP, navigateur, timestamps de connexion</li>
<li><strong>Tokens OAuth :</strong> chiffrés Fernet — jamais lisibles en clair par NexHire</li>
</ul>
<h4>3. Finalités du traitement</h4>
<p>Les données sont utilisées pour : fournir le Service, améliorer la qualité des réponses de l'agent IA, assurer la sécurité et la conformité réglementaire, facturer les abonnements.</p>
<h4>4. Conformité à la Loi 25 (Québec)</h4>
<p>NexHire est conforme à la Loi modernisant des dispositions législatives en matière de protection des renseignements personnels (Loi 25). Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits : <strong>privacy@nexhire.ca</strong>.</p>
<h4>5. Sous-traitants</h4>
<ul>
<li><strong>Supabase (PostgreSQL)</strong> — hébergement de la base de données (Canada/USA)</li>
<li><strong>Render</strong> — hébergement de l'application</li>
<li><strong>OpenAI</strong> — traitement des questions par l'IA (les questions sont transmises mais jamais stockées par OpenAI à des fins d'entraînement si configuré en mode API)</li>
<li><strong>Stripe</strong> — gestion des paiements et abonnements</li>
</ul>
<h4>6. Conservation des données</h4>
<p>Les données sont conservées pendant la durée de l'abonnement actif + 12 mois après résiliation. Le journal d'audit est conservé 7 ans conformément aux obligations légales canadiennes.</p>
<h4>7. Cookies</h4>
<p>NexHire n'utilise pas de cookies publicitaires ou de traçage tiers. Seul un token d'authentification (stocké en mémoire locale) est utilisé pour maintenir votre session.</p>
<h4>8. Transferts internationaux</h4>
<p>Certaines données peuvent transiter via des serveurs situés aux États-Unis (OpenAI, Stripe). Ces transferts sont encadrés par des clauses contractuelles types conformes aux standards internationaux.</p>
<h4>9. Contact</h4>
<p>Pour toute question relative à vos données personnelles : <strong>privacy@nexhire.ca</strong> ou en écrivant à Nexhire Inc., Montréal, Québec, Canada.</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Dernière mise à jour : Juin 2026</p>
    `, en: `
<h4>1. Data Controller</h4>
<p>Nexhire Inc., a company registered in Quebec, Canada, is the controller of personal data collected through the Service.</p>
<h4>2. Data Collected</h4>
<ul>
<li><strong>Account data:</strong> email address, full name, organization name</li>
<li><strong>Usage data:</strong> questions asked to the AI agent, connectors used, actions performed (audit log)</li>
<li><strong>Technical data:</strong> IP address, browser, connection timestamps</li>
<li><strong>OAuth tokens:</strong> Fernet-encrypted — never readable in plain text by NexHire</li>
</ul>
<h4>3. Processing Purposes</h4>
<p>Data is used to: provide the Service, improve AI agent response quality, ensure security and regulatory compliance, process subscription billing.</p>
<h4>4. Quebec Law 25 Compliance</h4>
<p>NexHire complies with Quebec's Act respecting the protection of personal information in the private sector (Law 25). You have the right to access, rectify, and delete your data. To exercise these rights: <strong>privacy@nexhire.ca</strong>.</p>
<h4>5. Sub-processors</h4>
<ul>
<li><strong>Supabase (PostgreSQL)</strong> — database hosting (Canada/USA)</li>
<li><strong>Render</strong> — application hosting</li>
<li><strong>OpenAI</strong> — AI question processing (questions are transmitted but not stored by OpenAI for training when using the API)</li>
<li><strong>Stripe</strong> — payment and subscription management</li>
</ul>
<h4>6. Data Retention</h4>
<p>Data is retained for the duration of the active subscription + 12 months after cancellation. Audit logs are retained for 7 years in compliance with Canadian legal requirements.</p>
<h4>7. Cookies</h4>
<p>NexHire does not use advertising or third-party tracking cookies. Only an authentication token (stored in local memory) is used to maintain your session.</p>
<h4>8. International Transfers</h4>
<p>Some data may transit through servers located in the United States (OpenAI, Stripe). These transfers are governed by standard contractual clauses compliant with international standards.</p>
<h4>9. Contact</h4>
<p>For any questions regarding your personal data: <strong>privacy@nexhire.ca</strong> or by writing to Nexhire Inc., Montreal, Quebec, Canada.</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Last updated: June 2026</p>
    `},
  },
  security: {
    title: { fr: "Sécurité", en: "Security" },
    body: { fr: `
<h4>Notre engagement sécurité</h4>
<p>NexHire a été conçu avec la sécurité entreprise dès la première ligne de code. Voici les mécanismes en place :</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:.85rem">
<tr style="background:var(--blue-pale)"><th style="padding:8px;text-align:left">Mécanisme</th><th style="padding:8px;text-align:left">Détail</th></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Authentification</td><td style="padding:8px;border-top:1px solid var(--border)">JWT ES256 (courbe elliptique) — tokens signés, non falsifiables</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Tokens OAuth</td><td style="padding:8px;border-top:1px solid var(--border)">Chiffrés Fernet (AES-128-CBC + HMAC) avant tout stockage</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Mots de passe</td><td style="padding:8px;border-top:1px solid var(--border)">Hashés bcrypt — jamais stockés en clair</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Base de données</td><td style="padding:8px;border-top:1px solid var(--border)">SSL obligatoire (sslmode=require) — Supabase PostgreSQL</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">RBAC</td><td style="padding:8px;border-top:1px solid var(--border)">4 niveaux de rôles vérifiés à chaque requête API</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Audit log</td><td style="padding:8px;border-top:1px solid var(--border)">Immuable, append-only — chaque action tracée avec IP et timestamp</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Session</td><td style="padding:8px;border-top:1px solid var(--border)">Expiration automatique + auto-logout sur inactivité</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Isolation données</td><td style="padding:8px;border-top:1px solid var(--border)">Chaque organisation est isolée — aucun accès croisé possible</td></tr>
</table>
<h4>Signaler une vulnérabilité</h4>
<p>Si vous découvrez une vulnérabilité de sécurité, contactez-nous immédiatement à <strong>security@nexhire.ca</strong>. Nous nous engageons à répondre dans les 24 heures.</p>
<h4>Conformité</h4>
<p>NexHire est conçu pour satisfaire les exigences de : Loi 25 (Québec), ISO 27001 (en cours de certification), SOC 2 Type II (en cours).</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Pour toute question de sécurité : security@nexhire.ca</p>
    `, en: `
<h4>Our Security Commitment</h4>
<p>NexHire was designed with enterprise security from the first line of code. Here are the mechanisms in place:</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:.85rem">
<tr style="background:var(--blue-pale)"><th style="padding:8px;text-align:left">Mechanism</th><th style="padding:8px;text-align:left">Detail</th></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Authentication</td><td style="padding:8px;border-top:1px solid var(--border)">JWT ES256 (elliptic curve) — signed tokens, unforgeable</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">OAuth Tokens</td><td style="padding:8px;border-top:1px solid var(--border)">Fernet-encrypted (AES-128-CBC + HMAC) before any storage</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Passwords</td><td style="padding:8px;border-top:1px solid var(--border)">bcrypt-hashed — never stored in plain text</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Database</td><td style="padding:8px;border-top:1px solid var(--border)">SSL required (sslmode=require) — Supabase PostgreSQL</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">RBAC</td><td style="padding:8px;border-top:1px solid var(--border)">4 role levels verified on every API request</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Audit log</td><td style="padding:8px;border-top:1px solid var(--border)">Immutable, append-only — every action tracked with IP and timestamp</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Session</td><td style="padding:8px;border-top:1px solid var(--border)">Automatic expiry + auto-logout on inactivity</td></tr>
<tr><td style="padding:8px;border-top:1px solid var(--border)">Data isolation</td><td style="padding:8px;border-top:1px solid var(--border)">Each organization is isolated — no cross-access possible</td></tr>
</table>
<h4>Report a Vulnerability</h4>
<p>If you discover a security vulnerability, contact us immediately at <strong>security@nexhire.ca</strong>. We commit to responding within 24 hours.</p>
<h4>Compliance</h4>
<p>NexHire is designed to meet requirements of: Quebec Law 25, ISO 27001 (certification in progress), SOC 2 Type II (in progress).</p>
<p style="margin-top:20px;color:var(--slate);font-size:.82rem">Security questions: security@nexhire.ca</p>
    `},
  },
};

function openLegal(key) {
  const docLang = document.documentElement.lang;
  const lang    = docLang === "en" || docLang === "es" ? "en" : "fr";
  const content = _LEGAL_CONTENT[key];
  if (!content) return;
  const modal = $("legal-modal");
  const title = $("legal-modal-title");
  const body  = $("legal-modal-body");
  if (!modal) return;
  if (title) title.textContent = content.title[lang] || content.title.fr;
  if (body)  body.innerHTML   = content.body[lang]  || content.body.fr;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLegal() {
  const modal = $("legal-modal");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPER ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════

async function loadSuperAdmin() {
  try {
    const [metrics, orgs] = await Promise.all([
      apiCall("/api/superadmin/metrics"),
      apiCall("/api/superadmin/orgs"),
    ]);

    // KPI
    $("sa-total-orgs").textContent = metrics.total_orgs ?? "—";
    $("sa-active").textContent     = metrics.active      ?? "—";
    $("sa-trialing").textContent   = metrics.trialing    ?? "—";
    $("sa-users").textContent      = metrics.total_users ?? "—";
    $("sa-queries").textContent    = metrics.queries_month ?? "—";

    // Table
    const tbody = $("sa-orgs-body");
    if (!orgs.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="muted" style="text-align:center;padding:24px">Aucune organisation.</td></tr>`;
      return;
    }

    const statusBadge = s => {
      const colors = { active:"#16a34a", trialing:"#d97706", cancelled:"#dc2626", suspended:"#6b7280", past_due:"#dc2626" };
      return `<span style="background:${colors[s]||'#6b7280'};color:#fff;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600">${s}</span>`;
    };

    const trialCell = o => {
      if (o.subscription_status !== "trialing") return `<td style="color:#94a3b8;font-size:.78rem;text-align:center">—</td>`;
      const created = new Date(o.created_at);
      const expires = new Date(created.getTime() + 14 * 86400000);
      const now = new Date();
      const daysLeft = Math.ceil((expires - now) / 86400000);
      if (daysLeft < 0)  return `<td style="font-size:.78rem;text-align:center"><span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:12px;font-weight:600">Expiré</span></td>`;
      if (daysLeft <= 3) return `<td style="font-size:.78rem;text-align:center"><span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:12px;font-weight:600">${daysLeft}j</span></td>`;
      return `<td style="font-size:.78rem;text-align:center"><span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:12px;font-weight:600">${daysLeft}j</span></td>`;
    };

    tbody.innerHTML = orgs.map(o => `
      <tr>
        <td><strong>${_esc(o.name)}</strong><br><span class="muted" style="font-size:.78rem">${_esc(o.slug||'')}</span></td>
        <td>${statusBadge(o.subscription_status||'unknown')}</td>
        <td>${o.subscription_plan||'—'}</td>
        <td style="text-align:center">${o.user_count??0}</td>
        <td style="text-align:center">${o.queries_month??0}</td>
        <td style="text-align:center">${o.connector_count??0}</td>
        <td style="font-size:.75rem;color:${o.stripe_customer_id?'#16a34a':'#94a3b8'}">${o.stripe_customer_id?'✓ Stripe':'—'}</td>
        <td style="font-size:.78rem">${(o.created_at||'').slice(0,10)}</td>
        ${trialCell(o)}
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" style="background:#16a34a;color:#fff;padding:3px 10px;font-size:.75rem"
              onclick="saSetStatus('${o.id}','active')">Activer</button>
            <button class="btn btn-sm" style="background:#d97706;color:#fff;padding:3px 10px;font-size:.75rem"
              onclick="saSetStatus('${o.id}','trialing')">Trial</button>
            <button class="btn btn-sm" style="background:#dc2626;color:#fff;padding:3px 10px;font-size:.75rem"
              onclick="saSetStatus('${o.id}','suspended')">Suspendre</button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch (ex) {
    $("sa-orgs-body").innerHTML = `<tr><td colspan="10" style="color:#dc2626;text-align:center;padding:16px">${ex.message}</td></tr>`;
  }
}

function _esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function saSetStatus(orgId, status) {
  if (!confirm(`Changer le statut de cette organisation en "${status}" ?`)) return;
  try {
    await apiCall(`/api/superadmin/orgs/${orgId}/status`, "PATCH", { status });
    await loadSuperAdmin();
  } catch (ex) {
    alert(ex.message);
  }
}

// Close on backdrop click
document.addEventListener("click", e => {
  if (e.target?.id === "legal-modal") closeLegal();
});

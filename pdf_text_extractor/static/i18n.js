/**
 * AgentHub Platform — NH_I18N
 * Système d'internationalisation partagé FR / EN.
 * Usage : NH_I18N.t('key') · NH_I18N.setLang('en') · data-i18n="key"
 */
(function () {
  'use strict';

  const S = {
    fr: {
      /* ── Auth : onglets ──────────────────────────────────────────────── */
      'tab.login':  'Connexion',
      'tab.signup': 'Créer un compte',

      /* ── Connexion ───────────────────────────────────────────────────── */
      'login.title':              'Bon retour 👋',
      'login.sub':                'Connectez-vous à votre espace AgentHub.',
      'login.email.label':        'Adresse courriel',
      'login.email.ph':           'vous@organisation.ca',
      'login.password.label':     'Mot de passe',
      'login.password.ph':        '••••••••',
      'login.remember':           'Se souvenir de moi',
      'login.btn':                'Connexion',
      'login.forgot':             'Mot de passe oublié ?',
      'login.no_account':         'Pas encore de compte ?',
      'login.free_trial':         'Essai gratuit de 14 jours →',

      /* ── Mot de passe oublié ─────────────────────────────────────────── */
      'forgot.title':             'Mot de passe oublié',
      'forgot.sub':               'Entrez votre courriel — nous vous enverrons un lien de réinitialisation.',
      'forgot.email.label':       'Adresse courriel',
      'forgot.email.ph':          'vous@organisation.ca',
      'forgot.btn':               'Envoyer le lien',
      'forgot.back':              '← Retour à la connexion',

      /* ── Réinitialisation ────────────────────────────────────────────── */
      'reset.title':              'Nouveau mot de passe',
      'reset.sub':                'Choisissez un mot de passe sécurisé pour votre compte.',
      'reset.pw.label':           'Nouveau mot de passe',
      'reset.pw.ph':              'Minimum 12 caractères',
      'reset.confirm.label':      'Confirmer le mot de passe',
      'reset.confirm.ph':         'Répétez le mot de passe',
      'reset.btn':                'Enregistrer le nouveau mot de passe',
      'reset.back':               '← Retour à la connexion',

      /* ── Inscription ─────────────────────────────────────────────────── */
      'signup.title':             'Créer votre compte',
      'signup.sub.partner':       'Rejoignez votre espace AgentHub Platform.',
      'signup.sub.direct':        'Créez votre espace de travail IA. 14 jours gratuits, aucune carte requise.',
      'signup.org_name.label':    'Nom de l\'organisation',
      'signup.org_name.ph':       'Ex. : Ville de Laval, Hôpital Saint-Luc…',
      'signup.org_type.label':    'Type d\'organisation',
      'signup.currency.label':    'Devise de l\'organisation',
      'signup.fname.label':       'Prénom',
      'signup.fname.ph':          'Marie',
      'signup.lname.label':       'Nom',
      'signup.lname.ph':          'Tremblay',
      'signup.email.label':       'Adresse courriel',
      'signup.email.ph':          'marie.tremblay@organisation.ca',
      'signup.phone.label':       'Numéro de téléphone',
      'signup.phone.ph':          '+1 514 555-0000',
      'signup.pw.label':          'Mot de passe (min. 12 caractères)',
      'signup.pw.ph':             '••••••••••••',
      'signup.cgu.pre':           'J\'accepte les',
      'signup.cgu.tos':           'Conditions d\'utilisation',
      'signup.cgu.and':           'et la',
      'signup.cgu.privacy':       'Politique de confidentialité',
      'signup.cgu.of':            'd\'AgentHub Platform.',
      'signup.btn':               'Créer mon compte →',
      'signup.already':           'Déjà un compte ?',
      'signup.signin_link':       'Se connecter',
      'signup.trial':             '14 jours d\'essai gratuit',
      'signup.trial.sub':         'aucune carte de crédit requise',

      /* ── Types d'org ─────────────────────────────────────────────────── */
      'org.entreprise':           'Entreprise privée',
      'org.pme':                  'PME / PMI',
      'org.hopital':              'Hôpital / Santé',
      'org.municipalite':         'Municipalité',
      'org.universite':           'Université / École',
      'org.entrepreneur':         'Startup / Entrepreneur',

      /* ── Mur d'invitation ────────────────────────────────────────────── */
      'invite.title':             'Invitation requise',
      'invite.desc':              'Pour créer un compte, vous avez besoin d\'un lien d\'invitation de votre chambre ou organisation partenaire. Contactez votre coordinateur ou administrateur pour obtenir votre lien.',

      /* ── SSO ─────────────────────────────────────────────────────────── */
      'sso.divider':              'ou connexion via SSO',
      'sso.section.title':        'Connexion via votre organisation',
      'sso.slug.label':           'Identifiant de votre organisation',
      'sso.slug.ph':              'ex. : ville-trois-rivieres',
      'sso.slug.hint':            'Entrez l\'identifiant unique de votre organisation',
      'sso.btn':                  'Se connecter avec SSO →',
      'sso.loading':              'Vérification…',
      'sso.redirecting':          'Redirection vers votre fournisseur d\'identité…',
      'sso.err.not_found':        'Organisation introuvable. Vérifiez l\'identifiant.',
      'sso.err.not_configured':   'SSO non configuré pour cette organisation. Contactez votre administrateur.',
      'sso.err.generic':          'Erreur lors de la vérification SSO.',
      'sso.joining':              'Connexion sécurisée via',

      /* ── Succès inscription ───────────────────────────────────────────── */
      'success.badge':            '✓ Compte créé avec succès',
      'success.title':            'Vérifiez votre courriel',
      'success.desc1':            'Nous avons envoyé un lien de confirmation à :',
      'success.desc2':            'Cliquez sur le lien reçu pour activer votre compte.',
      'success.gmail':            'Ouvrir Gmail',
      'success.outlook':          'Ouvrir Outlook',
      'success.yahoo':            'Ouvrir Yahoo Mail',
      'success.back':             'Retour à la connexion →',
      'success.noemail.title':    'Connectez-vous pour accéder à votre espace',

      /* ── Branding gauche ─────────────────────────────────────────────── */
      'brand.tagline':            'La plateforme IA pour',
      'brand.tagline.em':         'organisations modernes',
      'brand.sub':                'Évaluez votre maturité IA, gouvernez vos données et accélérez votre transformation numérique — en une seule plateforme.',
      'brand.card.title':         'Score de maturité IA — Tableau de bord',
      'brand.kpi.score':          'Score IMAI / 100',
      'brand.kpi.actions':        'Actions en cours',
      'brand.kpi.connectors':     'Connecteurs actifs',
      'brand.feat.1':             'Diagnostic de maturité IA en 10 minutes',
      'brand.feat.2':             'ATLAS — copilote IA disponible 24h/24',
      'brand.feat.3':             'Gouvernance & conformité Loi 25',
      'brand.feat.4':             'Connecteurs Microsoft 365, SAP, Jira et +20',
      'brand.trust.hosting':      'Hébergement Canada',
      'brand.trust.law25':        'Conforme Loi 25',
      'brand.trust.soc2':         'SOC 2 Type II',
      'brand.partner.joining':    'Vous rejoignez',
      'brand.footer':             '© 2026 CivicAI Inc. · Propulsé par ATLAS AI',

      /* ── Chargement / erreurs communs ────────────────────────────────── */
      'common.loading':           'Chargement…',
      'common.err.network':       'Erreur réseau. Vérifiez votre connexion.',
      'common.err.generic':       'Une erreur est survenue. Réessayez.',
      'common.btn.loading':       'Chargement…',

      /* ── Workspace shell — nav items ────────────────────────────────────── */
      'ws.search.ph':              'Rechercher dans AgentHub…',
      'ws.nav.dashboard':          'Tableau de bord',
      'ws.nav.diagnostic':         'Diagnostic IA IMAI',
      'ws.nav.atlas':              'ATLAS AI',
      'ws.nav.recommandations':    'Recommandations',
      'ws.nav.decisions':          'Décisions IA',
      'ws.nav.initiatives':        'Initiatives',
      'ws.nav.playbooks':          'Playbooks',
      'ws.nav.orchestrations':     "Centre d'Orchestration",
      'ws.nav.gouvernance':        'Gouvernance & Loi 25',
      'ws.nav.conformite':         'Conformité Causale',
      'ws.nav.politiques':         'Politiques Vivantes',
      'ws.nav.executive':          'Dashboard Exécutif',
      'ws.nav.observatoire':       'Observatoire',
      'ws.nav.reports':            'Rapports & Exports',
      'ws.nav.enterprise-intel':   'Coûts & Optimisation',
      'ws.nav.sales-intelligence': 'Sales Intelligence',
      'ws.nav.marketplace':        'Workspace Marketplace',
      'ws.nav.integrations':       'Tous les connecteurs',
      'ws.nav.ms365':              'Microsoft 365',
      'ws.nav.departments':        'Départements',
      'ws.nav.assets':             'Parc TI',
      'ws.nav.budget':             'Budget & Finances',
      'ws.nav.contracts':          'Contrats',
      'ws.nav.identity':           'Utilisateurs & Accès',
      'ws.nav.sso-mfa':            'SSO & MFA',
      'ws.nav.security':           'Tableau de sécurité',
      'ws.nav.audit':              "Journal d'audit",
      'ws.nav.knowledge':          'Knowledge Hub',
      'ws.nav.automation':         'Automatisation',
      'ws.nav.billing':            'Facturation',
      'ws.nav.service-accounts':   'Comptes de service',
      'ws.nav.help':               "Centre d'aide",
      'ws.nav.settings':           'Paramètres',
      'ws.nav.governance':         'Gouvernance',
      'ws.nav.observatory':        'Observatoire IA',
      'ws.nav.members':            'Membres',
      'ws.nav.finance':            'Finances',
      'ws.nav.soon':               'Bientôt',

      /* Nav sections */
      'ws.section.diagnostic':     'Diagnostic & IA',
      'ws.section.decisions':      'Intelligence Décisionnelle',
      'ws.section.governance':     'Gouvernance',
      'ws.section.direction':      'Vue Direction',
      'ws.section.intel':          'Enterprise Intelligence',
      'ws.section.sales':          'Sales Intelligence',
      'ws.section.marketplace':    'Marketplace',
      'ws.section.integrations':   "Centre d'intégrations",
      'ws.section.org':            'Organisation',
      'ws.section.finance':        'Finance & Contrats',
      'ws.section.identity':       'Identity & Access',
      'ws.section.security':       'Security Center',
      'ws.section.productivity':   'Productivité',
      'ws.section.admin':          'Administration',

      /* User menu */
      'ws.user.profile':           'Mon profil',
      'ws.user.settings':          'Mon organisation',
      'ws.user.logout':            'Déconnexion',
      'ws.user.lang':              'Langue / Language',
      'ws.user.notifications':     'Préférences notifications',
      'ws.user.invite':            'Inviter un utilisateur',
      'ws.user.support':           'Support',

      /* Topbar panels */
      'ws.notif.title':            'Notifications',
      'ws.notif.mark_all':         'Tout marquer lu',

      /* Help panel */
      'ws.help.title':             "Centre d'aide",
      'ws.help.docs':              'Documentation',
      'ws.help.docs.sub':          'Guides et tutoriels',
      'ws.help.videos':            'Tutoriels vidéo',
      'ws.help.videos.sub':        'Apprenez à votre rythme',
      'ws.help.faq':               'FAQ',
      'ws.help.faq.sub':           'Questions fréquentes',
      'ws.help.atlas':             'Discuter avec ATLAS',
      'ws.help.atlas.sub':         'Votre conseiller IA 24/7',
      'ws.help.contact':           'Contacter le support',
      'ws.help.contact.sub':       'Lun–Ven 9h–17h EST',

      /* Settings panel */
      'ws.settings.title':         'Paramètres rapides',
      'ws.settings.prefs':         'Préférences',
      'ws.settings.theme':         'Thème',
      'ws.settings.theme.sub':     'Clair (sombre : à venir)',
      'ws.settings.org':           'Organisation',
      'ws.settings.org.sub':       'Gérer les paramètres',
      'ws.settings.teams':         'Utilisateurs & équipes',
      'ws.settings.teams.sub':     'Invitations et rôles',
      'ws.settings.apikeys':       'Clés API',
      'ws.settings.apikeys.sub':   'Accès développeur (bientôt)',

      /* Roles */
      'ws.role.owner':             'Propriétaire',
      'ws.role.admin':             'Administrateur',
      'ws.role.manager':           'Manager',
      'ws.role.user':              'Utilisateur',
      'ws.role.collaborator':      'Collaborateur',

      /* ── Écran de bienvenue ───────────────────────────────────────────── */
      'welcome.tagline':          'Enterprise AI Workspace',
      'welcome.atlas.status':     'Préparation de votre environnement intelligent…',
      'welcome.step.0':           'Chargement de votre organisation',
      'welcome.step.1':           'Initialisation des agents IA',
      'welcome.step.2':           'Vérification des connecteurs',
      'welcome.step.3':           'Analyse des indicateurs',
      'welcome.step.4':           'Sécurisation de votre session',
      'welcome.final':            'Bienvenue dans AgentHub.',
      'welcome.skip':             'Accéder au tableau de bord →',

      /* ── Session / idle ──────────────────────────────────────────────── */
      'idle.title':               'Session inactive',
      'idle.sub':                 'Vous semblez absent. Votre session sera fermée automatiquement pour protéger vos données.',
      'idle.desc':                'Pour des raisons de sécurité, votre session sera fermée dans',
      'idle.unit':                'secondes.',
      'idle.stay':                'Rester connecté',
      'idle.logout':              'Se déconnecter',
    },

    en: {
      /* ── Auth : tabs ─────────────────────────────────────────────────── */
      'tab.login':  'Sign In',
      'tab.signup': 'Create Account',

      /* ── Sign in ─────────────────────────────────────────────────────── */
      'login.title':              'Welcome back 👋',
      'login.sub':                'Sign in to your AgentHub workspace.',
      'login.email.label':        'Email address',
      'login.email.ph':           'you@organisation.com',
      'login.password.label':     'Password',
      'login.password.ph':        '••••••••',
      'login.remember':           'Remember me',
      'login.btn':                'Sign in',
      'login.forgot':             'Forgot password?',
      'login.no_account':         'No account yet?',
      'login.free_trial':         '14-day free trial →',

      /* ── Forgot password ─────────────────────────────────────────────── */
      'forgot.title':             'Forgot password',
      'forgot.sub':               'Enter your email — we\'ll send you a reset link.',
      'forgot.email.label':       'Email address',
      'forgot.email.ph':          'you@organisation.com',
      'forgot.btn':               'Send reset link',
      'forgot.back':              '← Back to sign in',

      /* ── Reset password ──────────────────────────────────────────────── */
      'reset.title':              'New password',
      'reset.sub':                'Choose a secure password for your account.',
      'reset.pw.label':           'New password',
      'reset.pw.ph':              'At least 12 characters',
      'reset.confirm.label':      'Confirm password',
      'reset.confirm.ph':         'Repeat your password',
      'reset.btn':                'Save new password',
      'reset.back':               '← Back to sign in',

      /* ── Sign up ─────────────────────────────────────────────────────── */
      'signup.title':             'Create your account',
      'signup.sub.partner':       'Join your AgentHub Platform workspace.',
      'signup.sub.direct':        'Create your AI workspace. 14-day free trial, no credit card required.',
      'signup.org_name.label':    'Organisation name',
      'signup.org_name.ph':       'e.g.: City of Montreal, Hospital, Company XYZ…',
      'signup.org_type.label':    'Organisation type',
      'signup.currency.label':    'Organisation currency',
      'signup.fname.label':       'First name',
      'signup.fname.ph':          'Marie',
      'signup.lname.label':       'Last name',
      'signup.lname.ph':          'Tremblay',
      'signup.email.label':       'Email address',
      'signup.email.ph':          'marie.tremblay@organisation.com',
      'signup.phone.label':       'Phone number',
      'signup.phone.ph':          '+1 514 555-0000',
      'signup.pw.label':          'Password (min. 12 characters)',
      'signup.pw.ph':             '••••••••••••',
      'signup.cgu.pre':           'I accept the',
      'signup.cgu.tos':           'Terms of Service',
      'signup.cgu.and':           'and the',
      'signup.cgu.privacy':       'Privacy Policy',
      'signup.cgu.of':            'of AgentHub Platform.',
      'signup.btn':               'Create my account →',
      'signup.already':           'Already have an account?',
      'signup.signin_link':       'Sign in',
      'signup.trial':             '14-day free trial',
      'signup.trial.sub':         'no credit card required',

      /* ── Org types ───────────────────────────────────────────────────── */
      'org.entreprise':           'Private company',
      'org.pme':                  'SME / SMI',
      'org.hopital':              'Hospital / Healthcare',
      'org.municipalite':         'Municipality',
      'org.universite':           'University / School',
      'org.entrepreneur':         'Startup / Entrepreneur',

      /* ── Invite wall ─────────────────────────────────────────────────── */
      'invite.title':             'Invitation required',
      'invite.desc':              'To create an account, you need an invitation link from your partner organisation. Contact your coordinator or administrator to get your link.',

      /* ── SSO ─────────────────────────────────────────────────────────── */
      'sso.divider':              'or sign in with SSO',
      'sso.section.title':        'Sign in via your organisation',
      'sso.slug.label':           'Your organisation\'s identifier',
      'sso.slug.ph':              'e.g.: city-of-montreal',
      'sso.slug.hint':            'Enter your organisation\'s unique identifier',
      'sso.btn':                  'Sign in with SSO →',
      'sso.loading':              'Verifying…',
      'sso.redirecting':          'Redirecting to your identity provider…',
      'sso.err.not_found':        'Organisation not found. Check the identifier.',
      'sso.err.not_configured':   'SSO not configured for this organisation. Contact your administrator.',
      'sso.err.generic':          'Error during SSO verification.',
      'sso.joining':              'Secure sign-in via',

      /* ── Success ─────────────────────────────────────────────────────── */
      'success.badge':            '✓ Account created successfully',
      'success.title':            'Check your email',
      'success.desc1':            'We sent a confirmation link to:',
      'success.desc2':            'Click the link you received to activate your account.',
      'success.gmail':            'Open Gmail',
      'success.outlook':          'Open Outlook',
      'success.yahoo':            'Open Yahoo Mail',
      'success.back':             'Back to sign in →',
      'success.noemail.title':    'Sign in to access your workspace',

      /* ── Left branding ───────────────────────────────────────────────── */
      'brand.tagline':            'The AI platform for',
      'brand.tagline.em':         'modern organisations',
      'brand.sub':                'Assess your AI maturity, govern your data and accelerate your digital transformation — in one platform.',
      'brand.card.title':         'AI Maturity Score — Dashboard',
      'brand.kpi.score':          'IMAI Score / 100',
      'brand.kpi.actions':        'Active actions',
      'brand.kpi.connectors':     'Active connectors',
      'brand.feat.1':             'AI maturity diagnostic in 10 minutes',
      'brand.feat.2':             'ATLAS — AI copilot available 24/7',
      'brand.feat.3':             'Governance & compliance (Law 25)',
      'brand.feat.4':             'Microsoft 365, SAP, Jira & 20+ connectors',
      'brand.trust.hosting':      'Canada-hosted',
      'brand.trust.law25':        'Law 25 compliant',
      'brand.trust.soc2':         'SOC 2 Type II',
      'brand.partner.joining':    'Joining',
      'brand.footer':             '© 2026 CivicAI Inc. · Powered by ATLAS AI',

      /* ── Common ──────────────────────────────────────────────────────── */
      'common.loading':           'Loading…',
      'common.err.network':       'Network error. Check your connection.',
      'common.err.generic':       'An error occurred. Please try again.',
      'common.btn.loading':       'Loading…',

      /* ── Workspace shell — nav items ────────────────────────────────────── */
      'ws.search.ph':              'Search in AgentHub…',
      'ws.nav.dashboard':          'Dashboard',
      'ws.nav.diagnostic':         'AI Diagnostic IMAI',
      'ws.nav.atlas':              'ATLAS AI',
      'ws.nav.recommandations':    'Recommendations',
      'ws.nav.decisions':          'AI Decisions',
      'ws.nav.initiatives':        'Initiatives',
      'ws.nav.playbooks':          'Playbooks',
      'ws.nav.orchestrations':     'Orchestration Hub',
      'ws.nav.gouvernance':        'Governance & Law 25',
      'ws.nav.conformite':         'Causal Compliance',
      'ws.nav.politiques':         'Living Policies',
      'ws.nav.executive':          'Executive Dashboard',
      'ws.nav.observatoire':       'Observatory',
      'ws.nav.reports':            'Reports & Exports',
      'ws.nav.enterprise-intel':   'Costs & Optimization',
      'ws.nav.sales-intelligence': 'Sales Intelligence',
      'ws.nav.marketplace':        'Workspace Marketplace',
      'ws.nav.integrations':       'All Connectors',
      'ws.nav.ms365':              'Microsoft 365',
      'ws.nav.departments':        'Departments',
      'ws.nav.assets':             'IT Assets',
      'ws.nav.budget':             'Budget & Finance',
      'ws.nav.contracts':          'Contracts',
      'ws.nav.identity':           'Users & Access',
      'ws.nav.sso-mfa':            'SSO & MFA',
      'ws.nav.security':           'Security Dashboard',
      'ws.nav.audit':              'Audit Log',
      'ws.nav.knowledge':          'Knowledge Hub',
      'ws.nav.automation':         'Automation',
      'ws.nav.billing':            'Billing',
      'ws.nav.service-accounts':   'Service Accounts',
      'ws.nav.help':               'Help Centre',
      'ws.nav.settings':           'Settings',
      'ws.nav.governance':         'Governance',
      'ws.nav.observatory':        'AI Observatory',
      'ws.nav.members':            'Members',
      'ws.nav.finance':            'Finance',
      'ws.nav.soon':               'Soon',

      /* Nav sections */
      'ws.section.diagnostic':     'Diagnostic & AI',
      'ws.section.decisions':      'Decision Intelligence',
      'ws.section.governance':     'Governance',
      'ws.section.direction':      'Executive View',
      'ws.section.intel':          'Enterprise Intelligence',
      'ws.section.sales':          'Sales Intelligence',
      'ws.section.marketplace':    'Marketplace',
      'ws.section.integrations':   'Integration Hub',
      'ws.section.org':            'Organisation',
      'ws.section.finance':        'Finance & Contracts',
      'ws.section.identity':       'Identity & Access',
      'ws.section.security':       'Security Center',
      'ws.section.productivity':   'Productivity',
      'ws.section.admin':          'Administration',

      /* User menu */
      'ws.user.profile':           'My profile',
      'ws.user.settings':          'My organisation',
      'ws.user.logout':            'Sign out',
      'ws.user.lang':              'Language / Langue',
      'ws.user.notifications':     'Notification preferences',
      'ws.user.invite':            'Invite a user',
      'ws.user.support':           'Support',

      /* Topbar panels */
      'ws.notif.title':            'Notifications',
      'ws.notif.mark_all':         'Mark all as read',

      /* Help panel */
      'ws.help.title':             'Help Centre',
      'ws.help.docs':              'Documentation',
      'ws.help.docs.sub':          'Guides & tutorials',
      'ws.help.videos':            'Video tutorials',
      'ws.help.videos.sub':        'Learn at your own pace',
      'ws.help.faq':               'FAQ',
      'ws.help.faq.sub':           'Frequently asked questions',
      'ws.help.atlas':             'Chat with ATLAS',
      'ws.help.atlas.sub':         'Your AI advisor 24/7',
      'ws.help.contact':           'Contact support',
      'ws.help.contact.sub':       'Mon–Fri 9am–5pm EST',

      /* Settings panel */
      'ws.settings.title':         'Quick settings',
      'ws.settings.prefs':         'Preferences',
      'ws.settings.theme':         'Theme',
      'ws.settings.theme.sub':     'Light (dark: coming soon)',
      'ws.settings.org':           'Organisation',
      'ws.settings.org.sub':       'Manage settings',
      'ws.settings.teams':         'Users & teams',
      'ws.settings.teams.sub':     'Invitations & roles',
      'ws.settings.apikeys':       'API Keys',
      'ws.settings.apikeys.sub':   'Developer access (coming soon)',

      /* Roles */
      'ws.role.owner':             'Owner',
      'ws.role.admin':             'Administrator',
      'ws.role.manager':           'Manager',
      'ws.role.user':              'User',
      'ws.role.collaborator':      'Collaborator',

      /* ── Welcome screen ──────────────────────────────────────────────── */
      'welcome.tagline':          'Enterprise AI Workspace',
      'welcome.atlas.status':     'Preparing your intelligent environment…',
      'welcome.step.0':           'Loading your organisation',
      'welcome.step.1':           'Initialising AI agents',
      'welcome.step.2':           'Checking connectors',
      'welcome.step.3':           'Analysing indicators',
      'welcome.step.4':           'Securing your session',
      'welcome.final':            'Welcome to AgentHub.',
      'welcome.skip':             'Go to dashboard →',

      /* ── Session / idle ──────────────────────────────────────────────── */
      'idle.title':               'Inactive session',
      'idle.sub':                 'You appear to be away. Your session will be closed automatically to protect your data.',
      'idle.desc':                'For security reasons, your session will close in',
      'idle.unit':                'seconds.',
      'idle.stay':                'Stay signed in',
      'idle.logout':              'Sign out',
    },
  };

  // ── Moteur i18n ────────────────────────────────────────────────────────────

  const I18N = {
    _lang: 'fr',
    _cbs: [],

    /** Retourne la traduction d'une clé, fallback FR si clé manquante. */
    t(key) {
      return (S[this._lang] || {})[key] || S.fr[key] || key;
    },

    get lang() { return this._lang; },

    /** Change la langue, applique au DOM, persiste dans localStorage. */
    setLang(lang, persist = true) {
      if (!S[lang]) return;
      this._lang = lang;
      if (persist) {
        try { localStorage.setItem('nh_lang', lang); } catch {}
      }
      this._apply();
      document.documentElement.lang = lang;
      // Mettre à jour tous les toggles dans la page
      document.querySelectorAll('.nh-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
      });
      this._cbs.forEach(fn => { try { fn(lang); } catch {} });
    },

    /** Écoute les changements de langue. */
    on(fn) { this._cbs.push(fn); },

    /** Applique les traductions à tous les éléments data-i18n du DOM. */
    _apply() {
      const lang = this._lang;
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const v = this.t(el.dataset.i18n);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = v; // rare, mais possible
        } else {
          el.textContent = v;
        }
      });
      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = this.t(el.dataset.i18nHtml);
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.placeholder = this.t(el.dataset.i18nPh);
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        el.setAttribute('aria-label', this.t(el.dataset.i18nAria));
      });
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = this.t(el.dataset.i18nTitle);
      });
    },

    /** Initialise : détecte la langue préférée et applique au DOM. */
    init() {
      let lang = 'fr';
      try {
        const stored = localStorage.getItem('nh_lang');
        if (stored && S[stored]) { lang = stored; }
        else {
          const browser = (navigator.language || 'fr').split('-')[0];
          if (S[browser]) lang = browser;
        }
      } catch {}
      this._lang = lang;

      const ready = () => {
        this._apply();
        document.documentElement.lang = lang;
        document.querySelectorAll('.nh-lang-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.lang === lang);
          btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready);
      } else {
        ready();
      }
    },
  };

  window.NH_I18N = I18N;
  I18N.init();
})();

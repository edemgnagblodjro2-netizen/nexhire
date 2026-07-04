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

      /* ── Dashboard ───────────────────────────────────────────────── */
      'db.demo.notice':           'Données de démonstration',
      'db.demo.notice.sub':       'Complétez votre premier diagnostic pour voir vos vraies métriques.',
      'db.greeting':              'Bonjour',
      'db.program':               'Programme Accélérateur IA',
      'db.hero.cta.start':        'Démarrer le diagnostic →',
      'db.hero.cta.view':         'Voir mes résultats →',
      'db.hero.assessed.prefix':  'Évalué le',
      'db.hero.empty':            '0 % complété · Complétez le diagnostic pour voir vos vrais résultats',
      'db.kpi.score':             'Score de maturité IA (IMAI)',
      'db.kpi.score.level':       'Niveau',
      'db.kpi.compliance':        'Conformité Loi 25',
      'db.kpi.compliance.delta':  '↗ +12 % vs le mois dernier',
      'db.kpi.actions':           'Actions prioritaires',
      'db.kpi.actions.delta':     '⚠️ À traiter · en retard',
      'db.kpi.users':             'Utilisateurs actifs',
      'db.kpi.users.delta':       '↗ +3 nouveaux ce mois-ci',
      'db.activity.title':        'Activité récente',
      'db.activity.diag.title':   'Diagnostic IA disponible',
      'db.activity.diag.meta':    'Évaluez la maturité IA de votre organisation',
      'db.activity.diag.done':    'Diagnostic complété',
      'db.activity.atlas.title':  'ATLAS est prêt',
      'db.activity.atlas.meta':   'Votre copilote IA personnel vous attend',
      'db.activity.atlas.recs':   'Consultez vos recommandations personnalisées',
      'db.activity.report.title': 'Rapport régional',
      'db.activity.report.meta':  'Synthèse de votre programme partenaire',
      'db.activity.now':          'Maintenant',
      'db.activity.available':    'Disponible',
      'db.actions.title':         'Actions rapides',
      'db.actions.diag.start':    'Démarrer le diagnostic',
      'db.actions.diag.redo':     'Refaire le diagnostic',
      'db.actions.diag.sub.start': 'Évaluer votre maturité IA',
      'db.actions.diag.sub.redo':  'Mesurer votre progression',
      'db.actions.obs.title':     'Observatoire IA',
      'db.actions.obs.sub':       'Tableau de bord du programme',
      'db.actions.report.title':  'Rapport régional',
      'db.actions.report.sub':    'Synthèse du programme',
      'db.chart.imai.title':      'Évolution du score IMAI',
      'db.chart.period.6m':       '6 derniers mois',
      'db.chart.period.12m':      '12 mois',
      'db.chart.donut.title':     'Répartition par dimension',
      'db.chart.detail.title':    'Détail dimension',
      'db.chart.score.global':    '/100 · Score global',
      'db.chart.click.hint':      'Cliquez sur un segment du graphe ou une ligne de la légende pour voir le détail par dimension.',
      'db.chart.obs.full':        "🔭 Voir l'Observatoire complet →",
      'db.chart.obs.go':          "🔭 Voir dans l'Observatoire →",
      'db.donut.center':          'Score IMAI',
      'db.level.debutant':        'Débutant',
      'db.level.intermediaire':   'Intermédiaire',
      'db.level.avance':          'Avancé',
      'db.dim.strategie':         'Stratégie',
      'db.dim.personnes':         'Personnes',
      'db.dim.processus':         'Processus',
      'db.dim.technologies':      'Technologies',
      'db.dim.gouvernance':       'Gouvernance',
      'db.dim.strategie.text':    'Définissez vos objectifs IA à 6 et 12 mois avec une feuille de route claire et des indicateurs mesurables.',
      'db.dim.personnes.text':    'Identifiez un champion IA dans votre équipe et planifiez la montée en compétences de votre organisation.',
      'db.dim.processus.text':    "Cartographiez vos tâches répétitives à fort potentiel d'automatisation et priorisez les gains rapides.",
      'db.dim.technologies.text': "Évaluez vos outils actuels et identifiez les solutions IA adaptées à votre secteur d'activité.",
      'db.dim.gouvernance.text':  "Complétez la checklist Loi 25, rédigez votre politique d'utilisation de l'IA et inventoriez vos outils.",
      'db.atlas.title.demo':      'Recommandations prioritaires',
      'db.atlas.title.real':      "Vos priorités d'action personnalisées",
      'db.atlas.demo.badge':      'Démo',
      'db.rec.strategie.text':    "Organisez un atelier de 2 h pour cartographier 3 cas d'usage IA à fort potentiel dans les 30 prochains jours.",
      'db.rec.personnes.text':    "Identifiez un « champion numérique » dans votre équipe et évaluez les compétences IA actuelles de l'organisation.",
      'db.rec.gouvernance.text':  "Prenez connaissance de la Loi 25 et vos obligations concernant la protection des renseignements personnels avec l'IA.",

      /* ── Settings ────────────────────────────────────────────────── */
      'st.title':                  'Paramètres',
      'st.sub':                    'Configuration de votre organisation et de votre compte.',
      'st.loading':                'Chargement…',
      'st.cancel':                 'Annuler',

      /* Onglets */
      'st.tab.organisation':       'Organisation',
      'st.tab.branding':           'Branding',
      'st.tab.utilisateurs':       'Utilisateurs',
      'st.tab.equipes':            'Équipes',
      'st.tab.langue':             'Langue & Région',
      'st.tab.theme':              'Thème',
      'st.tab.notifications':      'Notifications',
      'st.tab.securite':           'Sécurité',
      'st.tab.api':                "API & Intégrations",
      'st.tab.journal':            "Journal d'audit",

      /* Tab Organisation */
      'st.org.title':              'Votre organisation',
      'st.org.name.label':         "Nom de l'organisation",
      'st.org.type.label':         "Type d'organisation",
      'st.org.slug.label':         'Identifiant (slug)',
      'st.org.plan.label':         'Plan',
      'st.org.save':               'Enregistrer',
      'st.org.type.entreprise':    'Entreprise',
      'st.org.type.entrepreneur':  'Entrepreneur / Freelance',
      'st.org.type.hopital':       'Hôpital / CISSS',
      'st.org.type.municipalite':  'Municipalité',
      'st.org.type.universite':    'Université / Cégep',
      'st.org.info.name':          'Nom',
      'st.org.info.slug':          'Slug',
      'st.org.info.plan':          'Plan',
      'st.profile.title':          'Votre profil',
      'st.profile.name.label':     'Nom complet',
      'st.profile.email.label':    'Adresse email',
      'st.profile.role.label':     'Rôle',
      'st.profile.since.label':    'Membre depuis',
      'st.profile.save':           'Mettre à jour le profil',

      /* Tab Branding */
      'st.brand.logo.title':       "Logo de l'organisation",
      'st.brand.logo.none':        'Aucun logo',
      'st.brand.logo.choose':      '📁 Choisir un fichier',
      'st.brand.logo.hint':        'PNG, JPG ou SVG · Max 2 Mo',
      'st.brand.color.title':      'Couleur principale',
      'st.brand.color.apply':      'Appliquer',
      'st.brand.color.hint':       'La couleur est appliquée immédiatement dans le workspace.',

      /* Tab Utilisateurs */
      'st.users.loading':          'Chargement des membres…',
      'st.users.member.one':       'membre',
      'st.users.member.many':      'membres',
      'st.users.invite.btn':       '+ Inviter',
      'st.users.col.member':       'Membre',
      'st.users.col.role':         'Rôle',
      'st.users.col.status':       'Statut',
      'st.users.col.actions':      'Actions',
      'st.users.active':           'Actif',
      'st.users.inactive':         'Inactif',
      'st.users.deactivate':       'Désactiver',
      'st.users.reactivate':       'Réactiver',
      'st.users.delete':           'Supprimer',
      'st.users.modal.title':      'Inviter un utilisateur',
      'st.users.email.label':      'Adresse email',
      'st.users.role.label':       'Rôle initial',
      'st.users.role.user':        'Utilisateur',
      'st.users.role.manager':     'Manager',
      'st.users.role.admin':       'Administrateur',
      'st.users.invite.send':      "Envoyer l'invitation",

      /* Tab Équipes */
      'st.teams.loading':          'Chargement des équipes…',
      'st.teams.team.one':         'équipe',
      'st.teams.team.many':        'équipes',
      'st.teams.create.btn':       '+ Créer',
      'st.teams.empty':            'Aucune équipe configurée.',
      'st.teams.member.one':       'membre',
      'st.teams.member.many':      'membres',
      'st.teams.name.label':       "Nom de l'équipe",
      'st.teams.name.ph':          'ex. Équipe marketing',
      'st.teams.create.save':      "Créer l'équipe",

      /* Tab Langue */
      'st.lang.title':             'Langue & Région',
      'st.lang.lang.label':        "Langue de l'interface",
      'st.lang.tz.label':          'Fuseau horaire',
      'st.lang.save':              'Enregistrer',
      'st.lang.hint':              "La langue sélectionnée est appliquée immédiatement à l'interface.",
      'st.tz.toronto':             "Canada — Heure de l'Est (Montréal / Toronto / Ottawa)",
      'st.tz.winnipeg':            'Canada — Heure du Centre (Winnipeg)',
      'st.tz.edmonton':            'Canada — Heure des Rocheuses (Calgary / Edmonton)',
      'st.tz.vancouver':           'Canada — Heure du Pacifique (Vancouver)',
      'st.tz.halifax':             "Canada — Heure de l'Atlantique (Halifax)",
      'st.tz.stjohns':             "Canada — Heure de Terre-Neuve (St. John's)",
      'st.tz.utc':                 'UTC — Temps universel coordonné',
      'st.tz.paris':               'Europe — Paris / Bruxelles / Genève',

      /* Tab Thème */
      'st.theme.title':            "Thème de l'interface",
      'st.theme.light':            'Clair',
      'st.theme.dark':             'Sombre',
      'st.theme.system':           'Système',
      'st.theme.hint':             "Le thème s'applique immédiatement et est mémorisé pour vos prochaines visites.",

      /* Tab Notifications */
      'st.notif.title':            'Rapports automatiques par email',
      'st.notif.monthly.title':    '📊 Rapport mensuel de performance',
      'st.notif.monthly.desc':     'Synthèse IA mensuelle : score IMAI, indicateurs clés, recommandations prioritaires. Envoyé le 1er de chaque mois.',
      'st.notif.weekly.title':     '📋 Briefing exécutif hebdomadaire',
      'st.notif.weekly.desc':      'Résumé du lundi matin : alertes actives, contrats à renouveler, indicateurs de sécurité.',
      'st.notif.contracts.title':  '⚠️ Alertes contrats et licences',
      'st.notif.contracts.desc':   "Notification automatique 30 jours avant l'expiration d'un contrat ou d'une licence.",
      'st.notif.always':           'Toujours actif',

      /* Tab Sécurité */
      'st.sec.title':              'Accès et sécurité',
      'st.sec.auth':               'Authentification',
      'st.sec.auth.val':           '✓ Activée',
      'st.sec.tls':                'HTTPS / TLS',
      'st.sec.tls.val':            '✓ Forcé',
      'st.sec.isolation':          'Isolation des données',
      'st.sec.isolation.val':      '✓ Multi-tenant isolé',
      'st.sec.host':               'Hébergement',
      'st.sec.host.val':           'Canada — Infrastructure sécurisée',
      'st.sec.compliance':         'Conformité',
      'st.sec.compliance.val':     'Loi 25 du Québec',
      'st.sec.sso':                'SSO / Entra ID',
      'st.sec.sso.ok':             '✓ Configuré',
      'st.sec.sso.off':            'Non configuré',
      'st.sec.pwd.title':          'Modifier le mot de passe',
      'st.sec.pwd.current':        'Mot de passe actuel',
      'st.sec.pwd.new':            'Nouveau mot de passe',
      'st.sec.pwd.confirm':        'Confirmer le mot de passe',
      'st.sec.pwd.save':           'Changer le mot de passe',

      /* Tab API */
      'st.api.title':              'API & Intégrations',
      'st.api.desc':               "Gérez vos clés d'accès API pour connecter AgentHub à vos outils externes (Zapier, Make, outils internes).",
      'st.api.sa.title':           'Service Accounts & Clés API',
      'st.api.sa.desc':            'Créez et gérez vos tokens depuis le module dédié.',
      'st.api.sa.btn':             'Gérer les accès API →',

      /* Tab Journal */
      'st.journal.title':          "Journal d'audit",
      'st.journal.desc':           'Historique complet de toutes les actions dans votre workspace : connexions, modifications, suppressions.',
      'st.journal.full.title':     "Journal d'audit complet",
      'st.journal.full.desc':      "Consultez l'historique détaillé depuis le module Audit.",
      'st.journal.full.btn':       'Voir le journal →',

      /* Messages de retour */
      'st.msg.org.saved':          'Organisation mise à jour.',
      'st.msg.profile.saved':      'Profil mis à jour.',
      'st.msg.logo.saved':         'Logo mis à jour.',
      'st.msg.color.saved':        'Couleur mise à jour.',
      'st.msg.role.saved':         'Rôle mis à jour.',
      'st.msg.member.deleted':     'Membre supprimé.',
      'st.msg.member.activated':   'Membre réactivé.',
      'st.msg.member.deactivated': 'Membre désactivé.',
      'st.msg.team.created':       'Équipe créée.',
      'st.msg.lang.saved':         'Préférences régionales enregistrées.',
      'st.msg.report.on':          '✅ Rapport mensuel activé.',
      'st.msg.report.off':         '✅ Rapport mensuel désactivé.',
      'st.msg.pwd.saved':          '✅ Mot de passe modifié avec succès.',
      'st.msg.pwd.mismatch':       'Les mots de passe ne correspondent pas.',
      'st.msg.invite.prefix':      'Invitation envoyée à',
      'st.msg.confirm.delete':     'Supprimer définitivement ce membre ? Cette action est irréversible.',
      'st.msg.error.prefix':       'Erreur :',


      /* ── Knowledge Hub ───────────────────────────────────────────── */
      'kh.title':                  'Knowledge Hub',
      'kh.sub':                    'Base de connaissance organisationnelle — documents indexés, recherche sémantique, synchronisation M365',
      'kh.tab.search':             'Recherche IA',
      'kh.tab.docs':               'Documents',
      'kh.tab.m365':               'Microsoft 365',

      /* Recherche */
      'kh.search.placeholder':     'Ex. : Quelle est notre politique de télétravail ?',
      'kh.search.btn':             'Rechercher',
      'kh.search.loading':         'Recherche…',
      'kh.search.answer.label':    '✨ Réponse ATLAS Knowledge',
      'kh.search.sources':         'Sources utilisées',

      /* Documents — formulaire upload */
      'kh.docs.file.label':        'Fichier sélectionné',
      'kh.docs.file.unit':         'Ko',
      'kh.docs.title.label':       'Titre (optionnel)',
      'kh.docs.title.ph':          'Laisser vide pour utiliser le nom du fichier',
      'kh.docs.index.btn':         'Indexer le document',
      'kh.docs.index.loading':     'Indexation…',
      'kh.docs.cancel':            'Annuler',
      'kh.docs.drop.title':        'Glissez un fichier ici ou cliquez pour sélectionner',
      'kh.docs.drop.formats':      'Formats supportés : PDF, TXT, MD',

      /* Documents — liste */
      'kh.docs.doc.one':           'document indexé',
      'kh.docs.doc.many':          'documents indexés',
      'kh.docs.empty.title':       'Aucun document indexé',
      'kh.docs.empty.hint':        'Uploadez des PDF ou synchronisez SharePoint pour alimenter la base de connaissance.',
      'kh.docs.chunk.one':         'fragment',
      'kh.docs.chunk.many':        'fragments',
      'kh.docs.delete.title':      'Supprimer',
      'kh.docs.indexed.ok':        'indexé',
      'kh.docs.confirm.del.pre':   'Supprimer «',
      'kh.docs.confirm.del.suf':   '» de la base de connaissance ?',

      /* M365 */
      'kh.m365.section':           'Sites SharePoint',
      'kh.m365.discover.btn':      '🔍 Découvrir les sites',
      'kh.m365.discover.loading':  'Détection…',
      'kh.m365.sync.btn':          '🔄 Synchroniser M365',
      'kh.m365.sync.loading':      'Synchronisation…',
      'kh.m365.save.btn':          '💾 Sauvegarder',
      'kh.m365.empty.title':       'Mappages SharePoint',
      'kh.m365.empty.hint':        'Cliquez sur « Découvrir les sites » pour détecter vos bibliothèques et les associer aux départements.',
      'kh.m365.col.site':          'Site SharePoint',
      'kh.m365.col.dept':          'Département associé',
      'kh.m365.all.org':           '— Organisation entière —',
      'kh.m365.nosites.title':     'Aucun site détecté.',
      'kh.m365.nosites.hint':      'Vérifiez que votre connecteur M365 est actif dans le module Intégrations.',
      'kh.m365.confirm.sync':      'Lancer la synchronisation M365 ? Les documents SharePoint seront ré-indexés.',
      'kh.m365.saved.ok':          '✅ Mappages enregistrés.',
      'kh.m365.site.one':          'site détecté',
      'kh.m365.site.many':         'sites détectés',
      'kh.m365.synced.done':       'Terminé',
      'kh.m365.indexed':           'indexé',

      /* Erreurs */
      'kh.error.prefix':           'Erreur',

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

      /* ── Dashboard ───────────────────────────────────────────────── */
      'db.demo.notice':           'Demo data',
      'db.demo.notice.sub':       'Complete your first diagnostic to see your real metrics.',
      'db.greeting':              'Hello',
      'db.program':               'AI Accelerator Programme',
      'db.hero.cta.start':        'Start diagnostic →',
      'db.hero.cta.view':         'View my results →',
      'db.hero.assessed.prefix':  'Assessed on',
      'db.hero.empty':            '0% completed · Complete the diagnostic to see your real results',
      'db.kpi.score':             'AI Maturity Score (IMAI)',
      'db.kpi.score.level':       'Level',
      'db.kpi.compliance':        'Law 25 Compliance',
      'db.kpi.compliance.delta':  '↗ +12% vs last month',
      'db.kpi.actions':           'Priority actions',
      'db.kpi.actions.delta':     '⚠️ To address · overdue',
      'db.kpi.users':             'Active users',
      'db.kpi.users.delta':       '↗ +3 new this month',
      'db.activity.title':        'Recent activity',
      'db.activity.diag.title':   'AI Diagnostic available',
      'db.activity.diag.meta':    "Assess your organisation's AI maturity",
      'db.activity.diag.done':    'Diagnostic completed',
      'db.activity.atlas.title':  'ATLAS is ready',
      'db.activity.atlas.meta':   'Your personal AI copilot is waiting',
      'db.activity.atlas.recs':   'View your personalized recommendations',
      'db.activity.report.title': 'Regional report',
      'db.activity.report.meta':  'Summary of your partner programme',
      'db.activity.now':          'Now',
      'db.activity.available':    'Available',
      'db.actions.title':         'Quick actions',
      'db.actions.diag.start':    'Start diagnostic',
      'db.actions.diag.redo':     'Redo diagnostic',
      'db.actions.diag.sub.start': 'Assess your AI maturity',
      'db.actions.diag.sub.redo':  'Measure your progress',
      'db.actions.obs.title':     'AI Observatory',
      'db.actions.obs.sub':       'Programme dashboard',
      'db.actions.report.title':  'Regional report',
      'db.actions.report.sub':    'Programme summary',
      'db.chart.imai.title':      'IMAI score evolution',
      'db.chart.period.6m':       'Last 6 months',
      'db.chart.period.12m':      '12 months',
      'db.chart.donut.title':     'Breakdown by dimension',
      'db.chart.detail.title':    'Dimension detail',
      'db.chart.score.global':    '/100 · Global score',
      'db.chart.click.hint':      'Click a chart segment or legend row to see the breakdown by dimension.',
      'db.chart.obs.full':        '🔭 View full Observatory →',
      'db.chart.obs.go':          '🔭 View in Observatory →',
      'db.donut.center':          'IMAI Score',
      'db.level.debutant':        'Beginner',
      'db.level.intermediaire':   'Intermediate',
      'db.level.avance':          'Advanced',
      'db.dim.strategie':         'Strategy',
      'db.dim.personnes':         'People',
      'db.dim.processus':         'Processes',
      'db.dim.technologies':      'Technologies',
      'db.dim.gouvernance':       'Governance',
      'db.dim.strategie.text':    'Define your AI goals for the next 6 and 12 months with a clear roadmap and measurable indicators.',
      'db.dim.personnes.text':    "Identify an AI champion in your team and plan your organisation's skills development.",
      'db.dim.processus.text':    'Map your repetitive tasks with high automation potential and prioritize quick wins.',
      'db.dim.technologies.text': 'Assess your current tools and identify AI solutions suited to your industry.',
      'db.dim.gouvernance.text':  'Complete the Law 25 checklist, draft your AI usage policy, and inventory your tools.',
      'db.atlas.title.demo':      'Priority recommendations',
      'db.atlas.title.real':      'Your personalized action priorities',
      'db.atlas.demo.badge':      'Demo',
      'db.rec.strategie.text':    'Organise a 2-hour workshop to map 3 high-potential AI use cases in the next 30 days.',
      'db.rec.personnes.text':    "Identify a 'digital champion' in your team and assess your organisation's current AI competencies.",
      'db.rec.gouvernance.text':  'Familiarize yourself with Law 25 and your obligations regarding personal data protection with AI.',

      /* ── Settings ────────────────────────────────────────────────── */
      'st.title':                  'Settings',
      'st.sub':                    'Configure your organisation and account.',
      'st.loading':                'Loading…',
      'st.cancel':                 'Cancel',

      /* Tabs */
      'st.tab.organisation':       'Organisation',
      'st.tab.branding':           'Branding',
      'st.tab.utilisateurs':       'Users',
      'st.tab.equipes':            'Teams',
      'st.tab.langue':             'Language & Region',
      'st.tab.theme':              'Theme',
      'st.tab.notifications':      'Notifications',
      'st.tab.securite':           'Security',
      'st.tab.api':                'API & Integrations',
      'st.tab.journal':            'Audit Log',

      /* Tab Organisation */
      'st.org.title':              'Your organisation',
      'st.org.name.label':         'Organisation name',
      'st.org.type.label':         'Organisation type',
      'st.org.slug.label':         'Identifier (slug)',
      'st.org.plan.label':         'Plan',
      'st.org.save':               'Save',
      'st.org.type.entreprise':    'Company',
      'st.org.type.entrepreneur':  'Entrepreneur / Freelancer',
      'st.org.type.hopital':       'Hospital / Health Centre',
      'st.org.type.municipalite':  'Municipality',
      'st.org.type.universite':    'University / College',
      'st.org.info.name':          'Name',
      'st.org.info.slug':          'Slug',
      'st.org.info.plan':          'Plan',
      'st.profile.title':          'Your profile',
      'st.profile.name.label':     'Full name',
      'st.profile.email.label':    'Email address',
      'st.profile.role.label':     'Role',
      'st.profile.since.label':    'Member since',
      'st.profile.save':           'Update profile',

      /* Tab Branding */
      'st.brand.logo.title':       'Organisation logo',
      'st.brand.logo.none':        'No logo',
      'st.brand.logo.choose':      '📁 Choose a file',
      'st.brand.logo.hint':        'PNG, JPG or SVG · Max 2 MB',
      'st.brand.color.title':      'Primary colour',
      'st.brand.color.apply':      'Apply',
      'st.brand.color.hint':       'The colour is applied immediately in the workspace.',

      /* Tab Users */
      'st.users.loading':          'Loading members…',
      'st.users.member.one':       'member',
      'st.users.member.many':      'members',
      'st.users.invite.btn':       '+ Invite',
      'st.users.col.member':       'Member',
      'st.users.col.role':         'Role',
      'st.users.col.status':       'Status',
      'st.users.col.actions':      'Actions',
      'st.users.active':           'Active',
      'st.users.inactive':         'Inactive',
      'st.users.deactivate':       'Deactivate',
      'st.users.reactivate':       'Reactivate',
      'st.users.delete':           'Delete',
      'st.users.modal.title':      'Invite a user',
      'st.users.email.label':      'Email address',
      'st.users.role.label':       'Initial role',
      'st.users.role.user':        'User',
      'st.users.role.manager':     'Manager',
      'st.users.role.admin':       'Administrator',
      'st.users.invite.send':      'Send invitation',

      /* Tab Teams */
      'st.teams.loading':          'Loading teams…',
      'st.teams.team.one':         'team',
      'st.teams.team.many':        'teams',
      'st.teams.create.btn':       '+ Create',
      'st.teams.empty':            'No teams configured.',
      'st.teams.member.one':       'member',
      'st.teams.member.many':      'members',
      'st.teams.name.label':       'Team name',
      'st.teams.name.ph':          'e.g. Marketing team',
      'st.teams.create.save':      'Create team',

      /* Tab Language */
      'st.lang.title':             'Language & Region',
      'st.lang.lang.label':        'Interface language',
      'st.lang.tz.label':          'Time zone',
      'st.lang.save':              'Save',
      'st.lang.hint':              'The selected language is applied immediately to the interface.',
      'st.tz.toronto':             'Canada — Eastern Time (Montréal / Toronto / Ottawa)',
      'st.tz.winnipeg':            'Canada — Central Time (Winnipeg)',
      'st.tz.edmonton':            'Canada — Mountain Time (Calgary / Edmonton)',
      'st.tz.vancouver':           'Canada — Pacific Time (Vancouver)',
      'st.tz.halifax':             'Canada — Atlantic Time (Halifax)',
      'st.tz.stjohns':             "Canada — Newfoundland Time (St. John's)",
      'st.tz.utc':                 'UTC — Coordinated Universal Time',
      'st.tz.paris':               'Europe — Paris / Brussels / Geneva',

      /* Tab Theme */
      'st.theme.title':            'Interface theme',
      'st.theme.light':            'Light',
      'st.theme.dark':             'Dark',
      'st.theme.system':           'System',
      'st.theme.hint':             'The theme is applied immediately and remembered for your next visits.',

      /* Tab Notifications */
      'st.notif.title':            'Automatic email reports',
      'st.notif.monthly.title':    '📊 Monthly performance report',
      'st.notif.monthly.desc':     'Monthly AI summary: IMAI score, key indicators, priority recommendations. Sent on the 1st of each month.',
      'st.notif.weekly.title':     '📋 Weekly executive briefing',
      'st.notif.weekly.desc':      'Monday morning summary: active alerts, contracts to renew, security indicators.',
      'st.notif.contracts.title':  '⚠️ Contract and licence alerts',
      'st.notif.contracts.desc':   'Automatic notification 30 days before a contract or licence expires.',
      'st.notif.always':           'Always active',

      /* Tab Security */
      'st.sec.title':              'Access and security',
      'st.sec.auth':               'Authentication',
      'st.sec.auth.val':           '✓ Enabled',
      'st.sec.tls':                'HTTPS / TLS',
      'st.sec.tls.val':            '✓ Enforced',
      'st.sec.isolation':          'Data isolation',
      'st.sec.isolation.val':      '✓ Multi-tenant isolated',
      'st.sec.host':               'Hosting',
      'st.sec.host.val':           'Canada — Secure infrastructure',
      'st.sec.compliance':         'Compliance',
      'st.sec.compliance.val':     'Québec Law 25',
      'st.sec.sso':                'SSO / Entra ID',
      'st.sec.sso.ok':             '✓ Configured',
      'st.sec.sso.off':            'Not configured',
      'st.sec.pwd.title':          'Change password',
      'st.sec.pwd.current':        'Current password',
      'st.sec.pwd.new':            'New password',
      'st.sec.pwd.confirm':        'Confirm password',
      'st.sec.pwd.save':           'Change password',

      /* Tab API */
      'st.api.title':              'API & Integrations',
      'st.api.desc':               'Manage your API access keys to connect AgentHub to your external tools (Zapier, Make, internal tools).',
      'st.api.sa.title':           'Service Accounts & API Keys',
      'st.api.sa.desc':            'Create and manage your tokens from the dedicated module.',
      'st.api.sa.btn':             'Manage API access →',

      /* Tab Audit Log */
      'st.journal.title':          'Audit log',
      'st.journal.desc':           'Full history of all actions in your workspace: logins, modifications, deletions.',
      'st.journal.full.title':     'Complete audit log',
      'st.journal.full.desc':      'View the detailed history from the Audit module.',
      'st.journal.full.btn':       'View log →',

      /* Feedback messages */
      'st.msg.org.saved':          'Organisation updated.',
      'st.msg.profile.saved':      'Profile updated.',
      'st.msg.logo.saved':         'Logo updated.',
      'st.msg.color.saved':        'Colour updated.',
      'st.msg.role.saved':         'Role updated.',
      'st.msg.member.deleted':     'Member deleted.',
      'st.msg.member.activated':   'Member reactivated.',
      'st.msg.member.deactivated': 'Member deactivated.',
      'st.msg.team.created':       'Team created.',
      'st.msg.lang.saved':         'Regional preferences saved.',
      'st.msg.report.on':          '✅ Monthly report enabled.',
      'st.msg.report.off':         '✅ Monthly report disabled.',
      'st.msg.pwd.saved':          '✅ Password changed successfully.',
      'st.msg.pwd.mismatch':       'Passwords do not match.',
      'st.msg.invite.prefix':      'Invitation sent to',
      'st.msg.confirm.delete':     'Permanently delete this member? This action is irreversible.',
      'st.msg.error.prefix':       'Error:',


      /* ── Knowledge Hub ───────────────────────────────────────────── */
      'kh.title':                  'Knowledge Hub',
      'kh.sub':                    'Organisational knowledge base — indexed documents, semantic search, M365 sync',
      'kh.tab.search':             'AI Search',
      'kh.tab.docs':               'Documents',
      'kh.tab.m365':               'Microsoft 365',

      /* Search */
      'kh.search.placeholder':     'E.g.: What is our remote work policy?',
      'kh.search.btn':             'Search',
      'kh.search.loading':         'Searching…',
      'kh.search.answer.label':    '✨ ATLAS Knowledge Answer',
      'kh.search.sources':         'Sources used',

      /* Documents — upload form */
      'kh.docs.file.label':        'Selected file',
      'kh.docs.file.unit':         'KB',
      'kh.docs.title.label':       'Title (optional)',
      'kh.docs.title.ph':          'Leave blank to use the file name',
      'kh.docs.index.btn':         'Index document',
      'kh.docs.index.loading':     'Indexing…',
      'kh.docs.cancel':            'Cancel',
      'kh.docs.drop.title':        'Drag a file here or click to select',
      'kh.docs.drop.formats':      'Supported formats: PDF, TXT, MD',

      /* Documents — list */
      'kh.docs.doc.one':           'indexed document',
      'kh.docs.doc.many':          'indexed documents',
      'kh.docs.empty.title':       'No indexed documents',
      'kh.docs.empty.hint':        'Upload PDFs or sync SharePoint to populate the knowledge base.',
      'kh.docs.chunk.one':         'chunk',
      'kh.docs.chunk.many':        'chunks',
      'kh.docs.delete.title':      'Delete',
      'kh.docs.indexed.ok':        'indexed',
      'kh.docs.confirm.del.pre':   'Delete «',
      'kh.docs.confirm.del.suf':   '» from the knowledge base?',

      /* M365 */
      'kh.m365.section':           'SharePoint Sites',
      'kh.m365.discover.btn':      '🔍 Discover sites',
      'kh.m365.discover.loading':  'Detecting…',
      'kh.m365.sync.btn':          '🔄 Sync M365',
      'kh.m365.sync.loading':      'Syncing…',
      'kh.m365.save.btn':          '💾 Save',
      'kh.m365.empty.title':       'SharePoint Mappings',
      'kh.m365.empty.hint':        'Click "Discover sites" to detect your libraries and map them to departments.',
      'kh.m365.col.site':          'SharePoint Site',
      'kh.m365.col.dept':          'Associated department',
      'kh.m365.all.org':           '— Entire organisation —',
      'kh.m365.nosites.title':     'No sites detected.',
      'kh.m365.nosites.hint':      'Check that your M365 connector is active in the Integrations module.',
      'kh.m365.confirm.sync':      'Start M365 sync? SharePoint documents will be re-indexed.',
      'kh.m365.saved.ok':          '✅ Mappings saved.',
      'kh.m365.site.one':          'site detected',
      'kh.m365.site.many':         'sites detected',
      'kh.m365.synced.done':       'Done',
      'kh.m365.indexed':           'indexed',

      /* Errors */
      'kh.error.prefix':           'Error',

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

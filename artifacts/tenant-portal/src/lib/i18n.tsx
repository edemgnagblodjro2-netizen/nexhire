import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

const T = {
  fr: {
    portalName: "CivicAI Portal",
    tagline: "Gérez vos produits et services CivicAI",
    signIn: "Se connecter",
    signInTitle: "Connexion",
    signInDesc: "Entrez vos identifiants pour accéder à votre compte.",
    signingIn: "Connexion en cours…",
    signOut: "Déconnexion",
    noAccount: "Pas encore de compte ?",
    registerLink: "Créer une organisation",
    orgCode: "Code organisation",
    orgCodePlaceholder: "ex. ville-de-montreal",
    orgCodeDesc: "Votre identifiant unique fourni par CivicAI.",
    email: "Adresse courriel",
    password: "Mot de passe",
    loginSuccess: "Bienvenue",
    loginSuccessDesc: "Connexion réussie.",
    loginFailed: "Échec de connexion",
    loginFailedDesc: "Vérifiez vos identifiants et réessayez.",
    register: "Créer votre organisation",
    registerTitle: "Créer votre organisation",
    registerDesc: "Accédez à l'ensemble des produits et services CivicAI depuis un seul portail.",
    registering: "Inscription en cours…",
    createAccount: "Créer le compte",
    alreadyAccount: "Déjà un compte ?",
    loginLink: "Se connecter",
    firstName: "Prénom",
    lastName: "Nom",
    registerSuccess: "Compte créé",
    registerSuccessDesc: "Inscription et connexion réussies.",
    registerFailed: "Échec de l'inscription",
    registerFailedDesc: "Vérifiez vos informations et réessayez.",
    dashboard: "Tableau de bord",
    welcome: "Bienvenue",
    activeProducts: (n: number) => `${n} catégorie${n !== 1 ? "s" : ""} active${n !== 1 ? "s" : ""}`,
    activeServices: (n: number) => `${n} service${n !== 1 ? "s" : ""} actif${n !== 1 ? "s" : ""}`,
    yourProducts: "Vos catégories",
    yourServices: "Vos services",
    tenantDir: "Gestion tenants",
    activated: "Activé",
    inactive: "Inactif",
    addProduct: "Ajouter une catégorie",
    contactCivicAI: "Contacter CivicAI",
    products: {
      // Deployable apps
      constructpro:         { label: "ConstructPro",         desc: "ERP construction & chantiers" },
      attentezero:          { label: "AttenteZéro",          desc: "Services communautaires QC" },
      // CivicAI service categories
      "sites-web":          { label: "Sites web",            desc: "Présence digitale professionnelle" },
      "erp-gestion":        { label: "ERP & Gestion",        desc: "Pilotez vos opérations" },
      "marketing-digital":  { label: "Marketing digital",    desc: "Visibilité & croissance" },
      "automatisation-crm": { label: "Automatisation & CRM", desc: "Automatisez, connectez, scalez" },
    },
    services: {
      // Sites web
      "site-vitrine":             { label: "Site vitrine",        desc: "À partir de 800$" },
      "site-ecommerce":           { label: "Site e-commerce",     desc: "À partir de 1 500$" },
      "portail-mesure":           { label: "Portail sur mesure",  desc: "À partir de 2 500$" },
      "maintenance-mensuelle-web":{ label: "Maintenance mensuelle", desc: "Dès 100$/mois" },
      // ERP & Gestion
      "erp-starter":    { label: "Plan Starter",       desc: "99$/mois" },
      "erp-pro":        { label: "Plan Professionnel", desc: "249$/mois" },
      "erp-enterprise": { label: "Plan Entreprise",    desc: "499$/mois" },
      "erp-setup":      { label: "Setup & formation",  desc: "500$ à 1 500$" },
      // Marketing digital
      "marketing-strategie": { label: "Stratégie & conseil",   desc: "Dès 500$/mois" },
      "marketing-reseaux":   { label: "Réseaux sociaux",       desc: "Dès 400$/mois" },
      "marketing-ads":       { label: "Publicités (Ads)",      desc: "Dès 600$/mois" },
      "marketing-seo":       { label: "SEO & référencement",   desc: "Dès 450$/mois" },
      // Automatisation & CRM
      "auto-analyse":  { label: "Analyse & conception", desc: "Sur devis" },
      "auto-dev":      { label: "Développement",        desc: "Sur devis" },
      "auto-crm":      { label: "CRM sur mesure",       desc: "Sur devis" },
      "auto-support":  { label: "Support mensuel",      desc: "Dès 150$/mois" },
    },
    openApp: "Ouvrir l'app",
    profile: "Mon profil",
    profileTitle: "Profil & sécurité",
    displayName: "Nom affiché",
    saveChanges: "Enregistrer",
    saving: "Enregistrement…",
    changePassword: "Changer le mot de passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    profileSaved: "Profil mis à jour",
    passwordChanged: "Mot de passe modifié",
    wrongPassword: "Mot de passe actuel incorrect",
    modulesTitle: "Produits & services",
    modulesDesc: "Activez ou désactivez les modules pour cette organisation.",
    saveModules: "Enregistrer les modules",
    modulesSaved: "Modules mis à jour",
    required: (f: string) => `${f} est requis`,
    invalidEmail: "Adresse courriel invalide",
    passwordMin: "Mot de passe : 8 caractères minimum",
  },
  en: {
    portalName: "CivicAI Portal",
    tagline: "Manage your CivicAI products and services",
    signIn: "Sign in",
    signInTitle: "Sign in",
    signInDesc: "Enter your credentials to access your account.",
    signingIn: "Signing in…",
    signOut: "Sign out",
    noAccount: "Don't have an account?",
    registerLink: "Create an organisation",
    orgCode: "Organisation Code",
    orgCodePlaceholder: "e.g. city-of-montreal",
    orgCodeDesc: "Your unique organisation identifier provided by CivicAI.",
    email: "Email Address",
    password: "Password",
    loginSuccess: "Welcome back",
    loginSuccessDesc: "Successfully logged in.",
    loginFailed: "Login failed",
    loginFailedDesc: "Please check your credentials and try again.",
    register: "Create your organisation",
    registerTitle: "Create your organisation",
    registerDesc: "Access all CivicAI products and services from one portal.",
    registering: "Registering…",
    createAccount: "Create account",
    alreadyAccount: "Already have an account?",
    loginLink: "Sign in",
    firstName: "First name",
    lastName: "Last name",
    registerSuccess: "Account created",
    registerSuccessDesc: "Successfully registered and logged in.",
    registerFailed: "Registration failed",
    registerFailedDesc: "Please check your information and try again.",
    dashboard: "Dashboard",
    welcome: "Welcome",
    activeProducts: (n: number) => `${n} active categor${n !== 1 ? "ies" : "y"}`,
    activeServices: (n: number) => `${n} active service${n !== 1 ? "s" : ""}`,
    yourProducts: "Your categories",
    yourServices: "Your services",
    tenantDir: "Tenant directory",
    activated: "Active",
    inactive: "Inactive",
    addProduct: "Add a category",
    contactCivicAI: "Contact CivicAI",
    products: {
      constructpro:         { label: "ConstructPro",         desc: "Construction ERP & site management" },
      attentezero:          { label: "AttenteZéro",          desc: "Community services – Québec" },
      "sites-web":          { label: "Web Sites",            desc: "Professional digital presence" },
      "erp-gestion":        { label: "ERP & Management",     desc: "Run your operations" },
      "marketing-digital":  { label: "Digital Marketing",    desc: "Visibility & growth" },
      "automatisation-crm": { label: "Automation & CRM",     desc: "Automate, connect, scale" },
    },
    services: {
      "site-vitrine":             { label: "Showcase site",     desc: "From $800" },
      "site-ecommerce":           { label: "E-commerce site",   desc: "From $1,500" },
      "portail-mesure":           { label: "Custom portal",     desc: "From $2,500" },
      "maintenance-mensuelle-web":{ label: "Monthly maintenance", desc: "From $100/mo" },
      "erp-starter":    { label: "Starter Plan",       desc: "$99/mo" },
      "erp-pro":        { label: "Professional Plan",  desc: "$249/mo" },
      "erp-enterprise": { label: "Enterprise Plan",    desc: "$499/mo" },
      "erp-setup":      { label: "Setup & training",   desc: "$500 to $1,500" },
      "marketing-strategie": { label: "Strategy & consulting", desc: "From $500/mo" },
      "marketing-reseaux":   { label: "Social media",         desc: "From $400/mo" },
      "marketing-ads":       { label: "Paid ads",             desc: "From $600/mo" },
      "marketing-seo":       { label: "SEO",                  desc: "From $450/mo" },
      "auto-analyse":  { label: "Analysis & design", desc: "On quote" },
      "auto-dev":      { label: "Development",       desc: "On quote" },
      "auto-crm":      { label: "Custom CRM",        desc: "On quote" },
      "auto-support":  { label: "Monthly support",   desc: "From $150/mo" },
    },
    openApp: "Open app",
    profile: "My profile",
    profileTitle: "Profile & security",
    displayName: "Display name",
    saveChanges: "Save changes",
    saving: "Saving…",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm",
    passwordMismatch: "Passwords do not match",
    profileSaved: "Profile updated",
    passwordChanged: "Password changed",
    wrongPassword: "Current password is incorrect",
    modulesTitle: "Products & services",
    modulesDesc: "Enable or disable modules for this organisation.",
    saveModules: "Save modules",
    modulesSaved: "Modules updated",
    required: (f: string) => `${f} is required`,
    invalidEmail: "Invalid email address",
    passwordMin: "Password must be at least 8 characters",
  },
} as const;

export type Translations = (typeof T)["fr"];

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextValue>({
  lang: "fr",
  setLang: () => {},
  t: T["fr"],
});

export function LangProvider({ children }: { children: ReactNode }) {
  const stored = (localStorage.getItem("civicai-lang") ?? "fr") as Lang;
  const [lang, setLangState] = useState<Lang>(stored);

  function setLang(l: Lang) {
    localStorage.setItem("civicai-lang", l);
    setLangState(l);
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: T[lang] as Translations }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

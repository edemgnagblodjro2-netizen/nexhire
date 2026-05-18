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
    activeProducts: (n: number) => `${n} produit${n !== 1 ? "s" : ""} actif${n !== 1 ? "s" : ""}`,
    activeServices: (n: number) => `${n} service${n !== 1 ? "s" : ""} actif${n !== 1 ? "s" : ""}`,
    yourProducts: "Vos produits",
    yourServices: "Vos services",
    tenantDir: "Gestion tenants",
    activated: "Activé",
    inactive: "Inactif",
    addProduct: "Ajouter un produit",
    contactCivicAI: "Contacter CivicAI",
    products: {
      constructpro: { label: "ConstructPro", desc: "ERP construction & chantiers" },
      attentezero:  { label: "AttenteZéro", desc: "Services communautaires QC" },
    },
    services: {
      digitalisation: { label: "Digitalisation",     desc: "Transformation numérique" },
      crm:            { label: "CRM personnalisé",    desc: "Gestion relation client" },
      automation:     { label: "Automatisation",      desc: "Workflows & processus auto" },
      api:            { label: "Intégrations API",    desc: "Connexions tierces & REST" },
      consulting:     { label: "Consulting TI",       desc: "Accompagnement stratégique" },
      formation:      { label: "Formation",           desc: "Montée en compétence" },
    },
    openApp: "Ouvrir l'app",
    profile: "Mon profil",
    profileTitle: "Profil & sécurité",
    displayName: "Nom affiché",
    firstName: "Prénom",
    lastName: "Nom",
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
    firstName: "First Name",
    lastName: "Last Name",
    registerSuccess: "Account created",
    registerSuccessDesc: "Successfully registered and logged in.",
    registerFailed: "Registration failed",
    registerFailedDesc: "Please check your information and try again.",
    dashboard: "Dashboard",
    welcome: "Welcome",
    activeProducts: (n: number) => `${n} active product${n !== 1 ? "s" : ""}`,
    activeServices: (n: number) => `${n} active service${n !== 1 ? "s" : ""}`,
    yourProducts: "Your products",
    yourServices: "Your services",
    tenantDir: "Tenant directory",
    activated: "Active",
    inactive: "Inactive",
    addProduct: "Add a product",
    contactCivicAI: "Contact CivicAI",
    products: {
      constructpro: { label: "ConstructPro", desc: "Construction ERP & site management" },
      attentezero:  { label: "AttenteZéro", desc: "Community services – Québec" },
    },
    services: {
      digitalisation: { label: "Digitalisation",    desc: "Digital transformation" },
      crm:            { label: "Custom CRM",         desc: "Customer relationship management" },
      automation:     { label: "Automation",         desc: "Workflows & process automation" },
      api:            { label: "API Integrations",   desc: "Third-party & REST connections" },
      consulting:     { label: "IT Consulting",      desc: "Strategic advisory" },
      formation:      { label: "Training",           desc: "Team skill development" },
    },
    openApp: "Open app",
    profile: "My profile",
    profileTitle: "Profile & security",
    displayName: "Display name",
    firstName: "First Name",
    lastName: "Last Name",
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
    <LangContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

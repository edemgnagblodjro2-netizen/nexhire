import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LangToggle } from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Globe, BarChart3, TrendingUp, Zap,
  ShoppingCart, Layers, Wrench, Rocket, Users, Search,
  Megaphone, BrainCircuit, Code2, HeartHandshake, Settings,
  Check, ChevronRight, ChevronLeft, Shield, Smartphone,
  CreditCard, Package, Truck, LayoutDashboard, KeyRound,
  Plug, Camera, Mail, Share2, Phone, MapPin, Briefcase,
} from "lucide-react";

// ── Catalogue complet ─────────────────────────────────────────────────────────
type ServiceItem = {
  id: string;
  label: string;
  tagline: string;
  price: string;
  features: string[];
  icon: React.ElementType;
  accent: string;         // header bg + text
  featureDot: string;     // bullet color
  border: string;
  activeBorder: string;
  activeBg: string;
};

type Category = {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;       // card gradient (registration step)
  labelColor: string;
  itemColor: string;
  border: string;
  activeBorder: string;
  activeBg: string;
  items: ServiceItem[];
};

const CATALOGUE: Category[] = [
  {
    id: "sites-web",
    label: "Sites web",
    desc: "Présence digitale professionnelle clé en main",
    icon: Globe,
    gradient: "from-blue-900 to-blue-800",
    labelColor: "text-blue-300",
    itemColor: "bg-blue-800/50 border-blue-700",
    border: "border-blue-800",
    activeBorder: "border-blue-400",
    activeBg: "bg-blue-950/60",
    items: [
      {
        id: "site-vitrine",
        label: "Site vitrine",
        tagline: "Présentez votre entreprise avec un design moderne et professionnel qui inspire confiance.",
        price: "À partir de 800$",
        icon: Layers,
        accent: "bg-blue-600 text-white",
        featureDot: "bg-blue-500",
        border: "border-blue-200",
        activeBorder: "border-blue-500",
        activeBg: "bg-blue-50",
        features: [
          "Design sur mesure à votre image",
          "Responsive mobile & tablette",
          "SEO optimisé dès le lancement",
          "Formulaire de contact",
          "Galerie photos & réalisations",
          "Intégration réseaux sociaux",
        ],
      },
      {
        id: "site-ecommerce",
        label: "Site e-commerce",
        tagline: "Vendez vos produits ou services en ligne avec une boutique complète, sécurisée et facile à gérer.",
        price: "À partir de 1 500$",
        icon: ShoppingCart,
        accent: "bg-emerald-700 text-white",
        featureDot: "bg-emerald-500",
        border: "border-emerald-200",
        activeBorder: "border-emerald-500",
        activeBg: "bg-emerald-50",
        features: [
          "Catalogue produits complet",
          "Paiement sécurisé (Stripe/PayPal)",
          "Gestion des commandes",
          "Suivi des livraisons",
          "Paniers abandonnés",
          "Tableau de bord ventes",
        ],
      },
      {
        id: "portail-mesure",
        label: "Portail & application web",
        tagline: "Une application web sur mesure pour gérer vos opérations, vos clients ou votre équipe — adaptée à vos besoins précis.",
        price: "À partir de 2 500$",
        icon: LayoutDashboard,
        accent: "bg-purple-700 text-white",
        featureDot: "bg-purple-500",
        border: "border-purple-200",
        activeBorder: "border-purple-500",
        activeBg: "bg-purple-50",
        features: [
          "Développement sur mesure",
          "Authentification sécurisée",
          "Tableau de bord personnalisé",
          "Gestion des utilisateurs",
          "Intégrations API",
          "Mode mobile inclus",
        ],
      },
      {
        id: "maintenance-mensuelle-web",
        label: "Maintenance mensuelle",
        tagline: "Gardez votre site à jour, sécurisé et performant sans vous en préoccuper.",
        price: "Dès 100$/mois",
        icon: Wrench,
        accent: "bg-slate-600 text-white",
        featureDot: "bg-slate-500",
        border: "border-slate-200",
        activeBorder: "border-slate-500",
        activeBg: "bg-slate-50",
        features: [
          "Mises à jour régulières",
          "Sauvegardes automatiques",
          "Monitoring de disponibilité",
          "Correctifs sécurité",
          "Support réactif",
          "Rapport mensuel",
        ],
      },
    ],
  },
  {
    id: "erp-gestion",
    label: "ERP & Gestion",
    desc: "Pilotez vos opérations avec un ERP adapté à votre secteur",
    icon: BarChart3,
    gradient: "from-purple-900 to-purple-800",
    labelColor: "text-purple-300",
    itemColor: "bg-purple-800/50 border-purple-700",
    border: "border-purple-800",
    activeBorder: "border-purple-400",
    activeBg: "bg-purple-950/60",
    items: [
      {
        id: "erp-starter",
        label: "Plan Starter",
        tagline: "L'essentiel pour digitaliser vos opérations et gagner en efficacité dès le premier mois.",
        price: "99$/mois",
        icon: Rocket,
        accent: "bg-purple-600 text-white",
        featureDot: "bg-purple-500",
        border: "border-purple-200",
        activeBorder: "border-purple-500",
        activeBg: "bg-purple-50",
        features: [
          "Gestion de projets & tâches",
          "CRM de base",
          "Facturation simple",
          "5 utilisateurs inclus",
          "Tableau de bord",
          "Support par courriel",
        ],
      },
      {
        id: "erp-pro",
        label: "Plan Professionnel",
        tagline: "Des fonctionnalités avancées pour les équipes en croissance qui ont besoin de plus de puissance.",
        price: "249$/mois",
        icon: BarChart3,
        accent: "bg-indigo-700 text-white",
        featureDot: "bg-indigo-500",
        border: "border-indigo-200",
        activeBorder: "border-indigo-500",
        activeBg: "bg-indigo-50",
        features: [
          "Tout le plan Starter",
          "Gestion RH & équipes",
          "Rapports avancés",
          "25 utilisateurs inclus",
          "Intégrations tierces",
          "Support prioritaire",
        ],
      },
      {
        id: "erp-enterprise",
        label: "Plan Entreprise",
        tagline: "Solution complète pour les grandes organisations avec des besoins complexes et multi-sites.",
        price: "499$/mois",
        icon: Building2,
        accent: "bg-violet-700 text-white",
        featureDot: "bg-violet-500",
        border: "border-violet-200",
        activeBorder: "border-violet-500",
        activeBg: "bg-violet-50",
        features: [
          "Tout le plan Pro",
          "Multi-sites & filiales",
          "Utilisateurs illimités",
          "DBA dédié",
          "SLA 99.9 %",
          "Onboarding sur site",
        ],
      },
      {
        id: "erp-setup",
        label: "Setup & formation",
        tagline: "Déploiement clé en main et formation de vos équipes pour une adoption rapide et réussie.",
        price: "500$ à 1 500$",
        icon: Users,
        accent: "bg-rose-700 text-white",
        featureDot: "bg-rose-500",
        border: "border-rose-200",
        activeBorder: "border-rose-500",
        activeBg: "bg-rose-50",
        features: [
          "Configuration complète",
          "Import de vos données",
          "Formation des administrateurs",
          "Formation des utilisateurs",
          "Documentation personnalisée",
          "Suivi post-déploiement",
        ],
      },
    ],
  },
  {
    id: "marketing-digital",
    label: "Marketing digital",
    desc: "Visibilité, acquisition et fidélisation de clientèle",
    icon: TrendingUp,
    gradient: "from-teal-900 to-teal-800",
    labelColor: "text-teal-300",
    itemColor: "bg-teal-800/50 border-teal-700",
    border: "border-teal-800",
    activeBorder: "border-teal-400",
    activeBg: "bg-teal-950/60",
    items: [
      {
        id: "marketing-strategie",
        label: "Stratégie & conseil",
        tagline: "Définissez une stratégie digitale claire et mesurable alignée sur vos objectifs d'affaires.",
        price: "Dès 500$/mois",
        icon: BrainCircuit,
        accent: "bg-teal-700 text-white",
        featureDot: "bg-teal-500",
        border: "border-teal-200",
        activeBorder: "border-teal-500",
        activeBg: "bg-teal-50",
        features: [
          "Audit digital complet",
          "Personas & cibles",
          "Plan d'action 90 jours",
          "KPIs & tableaux de bord",
          "Veille concurrentielle",
          "Revue mensuelle",
        ],
      },
      {
        id: "marketing-reseaux",
        label: "Réseaux sociaux",
        tagline: "Créez une présence engageante sur les plateformes où se trouvent vos clients.",
        price: "Dès 400$/mois",
        icon: Share2,
        accent: "bg-cyan-700 text-white",
        featureDot: "bg-cyan-500",
        border: "border-cyan-200",
        activeBorder: "border-cyan-500",
        activeBg: "bg-cyan-50",
        features: [
          "Gestion des comptes",
          "Création de contenu",
          "Calendrier éditorial",
          "Community management",
          "Stories & Reels",
          "Rapport de performance",
        ],
      },
      {
        id: "marketing-ads",
        label: "Publicités (Ads)",
        tagline: "Atteignez vos cibles avec des campagnes publicitaires performantes sur Google et Meta.",
        price: "Dès 600$/mois",
        icon: Megaphone,
        accent: "bg-orange-700 text-white",
        featureDot: "bg-orange-500",
        border: "border-orange-200",
        activeBorder: "border-orange-500",
        activeBg: "bg-orange-50",
        features: [
          "Google Ads & Meta Ads",
          "Ciblage avancé",
          "A/B testing des annonces",
          "Optimisation continue",
          "Remarketing",
          "Rapport hebdomadaire",
        ],
      },
      {
        id: "marketing-seo",
        label: "SEO & référencement",
        tagline: "Apparaissez en tête des résultats de recherche et générez un trafic qualifié durable.",
        price: "Dès 450$/mois",
        icon: Search,
        accent: "bg-lime-700 text-white",
        featureDot: "bg-lime-500",
        border: "border-lime-200",
        activeBorder: "border-lime-500",
        activeBg: "bg-lime-50",
        features: [
          "Audit SEO technique",
          "Recherche de mots-clés",
          "Optimisation on-page",
          "Création de contenu SEO",
          "Netlinking",
          "Suivi de positionnement",
        ],
      },
    ],
  },
  {
    id: "automatisation-crm",
    label: "Automatisation & CRM",
    desc: "Automatisez vos processus et centralisez vos données clients",
    icon: Zap,
    gradient: "from-cyan-900 to-cyan-800",
    labelColor: "text-cyan-300",
    itemColor: "bg-cyan-800/50 border-cyan-700",
    border: "border-cyan-800",
    activeBorder: "border-cyan-400",
    activeBg: "bg-cyan-950/60",
    items: [
      {
        id: "auto-analyse",
        label: "Analyse & conception",
        tagline: "Cartographiez vos processus et concevez l'architecture idéale avant de développer.",
        price: "Sur devis",
        icon: BrainCircuit,
        accent: "bg-cyan-700 text-white",
        featureDot: "bg-cyan-500",
        border: "border-cyan-200",
        activeBorder: "border-cyan-500",
        activeBg: "bg-cyan-50",
        features: [
          "Cartographie des processus",
          "Identification des gains",
          "Architecture solution",
          "Cahier des charges",
          "Proof of concept",
          "Feuille de route",
        ],
      },
      {
        id: "auto-dev",
        label: "Développement",
        tagline: "Automatisations sur mesure connectées à vos outils existants — sans friction pour vos équipes.",
        price: "Sur devis",
        icon: Code2,
        accent: "bg-blue-700 text-white",
        featureDot: "bg-blue-500",
        border: "border-blue-200",
        activeBorder: "border-blue-500",
        activeBg: "bg-blue-50",
        features: [
          "Workflows automatisés",
          "Intégrations API (Zapier, Make…)",
          "Bots & assistants IA",
          "Traitement de données",
          "Notifications automatiques",
          "Tests & documentation",
        ],
      },
      {
        id: "auto-crm",
        label: "CRM sur mesure",
        tagline: "Un CRM conçu pour votre réalité — pas l'inverse. Suivi client, pipeline et relances automatiques.",
        price: "Sur devis",
        icon: HeartHandshake,
        accent: "bg-violet-700 text-white",
        featureDot: "bg-violet-500",
        border: "border-violet-200",
        activeBorder: "border-violet-500",
        activeBg: "bg-violet-50",
        features: [
          "Base clients centralisée",
          "Pipeline de ventes",
          "Relances automatiques",
          "Historique interactions",
          "Devis & contrats intégrés",
          "Tableaux de bord commerciaux",
        ],
      },
      {
        id: "auto-support",
        label: "Support mensuel",
        tagline: "Un accompagnement continu pour maintenir, faire évoluer et optimiser vos automatisations.",
        price: "Dès 150$/mois",
        icon: Settings,
        accent: "bg-slate-700 text-white",
        featureDot: "bg-slate-500",
        border: "border-slate-200",
        activeBorder: "border-slate-500",
        activeBg: "bg-slate-50",
        features: [
          "Maintenance corrective",
          "Évolutions mineures",
          "Monitoring des flux",
          "Alertes & incidents",
          "Réunion mensuelle",
          "Rapport d'activité",
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

const STEPS = ["Organisation", "Informations", "Catégories", "Services", "Compte admin"];

const SECTORS = [
  "Construction",
  "Services professionnels",
  "Santé et services sociaux",
  "Commerce de détail",
  "Technologie",
  "Organisme à but non lucratif",
  "Éducation",
  "Municipal / Gouvernement",
  "Immobilier",
  "Transport et logistique",
  "Autre",
];

const USER_COUNTS = ["1–5", "6–20", "21–100", "101–500", "500+"];

// ── Main component ────────────────────────────────────────────────────────────
export function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  // Step 1 — company details
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [neq, setNeq] = useState("");
  const [sector, setSector] = useState("");
  const [userCount, setUserCount] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleCompanyChange(v: string) {
    setCompanyName(v);
    if (!slugEdited) setTenantSlug(slugify(v));
  }

  function toggleCategory(id: string) {
    setCategories(p =>
      p.includes(id) ? p.filter(x => x !== id) : [...p, id]
    );
  }

  function toggleService(id: string) {
    setServices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  // Services visible in step 3 = items of selected categories (or all if none selected)
  const visibleCategories = categories.length > 0
    ? CATALOGUE.filter(c => categories.includes(c.id))
    : CATALOGUE;

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!companyName.trim()) e.companyName = "Nom requis";
      if (!tenantSlug.trim()) e.tenantSlug = "Code requis";
      if (!/^[a-z0-9-]+$/.test(tenantSlug)) e.tenantSlug = "Lettres minuscules, chiffres et tirets uniquement";
    }
    if (step === 1) {
      if (!phone.trim()) e.phone = "Numéro de téléphone requis";
      if (!address.trim()) e.address = "Adresse requise";
      if (!city.trim()) e.city = "Ville requise";
      if (!sector) e.sector = "Secteur requis";
      if (!userCount) e.userCount = "Nombre d'utilisateurs requis";
    }
    if (step === 4) {
      if (!firstName.trim()) e.firstName = "Prénom requis";
      if (!lastName.trim()) e.lastName = "Nom requis";
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Courriel invalide";
      if (password.length < 8) e.password = "8 caractères minimum";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validateStep()) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/tenant-auth/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          tenantSlug,
          plan: "free",
          enabledProducts: categories,
          enabledServices: services,
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          neq: neq.trim(),
          sector,
          userCount,
          contactTitle: contactTitle.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Erreur ${r.status}`);
      setToken(data.token);
      toast({ title: "Organisation créée !", description: `Bienvenue sur CivicAI Portal, ${firstName}.` });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Échec de création", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-600/15 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-reg" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-reg)" />
        </svg>
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0">
        <div className="flex items-center gap-2">
          <img src="/tenant-portal/civicai-logo.png" alt="CivicAI" className="w-7 h-7 rounded-md object-contain bg-white/10 p-0.5" />
          <span className="font-bold text-white">CivicAI Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <LangToggle />
          <span className="text-sm text-slate-400">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-teal-400 font-medium hover:text-teal-300">Se connecter</Link>
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white">Créer votre organisation</h1>
              <span className="text-sm text-slate-500">{step + 1} / {STEPS.length}</span>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {STEPS.map((s, i) => (
                <span key={s} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  i === step ? "bg-teal-500 text-white" : i < step ? "bg-teal-500/20 text-teal-400" : "bg-white/10 text-slate-500"
                }`}>
                  {i < step && <Check className="h-3 w-3" />}{s}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* ── Step 0 — Org info ──────────────────────────────────────────── */}
          {step === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Votre organisation</h2>
                <p className="text-sm text-gray-500">Ces informations identifient votre organisation sur la plateforme CivicAI.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'organisation</label>
                  <Input placeholder="ex. Agence Montréal Digital" value={companyName}
                    onChange={e => handleCompanyChange(e.target.value)}
                    className={errors.companyName ? "border-red-400" : ""} />
                  {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Code organisation <span className="text-gray-400 font-normal">(identifiant unique, permanent)</span>
                  </label>
                  <div className="flex">
                    <span className="flex items-center text-sm text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md px-3 h-10 whitespace-nowrap">attentezero.ca/</span>
                    <Input className={`rounded-l-none ${errors.tenantSlug ? "border-red-400" : ""}`}
                      placeholder="agence-montreal" value={tenantSlug}
                      onChange={e => { setTenantSlug(slugify(e.target.value)); setSlugEdited(true); }} />
                  </div>
                  {errors.tenantSlug
                    ? <p className="text-xs text-red-500 mt-1">{errors.tenantSlug}</p>
                    : <p className="text-xs text-gray-400 mt-1">Lettres minuscules, chiffres et tirets.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 — Company details ───────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Informations de l'entreprise</h2>
                <p className="text-sm text-gray-500">Ces informations nous permettent de vous contacter et de préparer votre dossier client.</p>
              </div>

              {/* Phone + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />Téléphone professionnel</span>
                  </label>
                  <Input placeholder="514-555-0100" value={phone} onChange={e => setPhone(e.target.value)}
                    className={errors.phone ? "border-red-400" : ""} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre / Fonction <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <Input placeholder="ex. Directeur général" value={contactTitle} onChange={e => setContactTitle(e.target.value)} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" />Adresse</span>
                </label>
                <Input placeholder="123, rue des Érables" value={address} onChange={e => setAddress(e.target.value)}
                  className={errors.address ? "border-red-400" : ""} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

              {/* City + NEQ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
                  <Input placeholder="Montréal" value={city} onChange={e => setCity(e.target.value)}
                    className={errors.city ? "border-red-400" : ""} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    NEQ <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <Input placeholder="1234567890" value={neq} onChange={e => setNeq(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10} />
                  <p className="text-xs text-gray-400 mt-1">Numéro d'entreprise du Québec (10 chiffres).</p>
                </div>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-gray-400" />Secteur d'activité</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map(s => (
                    <button key={s} type="button" onClick={() => setSector(s)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        sector === s
                          ? "bg-teal-600 border-teal-600 text-white font-medium"
                          : "border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-700 bg-white"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                {errors.sector && <p className="text-xs text-red-500 mt-2">{errors.sector}</p>}
              </div>

              {/* User count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gray-400" />Nombre d'utilisateurs prévus</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {USER_COUNTS.map(u => (
                    <button key={u} type="button" onClick={() => setUserCount(u)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-all font-medium ${
                        userCount === u
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-700 bg-white"
                      }`}>
                      {u}
                    </button>
                  ))}
                </div>
                {errors.userCount && <p className="text-xs text-red-500 mt-2">{errors.userCount}</p>}
              </div>
            </div>
          )}

          {/* ── Step 2 — Categories ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Quels services vous intéressent ?</h2>
                <p className="text-sm text-gray-500">Sélectionnez une ou plusieurs catégories. Vous affinerez ensuite service par service.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CATALOGUE.map(cat => {
                  const Icon = cat.icon;
                  const active = categories.includes(cat.id);
                  return (
                    <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                      className={`relative text-left rounded-2xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${
                        active ? cat.activeBorder : cat.border
                      }`}
                    >
                      {/* Dark gradient header */}
                      <div className={`bg-gradient-to-br ${cat.gradient} p-5`}>
                        <div className="flex items-center justify-between mb-3">
                          <Icon className={`h-6 w-6 ${cat.labelColor}`} />
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            active ? "bg-white border-white" : "border-white/40"
                          }`}>
                            {active && <Check className="h-3.5 w-3.5 text-gray-900" />}
                          </div>
                        </div>
                        <h3 className="text-white font-bold text-base mb-1">{cat.label}</h3>
                        <p className={`text-xs ${cat.labelColor} leading-relaxed`}>{cat.desc}</p>
                      </div>
                      {/* Items preview */}
                      <div className={`p-3 bg-white space-y-1.5 ${active ? cat.activeBg : ""}`}>
                        {cat.items.map(item => (
                          <div key={item.id} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${cat.itemColor.replace("border-", "border-").replace("bg-", "bg-")}`}>
                            <span className="text-white/90 font-medium">{item.label}</span>
                            <span className={`${cat.labelColor} font-semibold`}>{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-center text-gray-400">Aucune sélection requise — vous pouvez tout explorer à l'étape suivante.</p>
            </div>
          )}

          {/* ── Step 3 — Services ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Choisissez vos services</h2>
                <p className="text-sm text-gray-500">
                  {categories.length > 0
                    ? `Services des ${categories.length} catégorie${categories.length > 1 ? "s" : ""} sélectionnée${categories.length > 1 ? "s" : ""}.`
                    : "Tous les services CivicAI disponibles."}
                  {" "}Sélectionnez ceux qui correspondent à vos besoins.
                </p>
              </div>

              {visibleCategories.map(cat => (
                <div key={cat.id}>
                  <div className={`flex items-center gap-2 mb-3 px-1`}>
                    <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${cat.gradient}`} />
                    <h3 className="font-semibold text-gray-800 text-sm">{cat.label}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cat.items.map(item => {
                      const Icon = item.icon;
                      const active = services.includes(item.id);
                      return (
                        <button key={item.id} type="button" onClick={() => toggleService(item.id)}
                          className={`text-left rounded-xl border-2 overflow-hidden transition-all shadow-sm hover:shadow-md ${
                            active ? item.activeBorder : item.border
                          } ${active ? item.activeBg : "bg-white"}`}
                        >
                          {/* Colored header */}
                          <div className={`${item.accent} px-4 py-3 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 opacity-90" />
                              <span className="font-bold text-sm">{item.label}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              active ? "bg-white border-white" : "border-white/50"
                            }`}>
                              {active && <Check className="h-3 w-3 text-gray-800" />}
                            </div>
                          </div>
                          {/* Body */}
                          <div className="px-4 py-3">
                            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{item.tagline}</p>
                            <ul className="space-y-1.5 mb-3">
                              {item.features.map(f => (
                                <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.featureDot}`} />
                                  {f}
                                </li>
                              ))}
                            </ul>
                            <div className={`text-center py-1.5 rounded-lg text-sm font-bold ${item.accent}`}>
                              {item.price}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {services.length > 0 && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
                  <strong>{services.length} service{services.length > 1 ? "s" : ""} sélectionné{services.length > 1 ? "s" : ""}</strong>
                  {" "}— Un conseiller CivicAI vous contactera après la création de votre compte pour préciser votre devis.
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 — Admin account ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Compte administrateur</h2>
                <p className="text-sm text-gray-500">Ce compte aura un accès complet à votre organisation. Vous pourrez inviter d'autres membres ensuite.</p>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Organisation</span>
                  <span className="font-semibold text-gray-900">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Code</span>
                  <code className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-teal-700">{tenantSlug}</code>
                </div>
                {city && <div className="flex justify-between">
                  <span className="text-gray-500">Ville</span>
                  <span className="text-gray-900">{city}</span>
                </div>}
                {sector && <div className="flex justify-between">
                  <span className="text-gray-500">Secteur</span>
                  <span className="text-gray-900">{sector}</span>
                </div>}
                {userCount && <div className="flex justify-between">
                  <span className="text-gray-500">Utilisateurs</span>
                  <span className="text-gray-900">{userCount}</span>
                </div>}
                <div className="flex justify-between">
                  <span className="text-gray-500">Catégories</span>
                  <span className="text-gray-900">{categories.length === 0 ? "—" : categories.map(id => CATALOGUE.find(c => c.id === id)?.label).join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Services choisis</span>
                  <span className="font-semibold text-teal-700">{services.length} service{services.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                  <Input placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className={errors.firstName ? "border-red-400" : ""} />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                  <Input placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)}
                    className={errors.lastName ? "border-red-400" : ""} />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse courriel</label>
                <Input type="email" placeholder="admin@monorganisation.ca" value={email}
                  onChange={e => setEmail(e.target.value)} className={errors.email ? "border-red-400" : ""} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <Input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} className={errors.password ? "border-red-400" : ""} />
                {errors.password
                  ? <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  : <p className="text-xs text-gray-400 mt-1">8 caractères minimum.</p>}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 0
              ? <Button variant="outline" onClick={back} className="gap-1.5"><ChevronLeft className="h-4 w-4" /> Retour</Button>
              : <div />
            }
            {step < STEPS.length - 1
              ? <Button onClick={next} className="gap-1.5 bg-teal-600 hover:bg-teal-700">Continuer <ChevronRight className="h-4 w-4" /></Button>
              : <Button onClick={submit} disabled={submitting} className="gap-1.5 bg-teal-600 hover:bg-teal-700 px-6">
                  {submitting ? "Création en cours…" : "Créer l'organisation →"}
                </Button>
            }
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            En créant un compte, vous acceptez les{" "}
            <a href="/privacy" target="_blank" className="underline hover:text-gray-600">conditions d'utilisation</a> de CivicAI.
          </p>
        </div>
      </div>
    </div>
  );
}

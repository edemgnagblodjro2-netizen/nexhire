import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LangToggle } from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Rocket, BarChart3, Building2, Check, ChevronRight, ChevronLeft,
  Users, Phone, MapPin, Briefcase, Globe, TrendingUp, Zap, Star,
} from "lucide-react";

// ── Plans ERP (sélection unique obligatoire) ──────────────────────────────────
type PlanOption = {
  id: string;
  label: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  icon: React.ElementType;
  recommended?: boolean;
  accentFrom: string;
  accentTo: string;
  badgeColor: string;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    label: "Plan Starter",
    tagline: "L'essentiel pour digitaliser vos opérations dès le premier mois.",
    price: "99$",
    priceNote: "/mois",
    icon: Rocket,
    accentFrom: "from-purple-600",
    accentTo: "to-purple-700",
    badgeColor: "bg-purple-100 text-purple-700",
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
    id: "pro",
    label: "Plan Professionnel",
    tagline: "Des fonctionnalités avancées pour les équipes en croissance.",
    price: "249$",
    priceNote: "/mois",
    icon: BarChart3,
    recommended: true,
    accentFrom: "from-indigo-600",
    accentTo: "to-indigo-700",
    badgeColor: "bg-indigo-100 text-indigo-700",
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
    id: "enterprise",
    label: "Plan Entreprise",
    tagline: "Solution complète pour les grandes organisations multi-sites.",
    price: "499$",
    priceNote: "/mois",
    icon: Building2,
    accentFrom: "from-violet-600",
    accentTo: "to-violet-700",
    badgeColor: "bg-violet-100 text-violet-700",
    features: [
      "Tout le plan Pro",
      "Multi-sites & filiales",
      "Utilisateurs illimités",
      "DBA dédié",
      "SLA 99,9 %",
      "Onboarding sur site",
    ],
  },
];

const OTHER_INTERESTS = [
  { id: "sites-web",          label: "Sites web",            icon: Globe },
  { id: "marketing-digital",  label: "Marketing digital",    icon: TrendingUp },
  { id: "automatisation-crm", label: "Automatisation & CRM", icon: Zap },
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

const STEPS = ["Organisation", "Informations", "Plan", "Compte admin"];

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
  // Step 2 — Plan selection (single choice)
  const [selectedPlan, setSelectedPlan] = useState("");
  const [otherInterests, setOtherInterests] = useState<string[]>([]);
  const [clientMessage, setClientMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleCompanyChange(v: string) {
    setCompanyName(v);
    if (!slugEdited) setTenantSlug(slugify(v));
  }

  function toggleInterest(id: string) {
    setOtherInterests(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

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
    if (step === 2) {
      if (!selectedPlan) e.selectedPlan = "Veuillez choisir un plan pour continuer";
    }
    if (step === 3) {
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
          plan: selectedPlan,
          enabledProducts: otherInterests,
          enabledServices: [],
          clientMessage: clientMessage.trim(),
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

          {/* ── Step 2 — Plan selection ────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Choisissez votre plan</h2>
                <p className="text-sm text-gray-500">
                  Un seul plan actif à la fois. Votre conseiller CivicAI vous contactera après l'inscription pour confirmer et activer votre accès.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {PLAN_OPTIONS.map(plan => {
                  const Icon = plan.icon;
                  const active = selectedPlan === plan.id;
                  return (
                    <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)}
                      className={`text-left rounded-2xl border-2 overflow-hidden transition-all shadow-sm hover:shadow-md ${
                        active ? "border-teal-500 shadow-teal-200" : "border-gray-200 hover:border-gray-300"
                      } bg-white`}
                    >
                      <div className={`bg-gradient-to-r ${plan.accentFrom} ${plan.accentTo} px-5 py-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-white/90" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-base">{plan.label}</span>
                              {plan.recommended && (
                                <span className="text-[10px] font-semibold bg-white/20 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
                                  <Star className="h-2.5 w-2.5" />RECOMMANDÉ
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/70 mt-0.5">{plan.tagline}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          <div className="text-right">
                            <span className="text-2xl font-black text-white">{plan.price}</span>
                            <span className="text-white/60 text-xs">{plan.priceNote}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            active ? "bg-white border-white" : "border-white/40"
                          }`}>
                            {active && <div className="w-3 h-3 rounded-full bg-gray-800" />}
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                          {plan.features.map(f => (
                            <div key={f} className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Check className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {errors.selectedPlan && (
                <p className="text-sm text-red-500 text-center font-medium">{errors.selectedPlan}</p>
              )}

              {/* Message / besoins spécifiques */}
              {selectedPlan && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Décrivez brièvement vos besoins{" "}
                    <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <p className="text-xs text-gray-400">
                    Personnalisations souhaitées, intégrations existantes, délais, contraintes particulières…
                    Notre conseiller lira votre message avant de vous appeler.
                  </p>
                  <textarea
                    value={clientMessage}
                    onChange={e => setClientMessage(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder={
                      selectedPlan === "enterprise"
                        ? "Ex. : Nous avons 3 chantiers actifs, un ERP maison à remplacer, et besoin d'une intégration avec QuickBooks…"
                        : "Ex. : Nous cherchons à centraliser nos projets et notre facturation pour une équipe de 8 personnes…"
                    }
                    className="w-full text-sm rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none text-gray-800 placeholder-gray-300"
                  />
                  <p className="text-xs text-gray-300 text-right">{clientMessage.length}/1000</p>
                </div>
              )}

              {/* Optional: other interests */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Intéressé par d'autres services CivicAI ? <span className="text-slate-500 font-normal">(optionnel)</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {OTHER_INTERESTS.map(item => {
                    const Icon = item.icon;
                    const active = otherInterests.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => toggleInterest(item.id)}
                        className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all ${
                          active
                            ? "bg-teal-600 border-teal-500 text-white font-medium"
                            : "border-white/20 text-slate-400 hover:border-white/40 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">Ces services sont sur devis — notre équipe vous contactera pour en discuter.</p>
              </div>
            </div>
          )}

          {/* ── Step 3 — Admin account ─────────────────────────────────────── */}
          {step === 3 && (
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
                  <span className="text-gray-500">Plan sélectionné</span>
                  <span className="font-semibold text-teal-700">
                    {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.label ?? "—"}
                  </span>
                </div>
                {otherInterests.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Autres intérêts</span>
                    <span className="text-gray-900 text-right text-xs">
                      {otherInterests.map(id => OTHER_INTERESTS.find(o => o.id === id)?.label).join(", ")}
                    </span>
                  </div>
                )}
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

          <p className="text-center text-xs text-gray-400 mt-8">
            En créant un compte, vous acceptez les{" "}
            <a href="/privacy" target="_blank" className="underline hover:text-gray-300">conditions d'utilisation</a> de CivicAI.
          </p>
        </div>
      </div>

      {/* ── Navigation bar — sticky bottom ─────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#0a1628]/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-white/25 text-white font-medium text-sm hover:border-white/50 hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">
              Étape {step + 1} sur {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-500/25"
              >
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-500/25"
              >
                {submitting ? "Création en cours…" : "Créer l'organisation →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

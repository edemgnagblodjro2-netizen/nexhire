import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LangToggle } from "@/components/LangToggle";
import {
  Building2, HardHat, Heart, Cpu, Users, Zap, Globe,
  BarChart3, GraduationCap, Check, ChevronRight, ChevronLeft,
  Sparkles, Rocket, Crown, Star,
} from "lucide-react";

// ── Catalogue ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "attentezero",
    icon: Heart,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-300",
    label: "AttenteZéro",
    desc: "Gestion de files d'attente, RDV, CRM citoyen et portail public QR code.",
    badge: "Populaire",
    badgeColor: "bg-teal-100 text-teal-700",
  },
  {
    id: "constructpro",
    icon: HardHat,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-300",
    label: "ConstructPro",
    desc: "ERP complet pour la gestion de chantiers, devis, équipes et facturation.",
    badge: "Bêta",
    badgeColor: "bg-orange-100 text-orange-700",
  },
];

const SERVICES = [
  { id: "digitalisation", icon: Cpu,          label: "Digitalisation",   desc: "Transformation numérique" },
  { id: "crm",            icon: Users,         label: "CRM personnalisé", desc: "Gestion relation client" },
  { id: "automation",     icon: Zap,           label: "Automatisation",   desc: "Workflows & processus" },
  { id: "api",            icon: Globe,         label: "Intégrations API", desc: "Connexions tierces & REST" },
  { id: "consulting",     icon: BarChart3,     label: "Consulting TI",    desc: "Accompagnement stratégique" },
  { id: "formation",      icon: GraduationCap, label: "Formation",        desc: "Montée en compétences" },
];

const PLANS = [
  {
    id: "free",
    icon: Sparkles,
    label: "Gratuit",
    price: "0 $",
    period: "/mois",
    color: "border-gray-200",
    activeColor: "border-teal-500 bg-teal-50/50",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    features: ["1 produit", "3 utilisateurs", "Support communautaire"],
  },
  {
    id: "starter",
    icon: Rocket,
    label: "Starter",
    price: "49 $",
    period: "/mois",
    color: "border-gray-200",
    activeColor: "border-teal-500 bg-teal-50/50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    features: ["3 produits", "15 utilisateurs", "Support prioritaire", "Analytics avancés"],
  },
  {
    id: "pro",
    icon: Crown,
    label: "Pro",
    price: "149 $",
    period: "/mois",
    color: "border-gray-200",
    activeColor: "border-teal-500 bg-teal-50/50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    recommended: true,
    features: ["Tous les produits", "Utilisateurs illimités", "SLA 99.9 %", "Onboarding dédié"],
  },
  {
    id: "enterprise",
    icon: Star,
    label: "Entreprise",
    price: "Sur devis",
    period: "",
    color: "border-gray-200",
    activeColor: "border-teal-500 bg-teal-50/50",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    features: ["Infrastructure dédiée", "Multi-sites", "DBA dédié", "Contrat B2G"],
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

const STEPS = ["Votre organisation", "Produits", "Services", "Plan", "Compte admin"];

// ── Main component ────────────────────────────────────────────────────────────
export function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [plan, setPlan] = useState("starter");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleCompanyChange(v: string) {
    setCompanyName(v);
    if (!slugEdited) setTenantSlug(slugify(v));
  }

  function toggleProduct(id: string) {
    setProducts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  function toggleService(id: string) {
    setServices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!companyName.trim()) e.companyName = "Nom requis";
      if (!tenantSlug.trim()) e.tenantSlug = "Code requis";
      if (!/^[a-z0-9-]+$/.test(tenantSlug)) e.tenantSlug = "Lettres minuscules, chiffres et tirets uniquement";
    }
    if (step === 4) {
      if (!firstName.trim()) e.firstName = "Prénom requis";
      if (!lastName.trim()) e.lastName = "Nom requis";
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Adresse courriel invalide";
      if (password.length < 8) e.password = "8 caractères minimum";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep()) return;
    setStep(s => s + 1);
  }
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
          plan,
          enabledProducts: products,
          enabledServices: services,
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

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          <span className="font-bold text-gray-900">CivicAI Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <span className="text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-teal-600 font-medium hover:underline">Se connecter</Link>
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-2xl">
          {/* Progress header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Créer votre organisation</h1>
              <span className="text-sm text-gray-400">{step + 1} / {STEPS.length}</span>
            </div>
            {/* Step pills */}
            <div className="flex gap-1 mb-3 flex-wrap">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                    i === step
                      ? "bg-teal-600 text-white"
                      : i < step
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < step && <Check className="inline h-3 w-3 mr-0.5" />}{s}
                </span>
              ))}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
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
                  <Input
                    placeholder="ex. Ville de Montréal"
                    value={companyName}
                    onChange={e => handleCompanyChange(e.target.value)}
                    className={errors.companyName ? "border-red-400" : ""}
                  />
                  {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Code organisation <span className="text-gray-400 font-normal">(identifiant unique)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md px-3 py-2 h-10 flex items-center">civicai.ca/</span>
                    <Input
                      className={`rounded-l-none ${errors.tenantSlug ? "border-red-400" : ""}`}
                      placeholder="ville-de-montreal"
                      value={tenantSlug}
                      onChange={e => { setTenantSlug(slugify(e.target.value)); setSlugEdited(true); }}
                    />
                  </div>
                  {errors.tenantSlug
                    ? <p className="text-xs text-red-500 mt-1">{errors.tenantSlug}</p>
                    : <p className="text-xs text-gray-400 mt-1">Lettres minuscules, chiffres et tirets. Permanent après création.</p>
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 — Products ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Choisissez vos produits</h2>
                <p className="text-sm text-gray-500">Sélectionnez les applications CivicAI à activer pour votre organisation. Vous pourrez en ajouter plus tard.</p>
              </div>

              <div className="grid gap-4">
                {PRODUCTS.map(p => {
                  const Icon = p.icon;
                  const active = products.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                        active ? "border-teal-500 bg-teal-50/40" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${p.bg} flex-shrink-0`}>
                          <Icon className={`h-6 w-6 ${p.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{p.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.badgeColor}`}>{p.badge}</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          active ? "bg-teal-600 border-teal-600" : "border-gray-300"
                        }`}>
                          {active && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 text-center">Aucune sélection requise — vous pouvez configurer cela depuis le tableau de bord.</p>
            </div>
          )}

          {/* ── Step 2 — Services ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Services CivicAI</h2>
                <p className="text-sm text-gray-500">Services d'accompagnement professionnels. Sélectionnez ceux qui correspondent à vos besoins.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICES.map(s => {
                  const Icon = s.icon;
                  const active = services.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        active ? "border-teal-500 bg-teal-50/50" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${active ? "bg-teal-100" : "bg-gray-100"}`}>
                        <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{s.label}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        active ? "bg-teal-600 border-teal-600" : "border-gray-300"
                      }`}>
                        {active && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 text-center">Ces services sont fournis par CivicAI. Un conseiller vous contactera après la création de votre compte.</p>
            </div>
          )}

          {/* ── Step 3 — Plan ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Choisissez votre plan</h2>
                <p className="text-sm text-gray-500">Commencez gratuitement, évoluez selon vos besoins. Sans engagement.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map(p => {
                  const Icon = p.icon;
                  const active = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                        active ? p.activeColor : p.color + " bg-white hover:border-gray-300"
                      }`}
                    >
                      {p.recommended && (
                        <span className="absolute -top-2.5 left-4 text-xs bg-teal-600 text-white px-2.5 py-0.5 rounded-full font-medium">
                          Recommandé
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${p.iconBg}`}>
                          <Icon className={`h-4 w-4 ${p.iconColor}`} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? "bg-teal-600 border-teal-600" : "border-gray-300"
                        }`}>
                          {active && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900 text-sm mb-0.5">{p.label}</div>
                      <div className="flex items-baseline gap-0.5 mb-3">
                        <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                        <span className="text-xs text-gray-400">{p.period}</span>
                      </div>
                      <ul className="space-y-1">
                        {p.features.map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Check className="h-3 w-3 text-teal-500 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4 — Admin account ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Compte administrateur</h2>
                <p className="text-sm text-gray-500">Ce compte aura un accès complet à votre organisation. Vous pourrez inviter d'autres utilisateurs ensuite.</p>
              </div>

              {/* Summary strip */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Organisation</span>
                  <span className="font-semibold text-gray-900">{companyName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Code</span>
                  <code className="text-xs bg-white border border-teal-200 rounded px-2 py-0.5 text-teal-700">{tenantSlug}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Produits</span>
                  <span className="text-gray-900">{products.length === 0 ? "Aucun" : products.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold capitalize text-teal-700">{PLANS.find(p => p.id === plan)?.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                  <Input
                    placeholder="Jane"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className={errors.firstName ? "border-red-400" : ""}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={errors.lastName ? "border-red-400" : ""}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse courriel</label>
                <Input
                  type="email"
                  placeholder="admin@monorganisation.ca"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={errors.email ? "border-red-400" : ""}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={errors.password ? "border-red-400" : ""}
                />
                {errors.password
                  ? <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  : <p className="text-xs text-gray-400 mt-1">8 caractères minimum.</p>
                }
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <Button variant="outline" onClick={back} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Retour
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 px-6"
              >
                {submitting ? "Création en cours…" : "🚀 Créer l'organisation"}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            En créant un compte, vous acceptez les{" "}
            <a href="/privacy" target="_blank" className="underline hover:text-gray-600">conditions d'utilisation</a>{" "}
            de CivicAI.
          </p>
        </div>
      </div>
    </div>
  );
}

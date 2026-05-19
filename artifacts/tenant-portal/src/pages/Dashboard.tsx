import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetTenantCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LangToggle } from "@/components/LangToggle";
import {
  Building2, LogOut, Server, CheckCircle2, Circle, Lock,
  HardHat, Heart, Globe, BarChart3, TrendingUp, Zap,
  Layers, ShoppingCart, LayoutDashboard, Wrench,
  Rocket, Users, BrainCircuit, Share2, Megaphone, Search,
  Code2, HeartHandshake, Settings,
  ExternalLink, Mail, Cpu, GraduationCap,
} from "lucide-react";

// ── Deployable apps (launchable from Dashboard) ────────────────────────────
const APPS: Record<string, { icon: React.ElementType; color: string; bg: string; appUrl: string; internal: boolean }> = {
  constructpro: { icon: HardHat, color: "text-orange-500", bg: "bg-orange-50", appUrl: "/constructpro-erp/", internal: false },
  attentezero:  { icon: Heart,   color: "text-teal-500",   bg: "bg-teal-50",   appUrl: "/apps/attentezero/queues", internal: true },
};

// ── Category visuals (matching registration wizard) ────────────────────────
const CATEGORY_CFG: Record<string, { icon: React.ElementType; gradient: string; textColor: string; border: string }> = {
  "sites-web":          { icon: Globe,      gradient: "from-blue-800 to-blue-700",   textColor: "text-blue-300",   border: "border-blue-700" },
  "erp-gestion":        { icon: BarChart3,  gradient: "from-purple-800 to-purple-700", textColor: "text-purple-300", border: "border-purple-700" },
  "marketing-digital":  { icon: TrendingUp, gradient: "from-teal-800 to-teal-700",   textColor: "text-teal-300",   border: "border-teal-700" },
  "automatisation-crm": { icon: Zap,        gradient: "from-cyan-800 to-cyan-700",   textColor: "text-cyan-300",   border: "border-cyan-700" },
};

// ── Service icons (all 16 + legacy keys) ──────────────────────────────────
const SERVICE_ICONS: Record<string, React.ElementType> = {
  // Sites web
  "site-vitrine":             Layers,
  "site-ecommerce":           ShoppingCart,
  "portail-mesure":           LayoutDashboard,
  "maintenance-mensuelle-web": Wrench,
  // ERP & Gestion
  "erp-starter":    Rocket,
  "erp-pro":        BarChart3,
  "erp-enterprise": Building2,
  "erp-setup":      Users,
  // Marketing digital
  "marketing-strategie": BrainCircuit,
  "marketing-reseaux":   Share2,
  "marketing-ads":       Megaphone,
  "marketing-seo":       Search,
  // Automatisation & CRM
  "auto-analyse": BrainCircuit,
  "auto-dev":     Code2,
  "auto-crm":     HeartHandshake,
  "auto-support": Settings,
  // Legacy keys (backward compat)
  digitalisation: Cpu,
  crm:            Users,
  automation:     Zap,
  api:            Globe,
  consulting:     BarChart3,
  formation:      GraduationCap,
};

// ── Service accent colors (by prefix) ─────────────────────────────────────
function serviceAccent(key: string) {
  if (key.startsWith("site-") || key === "maintenance-mensuelle-web")
    return { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" };
  if (key.startsWith("erp-"))
    return { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" };
  if (key.startsWith("marketing-"))
    return { dot: "bg-teal-500", badge: "bg-teal-100 text-teal-700" };
  if (key.startsWith("auto-"))
    return { dot: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-700" };
  return { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ServiceContactModal({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-teal-50 rounded-lg"><Mail className="h-5 w-5 text-teal-600" /></div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Ce service est actif dans votre organisation. Contactez votre conseiller CivicAI pour accéder à ce module ou planifier une session.
        </p>
        <a
          href={`mailto:partenaires@attentezero.ca?subject=Service actif : ${encodeURIComponent(label)}`}
          className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Contacter CivicAI
        </a>
        <button onClick={onClose} className="block w-full text-center mt-2 text-sm text-gray-400 hover:text-gray-600">
          Fermer
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout, token } = useAuth();
  const { t } = useLang();
  const { data: user, isLoading, isError, error } = useGetTenantCurrentUser();
  const [activeService, setActiveService] = useState<{ key: string; label: string } | null>(null);

  useEffect(() => {
    if (isError && (error as any)?.status === 401) { logout(); setLocation("/login"); }
  }, [isError, error, logout, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse space-y-3 text-center">
          <div className="h-10 w-10 bg-gray-200 rounded-full mx-auto" />
          <div className="h-4 w-40 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const enabledProducts = user.enabledProducts ?? [];
  const enabledServices = user.enabledServices ?? [];
  const companyName = user.companyName || user.tenantSlug;

  // Split enabled products: deployable apps vs service categories
  const activeApps = enabledProducts.filter(k => k in APPS);
  const activeCategories = enabledProducts.filter(k => k in CATEGORY_CFG);

  // All category keys (active or not) for display
  const allCategoryKeys = Object.keys(CATEGORY_CFG);
  const allServiceKeys = Object.keys(t.services) as (keyof typeof t.services)[];
  // Only show services that belong to active categories (or all if no categories set)
  const visibleServiceKeys = enabledServices.length > 0
    ? allServiceKeys.filter(k => enabledServices.includes(k))
    : allServiceKeys;

  function openApp(key: string) {
    const cfg = APPS[key];
    if (!cfg) return;
    if (cfg.internal) { setLocation(cfg.appUrl); return; }
    const url = new URL(cfg.appUrl, window.location.origin);
    url.searchParams.set("tenant_token", token ?? "");
    window.open(url.toString(), "_blank", "noopener");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <img src="/tenant-portal/civicai-logo.png" alt="CivicAI" className="h-7 w-7 rounded-md object-contain" />
            <span className="font-bold text-lg text-gray-900">{t.portalName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <button onClick={() => setLocation("/profile")} className="flex items-center gap-2 hover:opacity-80 transition-opacity" title={t.profile}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-teal-600 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{user.firstName} {user.lastName}</span>
            </button>
            {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1 text-sm">{t.signOut}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Welcome banner */}
        <div className="relative rounded-2xl overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0f2744 50%, #0c3547 100%)" }}>
          {/* Dot-grid decoration */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="db-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#14b8a6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#db-dots)" />
          </svg>
          {/* Teal glow blobs */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "#14b8a6" }} />
          <div className="absolute bottom-0 right-64 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none" style={{ background: "#0ea5e9" }} />

          {/* Content row */}
          <div className="relative z-10 flex items-stretch">
            {/* Left: text content */}
            <div className="flex-1 p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <img src="/tenant-portal/civicai-logo.png" alt="CivicAI" className="h-8 w-8 rounded-lg object-contain bg-white/10 p-1" />
                <span className="text-teal-300 text-sm font-semibold tracking-wide uppercase">CivicAI · {t.dashboard}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold leading-tight">
                {t.welcome}, <span className="text-teal-300">{companyName}</span>
              </h1>
              <p className="text-slate-300 mt-2 text-sm max-w-md">
                Gérez vos projets, vos équipes et vos services depuis un seul espace — sécurisé, rapide et conçu au Québec.
              </p>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-teal-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                  {t.activeProducts(activeCategories.length)}
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                  {t.activeServices(enabledServices.length)}
                </div>
                <Badge className="bg-white/10 text-white border-white/20 font-mono text-xs">{user.tenantSlug}</Badge>
                <Badge className="bg-teal-500/30 text-teal-200 border-teal-500/40 text-xs capitalize">{user.role}</Badge>
              </div>
            </div>
            {/* Right: abstract geometric decoration */}
            <div className="hidden lg:flex w-56 xl:w-72 flex-shrink-0 items-center justify-center relative overflow-hidden pr-6">
              {/* Concentric rings */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-48 h-48 rounded-full border border-teal-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                <div className="w-36 h-36 rounded-full border border-teal-400/25 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                <div className="w-24 h-24 rounded-full border border-teal-300/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                {/* Center glow node */}
                <div className="w-10 h-10 rounded-full bg-teal-500/30 backdrop-blur-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-teal-400/70" />
                </div>
                {/* Orbiting dots */}
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400/60 absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%) translate(60px, -42px)" }} />
                <div className="w-2 h-2 rounded-full bg-sky-400/50 absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%) translate(-55px, 38px)" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-300/50 absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%) translate(30px, 70px)" }} />
              </div>
              {/* Left fade */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Deployable apps section (only if at least one active) ──── */}
        {(activeApps.length > 0 || Object.keys(APPS).some(k => enabledProducts.includes(k))) && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Applications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(APPS).map(([key, cfg]) => {
                const active = enabledProducts.includes(key);
                const Icon = cfg.icon;
                const p = t.products[key as keyof typeof t.products];
                if (!p) return null;
                if (!active) return (
                  <Card key={key} className="opacity-40 bg-gray-50 border-gray-200 select-none">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className="p-2 rounded-lg bg-gray-100"><Icon className="h-5 w-5 text-gray-400" /></div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <Lock className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0"><Badge variant="outline" className="text-xs">{t.inactive}</Badge></CardContent>
                  </Card>
                );
                return (
                  <Card key={key} className="border-teal-200 bg-white shadow-sm hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group" onClick={() => openApp(key)}>
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className={`p-2 rounded-lg ${cfg.bg}`}><Icon className={`h-5 w-5 ${cfg.color}`} /></div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center justify-between">
                      <Badge className="text-xs bg-teal-600">{t.activated}</Badge>
                      <span className="flex items-center gap-1 text-xs text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        <ExternalLink className="h-3 w-3" /> {t.openApp}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Service categories ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t.yourProducts}</h2>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => setLocation("/admin/tenants")}>
                <Server className="h-3 w-3 mr-1" /> {t.tenantDir}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allCategoryKeys.map(key => {
              const active = activeCategories.includes(key);
              const cfg = CATEGORY_CFG[key];
              const Icon = cfg.icon;
              const p = t.products[key as keyof typeof t.products];
              if (!p) return null;

              if (!active) return (
                <div key={key} className={`rounded-xl border-2 ${cfg.border} overflow-hidden opacity-40 select-none`}>
                  <div className={`bg-gradient-to-br ${cfg.gradient} p-4`}>
                    <Icon className={`h-5 w-5 ${cfg.textColor} mb-2`} />
                    <div className="text-white font-semibold text-sm">{p.label}</div>
                    <div className={`text-xs ${cfg.textColor} mt-0.5`}>{p.desc}</div>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <Badge variant="outline" className="text-xs">{t.inactive}</Badge>
                  </div>
                </div>
              );

              return (
                <div key={key} className={`rounded-xl border-2 ${cfg.border} overflow-hidden shadow-sm hover:shadow-md transition-all`}>
                  <div className={`bg-gradient-to-br ${cfg.gradient} p-4`}>
                    <Icon className={`h-5 w-5 ${cfg.textColor} mb-2`} />
                    <div className="text-white font-bold text-sm">{p.label}</div>
                    <div className={`text-xs ${cfg.textColor} mt-0.5`}>{p.desc}</div>
                  </div>
                  <div className="bg-white px-3 py-2 flex items-center justify-between">
                    <Badge className="text-xs bg-teal-600">{t.activated}</Badge>
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  </div>
                </div>
              );
            })}

            {/* Add category CTA */}
            <div
              className="rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center min-h-[112px] cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all group"
              onClick={() => window.open("mailto:partenaires@attentezero.ca?subject=Ajouter une catégorie", "_blank")}
            >
              <div className="text-center text-sm text-gray-400 p-4 group-hover:text-teal-600 transition-colors">
                <div className="text-2xl mb-1">+</div>
                <div className="font-medium text-xs">{t.addProduct}</div>
                <div className="text-xs mt-0.5 opacity-70">{t.contactCivicAI}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Services actifs ────────────────────────────────────────── */}
        {enabledServices.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">{t.yourServices}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleServiceKeys.map(key => {
                const active = enabledServices.includes(key);
                const Icon = SERVICE_ICONS[key] ?? Cpu;
                const s = t.services[key];
                const accent = serviceAccent(key);
                return (
                  <div
                    key={key}
                    onClick={() => active && setActiveService({ key, label: s.label })}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${active
                        ? "bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 cursor-pointer group"
                        : "bg-gray-50 border-gray-200 opacity-40 cursor-default"
                      }`}
                  >
                    <div className={`p-1.5 rounded-md ${active ? "bg-gray-100" : "bg-gray-100"}`}>
                      <Icon className={`h-4 w-4 ${active ? "text-gray-600" : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{s.label}</div>
                      <div className="text-xs text-gray-500">{s.desc}</div>
                    </div>
                    {active ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${accent.badge}`}>Actif</span>
                    ) : (
                      <Circle className="h-4 w-4 text-gray-200 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state — no services yet */}
        {enabledServices.length === 0 && enabledProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun service configuré pour le moment.</p>
            <p className="text-xs mt-1">Contactez <a href="mailto:partenaires@attentezero.ca" className="text-teal-600 hover:underline">partenaires@attentezero.ca</a> pour configurer votre organisation.</p>
          </div>
        )}
      </main>

      {activeService && (
        <ServiceContactModal label={activeService.label} onClose={() => setActiveService(null)} />
      )}
    </div>
  );
}

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
  Building2, LogOut, Server, CheckCircle2, Circle,
  HardHat, Heart, Cpu, Users, Zap, Globe, GraduationCap,
  BarChart3, ExternalLink, Smartphone, Mail, Lock
} from "lucide-react";

// ── Product catalogue ──────────────────────────────────────────────────────
const PRODUCTS = {
  constructpro: {
    icon: HardHat,
    color: "text-orange-500",
    bg: "bg-orange-50",
    appUrl: "/constructpro-erp/",
    kind: "web" as const,
  },
  attentezero: {
    icon: Heart,
    color: "text-teal-500",
    bg: "bg-teal-50",
    appUrl: "https://attentezero.ca",
    kind: "mobile" as const,
  },
} satisfies Record<string, { icon: React.ElementType; color: string; bg: string; appUrl: string; kind: "web" | "mobile" }>;

const SERVICE_ICONS: Record<string, React.ElementType> = {
  digitalisation: Cpu,
  crm: Users,
  automation: Zap,
  api: Globe,
  consulting: BarChart3,
  formation: GraduationCap,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function openProduct(key: string, token: string) {
  const cfg = PRODUCTS[key as keyof typeof PRODUCTS];
  if (!cfg) return;
  if (cfg.kind === "mobile") {
    window.open(cfg.appUrl, "_blank", "noopener");
    return;
  }
  // Pass tenant token so the app can auto-authenticate
  const url = new URL(cfg.appUrl, window.location.origin);
  url.searchParams.set("tenant_token", token);
  window.open(url.toString(), "_blank", "noopener");
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ServiceContactModal({ serviceKey, label, onClose }: { serviceKey: string; label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-teal-50 rounded-lg">
            <Mail className="h-5 w-5 text-teal-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Ce service est actif dans votre organisation. Contactez votre responsable CivicAI pour accéder à ce module ou planifier une session.
        </p>
        <a
          href="mailto:services@civicai.ca?subject=Service actif : ${label}"
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

  const allProductKeys = Object.keys(t.products) as (keyof typeof t.products)[];
  const allServiceKeys = Object.keys(t.services) as (keyof typeof t.services)[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span className="font-bold text-lg text-gray-900">{t.portalName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <button
              onClick={() => setLocation("/profile")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={t.profile}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-teal-600 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </span>
            </button>
            {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1 text-sm">{t.signOut}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white">
          <p className="text-teal-100 text-sm font-medium mb-1">{t.dashboard}</p>
          <h1 className="text-2xl font-bold">{t.welcome}, {companyName}</h1>
          <p className="text-teal-100 mt-1 text-sm">
            {t.activeProducts(enabledProducts.length)} · {t.activeServices(enabledServices.length)}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 text-white border-white/30 font-mono text-xs">{user.tenantSlug}</Badge>
            <Badge className="bg-white/20 text-white border-white/30 text-xs capitalize">{user.role}</Badge>
          </div>
        </div>

        {/* Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t.yourProducts}</h2>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => setLocation("/admin/tenants")}>
                <Server className="h-3 w-3 mr-1" /> {t.tenantDir}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProductKeys.map((key) => {
              const active = enabledProducts.includes(key);
              const cfg = PRODUCTS[key as keyof typeof PRODUCTS];
              const Icon = cfg?.icon ?? Building2;
              const p = t.products[key];

              if (!active) {
                return (
                  <Card key={key} className="opacity-50 bg-gray-50 border-gray-200 select-none">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <Lock className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="text-xs">{t.inactive}</Badge>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card
                  key={key}
                  className="border-teal-200 bg-white shadow-sm hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group"
                  onClick={() => openProduct(key, token ?? "")}
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className={`p-2 rounded-lg ${cfg?.bg ?? "bg-teal-50"}`}>
                      <Icon className={`h-5 w-5 ${cfg?.color ?? "text-teal-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between">
                    <Badge className="text-xs bg-teal-600">{t.activated}</Badge>
                    <span className="flex items-center gap-1 text-xs text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      {cfg?.kind === "mobile"
                        ? <><Smartphone className="h-3 w-3" /> App mobile</>
                        : <><ExternalLink className="h-3 w-3" /> {t.openApp}</>
                      }
                    </span>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add product placeholder */}
            <Card className="border-dashed border-2 border-gray-200 bg-transparent flex items-center justify-center min-h-[108px] cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all group">
              <div className="text-center text-sm text-gray-400 p-4 group-hover:text-teal-600 transition-colors">
                <div className="text-2xl mb-1">+</div>
                <div className="font-medium">{t.addProduct}</div>
                <div className="text-xs mt-1">{t.contactCivicAI}</div>
              </div>
            </Card>
          </div>
        </section>

        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.yourServices}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allServiceKeys.map((key) => {
              const active = enabledServices.includes(key);
              const Icon = SERVICE_ICONS[key] ?? Cpu;
              const s = t.services[key];
              return (
                <div
                  key={key}
                  onClick={() => active && setActiveService({ key, label: s.label })}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${active
                      ? "bg-white border-teal-200 shadow-sm hover:shadow-md hover:border-teal-400 cursor-pointer group"
                      : "bg-gray-50 border-gray-200 opacity-50 cursor-default"
                    }`}
                >
                  <div className={`p-1.5 rounded-md ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </div>
                  {active
                    ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    : <Circle className="h-4 w-4 text-gray-200 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Service contact modal */}
      {activeService && (
        <ServiceContactModal
          serviceKey={activeService.key}
          label={activeService.label}
          onClose={() => setActiveService(null)}
        />
      )}
    </div>
  );
}

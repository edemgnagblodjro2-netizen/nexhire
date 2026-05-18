import { useEffect } from "react";
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
  HardHat, Heart, Cpu, Users, Zap, Globe, GraduationCap, BarChart3
} from "lucide-react";

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  constructpro: HardHat,
  attentezero: Heart,
};
const PRODUCT_COLORS: Record<string, string> = {
  constructpro: "text-orange-500",
  attentezero: "text-teal-500",
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  digitalisation: Cpu,
  crm: Users,
  automation: Zap,
  api: Globe,
  consulting: BarChart3,
  formation: GraduationCap,
};

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const { t } = useLang();
  const { data: user, isLoading, isError, error } = useGetTenantCurrentUser();

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span className="font-bold text-lg text-gray-900">{t.portalName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-teal-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {user.firstName} {user.lastName}
            </span>
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
            <Badge className="bg-white/20 text-white border-white/30 font-mono text-xs">
              {user.tenantSlug}
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 text-xs capitalize">
              {user.role}
            </Badge>
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
              const Icon = PRODUCT_ICONS[key] ?? Building2;
              const color = PRODUCT_COLORS[key] ?? "text-gray-500";
              const p = t.products[key];
              return (
                <Card key={key} className={`transition-all ${active ? "border-teal-200 bg-white shadow-sm" : "opacity-60 bg-gray-50"}`}>
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className={`p-2 rounded-lg ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                      <Icon className={`h-5 w-5 ${active ? color : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    {active
                      ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant={active ? "default" : "outline"} className={`text-xs ${active ? "bg-teal-600" : ""}`}>
                      {active ? t.activated : t.inactive}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="border-dashed border-2 border-gray-200 bg-transparent flex items-center justify-center min-h-[100px] cursor-pointer hover:border-teal-300 transition-colors">
              <div className="text-center text-sm text-gray-400 p-4">
                <div className="text-2xl mb-1">+</div>
                <div>{t.addProduct}</div>
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
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${active ? "bg-white border-teal-200 shadow-sm" : "bg-gray-50 border-gray-200 opacity-60"}`}>
                  <div className={`p-1.5 rounded-md ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </div>
                  {active
                    ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    : <Circle className="h-4 w-4 text-gray-200 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

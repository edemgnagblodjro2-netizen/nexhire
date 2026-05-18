import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTenant } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Loader2, Calendar, CheckCircle2, Circle,
  HardHat, Heart, Cpu, Users, Zap, Globe, GraduationCap, BarChart3, Save
} from "lucide-react";

const ALL_PRODUCTS = [
  { key: "constructpro", icon: HardHat, color: "text-orange-500", bg: "bg-orange-50" },
  { key: "attentezero",  icon: Heart,    color: "text-teal-500",   bg: "bg-teal-50"   },
];
const ALL_SERVICES = [
  { key: "digitalisation", icon: Cpu       },
  { key: "crm",            icon: Users     },
  { key: "automation",     icon: Zap       },
  { key: "api",            icon: Globe     },
  { key: "consulting",     icon: BarChart3 },
  { key: "formation",      icon: GraduationCap },
];

export function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const [, setLocation] = useLocation();
  const { logout, token } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();

  const id = params?.id || "";
  const { data: tenant, isLoading, isError, error, refetch } = useGetTenant(id);

  const [products, setProducts] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [inited, setInited] = useState(false);

  useEffect(() => {
    if (tenant && !inited) {
      setProducts((tenant as any).enabledProducts ?? []);
      setServices((tenant as any).enabledServices ?? []);
      setInited(true);
    }
  }, [tenant, inited]);

  if (isError && (error as any)?.status === 401) { logout(); setLocation("/login"); return null; }

  function toggleProduct(key: string) {
    setProducts(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  }
  function toggleService(key: string) {
    setServices(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);
  }

  async function saveModules() {
    setSavingModules(true);
    try {
      const r = await fetch(`/api/admin/tenants/${id}/modules`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": token ?? "",
        },
        body: JSON.stringify({ enabledProducts: products, enabledServices: services }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      await refetch();
      toast({ title: t.modulesSaved });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingModules(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/tenants")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
            <Building2 className="h-5 w-5 text-teal-600" />
            <span className="font-semibold text-lg text-gray-900">
              {tenant?.name || tenant?.slug || "Organisation"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : isError || !tenant ? (
          <div className="text-center p-12">
            <h2 className="text-xl font-semibold text-gray-900">Organisation introuvable</h2>
            <Button className="mt-4" onClick={() => setLocation("/admin/tenants")}>Retour</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {tenant.name || tenant.slug}
                  <Badge className={`font-normal text-xs ${(tenant as any).status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-600"}`}>
                    {(tenant as any).status ?? "active"}
                  </Badge>
                </h1>
                <p className="mt-1 text-gray-500 font-mono text-sm">{tenant.slug}</p>
              </div>
              <Badge variant="outline" className="capitalize">{tenant.plan}</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Info card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs mb-0.5">ID</span>
                    <span className="font-mono text-xs break-all">{tenant.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-0.5">Code</span>
                    <span className="font-mono">{tenant.slug}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-0.5">Plan</span>
                    <span className="capitalize">{tenant.plan}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-0.5">Créé le</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Modules card */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{t.modulesTitle}</CardTitle>
                    <CardDescription className="text-xs mt-1">{t.modulesDesc}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 gap-2"
                    onClick={saveModules}
                    disabled={savingModules}
                  >
                    {savingModules
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Save className="h-3 w-3" />}
                    {t.saveModules}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Products */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {t.yourProducts}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_PRODUCTS.map(({ key, icon: Icon, color, bg }) => {
                        const active = products.includes(key);
                        const label = t.products[key as keyof typeof t.products]?.label ?? key;
                        const desc = t.products[key as keyof typeof t.products]?.desc ?? "";
                        return (
                          <button
                            key={key}
                            onClick={() => toggleProduct(key)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full
                              ${active
                                ? "bg-white border-teal-300 shadow-sm ring-1 ring-teal-200"
                                : "bg-gray-50 border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <div className={`p-1.5 rounded-md ${active ? bg : "bg-gray-100"}`}>
                              <Icon className={`h-4 w-4 ${active ? color : "text-gray-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{label}</div>
                              <div className="text-xs text-gray-500">{desc}</div>
                            </div>
                            {active
                              ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                              : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {t.yourServices}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_SERVICES.map(({ key, icon: Icon }) => {
                        const active = services.includes(key);
                        const label = t.services[key as keyof typeof t.services]?.label ?? key;
                        const desc = t.services[key as keyof typeof t.services]?.desc ?? "";
                        return (
                          <button
                            key={key}
                            onClick={() => toggleService(key)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full
                              ${active
                                ? "bg-white border-teal-300 shadow-sm ring-1 ring-teal-200"
                                : "bg-gray-50 border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <div className={`p-1.5 rounded-md ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                              <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{label}</div>
                              <div className="text-xs text-gray-500">{desc}</div>
                            </div>
                            {active
                              ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                              : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

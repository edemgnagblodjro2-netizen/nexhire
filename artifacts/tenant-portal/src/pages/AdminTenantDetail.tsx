import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Loader2, Calendar, CheckCircle2, Circle,
  Save, Globe, BarChart3, TrendingUp, Zap, HardHat, Heart,
  Layers, ShoppingCart, LayoutDashboard, Wrench,
  Rocket, Users, BrainCircuit, Share2, Megaphone, Search,
  Code2, HeartHandshake, Settings, Clock, XCircle, Pencil,
  Phone, MapPin, Briefcase,
} from "lucide-react";

// ── Full product catalogue ─────────────────────────────────────────────────
const ALL_PRODUCTS = [
  { key: "constructpro",        icon: HardHat,       color: "text-orange-500", bg: "bg-orange-50" },
  { key: "attentezero",         icon: Heart,         color: "text-teal-500",   bg: "bg-teal-50"   },
  { key: "civicai-crm",         icon: HeartHandshake,color: "text-indigo-500", bg: "bg-indigo-50" },
  { key: "sites-web",           icon: Globe,         color: "text-blue-500",   bg: "bg-blue-50"   },
  { key: "erp-gestion",         icon: BarChart3,     color: "text-purple-500", bg: "bg-purple-50" },
  { key: "marketing-digital",   icon: TrendingUp,    color: "text-teal-500",   bg: "bg-teal-50"   },
  { key: "automatisation-crm",  icon: Zap,           color: "text-cyan-500",   bg: "bg-cyan-50"   },
];

const ALL_SERVICES = [
  { key: "site-vitrine",              icon: Layers        },
  { key: "site-ecommerce",            icon: ShoppingCart  },
  { key: "portail-mesure",            icon: LayoutDashboard},
  { key: "maintenance-mensuelle-web", icon: Wrench        },
  { key: "erp-starter",               icon: Rocket        },
  { key: "erp-pro",                   icon: BarChart3     },
  { key: "erp-enterprise",            icon: Building2     },
  { key: "erp-setup",                 icon: Users         },
  { key: "marketing-strategie",       icon: BrainCircuit  },
  { key: "marketing-reseaux",         icon: Share2        },
  { key: "marketing-ads",             icon: Megaphone     },
  { key: "marketing-seo",             icon: Search        },
  { key: "auto-analyse",              icon: BrainCircuit  },
  { key: "auto-dev",                  icon: Code2         },
  { key: "auto-crm",                  icon: HeartHandshake},
  { key: "auto-support",              icon: Settings      },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface TenantMetadata {
  neq?: string;
  phone?: string;
  address?: string;
  city?: string;
  sector?: string;
  userCount?: string;
  contactTitle?: string;
}

interface Tenant {
  id: string;
  companyName: string;
  subdomain: string;
  schemaName: string;
  appType: string;
  plan: string;
  status: "active" | "suspended" | "trial";
  enabledProducts: string[];
  enabledServices: string[];
  metadata?: TenantMetadata;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Actif</Badge>;
  if (status === "trial")     return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Clock className="h-3 w-3" />Essai</Badge>;
  if (status === "suspended") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Suspendu</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

// ── Page ───────────────────────────────────────────────────────────────────
export function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();

  const id = params?.id ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"active" | "suspended" | "trial">("active");
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<"free" | "starter" | "pro" | "enterprise">("free");

  async function fetchTenant() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError("Organisation introuvable ou accès refusé."); return; }
      const data: Tenant = await res.json();
      setTenant(data);
      setProducts(data.enabledProducts ?? []);
      setServices(data.enabledServices ?? []);
      setPendingStatus(data.status ?? "active");
      setPendingPlan((data.plan ?? "free") as "free" | "starter" | "pro" | "enterprise");
    } catch { setError("Impossible de joindre le serveur."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (id && token) fetchTenant(); }, [id, token]);

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabledProducts: products, enabledServices: services }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      await fetchTenant();
      toast({ title: "Modules mis à jour", description: `${products.length} produits · ${services.length} services` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingModules(false); }
  }

  async function savePlan() {
    setSavingPlan(true);
    try {
      const r = await fetch(`/api/admin/tenants/${id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: pendingPlan }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      await fetchTenant();
      setEditingPlan(false);
      toast({ title: "Plan mis à jour", description: `Plan passé en : ${pendingPlan}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingPlan(false); }
  }

  async function saveStatus() {
    setSavingStatus(true);
    try {
      const r = await fetch(`/api/admin/tenants/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: pendingStatus }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      await fetchTenant();
      setEditingStatus(false);
      toast({ title: "Statut mis à jour", description: `Organisation passée en : ${pendingStatus}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingStatus(false); }
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-3">
          <button onClick={() => setLocation("/admin/tenants")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <Building2 className="h-5 w-5 text-teal-600" />
          <span className="font-semibold text-lg text-gray-900">
            {loading ? "Chargement…" : tenant?.companyName ?? "Organisation"}
          </span>
          {tenant && <StatusBadge status={tenant.status} />}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
        ) : error || !tenant ? (
          <div className="text-center p-12">
            <p className="text-lg font-semibold text-gray-800 mb-2">{error ?? "Organisation introuvable"}</p>
            <Button onClick={() => setLocation("/admin/tenants")}><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Info card */}
              <Card className="lg:col-span-1 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Nom</span>
                    <span className="font-semibold text-gray-900">{tenant.companyName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Code organisation</span>
                    <span className="font-mono text-gray-700">attentezero.ca/{tenant.subdomain}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Schéma BDD</span>
                    <span className="font-mono text-xs text-gray-500">{tenant.schemaName}</span>
                  </div>

                  {/* Metadata fields */}
                  {tenant.metadata?.phone && (
                    <div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Phone className="h-3 w-3" />Téléphone</span>
                      <span className="text-gray-700">{tenant.metadata.phone}</span>
                    </div>
                  )}
                  {(tenant.metadata?.address || tenant.metadata?.city) && (
                    <div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><MapPin className="h-3 w-3" />Adresse</span>
                      <span className="text-gray-700 text-xs">
                        {[tenant.metadata?.address, tenant.metadata?.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {tenant.metadata?.neq && (
                    <div>
                      <span className="text-xs text-gray-400 block mb-0.5">NEQ</span>
                      <span className="font-mono text-sm text-gray-700">{tenant.metadata.neq}</span>
                    </div>
                  )}
                  {tenant.metadata?.sector && (
                    <div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Briefcase className="h-3 w-3" />Secteur</span>
                      <span className="text-gray-700">{tenant.metadata.sector}</span>
                    </div>
                  )}
                  {tenant.metadata?.userCount && (
                    <div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Users className="h-3 w-3" />Utilisateurs prévus</span>
                      <span className="text-gray-700">{tenant.metadata.userCount}</span>
                    </div>
                  )}
                  {tenant.metadata?.contactTitle && (
                    <div>
                      <span className="text-xs text-gray-400 block mb-0.5">Titre du contact</span>
                      <span className="text-gray-700">{tenant.metadata.contactTitle}</span>
                    </div>
                  )}

                  {/* Plan changer */}
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400 block mb-2">Plan</span>
                    {editingPlan ? (
                      <div className="space-y-2">
                        {([
                          { key: "free",       label: "Gratuit",      color: "text-gray-600" },
                          { key: "starter",    label: "Starter",      color: "text-blue-600" },
                          { key: "pro",        label: "Professionnel",color: "text-purple-600" },
                          { key: "enterprise", label: "Entreprise",   color: "text-orange-600" },
                        ] as const).map(p => (
                          <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="plan" value={p.key} checked={pendingPlan === p.key}
                              onChange={() => setPendingPlan(p.key)} className="accent-teal-600" />
                            <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
                          </label>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 flex-1" onClick={savePlan} disabled={savingPlan}>
                            {savingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                            Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPlan(false)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Badge className={`capitalize ${
                          tenant.plan === "enterprise" ? "bg-orange-100 text-orange-700" :
                          tenant.plan === "pro"        ? "bg-purple-100 text-purple-700" :
                          tenant.plan === "starter"    ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {tenant.plan === "pro" ? "Professionnel" :
                           tenant.plan === "enterprise" ? "Entreprise" :
                           tenant.plan === "starter" ? "Starter" : "Gratuit"}
                        </Badge>
                        <button onClick={() => setEditingPlan(true)}
                          className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> Changer
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Type d'application</span>
                    <span className="capitalize text-gray-700">{tenant.appType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Inscrit le</span>
                    <span className="flex items-center gap-1 text-gray-700"><Calendar className="h-3 w-3 text-gray-400" />{fmtDate(tenant.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Mis à jour</span>
                    <span className="text-gray-600">{fmtDate(tenant.updatedAt)}</span>
                  </div>

                  {/* Status changer */}
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400 block mb-2">Statut du compte</span>
                    {editingStatus ? (
                      <div className="space-y-2">
                        {(["active", "trial", "suspended"] as const).map(s => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="status" value={s} checked={pendingStatus === s}
                              onChange={() => setPendingStatus(s)} className="accent-teal-600" />
                            <span className="text-sm capitalize text-gray-700">{s === "active" ? "Actif" : s === "trial" ? "En essai" : "Suspendu"}</span>
                          </label>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 flex-1" onClick={saveStatus} disabled={savingStatus}>
                            {savingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                            Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingStatus(false)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <StatusBadge status={tenant.status} />
                        <button onClick={() => setEditingStatus(true)}
                          className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> Changer
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Modules card */}
              <Card className="lg:col-span-2 border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm text-gray-700">{t.modulesTitle}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t.modulesDesc}</CardDescription>
                  </div>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={saveModules} disabled={savingModules}>
                    {savingModules ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {t.saveModules}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Products */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produits & catégories</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_PRODUCTS.map(({ key, icon: Icon, color, bg }) => {
                        const active = products.includes(key);
                        const label = t.products[key as keyof typeof t.products]?.label ?? key;
                        const desc  = t.products[key as keyof typeof t.products]?.desc ?? "";
                        return (
                          <button key={key} onClick={() => toggleProduct(key)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full
                              ${active ? "bg-white border-teal-300 shadow-sm ring-1 ring-teal-200" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${active ? bg : "bg-gray-100"}`}>
                              <Icon className={`h-4 w-4 ${active ? color : "text-gray-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{label}</div>
                              <div className="text-xs text-gray-400">{desc}</div>
                            </div>
                            {active ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Services facturables</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_SERVICES.map(({ key, icon: Icon }) => {
                        const active = services.includes(key);
                        const label = t.services[key as keyof typeof t.services]?.label ?? key;
                        const desc  = t.services[key as keyof typeof t.services]?.desc ?? "";
                        return (
                          <button key={key} onClick={() => toggleService(key)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full
                              ${active ? "bg-white border-teal-300 shadow-sm ring-1 ring-teal-200" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                              <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{label}</div>
                              <div className="text-xs text-gray-400">{desc}</div>
                            </div>
                            {active ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
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

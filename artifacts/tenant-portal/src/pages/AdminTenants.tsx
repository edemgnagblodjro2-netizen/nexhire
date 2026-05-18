import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetTenantCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, ArrowLeft, Search, ChevronRight,
  CheckCircle2, Clock, XCircle, Layers, Wrench,
  RefreshCw, Plus,
} from "lucide-react";

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
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Actif</Badge>;
  if (status === "trial")     return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Clock className="h-3 w-3" />Essai</Badge>;
  if (status === "suspended") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Suspendu</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
    enterprise: "bg-orange-100 text-orange-700",
  };
  return <Badge className={`${map[plan] ?? "bg-gray-100 text-gray-600"} capitalize`}>{plan}</Badge>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminTenants() {
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const { data: me } = useGetTenantCurrentUser();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdmin = me?.role === "admin" || me?.role === "super_admin";

  async function fetchTenants() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError("Accès refusé ou erreur serveur."); return; }
      setTenants(await res.json());
    } catch { setError("Impossible de joindre le serveur."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (token) fetchTenants(); }, [token]);

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.companyName.toLowerCase().includes(q) || t.subdomain.toLowerCase().includes(q))
      && (statusFilter === "all" || t.status === statusFilter);
  });

  const stats = {
    total:     tenants.length,
    active:    tenants.filter(t => t.status === "active").length,
    trial:     tenants.filter(t => t.status === "trial").length,
    suspended: tenants.filter(t => t.status === "suspended").length,
  };

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-sm p-8 text-center">
          <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-800">Accès refusé</p>
          <p className="text-sm text-gray-500 mt-1">Section réservée aux administrateurs CivicAI.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/dashboard")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <Building2 className="h-5 w-5 text-teal-600" />
            <span className="font-bold text-lg text-gray-900">Gestion des organisations</span>
            {!loading && <Badge variant="outline" className="text-xs">{tenants.length} au total</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setLocation("/register")}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle org
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",     value: stats.total,     icon: Building2,   color: "text-gray-700",   bg: "bg-gray-100"  },
            { label: "Actifs",    value: stats.active,    icon: CheckCircle2,color: "text-green-600",  bg: "bg-green-50"  },
            { label: "En essai",  value: stats.trial,     icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Suspendus", value: stats.suspended, icon: XCircle,     color: "text-red-500",    bg: "bg-red-50"    },
          ].map(s => (
            <Card key={s.label} className="border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par nom ou code…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "all",       l: "Tous"      },
              { v: "active",    l: "Actifs"    },
              { v: "trial",     l: "En essai"  },
              { v: "suspended", l: "Suspendus" },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${statusFilter === v ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune organisation trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <button key={t.id} onClick={() => setLocation(`/admin/tenants/${t.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-600 font-bold text-sm">{t.companyName[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{t.companyName}</span>
                      <StatusBadge status={t.status} />
                      <PlanBadge plan={t.plan} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span className="font-mono">civicai.ca/{t.subdomain}</span>
                      <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{(t.enabledProducts ?? []).length} produits</span>
                      <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{(t.enabledServices ?? []).length} services</span>
                      <span>{fmtDate(t.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

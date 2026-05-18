import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetTenantCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2, LogOut, Server, CheckCircle2, Circle,
  HardHat, Heart, Cpu, Users, Zap, Globe, GraduationCap, BarChart3
} from "lucide-react";

const PRODUCTS: Record<string, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  constructpro: { label: "ConstructPro", desc: "ERP construction & chantiers", icon: HardHat, color: "text-orange-500" },
  attentezero:  { label: "AttenteZéro", desc: "Services communautaires QC",   icon: Heart,    color: "text-teal-500"   },
};

const SERVICES: Record<string, { label: string; desc: string; icon: React.ElementType }> = {
  digitalisation: { label: "Digitalisation",    desc: "Transformation numérique",    icon: Cpu      },
  crm:            { label: "CRM personnalisé",   desc: "Gestion de la relation client", icon: Users   },
  automation:     { label: "Automatisation",     desc: "Workflows & processus auto",  icon: Zap      },
  api:            { label: "Intégrations API",   desc: "Connexions tierces & REST",   icon: Globe    },
  consulting:     { label: "Consulting TI",      desc: "Accompagnement stratégique",  icon: BarChart3},
  formation:      { label: "Formation",          desc: "Montée en compétence équipe", icon: GraduationCap },
};

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
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

  const initials = `${(user as any).firstName?.[0] ?? ""}${(user as any).lastName?.[0] ?? ""}`.toUpperCase();
  const isAdmin = (user as any).role === "admin" || (user as any).role === "super_admin";
  const enabledProducts: string[] = (user as any).enabledProducts ?? [];
  const enabledServices: string[] = (user as any).enabledServices ?? [];
  const companyName: string = (user as any).companyName || (user as any).tenantSlug || "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span className="font-bold text-lg text-gray-900">CivicAI Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-teal-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {(user as any).firstName} {(user as any).lastName}
            </span>
            {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white">
          <p className="text-teal-100 text-sm font-medium mb-1">Tableau de bord</p>
          <h1 className="text-2xl font-bold">Bienvenue, {companyName}</h1>
          <p className="text-teal-100 mt-1 text-sm">
            {enabledProducts.length} produit{enabledProducts.length !== 1 ? "s" : ""} actif{enabledProducts.length !== 1 ? "s" : ""} · {enabledServices.length} service{enabledServices.length !== 1 ? "s" : ""} actif{enabledServices.length !== 1 ? "s" : ""}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 text-white border-white/30 font-mono text-xs">
              {(user as any).tenantSlug}
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 text-xs capitalize">
              {(user as any).role}
            </Badge>
          </div>
        </div>

        {/* Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Vos produits</h2>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => setLocation("/admin/tenants")}>
                <Server className="h-3 w-3 mr-1" /> Gestion tenants
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PRODUCTS).map(([key, p]) => {
              const active = enabledProducts.includes(key);
              const Icon = p.icon;
              return (
                <Card key={key} className={`transition-all ${active ? "border-teal-200 bg-white shadow-sm" : "opacity-60 bg-gray-50"}`}>
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className={`p-2 rounded-lg ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                      <Icon className={`h-5 w-5 ${active ? p.color : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    {active
                      ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    }
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant={active ? "default" : "outline"} className={`text-xs ${active ? "bg-teal-600" : ""}`}>
                      {active ? "Activé" : "Inactif"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add product placeholder */}
            <Card className="border-dashed border-2 border-gray-200 bg-transparent flex items-center justify-center min-h-[100px] cursor-pointer hover:border-teal-300 transition-colors">
              <div className="text-center text-sm text-gray-400 p-4">
                <div className="text-2xl mb-1">+</div>
                <div>Ajouter un produit</div>
                <div className="text-xs mt-1">Contactez CivicAI</div>
              </div>
            </Card>
          </div>
        </section>

        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vos services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(SERVICES).map(([key, s]) => {
              const active = enabledServices.includes(key);
              const Icon = s.icon;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${active ? "bg-white border-teal-200 shadow-sm" : "bg-gray-50 border-gray-200 opacity-60"}`}
                >
                  <div className={`p-1.5 rounded-md ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-teal-600" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </div>
                  {active
                    ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    : <Circle className="h-4 w-4 text-gray-200 flex-shrink-0" />
                  }
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

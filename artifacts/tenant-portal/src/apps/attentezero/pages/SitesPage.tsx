import { useState } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { MapPin, Plus, Users, Clock, TrendingUp, ChevronRight } from "lucide-react";

interface Site {
  id: string; name: string; city: string; address: string;
  status: "active" | "inactive"; counters: number; todayClients: number; avgWait: string;
}

const SITES: Site[] = [
  { id: "1", name: "Bureau Principal",    city: "Montréal",      address: "1000 rue Saint-Denis",     status: "active",   counters: 6, todayClients: 142, avgWait: "8 min" },
  { id: "2", name: "Succursale Nord",     city: "Laval",         address: "345 boul. Cartier O.",     status: "active",   counters: 3, todayClients: 78,  avgWait: "5 min" },
  { id: "3", name: "Succursale Sud",      city: "Longueuil",     address: "880 chemin Chambly",       status: "active",   counters: 4, todayClients: 95,  avgWait: "11 min" },
  { id: "4", name: "Point de service Est",city: "Repentigny",    address: "225 rue Notre-Dame",       status: "inactive", counters: 2, todayClients: 0,   avgWait: "—" },
  { id: "5", name: "Kiosque Aéroport",    city: "Dorval",        address: "Aéroport Montréal-Trudeau",status: "active",   counters: 2, todayClients: 61,  avgWait: "3 min" },
];

export function SitesPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [selected, setSelected] = useState<string | null>(null);
  const site = SITES.find(s => s.id === selected);

  return (
    <AttenteZeroLayout active="sites">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Gestion multi-sites" : "Multi-site management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{SITES.filter(s => s.status === "active").length} {fr ? "sites actifs" : "active sites"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {fr ? "Ajouter un site" : "Add site"}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: fr ? "Total clients" : "Total clients", value: SITES.reduce((a, s) => a + s.todayClients, 0), icon: Users },
            { label: fr ? "Guichets actifs" : "Active counters", value: SITES.filter(s => s.status === "active").reduce((a, s) => a + s.counters, 0), icon: TrendingUp },
            { label: fr ? "Sites en ligne" : "Online sites", value: SITES.filter(s => s.status === "active").length, icon: MapPin },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-teal-600 flex-shrink-0" />
                <div>
                  <div className="text-xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Site list */}
        <div className="space-y-3">
          {SITES.map(s => (
            <Card key={s.id} className={`cursor-pointer transition-all hover:shadow-md ${selected === s.id ? "ring-2 ring-teal-400" : ""}`}
              onClick={() => setSelected(selected === s.id ? null : s.id)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${s.status === "active" ? "bg-teal-50" : "bg-gray-100"}`}>
                    <MapPin className={`h-5 w-5 ${s.status === "active" ? "text-teal-600" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                      <Badge className={`text-xs px-1.5 ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {s.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.city} · {s.address}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{s.todayClients}</div>
                      <div className="text-xs text-gray-400">{fr ? "clients" : "clients"}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{s.counters}</div>
                      <div className="text-xs text-gray-400">{fr ? "guichets" : "counters"}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{s.avgWait}</div>
                      <div className="text-xs text-gray-400">{fr ? "attente" : "wait"}</div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${selected === s.id ? "rotate-90" : ""}`} />
                </div>

                {selected === s.id && s.status === "active" && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: fr ? "Adresse" : "Address", value: s.address },
                      { label: fr ? "Ville" : "City",      value: s.city },
                      { label: fr ? "Guichets" : "Counters", value: `${s.counters} ouverts` },
                      { label: fr ? "Attente moy." : "Avg wait", value: s.avgWait },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AttenteZeroLayout>
  );
}

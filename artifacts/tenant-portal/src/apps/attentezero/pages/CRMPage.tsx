import { useState } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { BookUser, Search, Star, Clock, TrendingUp, Mail, Phone, Plus } from "lucide-react";

interface Client {
  id: string; name: string; email: string; phone: string;
  visits: number; lastVisit: string; avgWait: string;
  vip: boolean; notes: string; tags: string[];
}

const CLIENTS: Client[] = [
  { id: "1", name: "Marie Dupont",   email: "marie@example.com", phone: "514-555-0101", visits: 24, lastVisit: "2026-05-18", avgWait: "7 min", vip: true,  notes: "Cliente régulière, préfère les matins", tags: ["VIP", "Service civil"] },
  { id: "2", name: "Ahmed Benali",   email: "ahmed@example.com", phone: "438-555-0202", visits: 12, lastVisit: "2026-05-15", avgWait: "9 min", vip: false, notes: "Dossier immigration en cours",           tags: ["Immigration"] },
  { id: "3", name: "Julie Tremblay", email: "julie@example.com", phone: "450-555-0303", visits: 8,  lastVisit: "2026-05-10", avgWait: "6 min", vip: false, notes: "Permis de construction — suivi mensuel", tags: ["Construction"] },
  { id: "4", name: "Carlos Morales", email: "carlos@example.com",phone: "514-555-0404", visits: 31, lastVisit: "2026-05-17", avgWait: "5 min", vip: true,  notes: "Interprète requis — espagnol",          tags: ["VIP", "Interprète"] },
  { id: "5", name: "Fatima Osei",    email: "fatima@example.com",phone: "514-555-0505", visits: 5,  lastVisit: "2026-05-12", avgWait: "11 min",vip: false, notes: "",                                     tags: ["Impôts"] },
];

export function CRMPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  const filtered = CLIENTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AttenteZeroLayout active="crm">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "CRM — Gestion clients" : "CRM — Client management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{CLIENTS.length} {fr ? "clients enregistrés" : "registered clients"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {fr ? "Ajouter client" : "Add client"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BookUser,    label: fr ? "Total clients" : "Total clients",      value: CLIENTS.length },
            { icon: Star,        label: fr ? "Clients VIP"   : "VIP clients",        value: CLIENTS.filter(c => c.vip).length },
            { icon: TrendingUp,  label: fr ? "Visites ce mois" : "Visits this month", value: CLIENTS.reduce((a, c) => a + c.visits, 0) },
          ].map(({ icon: Icon, label, value }) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client list */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={fr ? "Rechercher un client…" : "Search client…"}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {filtered.map(c => (
              <Card key={c.id} className={`cursor-pointer transition-all hover:shadow-sm ${selected?.id === c.id ? "ring-2 ring-teal-400" : ""}`}
                onClick={() => setSelected(c)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                      {c.vip && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <div className="text-xs text-gray-500">{c.visits} {fr ? "visites" : "visits"} · {fr ? "Dernière" : "Last"}: {c.lastVisit}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 1).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs px-1.5 h-5">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Client detail */}
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-700">
                    {selected.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{selected.name}</CardTitle>
                      {selected.vip && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selected.tags.map(t => <Badge key={t} variant="outline" className="text-xs px-1.5 h-5">{t}</Badge>)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400 text-xs">{fr ? "Visites" : "Visits"}</span><div className="font-bold text-gray-900">{selected.visits}</div></div>
                  <div><span className="text-gray-400 text-xs">{fr ? "Attente moy." : "Avg wait"}</span><div className="font-bold text-gray-900">{selected.avgWait}</div></div>
                  <div><span className="text-gray-400 text-xs">{fr ? "Dernière visite" : "Last visit"}</span><div className="font-medium text-gray-900">{selected.lastVisit}</div></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400" />{selected.email}</div>
                  <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400" />{selected.phone}</div>
                </div>
                {selected.notes && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">{fr ? "Notes" : "Notes"}</div>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">{selected.notes}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5"><Mail className="h-3.5 w-3.5" />{fr ? "Email" : "Email"}</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5"><Clock className="h-3.5 w-3.5" />{fr ? "RDV" : "Appt"}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400">{fr ? "Sélectionnez un client" : "Select a client"}</p>
            </div>
          )}
        </div>
      </div>
    </AttenteZeroLayout>
  );
}

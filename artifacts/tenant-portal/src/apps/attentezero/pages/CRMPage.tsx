import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { BookUser, Search, Star, Clock, TrendingUp, Mail, Phone, Plus, RefreshCw, X, Check } from "lucide-react";
import { azApi } from "../lib/api";

export function CRMPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [clients,   setClients]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<any | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({ client_name: "", email: "", phone: "", notes: "", is_vip: false, tags: "" });

  const load = useCallback(async () => {
    try { const d = await azApi.getCrmClients(search || undefined); setClients(d); setError(null); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function addClient() {
    if (!form.client_name) return;
    setSaving(true);
    try {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      await azApi.createCrmClient({ ...form, tags, is_vip: form.is_vip });
      setShowForm(false);
      setForm({ client_name: "", email: "", phone: "", notes: "", is_vip: false, tags: "" });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleVip(client: any) {
    try { await azApi.updateCrmClient(client.id, { is_vip: !client.is_vip }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  if (loading && clients.length === 0) return (
    <AttenteZeroLayout active="crm">
      <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-teal-500" /></div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="crm">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "CRM — Gestion clients" : "CRM — Client management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clients.length} {fr ? "clients" : "clients"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> {fr ? "Ajouter" : "Add client"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BookUser,   label: fr ? "Total" : "Total",        value: clients.length },
            { icon: Star,       label: fr ? "VIP"   : "VIP",          value: clients.filter(c => c.is_vip).length },
            { icon: TrendingUp, label: fr ? "Visites" : "Total visits", value: clients.reduce((a, c) => a + (c.visit_count ?? 0), 0) },
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={fr ? "Rechercher…" : "Search…"}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            {clients.map((c: any) => {
              const tags: string[] = Array.isArray(c.tags) ? c.tags : (typeof c.tags === "string" ? JSON.parse(c.tags || "[]") : []);
              return (
                <Card key={c.id} className={`cursor-pointer transition-all hover:shadow-sm ${selected?.id === c.id ? "ring-2 ring-teal-400" : ""}`}
                  onClick={() => setSelected(c)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                      {c.client_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900">{c.client_name}</span>
                        {c.is_vip && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <div className="text-xs text-gray-500">{c.visit_count} {fr ? "visites" : "visits"} · {fr ? "Dernière" : "Last"}: {c.last_visit ?? "—"}</div>
                    </div>
                    {tags[0] && <Badge variant="outline" className="text-xs px-1.5 h-5">{tags[0]}</Badge>}
                  </CardContent>
                </Card>
              );
            })}

            {clients.length === 0 && !loading && (
              <p className="text-sm text-gray-400 text-center py-8">{fr ? "Aucun client" : "No clients"}</p>
            )}
          </div>

          {/* Detail */}
          {selected ? (() => {
            const tags: string[] = Array.isArray(selected.tags) ? selected.tags : (typeof selected.tags === "string" ? JSON.parse(selected.tags || "[]") : []);
            return (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-700">
                      {selected.client_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{selected.client_name}</CardTitle>
                        <button onClick={() => toggleVip(selected)}>
                          <Star className={`h-4 w-4 ${selected.is_vip ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs px-1.5 h-5">{t}</Badge>)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs">{fr ? "Visites" : "Visits"}</span><div className="font-bold text-gray-900">{selected.visit_count}</div></div>
                    <div><span className="text-gray-400 text-xs">{fr ? "Dernière visite" : "Last visit"}</span><div className="font-medium text-gray-900">{selected.last_visit ?? "—"}</div></div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {selected.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400" />{selected.email}</div>}
                    {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400" />{selected.phone}</div>}
                  </div>
                  {selected.notes && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Notes</div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">{selected.notes}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {selected.email && <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={() => window.open(`mailto:${selected.email}`)}><Mail className="h-3.5 w-3.5" />Email</Button>}
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5"><Clock className="h-3.5 w-3.5" />{fr ? "RDV" : "Appt"}</Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full text-xs text-gray-400" onClick={() => setSelected(null)}><X className="h-3 w-3 mr-1" />{fr ? "Fermer" : "Close"}</Button>
                </CardContent>
              </Card>
            );
          })() : (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400">{fr ? "Sélectionnez un client" : "Select a client"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">{fr ? "Nouveau client" : "New client"}</h3>
            {[
              { label: fr ? "Nom" : "Name",       key: "client_name", type: "text" },
              { label: "Email",                    key: "email",       type: "email" },
              { label: fr ? "Tél." : "Phone",     key: "phone",       type: "tel" },
              { label: "Notes",                    key: "notes",       type: "text" },
              { label: fr ? "Tags (virgule)" : "Tags (comma)", key: "tags", type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                <input type={type} value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_vip} onChange={e => setForm(p => ({ ...p, is_vip: e.target.checked }))} />
              VIP
            </label>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={addClient} disabled={saving || !form.client_name}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : (fr ? "Créer" : "Create")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            </div>
          </div>
        </div>
      )}
    </AttenteZeroLayout>
  );
}

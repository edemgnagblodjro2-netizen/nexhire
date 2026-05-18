import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { MapPin, Plus, Users, TrendingUp, ChevronRight, RefreshCw, X, Check } from "lucide-react";
import { azApi } from "../lib/api";

export function SitesPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [sites,    setSites]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", counters: "1" });

  const load = useCallback(async () => {
    try { const d = await azApi.getSites(); setSites(d); setError(null); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSite() {
    if (!form.name || !form.city) return;
    setSaving(true);
    try {
      await azApi.createSite({ ...form, counters: parseInt(form.counters) || 1 });
      setShowForm(false);
      setForm({ name: "", city: "", address: "", counters: "1" });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleStatus(site: any) {
    try {
      await azApi.updateSite(site.id, { status: site.status === "active" ? "inactive" : "active" });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  const active = sites.filter(s => s.status === "active");

  if (loading) return (
    <AttenteZeroLayout active="sites">
      <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-teal-500" /></div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="sites">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Gestion multi-sites" : "Multi-site management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{active.length} {fr ? "sites actifs" : "active sites"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={load} className="text-gray-400 hover:text-teal-600"><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> {fr ? "Ajouter" : "Add site"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: fr ? "Total clients" : "Total clients",  value: sites.reduce((a, s) => a + (s.today_clients ?? 0), 0), icon: Users },
            { label: fr ? "Guichets actifs" : "Active counters", value: active.reduce((a, s) => a + s.counters, 0), icon: TrendingUp },
            { label: fr ? "Sites en ligne" : "Online sites",  value: active.length, icon: MapPin },
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
          {sites.map((s: any) => (
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
                    <div className="text-xs text-gray-500 mt-0.5">{s.city}{s.address ? ` · ${s.address}` : ""}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{s.today_clients ?? 0}</div>
                      <div className="text-xs text-gray-400">{fr ? "clients" : "clients"}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{s.counters}</div>
                      <div className="text-xs text-gray-400">{fr ? "guichets" : "counters"}</div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${selected === s.id ? "rotate-90" : ""}`} />
                </div>

                {selected === s.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: fr ? "Adresse" : "Address", value: s.address || "—" },
                        { label: fr ? "Ville" : "City",      value: s.city },
                        { label: fr ? "Guichets" : "Counters", value: `${s.counters}` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="text-xs text-gray-400">{label}</div>
                          <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline"
                      className={`text-xs ${s.status === "active" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                      onClick={e => { e.stopPropagation(); toggleStatus(s); }}>
                      {s.status === "active" ? (fr ? "Désactiver" : "Deactivate") : (fr ? "Activer" : "Activate")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {sites.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{fr ? "Aucun site" : "No sites"}</p>}
        </div>
      </div>

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">{fr ? "Nouveau site" : "New site"}</h3>
            {[
              { label: fr ? "Nom du site" : "Site name", key: "name",     type: "text" },
              { label: fr ? "Ville" : "City",            key: "city",     type: "text" },
              { label: fr ? "Adresse" : "Address",       key: "address",  type: "text" },
              { label: fr ? "Nb guichets" : "Counters",  key: "counters", type: "number" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                <input type={type} value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={addSite} disabled={saving || !form.name || !form.city}>
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

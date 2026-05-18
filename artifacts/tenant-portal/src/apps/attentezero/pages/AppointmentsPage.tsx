import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { Calendar, Clock, User, Plus, Check, X, Phone, Mail, RefreshCw } from "lucide-react";
import { azApi } from "../lib/api";

type ApptStatus = "confirmed" | "pending" | "cancelled" | "done";

const STATUS = {
  confirmed: { label: "Confirmé",   labelEn: "Confirmed",  cls: "bg-green-100 text-green-800" },
  pending:   { label: "En attente", labelEn: "Pending",    cls: "bg-yellow-100 text-yellow-800" },
  cancelled: { label: "Annulé",     labelEn: "Cancelled",  cls: "bg-red-100 text-red-700" },
  done:      { label: "Terminé",    labelEn: "Done",       cls: "bg-gray-100 text-gray-600" },
};

const SERVICES = ["Service civil", "Immigration", "Permis construction", "Consultation sociale", "Impôts / fiscalité"];
const TODAY = new Date().toISOString().split("T")[0];
const TODAY_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30"];

export function AppointmentsPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [appts,     setAppts]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<"all" | ApptStatus>("all");
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    client_name: "", email: "", phone: "",
    service: SERVICES[0], appt_date: TODAY, appt_time: "09:00"
  });

  const load = useCallback(async () => {
    try {
      const data = await azApi.getAppointments();
      setAppts(data);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? appts : appts.filter(a => a.status === filter);
  const todayAppts = appts.filter(a => a.appt_date === TODAY);
  const bookedSlots = todayAppts.map(a => a.appt_time);

  async function changeStatus(id: string, status: ApptStatus) {
    try { await azApi.updateAppointment(id, { status }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function addAppt() {
    if (!form.client_name) return;
    setSaving(true);
    try {
      await azApi.createAppointment({ ...form });
      setShowForm(false);
      setForm({ client_name: "", email: "", phone: "", service: SERVICES[0], appt_date: TODAY, appt_time: "09:00" });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <AttenteZeroLayout active="appointments">
      <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-teal-500" /></div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="appointments">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Rendez-vous" : "Appointments"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{todayAppts.length} {fr ? "RDV aujourd'hui" : "appointments today"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> {fr ? "Nouveau RDV" : "New appointment"}
          </Button>
        </div>

        {/* Calendar strip */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              {fr ? "Créneaux du jour" : "Today's slots"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TODAY_SLOTS.map(slot => {
                const booked = bookedSlots.includes(slot);
                const appt   = todayAppts.find(a => a.appt_time === slot);
                return (
                  <div key={slot} className={`rounded-lg p-2 text-center text-xs border
                    ${booked ? "bg-teal-600 text-white border-teal-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    <div className="font-medium">{slot}</div>
                    {appt && <div className="truncate mt-0.5 opacity-80">{appt.client_name?.split(" ")[0]}</div>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "confirmed", "pending", "cancelled", "done"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
              className={filter === f ? "bg-teal-600 hover:bg-teal-700" : ""}
              onClick={() => setFilter(f)}>
              {f === "all" ? (fr ? "Tous" : "All") : (fr ? STATUS[f as ApptStatus].label : STATUS[f as ApptStatus].labelEn)}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map((a: any) => {
            const s = STATUS[a.status as ApptStatus] ?? STATUS.pending;
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                        {a.client_name?.[0] ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{a.client_name}</span>
                          <Badge className={`text-xs px-1.5 ${s.cls}`}>{fr ? s.label : s.labelEn}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{a.appt_date} {fr ? "à" : "at"} {a.appt_time}</div>
                          <div className="flex items-center gap-1"><User className="h-3 w-3" />{a.service}</div>
                          {(a.email || a.phone) && (
                            <div className="flex items-center gap-3 mt-1">
                              {a.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span>}
                              {a.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.phone}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {a.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => changeStatus(a.id, "confirmed")}>
                          <Check className="h-3 w-3 mr-1" /> {fr ? "Confirmer" : "Confirm"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => changeStatus(a.id, "cancelled")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {a.status === "confirmed" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-gray-500" onClick={() => changeStatus(a.id, "done")}>
                        <Check className="h-3 w-3 mr-1" /> {fr ? "Terminé" : "Done"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && !loading && (
            <p className="text-sm text-gray-400 text-center py-8">{fr ? "Aucun rendez-vous" : "No appointments"}</p>
          )}
        </div>

        {/* Add modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900">{fr ? "Nouveau rendez-vous" : "New appointment"}</h3>
              {[
                { label: fr ? "Nom" : "Name",          key: "client_name", type: "text" },
                { label: "Email",                       key: "email",       type: "email" },
                { label: fr ? "Téléphone" : "Phone",   key: "phone",       type: "tel" },
                { label: fr ? "Date" : "Date",         key: "appt_date",   type: "date" },
                { label: fr ? "Heure" : "Time",        key: "appt_time",   type: "time" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Service</label>
                <select value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {SERVICES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={addAppt} disabled={saving || !form.client_name}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : (fr ? "Créer" : "Create")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{fr ? "Annuler" : "Cancel"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AttenteZeroLayout>
  );
}

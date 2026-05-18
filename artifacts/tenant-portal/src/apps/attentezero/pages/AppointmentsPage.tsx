import { useState } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { Calendar, Clock, User, Plus, Check, X, Phone, Mail } from "lucide-react";

type ApptStatus = "confirmed" | "pending" | "cancelled" | "done";

interface Appointment {
  id: string; name: string; email: string; phone: string;
  service: string; date: string; time: string; status: ApptStatus;
}

const STATUS = {
  confirmed: { label: "Confirmé",  labelEn: "Confirmed",  cls: "bg-green-100 text-green-800" },
  pending:   { label: "En attente",labelEn: "Pending",     cls: "bg-yellow-100 text-yellow-800" },
  cancelled: { label: "Annulé",    labelEn: "Cancelled",  cls: "bg-red-100 text-red-700" },
  done:      { label: "Terminé",   labelEn: "Done",        cls: "bg-gray-100 text-gray-600" },
};

const SERVICES = ["Service civil", "Immigration", "Permis construction", "Consultation sociale", "Impôts / fiscalité"];

const INITIAL: Appointment[] = [
  { id: "1", name: "Marie Dupont",   email: "marie@example.com", phone: "514-555-0101", service: "Service civil",       date: "2026-05-18", time: "09:00", status: "confirmed" },
  { id: "2", name: "Ahmed Benali",   email: "ahmed@example.com", phone: "438-555-0202", service: "Immigration",         date: "2026-05-18", time: "09:30", status: "confirmed" },
  { id: "3", name: "Julie Tremblay", email: "julie@example.com", phone: "450-555-0303", service: "Permis construction", date: "2026-05-18", time: "10:00", status: "pending" },
  { id: "4", name: "Carlos Morales", email: "carlos@example.com",phone: "514-555-0404", service: "Consultation sociale",date: "2026-05-18", time: "10:30", status: "confirmed" },
  { id: "5", name: "Fatima Osei",    email: "fatima@example.com",phone: "514-555-0505", service: "Impôts / fiscalité",  date: "2026-05-19", time: "14:00", status: "pending" },
  { id: "6", name: "Pierre Morin",   email: "pierre@example.com",phone: "438-555-0606", service: "Service civil",       date: "2026-05-20", time: "11:00", status: "confirmed" },
];

const TODAY_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30"];

export function AppointmentsPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [appts, setAppts] = useState<Appointment[]>(INITIAL);
  const [filter, setFilter] = useState<"all" | ApptStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: SERVICES[0], date: "2026-05-21", time: "09:00" });

  const filtered = filter === "all" ? appts : appts.filter(a => a.status === filter);
  const today    = appts.filter(a => a.date === "2026-05-18");
  const bookedSlots = today.map(a => a.time);

  function confirm(id: string)  { setAppts(p => p.map(a => a.id === id ? { ...a, status: "confirmed" } : a)); }
  function cancel(id: string)   { setAppts(p => p.map(a => a.id === id ? { ...a, status: "cancelled" } : a)); }

  function addAppt() {
    setAppts(p => [...p, { id: crypto.randomUUID(), ...form, status: "pending" }]);
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", service: SERVICES[0], date: "2026-05-21", time: "09:00" });
  }

  return (
    <AttenteZeroLayout active="appointments">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Rendez-vous" : "Appointments"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{today.length} {fr ? "RDV aujourd'hui" : "appointments today"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> {fr ? "Nouveau RDV" : "New appointment"}
          </Button>
        </div>

        {/* Today's calendar strip */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              {fr ? "Créneaux du jour — 18 mai 2026" : "Today's slots — May 18, 2026"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TODAY_SLOTS.map(slot => {
                const booked = bookedSlots.includes(slot);
                const appt   = today.find(a => a.time === slot);
                return (
                  <div key={slot} className={`rounded-lg p-2 text-center text-xs border
                    ${booked ? "bg-teal-600 text-white border-teal-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    <div className="font-medium">{slot}</div>
                    {appt && <div className="truncate mt-0.5 opacity-80">{appt.name.split(" ")[0]}</div>}
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
              {f === "all" ? (fr ? "Tous" : "All") : (fr ? STATUS[f].label : STATUS[f].labelEn)}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map(a => {
            const s = STATUS[a.status];
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                        {a.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{a.name}</span>
                          <Badge className={`text-xs px-1.5 ${s.cls}`}>{fr ? s.label : s.labelEn}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {a.date} à {a.time}</div>
                          <div className="flex items-center gap-1"><User className="h-3 w-3" /> {a.service}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span>
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {a.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => confirm(a.id)}>
                          <Check className="h-3 w-3 mr-1" /> {fr ? "Confirmer" : "Confirm"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => cancel(a.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900">{fr ? "Nouveau rendez-vous" : "New appointment"}</h3>
              {[
                { label: fr ? "Nom" : "Name", key: "name", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: fr ? "Téléphone" : "Phone", key: "phone", type: "tel" },
                { label: fr ? "Date" : "Date", key: "date", type: "date" },
                { label: fr ? "Heure" : "Time", key: "time", type: "time" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{fr ? "Service" : "Service"}</label>
                <select value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {SERVICES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={addAppt}>{fr ? "Créer" : "Create"}</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{fr ? "Annuler" : "Cancel"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AttenteZeroLayout>
  );
}

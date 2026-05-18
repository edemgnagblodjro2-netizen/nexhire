import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import {
  CalendarPlus, Clock, Users, ChevronDown, ChevronUp,
  Trash2, Copy, CheckCircle, XCircle, AlertCircle,
  UserCheck, RefreshCw, Link, Plus, CalendarDays
} from "lucide-react";

const BASE = "/api";

function getToken() { return localStorage.getItem("tenant_token") ?? ""; }
function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

async function agentReq<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? `HTTP ${r.status}`);
  return data as T;
}

function getTenantId(): string {
  try {
    const raw = localStorage.getItem("tenant_token") ?? "";
    const [, payload] = raw.split(".");
    const decoded = JSON.parse(atob(payload));
    return decoded.tenantId ?? "";
  } catch { return ""; }
}

function fmtDt(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto",
  }).format(new Date(iso));
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  scheduled:   { label: "Confirmé",    cls: "bg-teal-100 text-teal-800",    icon: <CheckCircle className="h-3 w-3" /> },
  arrived:     { label: "Arrivé",      cls: "bg-purple-100 text-purple-800", icon: <UserCheck className="h-3 w-3" /> },
  late:        { label: "En retard",   cls: "bg-amber-100 text-amber-800",  icon: <AlertCircle className="h-3 w-3" /> },
  absent:      { label: "Absent",      cls: "bg-red-100 text-red-700",      icon: <XCircle className="h-3 w-3" /> },
  cancelled:   { label: "Annulé",      cls: "bg-gray-100 text-gray-600",    icon: <XCircle className="h-3 w-3" /> },
  completed:   { label: "Terminé",     cls: "bg-green-100 text-green-700",  icon: <CheckCircle className="h-3 w-3" /> },
  rescheduled: { label: "Reprogrammé", cls: "bg-blue-100 text-blue-700",    icon: <RefreshCw className="h-3 w-3" /> },
};

const AGENT_ACTIONS: Record<string, { label: string; status: string; cls: string }[]> = {
  scheduled: [
    { label: "Marquer arrivé",  status: "arrived",   cls: "bg-purple-600 hover:bg-purple-700 text-white" },
    { label: "Marquer absent",  status: "absent",    cls: "bg-red-600 hover:bg-red-700 text-white" },
    { label: "Terminer",        status: "completed", cls: "bg-green-600 hover:bg-green-700 text-white" },
  ],
  arrived: [
    { label: "Terminer",        status: "completed", cls: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Marquer absent",  status: "absent",    cls: "bg-red-600 hover:bg-red-700 text-white" },
  ],
  late: [
    { label: "Marquer arrivé",  status: "arrived",   cls: "bg-purple-600 hover:bg-purple-700 text-white" },
    { label: "Marquer absent",  status: "absent",    cls: "bg-red-600 hover:bg-red-700 text-white" },
  ],
};

export function SlotManagerPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const tenantId = getTenantId();

  const [slots,     setSlots]     = useState<any[]>([]);
  const [stats,     setStats]     = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [bookings,  setBookings]  = useState<Record<string, any[]>>({});
  const [loadingBk, setLoadingBk] = useState<string | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState("");
  const [filter,    setFilter]    = useState<"upcoming" | "all">("upcoming");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    serviceName: "Service principal",
    capacity: 1,
    repeat: false,
    repeatCount: 1,
    intervalMin: 30,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const params = filter === "upcoming"
        ? `?from=${now.toISOString()}`
        : "";
      const [sd, st] = await Promise.all([
        agentReq<{ slots: any[] }>("GET", `/queue/agent/slots${params}`),
        agentReq<{ stats: any }>("GET", "/queue/agent/stats"),
      ]);
      setSlots(sd.slots);
      setStats(st.stats);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function loadBookings(slotId: string) {
    if (bookings[slotId]) return; // already cached
    setLoadingBk(slotId);
    try {
      const d = await agentReq<{ bookings: any[] }>("GET", `/queue/agent/slots/${slotId}/bookings`);
      setBookings(prev => ({ ...prev, [slotId]: d.bookings }));
    } catch { /* ignore */ }
    finally { setLoadingBk(null); }
  }

  function toggleSlot(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadBookings(id);
  }

  async function updateBookingStatus(slotId: string, bookingId: string, status: string) {
    try {
      await agentReq("PATCH", `/queue/agent/bookings/${bookingId}/status`, { status });
      // Refresh bookings for that slot
      setBookings(prev => ({ ...prev, [slotId]: undefined as any }));
      loadBookings(slotId);
      load(); // refresh stats
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  }

  async function deleteSlot(slotId: string) {
    if (!confirm("Désactiver ce créneau ? Les réservations existantes ne seront pas notifiées.")) return;
    try {
      await agentReq("DELETE", `/queue/agent/slots/${slotId}`);
      load();
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  }

  async function createSlots() {
    setSaving(true);
    try {
      const slotDatetime = `${form.date}T${form.time}:00`;
      await agentReq("POST", "/queue/agent/slots", {
        slotDatetime,
        capacity: form.capacity,
        serviceName: form.serviceName,
        repeat: form.repeat,
        repeatCount: form.repeatCount,
        intervalMin: form.intervalMin,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      alert("Erreur : " + e.message);
    } finally { setSaving(false); }
  }

  function copyBookingLink(slotId: string) {
    const url = `${window.location.origin}/tenant-portal/reserver/${tenantId}`;
    navigator.clipboard.writeText(url);
    setCopied(slotId);
    setTimeout(() => setCopied(""), 2000);
  }

  const bookingPageUrl = `${window.location.origin}/tenant-portal/reserver/${tenantId}`;

  return (
    <AttenteZeroLayout active="slot-manager">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {fr ? "Gestion des créneaux" : "Slot Management"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {fr ? "Créez des créneaux, suivez les réservations et gérez les rendez-vous" : "Create slots, track bookings and manage appointments"}
            </p>
          </div>
          <Button onClick={() => setShowForm(v => !v)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <CalendarPlus className="h-4 w-4" />
            {fr ? "Nouveau créneau" : "New slot"}
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: fr ? "Créneaux" : "Slots",        val: stats.slotsToday,     color: "text-teal-700",   bg: "bg-teal-50" },
              { label: fr ? "Réservés" : "Booked",       val: stats.bookedToday,    color: "text-blue-700",   bg: "bg-blue-50" },
              { label: fr ? "Arrivés" : "Arrived",       val: stats.arrivedToday,   color: "text-purple-700", bg: "bg-purple-50" },
              { label: fr ? "En retard" : "Late",        val: stats.lateToday,      color: "text-amber-700",  bg: "bg-amber-50" },
              { label: fr ? "Absents" : "Absent",        val: stats.absentToday,    color: "text-red-700",    bg: "bg-red-50" },
              { label: fr ? "Annulés" : "Cancelled",     val: stats.cancelledToday, color: "text-gray-600",   bg: "bg-gray-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Booking link share */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <Link className="h-4 w-4 text-teal-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-0.5">
              {fr ? "Lien de réservation citoyen" : "Citizen booking link"}
            </div>
            <div className="text-xs text-teal-800 truncate font-mono">{bookingPageUrl}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-teal-400 text-teal-700 hover:bg-teal-100 gap-1.5 flex-shrink-0"
            onClick={() => { navigator.clipboard.writeText(bookingPageUrl); setCopied("main"); setTimeout(() => setCopied(""), 2000); }}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === "main" ? "Copié !" : "Copier"}
          </Button>
        </div>

        {/* Create slot form */}
        {showForm && (
          <Card className="border-teal-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-teal-600" />
                {fr ? "Créer des créneaux" : "Create slots"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                    {fr ? "Date" : "Date"} *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                    {fr ? "Heure" : "Time"} *
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                    {fr ? "Nom du service" : "Service name"}
                  </label>
                  <input
                    type="text"
                    value={form.serviceName}
                    onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Service principal"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                    {fr ? "Capacité (places)" : "Capacity"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Repeat option */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.repeat}
                    onChange={e => setForm(f => ({ ...f, repeat: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {fr ? "Créer plusieurs créneaux consécutifs" : "Create multiple consecutive slots"}
                  </span>
                </label>
                {form.repeat && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">{fr ? "Nombre de créneaux" : "Number of slots"}</label>
                      <input
                        type="number" min={2} max={60} value={form.repeatCount}
                        onChange={e => setForm(f => ({ ...f, repeatCount: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">{fr ? "Intervalle (min)" : "Interval (min)"}</label>
                      <select
                        value={form.intervalMin}
                        onChange={e => setForm(f => ({ ...f, intervalMin: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {[15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={saving}
                  onClick={createSlots}
                >
                  {saving ? "Création…" : (form.repeat ? `Créer ${form.repeatCount} créneaux` : "Créer le créneau")}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["upcoming", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "upcoming" ? (fr ? "À venir" : "Upcoming") : (fr ? "Tous" : "All")}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Rafraîchir"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Slots list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
            Chargement…
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{fr ? "Aucun créneau créé." : "No slots created."}</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> {fr ? "Créer le premier créneau" : "Create first slot"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map(slot => {
              const isExp = expanded === slot.id;
              const bk = bookings[slot.id] ?? [];
              const available = slot.capacity - slot.bookedCount;
              const pct = slot.capacity > 0 ? Math.round((slot.bookedCount / slot.capacity) * 100) : 0;
              const isPast = new Date(slot.slotDatetime) < new Date();

              return (
                <Card key={slot.id} className={`border transition-shadow ${isExp ? "shadow-md border-teal-200" : "shadow-sm"} ${!slot.isActive ? "opacity-50" : ""}`}>
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer select-none"
                    onClick={() => toggleSlot(slot.id)}
                  >
                    {/* Date block */}
                    <div className={`flex-shrink-0 rounded-xl px-3 py-2 text-center min-w-[60px] ${isPast ? "bg-gray-100" : "bg-teal-50"}`}>
                      <div className={`text-xs font-medium ${isPast ? "text-gray-400" : "text-teal-600"}`}>
                        {fmtTime(slot.slotDatetime)}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isPast ? "text-gray-400" : "text-teal-500"}`}>
                        {new Date(slot.slotDatetime).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{slot.serviceName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{fmtDate(slot.slotDatetime)}</div>
                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-teal-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {slot.bookedCount}/{slot.capacity}
                        </span>
                      </div>
                    </div>

                    {/* Badges + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {available > 0 && !isPast && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {available} libre{available > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {pct >= 100 && <Badge className="bg-red-100 text-red-600 text-xs">Complet</Badge>}
                      {isPast && <Badge className="bg-gray-100 text-gray-500 text-xs">Passé</Badge>}
                      {!slot.isActive && <Badge className="bg-gray-100 text-gray-400 text-xs">Inactif</Badge>}

                      <button
                        className="p-1 hover:bg-teal-50 rounded-lg text-teal-500 hover:text-teal-700"
                        onClick={e => { e.stopPropagation(); copyBookingLink(slot.id); }}
                        title="Copier le lien de réservation"
                      >
                        {copied === slot.id ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }}
                        title="Désactiver"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {isExp ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded — bookings */}
                  {isExp && (
                    <div className="border-t border-gray-100 px-4 pb-4">
                      {loadingBk === slot.id ? (
                        <div className="py-6 text-center text-gray-400 text-sm">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Chargement des réservations…
                        </div>
                      ) : bk.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 text-sm">
                          <Users className="h-6 w-6 mx-auto mb-2 opacity-40" />
                          Aucune réservation pour ce créneau
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {bk.map((b: any, i: number) => {
                            const sc = STATUS_CFG[b.status] ?? STATUS_CFG.scheduled;
                            const actions = AGENT_ACTIONS[b.status] ?? [];
                            return (
                              <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                {/* Number */}
                                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
                                  {i + 1}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900">{b.citizenName}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{b.citizenEmail}</div>
                                  {b.citizenPhone && <div className="text-xs text-gray-400">{b.citizenPhone}</div>}
                                </div>

                                {/* Status + actions */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  <Badge className={`${sc.cls} flex items-center gap-1 text-xs`}>
                                    {sc.icon}
                                    {sc.label}
                                  </Badge>
                                  {actions.length > 0 && (
                                    <div className="flex gap-1 flex-wrap justify-end">
                                      {actions.map(a => (
                                        <button
                                          key={a.status}
                                          className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${a.cls}`}
                                          onClick={() => updateBookingStatus(slot.id, b.id, a.status)}
                                        >
                                          {a.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {b.penaltyAmountCents && (
                                    <span className={`text-[10px] ${b.penaltyPaidAt ? "text-green-600" : "text-amber-600"}`}>
                                      {b.penaltyPaidAt ? `✓ Pénalité payée` : `⚠ Pénalité ${(b.penaltyAmountCents / 100).toFixed(2)}$`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AttenteZeroLayout>
  );
}

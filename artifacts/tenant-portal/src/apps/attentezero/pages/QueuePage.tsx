import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import {
  Users, Plus, ChevronRight, Clock, Star, AlertCircle,
  QrCode, Monitor, Ticket, ArrowRight, Check, X, RefreshCw
} from "lucide-react";
import { azApi } from "../lib/api";

type Priority = "normal" | "vip" | "urgent";

const PRIORITY_CONFIG = {
  normal:  { label: "Standard", labelEn: "Standard", color: "bg-gray-100 text-gray-700",     dot: "bg-gray-400" },
  vip:     { label: "VIP",      labelEn: "VIP",      color: "bg-yellow-100 text-yellow-800",  dot: "bg-yellow-500" },
  urgent:  { label: "Urgent",   labelEn: "Urgent",   color: "bg-red-100 text-red-700",        dot: "bg-red-500" },
};

function elapsed(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "< 1 min" : `${m} min`;
}

const COUNTERS = ["Guichet 1", "Guichet 2", "Guichet 3", "Guichet 4"];

export function QueuePage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [queues,  setQueues]  = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [qs, ts] = await Promise.all([azApi.getQueues(), azApi.getTickets()]);
      setQueues(qs);
      setTickets(ts);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const waiting = tickets.filter(t => t.status === "waiting");
  const called  = tickets.filter(t => t.status === "called");
  const served  = tickets.filter(t => t.status === "served");
  const urgentFirst = [...waiting].sort((a, b) => {
    const p: Record<string, number> = { urgent: 0, vip: 1, normal: 2 };
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
  });

  async function addTicket(priority: Priority) {
    const queue = queues[0];
    if (!queue) return;
    try {
      await azApi.createTicket({ queue_id: queue.id, site_id: queue.site_id, priority });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function callNext() {
    const next = urgentFirst[0];
    if (!next) return;
    const usedCounters = called.map((c: any) => c.guichet).filter(Boolean);
    const free = COUNTERS.find(g => !usedCounters.includes(g)) ?? COUNTERS[0];
    try {
      await azApi.callTicket(next.id, free);
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function callSpecific(id: string) {
    const usedCounters = called.map((c: any) => c.guichet).filter(Boolean);
    const free = COUNTERS.find(g => !usedCounters.includes(g)) ?? COUNTERS[0];
    try {
      await azApi.callTicket(id, free);
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function markServed(id: string) {
    try { await azApi.serveTicket(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function remove(id: string) {
    try { await azApi.deleteTicket(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  if (loading) return (
    <AttenteZeroLayout active="queues">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="queues">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "File d'attente" : "Queue management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {fr ? "Attente estimée" : "Est. wait"} : ~{Math.max(2, waiting.length * 4)} min
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addTicket("normal")}>
              <Plus className="h-3.5 w-3.5" /> Ticket
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-yellow-300 text-yellow-700 hover:bg-yellow-50" onClick={() => addTicket("vip")}>
              <Star className="h-3.5 w-3.5" /> VIP
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => addTicket("urgent")}>
              <AlertCircle className="h-3.5 w-3.5" /> {fr ? "Urgent" : "Urgent"}
            </Button>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700" onClick={callNext} disabled={waiting.length === 0}>
              <ChevronRight className="h-3.5 w-3.5" /> {fr ? "Appeler suivant" : "Call next"}
            </Button>
            <Button size="sm" variant="ghost" onClick={load} className="text-gray-400 hover:text-teal-600">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users,   label: fr ? "En attente"    : "Waiting",      value: waiting.length, color: "text-teal-600" },
            { icon: Monitor, label: fr ? "En cours"      : "In progress",  value: called.length,  color: "text-blue-600" },
            { icon: Check,   label: fr ? "Servis"        : "Served",       value: served.length,  color: "text-green-600" },
            { icon: Clock,   label: fr ? "Moy. attente"  : "Avg wait",     value: `~${Math.max(2, waiting.length * 4)} min`, color: "text-orange-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-6 w-6 ${color} flex-shrink-0`} />
                <div>
                  <div className="text-xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* In progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                {fr ? "En cours de service" : "Currently serving"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {called.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">{fr ? "Aucun guichet actif" : "No active counter"}</p>
              )}
              {called.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Ticket className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900">{t.number}</div>
                    <div className="text-xs text-blue-700">{t.client_name ?? fr ? "Client" : "Client"} · {t.guichet}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-100 h-7 px-2 text-xs" onClick={() => markServed(t.id)}>
                    <Check className="h-3 w-3 mr-1" /> {fr ? "Servi" : "Done"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Queue info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{fr ? "File active" : "Active queue"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all group">
                <QrCode className="h-8 w-8 text-gray-400 group-hover:text-teal-600" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-teal-700">QR Code</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all group">
                <Monitor className="h-8 w-8 text-gray-400 group-hover:text-teal-600" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-teal-700">{fr ? "Écran TV" : "TV Screen"}</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Waiting queue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{fr ? "File d'attente" : "Waiting queue"} ({waiting.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {waiting.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">{fr ? "File vide" : "Empty queue"}</p>
            )}
            <div className="space-y-2">
              {urgentFirst.map((t: any, i: number) => {
                const cfg = PRIORITY_CONFIG[t.priority as Priority] ?? PRIORITY_CONFIG.normal;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                    <span className="text-xs text-gray-400 w-5 text-center font-mono">{i + 1}</span>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{t.number}</span>
                        <Badge className={`text-xs px-1.5 py-0 h-4 ${cfg.color}`}>{fr ? cfg.label : cfg.labelEn}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{t.client_name ?? "—"} · {elapsed(t.created_at)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-teal-600 hover:bg-teal-50" onClick={() => callSpecific(t.id)}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => remove(t.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AttenteZeroLayout>
  );
}

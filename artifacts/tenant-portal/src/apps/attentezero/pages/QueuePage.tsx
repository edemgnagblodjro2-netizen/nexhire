import { useState } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import {
  Users, Plus, ChevronRight, Clock, Star, AlertCircle,
  QrCode, Monitor, Ticket, ArrowRight, Check, X
} from "lucide-react";

type Priority = "normal" | "vip" | "urgent";
type TicketStatus = "waiting" | "called" | "served";

interface Ticket {
  id: string; number: string; name: string; priority: Priority;
  status: TicketStatus; arrivedAt: Date; guichet?: string;
}

let nextNum = 103;

function genTicket(priority: Priority = "normal"): Ticket {
  const prefix = priority === "vip" ? "V" : priority === "urgent" ? "U" : "A";
  return {
    id: crypto.randomUUID(),
    number: `${prefix}-${nextNum++}`,
    name: ["Mohamed A.", "Sarah L.", "Jean-Pierre D.", "Fatima O.", "Marc T."][Math.floor(Math.random() * 5)],
    priority,
    status: "waiting",
    arrivedAt: new Date(),
  };
}

const INITIAL: Ticket[] = [
  { id: "1", number: "A-100", name: "Lucie Martin",  priority: "normal", status: "called",  arrivedAt: new Date(Date.now() - 18 * 60000), guichet: "Guichet 1" },
  { id: "2", number: "V-101", name: "Robert Chen",   priority: "vip",    status: "waiting", arrivedAt: new Date(Date.now() - 12 * 60000) },
  { id: "3", number: "U-102", name: "Amina Diallo",  priority: "urgent", status: "waiting", arrivedAt: new Date(Date.now() - 5  * 60000) },
  { id: "4", number: "A-103", name: "Pierre Dubois", priority: "normal", status: "waiting", arrivedAt: new Date(Date.now() - 3  * 60000) },
  { id: "5", number: "A-104", name: "Sara Khalil",   priority: "normal", status: "waiting", arrivedAt: new Date(Date.now() - 1  * 60000) },
];

const PRIORITY_CONFIG = {
  normal:  { label: "Standard", color: "bg-gray-100 text-gray-700",      dot: "bg-gray-400" },
  vip:     { label: "VIP",      color: "bg-yellow-100 text-yellow-800",   dot: "bg-yellow-500" },
  urgent:  { label: "Urgent",   color: "bg-red-100 text-red-700",         dot: "bg-red-500" },
};

function elapsed(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  return m < 1 ? "< 1 min" : `${m} min`;
}

export function QueuePage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL);

  const waiting  = tickets.filter(t => t.status === "waiting");
  const called   = tickets.filter(t => t.status === "called");
  const served   = tickets.filter(t => t.status === "served");
  const urgentFirst = [...waiting].sort((a, b) => {
    const p = { urgent: 0, vip: 1, normal: 2 };
    return p[a.priority] - p[b.priority];
  });

  function addTicket(priority: Priority) {
    setTickets(t => [...t, genTicket(priority)]);
  }

  function callNext() {
    const next = urgentFirst[0];
    if (!next) return;
    const guichets = ["Guichet 1", "Guichet 2", "Guichet 3"];
    const free = guichets.find(g => !called.find(c => c.guichet === g)) ?? "Guichet 1";
    setTickets(t => t.map(x => x.id === next.id ? { ...x, status: "called", guichet: free } : x));
  }

  function markServed(id: string) {
    setTickets(t => t.map(x => x.id === id ? { ...x, status: "served" } : x));
  }

  function removeTicket(id: string) {
    setTickets(t => t.filter(x => x.id !== id));
  }

  return (
    <AttenteZeroLayout active="queues">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "File d'attente" : "Queue management"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {fr ? "Temps d'attente estimé" : "Estimated wait time"} : ~{Math.max(2, waiting.length * 4)} min
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addTicket("normal")}>
              <Plus className="h-3.5 w-3.5" /> {fr ? "Ticket" : "Ticket"}
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
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users,   label: fr ? "En attente" : "Waiting",  value: waiting.length, color: "text-teal-600" },
            { icon: Monitor, label: fr ? "En cours"   : "In progress", value: called.length, color: "text-blue-600" },
            { icon: Check,   label: fr ? "Servis"     : "Served",    value: served.length,  color: "text-green-600" },
            { icon: Clock,   label: fr ? "Moy. attente" : "Avg wait", value: `${Math.max(2, waiting.length * 4)} min`, color: "text-orange-600" },
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
              {called.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Ticket className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900">{t.number}</div>
                    <div className="text-xs text-blue-700">{t.name} · {t.guichet}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-100 h-7 px-2 text-xs" onClick={() => markServed(t.id)}>
                    <Check className="h-3 w-3 mr-1" /> {fr ? "Servi" : "Done"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* QR / Display */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{fr ? "Accès rapide" : "Quick access"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all group">
                <QrCode className="h-8 w-8 text-gray-400 group-hover:text-teal-600" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-teal-700">{fr ? "QR Code" : "QR Code"}</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all group">
                <Monitor className="h-8 w-8 text-gray-400 group-hover:text-teal-600" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-teal-700">{fr ? "Écran TV" : "TV Screen"}</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Queue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{fr ? "File d'attente" : "Waiting queue"} ({waiting.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {waiting.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">{fr ? "File vide — ajoutez des tickets" : "Empty queue — add tickets"}</p>
            )}
            <div className="space-y-2">
              {urgentFirst.map((t, i) => {
                const cfg = PRIORITY_CONFIG[t.priority];
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                    <span className="text-xs text-gray-400 w-5 text-center font-mono">{i + 1}</span>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{t.number}</span>
                        <Badge className={`text-xs px-1.5 py-0 h-4 ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{t.name} · {elapsed(t.arrivedAt)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-teal-600 hover:bg-teal-50" onClick={() => {
                        const guichets = ["Guichet 1","Guichet 2","Guichet 3"];
                        const free = guichets.find(g => !called.find(c => c.guichet === g)) ?? "Guichet 1";
                        setTickets(prev => prev.map(x => x.id === t.id ? { ...x, status: "called", guichet: free } : x));
                      }}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => removeTicket(t.id)}>
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

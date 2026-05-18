import { useState } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { Bell, Mail, MessageSquare, Check, Settings, Send } from "lucide-react";

type Channel = "sms" | "email" | "whatsapp";
type NStatus = "sent" | "pending" | "failed";

interface Notif {
  id: string; name: string; ticket: string; channel: Channel;
  message: string; status: NStatus; time: string;
}

const NOTIFS: Notif[] = [
  { id: "1", name: "Marie Dupont",   ticket: "A-100", channel: "sms",      message: "Votre tour approche — Guichet 1 dans ~2 min",   status: "sent",    time: "14:23" },
  { id: "2", name: "Ahmed Benali",   ticket: "V-101", channel: "email",    message: "Votre ticket VIP-101 est appelé au Guichet 2",   status: "sent",    time: "14:20" },
  { id: "3", name: "Julie Tremblay", ticket: "A-103", channel: "whatsapp", message: "Bonjour Julie, votre position : #4 · ~16 min",  status: "sent",    time: "14:15" },
  { id: "4", name: "Carlos Morales", ticket: "U-102", channel: "sms",      message: "URGENT — Présentez-vous immédiatement Guichet 3",status: "sent",    time: "14:10" },
  { id: "5", name: "Sara Khalil",    ticket: "A-105", channel: "email",    message: "Rappel RDV demain à 9h00 — Service civil",       status: "pending", time: "14:08" },
  { id: "6", name: "Pierre Morin",   ticket: "A-106", channel: "sms",      message: "Votre tour approche — dans ~5 min",              status: "failed",  time: "14:05" },
];

const CHANNEL_CFG = {
  sms:      { icon: MessageSquare, label: "SMS",      color: "text-blue-600",   bg: "bg-blue-50"   },
  email:    { icon: Mail,          label: "Email",    color: "text-purple-600", bg: "bg-purple-50" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "text-green-600",  bg: "bg-green-50"  },
};

const STATUS_CFG = {
  sent:    { labelFr: "Envoyé",   labelEn: "Sent",    cls: "bg-green-100 text-green-800" },
  pending: { labelFr: "En cours", labelEn: "Pending", cls: "bg-yellow-100 text-yellow-800" },
  failed:  { labelFr: "Échec",    labelEn: "Failed",  cls: "bg-red-100 text-red-700" },
};

export function NotificationsPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [channels, setChannels] = useState({ sms: true, email: true, whatsapp: false });

  const sent    = NOTIFS.filter(n => n.status === "sent").length;
  const pending = NOTIFS.filter(n => n.status === "pending").length;
  const failed  = NOTIFS.filter(n => n.status === "failed").length;

  return (
    <AttenteZeroLayout active="notifications">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Notifications" : "Notifications"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sent} {fr ? "envoyées" : "sent"} · {pending} {fr ? "en cours" : "pending"} · {failed} {fr ? "échouées" : "failed"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5">
            <Send className="h-3.5 w-3.5" /> {fr ? "Envoyer manuel" : "Send manual"}
          </Button>
        </div>

        {/* Channel config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(channels) as Channel[]).map(ch => {
            const cfg = CHANNEL_CFG[ch];
            const Icon = cfg.icon;
            const active = channels[ch];
            return (
              <Card key={ch} className={`transition-all ${active ? "border-teal-300" : "opacity-60"}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${active ? cfg.bg : "bg-gray-100"}`}>
                    <Icon className={`h-5 w-5 ${active ? cfg.color : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{cfg.label}</div>
                    <div className="text-xs text-gray-500">{active ? (fr ? "Activé" : "Active") : (fr ? "Désactivé" : "Inactive")}</div>
                  </div>
                  <button
                    onClick={() => setChannels(p => ({ ...p, [ch]: !p[ch] }))}
                    className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-teal-600" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-teal-600" />
              {fr ? "Modèles de messages" : "Message templates"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { event: fr ? "Tour approche (5 min)"  : "Turn approaching (5 min)",   msg: fr ? "Votre tour approche — présentez-vous dans ~5 minutes" : "Your turn is coming — please approach in ~5 minutes" },
              { event: fr ? "Ticket appelé"           : "Ticket called",              msg: fr ? "Votre numéro {ticket} est appelé au {guichet}"          : "Your number {ticket} is called at {counter}" },
              { event: fr ? "Rappel RDV (24h)"        : "Appointment reminder (24h)", msg: fr ? "Rappel : RDV demain à {heure} — {service}"              : "Reminder: Appointment tomorrow at {time} — {service}" },
              { event: fr ? "Confirmation RDV"        : "Appointment confirmation",   msg: fr ? "RDV confirmé le {date} à {heure}"                        : "Appointment confirmed on {date} at {time}" },
            ].map(({ event, msg }) => (
              <div key={event} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <Bell className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700">{event}</div>
                  <div className="text-xs text-gray-500 mt-0.5 font-mono">{msg}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">{fr ? "Modifier" : "Edit"}</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{fr ? "Journal des envois" : "Delivery log"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {NOTIFS.map(n => {
              const ch = CHANNEL_CFG[n.channel];
              const ChIcon = ch.icon;
              const st = STATUS_CFG[n.status];
              return (
                <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                  <div className={`p-1.5 rounded-md ${ch.bg} flex-shrink-0`}>
                    <ChIcon className={`h-3.5 w-3.5 ${ch.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">{n.name}</span>
                      <span className="text-xs text-gray-400">#{n.ticket}</span>
                      <Badge className={`text-xs px-1.5 py-0 h-4 ${st.cls}`}>{fr ? st.labelFr : st.labelEn}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{n.message}</div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{n.time}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AttenteZeroLayout>
  );
}

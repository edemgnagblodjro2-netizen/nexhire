import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { Monitor, Maximize2, Volume2, Tv, RefreshCw } from "lucide-react";
import { azApi } from "../lib/api";

const MESSAGES_FR = [
  "Bienvenue — Merci de votre patience",
  "Port du masque recommandé dans nos locaux",
  "Nos guichets sont ouverts de 8h30 à 17h00",
];
const MESSAGES_EN = [
  "Welcome — Thank you for your patience",
  "Wearing a mask is recommended",
  "Our counters are open from 8:30am to 5:00pm",
];

export function DisplayPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [previewMode, setPreviewMode] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [called, setCalled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messages = fr ? MESSAGES_FR : MESSAGES_EN;

  const loadTickets = useCallback(async () => {
    try {
      const all = await azApi.getTickets({ status: "called" });
      setCalled(all);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Auto-refresh every 5s for near-real-time display
  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => {
    const t = setInterval(loadTickets, 5000);
    return () => clearInterval(t);
  }, [loadTickets]);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  const now = new Date().toLocaleTimeString(fr ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit" });

  // Show up to 6 called tickets on the screen
  const displayTickets = called.slice(0, 6);

  function TicketCard({ t, large = false }: { t: any; large?: boolean }) {
    const bg =
      t.priority === "urgent" ? "bg-red-600 border-red-400" :
      t.priority === "vip"    ? "bg-yellow-500 border-yellow-300" :
                                 "bg-teal-700 border-teal-500";
    return (
      <div className={`rounded-xl border-2 text-center ${large ? "p-8 rounded-2xl border-4" : "p-4"} ${bg}`}>
        <div className={`text-white/70 ${large ? "text-lg mb-2" : "text-xs mb-1"}`}>{t.guichet ?? "—"}</div>
        <div className={`text-white font-black tracking-wide ${large ? "text-7xl" : "text-3xl"}`}>{t.number}</div>
        {t.priority !== "normal" && (
          <div className={`text-white/90 font-bold uppercase tracking-wider ${large ? "text-lg mt-2" : "text-xs mt-1"}`}>
            {t.priority === "vip" ? "VIP" : "URGENT"}
          </div>
        )}
      </div>
    );
  }

  const EmptySlot = ({ large = false }: { large?: boolean }) => (
    <div className={`rounded-xl border-2 text-center ${large ? "p-8 rounded-2xl border-4 border-dashed border-teal-600" : "p-4 border-dashed border-teal-700"} bg-transparent`}>
      <div className={`text-teal-600 font-medium ${large ? "text-2xl" : "text-sm"}`}>—</div>
      <div className={`text-teal-700 ${large ? "text-sm mt-1" : "text-xs mt-0.5"}`}>{fr ? "Libre" : "Free"}</div>
    </div>
  );

  const cols = displayTickets.length > 3 ? 3 : Math.max(displayTickets.length, 1);
  const gridClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <AttenteZeroLayout active="display">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Écrans d'affichage" : "Display screens"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "…" : `${called.length} ${fr ? "guichet(s) actif(s)" : "active counter(s)"}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={loadTickets} className="text-gray-400 hover:text-teal-600">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setPreviewMode(true)}>
              <Maximize2 className="h-3.5 w-3.5" /> {fr ? "Mode plein écran" : "Fullscreen preview"}
            </Button>
          </div>
        </div>

        {/* Screen preview */}
        <Card className="overflow-hidden border-2 border-gray-300">
          <CardHeader className="bg-gray-800 py-2 px-4 flex flex-row items-center gap-2">
            <Tv className="h-4 w-4 text-gray-400" />
            <span className="text-gray-300 text-xs">{fr ? "Aperçu écran TV — données en direct" : "TV Screen preview — live data"}</span>
            <div className="ml-auto flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-teal-900 aspect-video relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bg-teal-800/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
              <div className="text-white font-bold text-lg">AttenteZéro</div>
              <div className="text-teal-200 text-sm font-mono">{now}</div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pt-14 pb-16 px-6">
              {loading ? (
                <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
              ) : (
                <div className={`grid ${gridClass} gap-4 w-full max-w-2xl`}>
                  {Array.from({ length: Math.max(called.length, 3) }, (_, i) => {
                    const t = displayTickets[i];
                    return t ? <TicketCard key={t.id} t={t} /> : <EmptySlot key={`empty-${i}`} />;
                  })}
                </div>
              )}
            </div>

            {called.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pt-14 pb-16">
                <div className="text-teal-400 text-center">
                  <div className="text-4xl font-bold mb-2">—</div>
                  <div className="text-sm">{fr ? "Aucun guichet actif" : "No active counter"}</div>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-teal-800/80 backdrop-blur-sm px-6 py-2.5">
              <p className="text-teal-100 text-sm text-center">{messages[msgIdx]}</p>
            </div>
          </CardContent>
        </Card>

        {/* Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Monitor,  label: fr ? "Mise à jour" : "Refresh rate",      value: "5s",   sub: fr ? "Automatique" : "Automatic", active: true },
            { icon: Volume2,  label: fr ? "Annonces vocales" : "Voice alerts",  value: "ON",   sub: fr ? "Français" : "French",       active: true },
            { icon: Tv,       label: fr ? "Guichets actifs" : "Active counters", value: `${called.length}`, sub: fr ? "En cours" : "In progress", active: called.length > 0 },
          ].map(({ icon: Icon, label, value, sub, active }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${active ? "bg-teal-50" : "bg-gray-100"}`}>
                  <Icon className={`h-5 w-5 ${active ? "text-teal-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className={`font-bold text-sm ${active ? "text-teal-700" : "text-gray-900"}`}>{value}</div>
                  <div className="text-xs text-gray-400">{sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fullscreen preview */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-teal-900 flex flex-col" onClick={() => setPreviewMode(false)}>
          <div className="flex items-center justify-between px-8 py-4 bg-teal-800">
            <div className="text-white font-bold text-2xl">AttenteZéro</div>
            <div className="text-teal-200 font-mono text-xl">{now}</div>
          </div>
          <div className="flex-1 flex items-center justify-center px-12">
            {called.length === 0 ? (
              <div className="text-teal-400 text-center">
                <div className="text-6xl font-bold mb-4">—</div>
                <div className="text-xl">{fr ? "Aucun guichet actif" : "No active counter"}</div>
              </div>
            ) : (
              <div className={`grid ${gridClass} gap-8 w-full max-w-5xl`}>
                {Array.from({ length: Math.max(called.length, 3) }, (_, i) => {
                  const t = displayTickets[i];
                  return t ? <TicketCard key={t.id} t={t} large /> : <EmptySlot key={`empty-${i}`} large />;
                })}
              </div>
            )}
          </div>
          <div className="px-8 py-4 bg-teal-800 text-center">
            <p className="text-teal-100 text-xl">{messages[msgIdx]}</p>
          </div>
          <div className="text-center py-2 text-teal-600 text-sm">{fr ? "Cliquer pour fermer" : "Click to close"}</div>
        </div>
      )}
    </AttenteZeroLayout>
  );
}

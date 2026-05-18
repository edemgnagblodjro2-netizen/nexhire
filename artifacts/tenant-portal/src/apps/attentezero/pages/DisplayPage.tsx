import { useState, useEffect } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { Monitor, Maximize2, Volume2, Tv } from "lucide-react";

const DISPLAY_TICKETS = [
  { number: "A-100", guichet: "Guichet 1", priority: "normal" },
  { number: "V-101", guichet: "Guichet 2", priority: "vip" },
  { number: "U-102", guichet: "Guichet 3", priority: "urgent" },
];

const MESSAGES_FR = ["Bienvenue — Merci de votre patience", "Port le masque est recommandé", "Nos guichets sont ouverts de 8h30 à 17h00"];
const MESSAGES_EN = ["Welcome — Thank you for your patience", "Wearing a mask is recommended", "Our counters are open from 8:30am to 5:00pm"];

export function DisplayPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [previewMode, setPreviewMode] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = fr ? MESSAGES_FR : MESSAGES_EN;

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  const now = new Date().toLocaleTimeString(fr ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <AttenteZeroLayout active="display">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Écrans d'affichage" : "Display screens"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{fr ? "Aperçu et configuration" : "Preview & configuration"}</p>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5" onClick={() => setPreviewMode(true)}>
            <Maximize2 className="h-3.5 w-3.5" /> {fr ? "Mode plein écran" : "Fullscreen preview"}
          </Button>
        </div>

        {/* Screen preview */}
        <Card className="overflow-hidden border-2 border-gray-300">
          <CardHeader className="bg-gray-800 py-2 px-4 flex flex-row items-center gap-2">
            <Tv className="h-4 w-4 text-gray-400" />
            <span className="text-gray-300 text-xs">{fr ? "Aperçu écran TV" : "TV Screen preview"}</span>
            <div className="ml-auto flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-teal-900 aspect-video relative overflow-hidden">
            {/* Header bar */}
            <div className="absolute top-0 left-0 right-0 bg-teal-800/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
              <div className="text-white font-bold text-lg">AttenteZéro</div>
              <div className="text-teal-200 text-sm font-mono">{now}</div>
            </div>

            {/* Main tickets */}
            <div className="absolute inset-0 flex items-center justify-center pt-12 pb-16 px-6">
              <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                {DISPLAY_TICKETS.map(t => (
                  <div key={t.number} className={`rounded-xl p-4 text-center border-2 
                    ${t.priority === "urgent" ? "bg-red-600 border-red-400" : t.priority === "vip" ? "bg-yellow-500 border-yellow-300" : "bg-teal-700 border-teal-500"}`}>
                    <div className="text-white/70 text-xs mb-1">{t.guichet}</div>
                    <div className="text-white font-black text-3xl tracking-wide">{t.number}</div>
                    {t.priority !== "normal" && (
                      <div className="text-white/90 text-xs mt-1 uppercase tracking-wider font-bold">
                        {t.priority === "vip" ? "VIP" : (fr ? "URGENT" : "URGENT")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ticker */}
            <div className="absolute bottom-0 left-0 right-0 bg-teal-800/80 backdrop-blur-sm px-6 py-2.5">
              <p className="text-teal-100 text-sm text-center transition-all duration-500">{messages[msgIdx]}</p>
            </div>
          </CardContent>
        </Card>

        {/* Config cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Monitor,  label: fr ? "Écrans connectés" : "Connected screens", value: "3",      sub: fr ? "2 actifs" : "2 active" },
            { icon: Volume2,  label: fr ? "Annonces vocales" : "Voice announcements", value: "ON",   sub: fr ? "Français" : "French", active: true },
            { icon: Tv,       label: fr ? "Mode publicité"  : "Ad mode",           value: "OFF",    sub: fr ? "Désactivé" : "Disabled" },
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
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs">{fr ? "Config" : "Config"}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fullscreen preview modal */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-teal-900 flex flex-col" onClick={() => setPreviewMode(false)}>
          <div className="flex items-center justify-between px-8 py-4 bg-teal-800">
            <div className="text-white font-bold text-2xl">AttenteZéro</div>
            <div className="text-teal-200 font-mono text-xl">{now}</div>
          </div>
          <div className="flex-1 flex items-center justify-center px-12">
            <div className="grid grid-cols-3 gap-8 w-full max-w-4xl">
              {DISPLAY_TICKETS.map(t => (
                <div key={t.number} className={`rounded-2xl p-8 text-center border-4
                  ${t.priority === "urgent" ? "bg-red-600 border-red-400" : t.priority === "vip" ? "bg-yellow-500 border-yellow-300" : "bg-teal-700 border-teal-500"}`}>
                  <div className="text-white/70 text-lg mb-2">{t.guichet}</div>
                  <div className="text-white font-black text-7xl tracking-wide">{t.number}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-8 py-4 bg-teal-800 text-center">
            <p className="text-teal-100 text-lg">{messages[msgIdx]}</p>
          </div>
          <div className="text-center py-2 text-teal-600 text-xs">{fr ? "Cliquer pour fermer" : "Click to close"}</div>
        </div>
      )}
    </AttenteZeroLayout>
  );
}

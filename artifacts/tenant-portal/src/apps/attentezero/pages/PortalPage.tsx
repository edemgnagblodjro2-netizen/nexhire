import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { Globe, QrCode, Smartphone, Eye, Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

function getTenantSlug(): string {
  try {
    const token = localStorage.getItem("tenant_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // schemaName is like "tenant_demo" → slug is "demo"
      const schema: string = payload.schemaName ?? "";
      return schema.replace(/^tenant_/, "") || "demo";
    }
  } catch { /* ignore */ }
  return "demo";
}

function buildPortalUrl(slug: string): string {
  const base = window.location.origin;
  return `${base}/apps/attentezero-public/${slug}`;
}

export function PortalPage() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [copied, setCopied] = useState(false);
  const [slug] = useState(() => getTenantSlug());
  const portalUrl = buildPortalUrl(slug);

  function copy() {
    navigator.clipboard.writeText(portalUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AttenteZeroLayout active="portal">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{fr ? "Portail citoyen / client" : "Citizen / client portal"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{fr ? "Accès public sans connexion pour vos clients" : "Public access without login for your clients"}</p>
        </div>

        {/* Portal URL */}
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-800">{fr ? "Lien du portail public" : "Public portal link"}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-teal-200 rounded px-3 py-2 text-teal-700 truncate">{portalUrl}</code>
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0 border-teal-300 text-teal-700 hover:bg-teal-100" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (fr ? "Copié !" : "Copied!") : (fr ? "Copier" : "Copy")}
              </Button>
              <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1.5 flex-shrink-0 bg-teal-600 hover:bg-teal-700">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* QR Code placeholder */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-32 w-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900">{fr ? "QR Code à imprimer" : "Printable QR code"}</div>
                <div className="text-xs text-gray-500 mt-0.5">{fr ? "Affichez-le à l'accueil ou en salle d'attente" : "Display at reception or in the waiting room"}</div>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> {fr ? "Télécharger QR" : "Download QR"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Smartphone,
              title: fr ? "Prise de ticket" : "Take a ticket",
              desc: fr ? "Le client prend son ticket depuis son téléphone via QR code — aucun compte requis." : "Clients take their ticket from their phone via QR code — no account required."
            },
            {
              icon: Eye,
              title: fr ? "Suivi en temps réel" : "Real-time tracking",
              desc: fr ? "Position dans la file, attente estimée, notification quand c'est son tour." : "Queue position, estimated wait, notification when it's their turn."
            },
            {
              icon: Globe,
              title: fr ? "Sans installation" : "No install needed",
              desc: fr ? "Application web progressive — aucune app à télécharger, fonctionne sur tout téléphone." : "Progressive web app — no download, works on any phone."
            },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-4">
                <div className="p-2 bg-teal-50 rounded-lg w-fit mb-3">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="font-semibold text-sm text-gray-900 mb-1">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Portal preview — phone mockup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{fr ? "Aperçu — vue client" : "Preview — client view"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden max-w-xs mx-auto shadow-lg">
              <div className="bg-teal-700 p-4 text-center">
                <div className="text-white font-bold text-sm">AttenteZéro</div>
                <div className="text-teal-200 text-xs">{fr ? "Portail citoyen" : "Citizen portal"}</div>
              </div>
              <div className="bg-white p-4 space-y-3">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-teal-600 font-medium mb-1">{fr ? "Votre ticket" : "Your ticket"}</div>
                  <div className="text-4xl font-black text-teal-700">A-107</div>
                  <div className="text-xs text-teal-500 mt-1">{fr ? "Position #4 dans la file" : "Position #4 in queue"}</div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{fr ? "Attente estimée" : "Est. wait"}</span>
                  <span className="font-bold text-gray-900">~16 min</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full w-1/4 bg-teal-500 rounded-full" />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <div className="font-medium mb-1">{fr ? "Vous serez notifié :" : "You'll be notified:"}</div>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Check className="h-3 w-3" /> {fr ? "À 10 min de votre tour" : "10 min before your turn"}
                  </div>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Check className="h-3 w-3" /> {fr ? "Quand votre numéro est appelé" : "When your number is called"}
                  </div>
                </div>
                <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-xs gap-1.5">
                  <Smartphone className="h-3 w-3" /> {fr ? "Prendre un ticket" : "Take a ticket"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AttenteZeroLayout>
  );
}

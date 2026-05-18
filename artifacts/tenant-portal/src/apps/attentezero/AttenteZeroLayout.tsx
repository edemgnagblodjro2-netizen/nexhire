import { useLocation } from "wouter";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Calendar, BarChart3, MapPin, Monitor, Bell,
  UserCog, Globe, BookUser, ArrowLeft, Menu, X, Wifi, CalendarCheck
} from "lucide-react";
import { useState } from "react";

const MODULES = [
  { key: "queues",        icon: Users,         labelFr: "File d'attente",  labelEn: "Queue",            badge: null },
  { key: "slot-manager",  icon: CalendarCheck, labelFr: "Créneaux & RDV",  labelEn: "Slots & Bookings", badge: null },
  { key: "appointments",  icon: Calendar,      labelFr: "Rendez-vous",     labelEn: "Appointments",     badge: null },
  { key: "analytics",     icon: BarChart3, labelFr: "Analytics",            labelEn: "Analytics",       badge: null },
  { key: "sites",         icon: MapPin,    labelFr: "Multi-sites",          labelEn: "Multi-sites",     badge: null },
  { key: "display",       icon: Monitor,   labelFr: "Écrans affichage",     labelEn: "Display screens", badge: null },
  { key: "notifications", icon: Bell,      labelFr: "Notifications",        labelEn: "Notifications",   badge: "3"  },
  { key: "staff",         icon: UserCog,   labelFr: "Employés / Guichets", labelEn: "Staff / Counters", badge: null },
  { key: "portal",        icon: Globe,     labelFr: "Portail client",       labelEn: "Client portal",   badge: null },
  { key: "crm",           icon: BookUser,  labelFr: "CRM",                  labelEn: "CRM",             badge: null },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

interface Props { children: React.ReactNode; active: ModuleKey; }

export function AttenteZeroLayout({ children, active }: Props) {
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const fr = lang === "fr";

  function nav(key: string) {
    setLocation(`/apps/attentezero/${key}`);
    setMobileOpen(false);
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-teal-700/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">AttenteZéro</div>
            <div className="text-teal-300 text-xs">{fr ? "Gestion files" : "Queue management"}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-green-400" />
          <span className="text-green-400 text-xs font-medium">{fr ? "En ligne" : "Online"}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {MODULES.map(({ key, icon: Icon, labelFr, labelEn, badge }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => nav(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                ${isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-teal-200 hover:bg-white/8 hover:text-white"
                }`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-teal-300"}`} />
              <span className="flex-1">{fr ? labelFr : labelEn}</span>
              {badge && (
                <Badge className="bg-red-500 text-white text-xs h-4 min-w-4 px-1 flex items-center justify-center">
                  {badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Back */}
      <div className="px-2 py-4 border-t border-teal-700/50">
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-300 hover:text-white hover:bg-white/8 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          {fr ? "Retour au portail" : "Back to portal"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-teal-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-teal-800 flex-shrink-0 flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-12 bg-teal-800 border-b border-teal-700">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-white font-semibold text-sm">AttenteZéro</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

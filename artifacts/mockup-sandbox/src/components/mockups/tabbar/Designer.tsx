import { Home, Cpu, List, MapPin, MoreHorizontal, Search, Bell, ChevronRight, Heart } from "lucide-react";

const TAB_BG = "#0d9488";
const TAB_ACTIVE = "#FFFFFF";
const TAB_INACTIVE = "rgba(255,255,255,0.62)";
const TAB_ACTIVE_PILL_BG = "rgba(255,255,255,0.18)";

type TabDef = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

const TABS: TabDef[] = [
  { key: "home", label: "Accueil", Icon: Home },
  { key: "chat", label: "Chat IA", Icon: Cpu },
  { key: "services", label: "Services", Icon: List },
  { key: "map", label: "Carte", Icon: MapPin },
  { key: "more", label: "Plus", Icon: MoreHorizontal },
];

export function Designer() {
  const activeKey = "home";

  return (
    <div className="min-h-screen w-full bg-neutral-100 flex items-stretch justify-center">
      <div className="relative w-full max-w-[390px] bg-white flex flex-col" style={{ height: "100vh" }}>
        {/* Faux status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold text-neutral-900">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-2 rounded-sm bg-neutral-900" />
            <span className="inline-block w-3 h-2 rounded-sm bg-neutral-900" />
            <span className="inline-block w-6 h-2.5 rounded-sm border border-neutral-900" />
          </div>
        </div>

        {/* Faux app header */}
        <div className="px-5 pt-3 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Bonjour</p>
              <h1 className="text-[22px] font-bold text-neutral-900 leading-tight">AttenteZéro</h1>
            </div>
            <button className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
              <Bell size={18} className="text-neutral-700" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 bg-neutral-100 rounded-2xl px-4 py-3">
            <Search size={18} className="text-neutral-500" />
            <span className="text-[14px] text-neutral-500">Rechercher un service…</span>
          </div>
        </div>

        {/* Faux content cards (so the tab bar sits in context) */}
        <div className="flex-1 overflow-hidden px-5 space-y-3">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Suggéré pour vous</p>
                <p className="text-[15px] font-semibold text-neutral-900 mt-1">Banque alimentaire Moisson</p>
                <p className="text-[12px] text-neutral-600 mt-0.5">Ouvert · 1.2 km</p>
              </div>
              <ChevronRight size={20} className="text-teal-600" />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Heart size={18} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-neutral-900">Aide en santé mentale</p>
                  <p className="text-[12px] text-neutral-500">24h/24 · Gratuit</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-neutral-400" />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <List size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-neutral-900">Hébergement d'urgence</p>
                  <p className="text-[12px] text-neutral-500">3 lits disponibles</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-neutral-400" />
            </div>
          </div>
        </div>

        {/* === LA TAB BAR (vc78) === */}
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{
            backgroundColor: TAB_BG,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            boxShadow: "0 -4px 14px rgba(0,0,0,0.18)",
            paddingTop: 6,
            paddingBottom: 18,
          }}
        >
          <div className="flex items-stretch justify-around">
            {TABS.map((tab) => {
              const isActive = tab.key === activeKey;
              const color = isActive ? TAB_ACTIVE : TAB_INACTIVE;
              const Icon = tab.Icon;
              return (
                <div key={tab.key} className="flex flex-col items-center justify-center flex-1 pt-1.5">
                  <div
                    style={{
                      minWidth: 44,
                      height: 30,
                      borderRadius: 14,
                      paddingLeft: 10,
                      paddingRight: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? TAB_ACTIVE_PILL_BG : "transparent",
                      marginBottom: 2,
                    }}
                  >
                    <Icon size={20} color={color} strokeWidth={2} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      color,
                    }}
                  >
                    {tab.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

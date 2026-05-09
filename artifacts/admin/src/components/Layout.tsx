import { Link, useLocation } from "wouter";
import { type AdminRole } from "@/lib/auth";

const SUPERADMIN_NAV = [
  { href: "/", icon: "📊", label: "Tableau de bord" },
  { href: "/live", icon: "🟢", label: "En direct" },
  { href: "/services", icon: "🏢", label: "Services" },
  { href: "/corrections", icon: "📍", label: "Corrections géo" },
  { href: "/verifications", icon: "🛡️", label: "Vérifications" },
  { href: "/organisations", icon: "🏢", label: "Organismes & Partenaires" },
  { href: "/b2g", icon: "🏛️", label: "B2G — Régions" },
  { href: "/bug-reports", icon: "🐛", label: "Signalements" },
  { href: "/stats", icon: "📈", label: "Statistiques" },
];

const B2G_NAV = [
  { href: "/", icon: "🏛️", label: "B2G — Régions" },
];

export default function Layout({
  children,
  onLogout,
  role,
}: {
  children: React.ReactNode;
  onLogout: () => void;
  role: AdminRole;
}) {
  const [location] = useLocation();
  const NAV = role === "b2g" ? B2G_NAV : SUPERADMIN_NAV;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-lg shrink-0">
              🏛️
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">AttenteZéro</p>
              <p className="text-xs text-gray-400">
                {role === "b2g" ? "Portail B2G" : "Administration"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? location === "/" || location === ""
                : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <span>🚪</span>
            Se déconnecter
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-3 leading-tight">
            © {new Date().getFullYear()} CivicAI
            <br />
            <span className="text-gray-300">AttenteZéro est un produit CivicAI</span>
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

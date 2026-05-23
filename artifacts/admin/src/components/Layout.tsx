import React, { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type AdminRole } from "@/lib/auth";
import { fetchContactStats, fetchVerificationStats, fetchBugReportStats, fetchOrgStats } from "@/lib/api";
import { useNotifications, type NotifEventPrefs } from "@/hooks/useNotifications";

const ORG_LAST_SEEN_KEY = "az_admin_orgs_last_seen";

const SUPERADMIN_NAV = [
  { href: "/", icon: "📊", label: "Tableau de bord" },
  { href: "/live", icon: "🟢", label: "En direct" },
  { href: "/services", icon: "🏢", label: "Services" },
  { href: "/corrections", icon: "📍", label: "Corrections géo" },
  { href: "/verifications", icon: "🛡️", label: "Vérifications" },
  { href: "/organisations", icon: "🏢", label: "Organismes & Partenaires" },
  { href: "/b2g", icon: "🏛️", label: "B2G — Régions" },
  { href: "/contact", icon: "✉️", label: "Contact CivicAI", badge: true },
  { href: "/bug-reports", icon: "🐛", label: "Signalements" },
  { href: "/stats", icon: "📈", label: "Statistiques" },
];

const B2G_NAV = [
  { href: "/", icon: "🏛️", label: "B2G — Régions" },
];

const EVENT_LABELS: { key: keyof NotifEventPrefs; label: string; icon: string }[] = [
  { key: "messages", label: "Messages", icon: "✉️" },
  { key: "verifications", label: "Vérifications", icon: "🛡️" },
  { key: "bugReports", label: "Signalements", icon: "🐛" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 transition-colors ${
        on ? "bg-teal-500 border-teal-500" : "bg-gray-200 border-gray-200"
      }`}
    >
      <span
        className={`block h-3 w-3 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function Layout({
  children,
  onLogout,
  role,
  adminKey,
}: {
  children: React.ReactNode;
  onLogout: () => void;
  role: AdminRole;
  adminKey?: string;
}) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const NAV = role === "b2g" ? B2G_NAV : SUPERADMIN_NAV;

  const enabled = !!adminKey && role !== "b2g";

  // Stable ref for the org last-seen timestamp so the query key doesn't change on re-renders
  const orgLastSeenRef = useRef<string>(
    localStorage.getItem(ORG_LAST_SEEN_KEY) ?? new Date(0).toISOString()
  );

  const { data: contactStats } = useQuery({
    queryKey: ["contact-stats", adminKey],
    queryFn: () => fetchContactStats(adminKey!),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: verificationStats } = useQuery({
    queryKey: ["verification-stats", adminKey],
    queryFn: () => fetchVerificationStats(adminKey!),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: bugReportStats } = useQuery({
    queryKey: ["bug-report-stats", adminKey],
    queryFn: () => fetchBugReportStats(adminKey!),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: orgStats } = useQuery({
    queryKey: ["org-stats", adminKey, orgLastSeenRef.current],
    queryFn: () => fetchOrgStats(adminKey!, orgLastSeenRef.current),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // When admin navigates to /organisations, mark all current orgs as seen
  useEffect(() => {
    if (location === "/organisations" || location.startsWith("/organisations/")) {
      const now = new Date().toISOString();
      localStorage.setItem(ORG_LAST_SEEN_KEY, now);
      orgLastSeenRef.current = now;
      queryClient.invalidateQueries({ queryKey: ["org-stats", adminKey] });
    }
  }, [location, adminKey, queryClient]);

  const unreadCount = contactStats?.newCount ?? 0;
  const newOrgCount = orgStats?.newCount ?? 0;

  const counts = useMemo(() => ({
    messages: contactStats?.newCount ?? 0,
    verifications: verificationStats?.pendingCount ?? 0,
    bugReports: bugReportStats?.newCount ?? 0,
  }), [contactStats?.newCount, verificationStats?.pendingCount, bugReportStats?.newCount]);

  const { prefs, setPrefs, setEventPref, toggleBrowserPref, browserPermission } = useNotifications(counts);

  useEffect(() => {
    const base = role === "b2g" ? "AttenteZéro — B2G" : "AttenteZéro — Admin";
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [unreadCount, role]);

  const anyNotifOn = prefs.sound || prefs.browser;
  const anyEventOn = Object.values(prefs.events).some(Boolean);

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
            const pendingVerifCount = verificationStats?.pendingCount ?? 0;
            const newBugCount = bugReportStats?.newCount ?? 0;
            const badgeCount =
              item.href === "/contact" && unreadCount > 0 ? unreadCount
              : item.href === "/organisations" && newOrgCount > 0 ? newOrgCount
              : item.href === "/verifications" && pendingVerifCount > 0 ? pendingVerifCount
              : item.href === "/bug-reports" && newBugCount > 0 ? newBugCount
              : 0;
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
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          {role !== "b2g" && (
            <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Alertes
              </p>

              {/* Sound / browser toggles */}
              <div className="flex flex-col gap-1 mb-2">
                <label className="flex items-center justify-between gap-2 cursor-pointer group">
                  <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors select-none">
                    🔔 Son
                  </span>
                  <Toggle on={prefs.sound} onToggle={() => setPrefs({ sound: !prefs.sound })} />
                </label>
                {browserPermission === "denied" ? (
                  <div
                    className="flex items-center justify-between gap-2 cursor-not-allowed"
                    title="Notifications bloquées par le navigateur. Allez dans les réglages du navigateur pour les réactiver."
                  >
                    <span className="text-xs text-gray-400 select-none">
                      🖥️ Notification
                    </span>
                    <div className="relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 bg-gray-100 border-gray-100 opacity-50">
                      <span className="block h-3 w-3 rounded-full bg-white shadow translate-x-0" />
                    </div>
                  </div>
                ) : browserPermission === "default" ? (
                  <button
                    type="button"
                    onClick={toggleBrowserPref}
                    className="mt-0.5 w-full text-left text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors select-none"
                  >
                    🖥️ Activer les notifications navigateur
                  </button>
                ) : (
                  <label className="flex items-center justify-between gap-2 cursor-pointer group">
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors select-none">
                      🖥️ Notification
                    </span>
                    <Toggle on={prefs.browser} onToggle={toggleBrowserPref} />
                  </label>
                )}
              </div>

              {/* Per-event toggles */}
              {anyNotifOn && (
                <>
                  <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide mb-1">
                    Événements
                  </p>
                  <div className="flex flex-col gap-1">
                    {EVENT_LABELS.map(({ key, label, icon }) => (
                      <label key={key} className="flex items-center justify-between gap-2 cursor-pointer group">
                        <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors select-none">
                          {icon} {label}
                        </span>
                        <Toggle
                          on={prefs.events[key]}
                          onToggle={() => setEventPref(key, !prefs.events[key])}
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}

              {(!anyNotifOn || !anyEventOn) && (
                <p className="text-[10px] text-gray-400 mt-1.5 italic">
                  {!anyNotifOn ? "Alertes désactivées" : "Aucun événement sélectionné"}
                </p>
              )}
            </div>
          )}

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
            <br />
            <span className="text-gray-300">NEQ : 2280791601</span>
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

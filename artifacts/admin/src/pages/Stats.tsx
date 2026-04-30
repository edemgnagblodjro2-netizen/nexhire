import { useEffect, useState } from "react";

type ProvinceRow = { province: string; count: number };
type CategoryRow = { category: string; count: number };
type StatsResponse = {
  days: number;
  total: number;
  byProvince: ProvinceRow[];
  byCategory: CategoryRow[];
};

type OverviewResponse = {
  days: number;
  activeNow: number;
  eventsTotal: number;
  uniqueSessions: number;
  uniqueUsers: number;
  screenViews: number;
  searches: number;
  serviceViews: number;
  serviceCalls: number;
  serviceDirections: number;
  pushTokens: number;
  newUsers: number;
  premiumUsers: number;
};

type ScreenRow = { screen: string; count: number; uniqueSessions: number };
type ScreensResponse = { days: number; screens: ScreenRow[] };

type FunnelTopCalled = {
  serviceId: string;
  name: string | null;
  city: string | null;
  province: string | null;
  calls: number;
};
type FunnelResponse = {
  days: number;
  views: number;
  calls: number;
  directions: number;
  websites: number;
  callRate: number;
  directionsRate: number;
  websiteRate: number;
  topCalled: FunnelTopCalled[];
};

const PROVINCE_NAMES: Record<string, string> = {
  QC: "Québec",
  ON: "Ontario",
  BC: "Colombie-Britannique",
  AB: "Alberta",
  MB: "Manitoba",
  SK: "Saskatchewan",
  NB: "Nouveau-Brunswick",
  NS: "Nouvelle-Écosse",
  PE: "Île-du-Prince-Édouard",
  NL: "Terre-Neuve-et-Labrador",
  YT: "Yukon",
  NT: "Territoires du Nord-Ouest",
  NU: "Nunavut",
  ALL: "Toutes provinces",
};

const CATEGORY_NAMES: Record<string, string> = {
  housing: "Logement",
  food: "Alimentation",
  mentalHealth: "Santé mentale",
  health: "Santé",
  immigration: "Immigration",
  employment: "Emploi",
  family: "Famille",
  social: "Soutien social",
  childcare: "Services de garde",
  realestate: "Achat immobilier",
  administrative: "Démarches administratives",
  legal: "Aide juridique",
  all: "Toutes catégories",
};

export default function Stats({ adminKey }: { adminKey: string }) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [screens, setScreens] = useState<ScreensResponse | null>(null);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = { "x-admin-key": adminKey };
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`/api/admin/search-stats?days=${days}`, { headers }),
          fetch(`/api/admin/analytics/overview?days=${days}`, { headers }),
          fetch(`/api/admin/analytics/screens?days=${days}`, { headers }),
          fetch(`/api/admin/analytics/funnel?days=${days}`, { headers }),
        ]);
        if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
        const data = (await r1.json()) as StatsResponse;
        const ov = r2.ok ? ((await r2.json()) as OverviewResponse) : null;
        const sc = r3.ok ? ((await r3.json()) as ScreensResponse) : null;
        const fn = r4.ok ? ((await r4.json()) as FunnelResponse) : null;
        if (!cancelled) {
          setStats(data);
          setOverview(ov);
          setScreens(sc);
          setFunnel(fn);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminKey, days]);

  const maxProvince = Math.max(1, ...(stats?.byProvince.map((r) => r.count) ?? [1]));
  const maxCategory = Math.max(1, ...(stats?.byCategory.map((r) => r.count) ?? [1]));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques de recherche</h1>
          <p className="text-sm text-gray-500 mt-1">
            Données 100 % anonymes — aucun texte de recherche n'est conservé.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700"
        >
          <option value={1}>Dernières 24 h</option>
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Erreur : {error}
        </div>
      ) : !stats ? null : (
        <div className="space-y-6">
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                label="Actifs maintenant"
                value={overview.activeNow}
                accent="green"
                hint="dernier ping < 2 min"
              />
              <Kpi
                label="Sessions uniques"
                value={overview.uniqueSessions}
                accent="teal"
                hint={`${overview.uniqueUsers} comptes connectés`}
              />
              <Kpi
                label="Vues d'écran"
                value={overview.screenViews}
                accent="blue"
                hint={`${overview.eventsTotal} événements`}
              />
              <Kpi
                label="Appareils notifiables"
                value={overview.pushTokens}
                accent="purple"
                hint={`${overview.premiumUsers} comptes premium`}
              />
            </div>
          )}

          {funnel && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">
                Tunnel de conversion (vue → action)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FunnelStep
                  label="Vues de fiches"
                  value={funnel.views}
                  rate={null}
                />
                <FunnelStep
                  label="Appels"
                  value={funnel.calls}
                  rate={funnel.callRate}
                />
                <FunnelStep
                  label="Itinéraires"
                  value={funnel.directions}
                  rate={funnel.directionsRate}
                />
                <FunnelStep
                  label="Sites web"
                  value={funnel.websites}
                  rate={funnel.websiteRate}
                />
              </div>
              {funnel.topCalled.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Services les plus appelés
                  </h3>
                  <div className="space-y-1.5">
                    {funnel.topCalled.slice(0, 8).map((s) => (
                      <div
                        key={s.serviceId}
                        className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5"
                      >
                        <span className="text-gray-700 truncate">
                          {s.name ?? s.serviceId}
                          {s.city && (
                            <span className="text-gray-400 ml-1">
                              · {s.city}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {s.calls}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {screens && screens.screens.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">
                Écrans les plus visités
              </h2>
              <div className="space-y-1.5">
                {screens.screens.slice(0, 15).map((s) => (
                  <div
                    key={s.screen}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-gray-700 truncate flex-1">
                      {s.screen.replace(/^\//, "") || "accueil"}
                    </span>
                    <span className="text-xs text-gray-400 mr-3">
                      {s.uniqueSessions} sessions
                    </span>
                    <span className="font-semibold text-gray-900 w-16 text-right">
                      {s.count.toLocaleString("fr-CA")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
              Total recherches (legacy)
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {stats.total.toLocaleString("fr-CA")}
            </p>
            <p className="text-sm text-gray-500 mt-1">sur {stats.days} jour{stats.days !== 1 ? "s" : ""}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Par province / territoire</h2>
              {stats.byProvince.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune recherche enregistrée pour cette période.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byProvince.map((row) => (
                    <div key={row.province} className="flex items-center gap-3">
                      <div className="w-44 text-sm text-gray-700 truncate">
                        {PROVINCE_NAMES[row.province] ?? row.province}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                        <div
                          className="h-full bg-teal-500"
                          style={{ width: `${(row.count / maxProvince) * 100}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm font-medium text-gray-900">
                        {row.count.toLocaleString("fr-CA")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Par catégorie</h2>
              {stats.byCategory.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune recherche enregistrée pour cette période.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byCategory.map((row) => (
                    <div key={row.category} className="flex items-center gap-3">
                      <div className="w-44 text-sm text-gray-700 truncate">
                        {CATEGORY_NAMES[row.category] ?? row.category}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${(row.count / maxCategory) * 100}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm font-medium text-gray-900">
                        {row.count.toLocaleString("fr-CA")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: "green" | "teal" | "blue" | "purple";
}) {
  const ring =
    accent === "green"
      ? "border-green-100"
      : accent === "teal"
      ? "border-teal-100"
      : accent === "blue"
      ? "border-blue-100"
      : "border-purple-100";
  const text =
    accent === "green"
      ? "text-green-700"
      : accent === "teal"
      ? "text-teal-700"
      : accent === "blue"
      ? "text-blue-700"
      : "text-purple-700";
  return (
    <div className={`bg-white rounded-2xl border ${ring} p-4 shadow-sm`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${text}`}>
        {value.toLocaleString("fr-CA")}
      </p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate: number | null;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {value.toLocaleString("fr-CA")}
      </p>
      {rate !== null && (
        <p className="text-xs text-teal-700 font-medium mt-0.5">
          {rate}% des vues
        </p>
      )}
    </div>
  );
}

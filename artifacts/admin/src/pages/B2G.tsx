import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// AttenteZéro — B2G regional insights dashboard.
// Anonymized aggregate stats for municipalities and CIUSSS partners.
// All data is computed server-side from the public service directory and
// citizen interaction logs; no individual identifiers are surfaced here.

type Insights = {
  region: string;
  days: number;
  since: string;
  generatedAt: string;
  privacyFloor: number;
  totals: {
    interactions: number;
    views: number;
    calls: number;
    websiteClicks: number;
    urgentEngagements: number;
    uniqueServicesEngaged: number;
    distinctAuthenticatedUsers: number;
    anonymousEvents: number;
  };
  userStats?: {
    total: number;
    newInPeriod: number;
    premium: number;
    premiumConversionPct: number;
    citizens: number;
    organisations: number;
  };
  dailySignups?: Array<{ date: string; signups: number }>;
  waitStats: {
    reportsInPeriod: number;
    servicesReportedInPeriod: number;
    liveWindowMinutes: number;
    liveTopServices: Array<{
      id: string;
      name: string;
      category: string;
      isUrgent: boolean;
      medianMinutes: number;
      sampleCount: number;
    }>;
  };
  topCategories: Array<{ category: string; interactions: number }>;
  topServices: Array<{
    id: string;
    name: string;
    category: string;
    isUrgent: boolean;
    interactions: number;
  }>;
  dailyActivity: Array<{ date: string; interactions: number }>;
  coverageGaps: Array<{
    category: string;
    engagements: number;
    servicesAvailable: number;
    ratio: number;
  }>;
  categoriesInRegion: Array<{ category: string; services: number }>;
};

type RegionEntry = { city: string; services: number };

async function fetchJson<T>(url: string, adminKey: string): Promise<T> {
  const res = await fetch(url, { headers: { "x-admin-key": adminKey } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const RANGE_OPTIONS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 365, label: "12 mois" },
];

function formatNum(n: number): string {
  return n.toLocaleString("fr-CA");
}

function fmtDate(s: string): string {
  // Inputs are "YYYY-MM-DD" — render as "1 mars" in fr-CA.
  const d = new Date(s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

const MINI_ACCENTS: Record<string, string> = {
  teal: "bg-teal-50 text-teal-700 border-teal-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
};

function MiniStat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent: keyof typeof MINI_ACCENTS;
  hint?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${MINI_ACCENTS[accent] ?? MINI_ACCENTS.teal}`}>
      <p className="text-[11px] uppercase tracking-wide font-semibold opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{formatNum(value)}</p>
      {hint && <p className="text-[11px] opacity-70 mt-0.5">{hint}</p>}
    </div>
  );
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function B2G({ adminKey }: { adminKey: string }) {
  const [city, setCity] = useState<string>("");
  const [days, setDays] = useState<number>(30);

  const regionsQuery = useQuery({
    queryKey: ["b2g-regions", adminKey],
    queryFn: () => fetchJson<{ regions: RegionEntry[] }>("/api/b2g/regions", adminKey),
    staleTime: 5 * 60_000,
  });

  const insightsQuery = useQuery({
    queryKey: ["b2g-insights", adminKey, city, days],
    queryFn: () =>
      fetchJson<Insights>(
        `/api/b2g/insights?city=${encodeURIComponent(city)}&days=${days}`,
        adminKey,
      ),
    staleTime: 60_000,
  });

  // Default to the largest region once regions load.
  useEffect(() => {
    if (!city && regionsQuery.data?.regions?.[0]) {
      setCity(regionsQuery.data.regions[0].city);
    }
  }, [regionsQuery.data, city]);

  const data = insightsQuery.data;

  const dailyChartData = useMemo(() => {
    if (!data) return [];
    return data.dailyActivity.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("fr-CA", { month: "short", day: "numeric" }),
    }));
  }, [data]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-purple-600">🏛️</span> Tableau de bord B2G
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Statistiques agrégées et anonymisées pour municipalités et CIUSSS.
            Aucune donnée individuelle n'est jamais affichée.
          </p>
        </div>
        <button
          onClick={() => {
            if (!data) return;
            downloadCsv(`attentezero-b2g-${data.region}-${data.days}j.csv`, [
              ...data.topCategories.map((c) => ({
                section: "category",
                key: c.category,
                interactions: c.interactions,
              })),
              ...data.topServices.map((s) => ({
                section: "service",
                key: s.name,
                interactions: s.interactions,
              })),
              ...data.dailyActivity.map((d) => ({
                section: "daily",
                key: d.date,
                interactions: d.interactions,
              })),
            ]);
          }}
          disabled={!data}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>⬇</span> Exporter CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Région
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tout le Québec</option>
            {regionsQuery.data?.regions.map((r) => (
              <option key={r.city} value={r.city}>
                {r.city} ({r.services} services)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Période
          </label>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  days === opt.days
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {insightsQuery.isLoading && (
        <div className="p-12 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Calcul des indicateurs régionaux…</p>
          </div>
        </div>
      )}

      {insightsQuery.error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
          Erreur lors du chargement des statistiques.
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon="👥"
              label="Citoyens identifiés"
              value={data.totals.distinctAuthenticatedUsers}
              hint={`Comptes distincts · ${data.totals.anonymousEvents.toLocaleString("fr-CA")} interactions anonymes`}
              color="teal"
            />
            <KpiCard
              icon="🔄"
              label="Interactions totales"
              value={data.totals.interactions}
              hint={`${data.totals.views} vues · ${data.totals.calls} appels · ${data.totals.websiteClicks} clics web`}
              color="blue"
            />
            <KpiCard
              icon="🚨"
              label="Engagements urgents"
              value={data.totals.urgentEngagements}
              hint="Sur services flaggés urgents"
              color="red"
            />
            <KpiCard
              icon="🏢"
              label="Services activés"
              value={data.totals.uniqueServicesEngaged}
              hint="Distincts ayant reçu ≥ 1 interaction"
              color="violet"
            />
          </div>

          {/* Adoption — comptes utilisateurs (global, hors région) */}
          {/* Only present for super-admin (ADMIN_API_KEY). Scoped B2G partners  */}
          {/* do not receive these province-wide metrics to prevent cross-tenant */}
          {/* data leakage.                                                       */}
          {data.userStats && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-gray-900">
                  Adoption — comptes utilisateurs
                </h2>
                <span className="text-xs text-gray-400">
                  Données pan-québécoises (non régionalisées)
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Croissance de la base d'utilisateurs AttenteZéro à l'échelle de la province.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <MiniStat label="Comptes totaux" value={data.userStats.total} accent="teal" />
                <MiniStat
                  label={`Nouveaux (${data.days}j)`}
                  value={data.userStats.newInPeriod}
                  accent="blue"
                />
                <MiniStat label="Citoyens" value={data.userStats.citizens} accent="violet" />
                <MiniStat label="Organismes" value={data.userStats.organisations} accent="indigo" />
                <MiniStat
                  label="Premium"
                  value={data.userStats.premium}
                  accent="amber"
                  hint={`${data.userStats.premiumConversionPct}% conversion`}
                />
              </div>
              {(data.dailySignups ?? []).length > 0 && (
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart
                    data={data.dailySignups}
                    margin={{ left: 0, right: 10, top: 5, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickFormatter={fmtDate} />
                    <YAxis stroke="#9ca3af" fontSize={10} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v} inscriptions`, "Inscriptions"]}
                      labelFormatter={fmtDate}
                    />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* "Combien d'attente ?" — citizen wait-time pulse */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">
                Combien d'attente ? — pouls citoyen
              </h2>
              <span className="text-xs text-gray-400">
                Médiane sur les {data.waitStats.liveWindowMinutes} dernières minutes
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Temps d'attente déclarés par les citoyens sur place. Filtre de
              confidentialité : minimum {data.privacyFloor} signalements requis pour publier
              une médiane par service.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              <MiniStat
                label={`Signalements (${data.days}j)`}
                value={data.waitStats.reportsInPeriod}
                accent="teal"
              />
              <MiniStat
                label="Services signalés"
                value={data.waitStats.servicesReportedInPeriod}
                accent="blue"
              />
              <MiniStat
                label="Services chauds (live)"
                value={data.waitStats.liveTopServices.length}
                accent="amber"
                hint="Médiane active publiable"
              />
            </div>
            {data.waitStats.liveTopServices.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Files d'attente les plus longues actuellement
                </p>
                {data.waitStats.liveTopServices.map((s) => (
                  <div
                    key={s.id}
                    className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                        {s.isUrgent && <span className="text-rose-600">●</span>}
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.category} · {s.sampleCount} signalement
                        {s.sampleCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-amber-700">
                        {s.medianMinutes}
                        <span className="text-sm font-medium text-gray-500"> min</span>
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Médiane</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Aucun service avec assez de signalements actifs pour publier une médiane.
                Encouragez les citoyens à partager leur temps d'attente depuis l'app mobile.
              </p>
            )}
          </div>

          {/* Coverage gaps callout */}
          {data.coverageGaps.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-amber-900 mb-1">
                    Écarts de couverture détectés
                  </h3>
                  <p className="text-sm text-amber-800 mb-3">
                    Catégories à forte demande citoyenne avec peu de services référencés
                    dans la région — opportunités prioritaires de référencement ou de
                    financement.
                  </p>
                  <div className="space-y-2">
                    {data.coverageGaps.map((gap) => (
                      <div
                        key={gap.category}
                        className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-amber-100"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{gap.category}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatNum(gap.engagements)} engagements citoyens · seulement{" "}
                            {gap.servicesAvailable} service{gap.servicesAvailable === 1 ? "" : "s"}{" "}
                            référencé{gap.servicesAvailable === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-amber-700">
                            {Math.round(gap.ratio)}:1
                          </p>
                          <p className="text-xs text-gray-500">Engagement / service</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Top 10 catégories les plus recherchées
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Volume d'interactions citoyennes par catégorie de service
              </p>
              {data.topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.topCategories}
                    layout="vertical"
                    margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={140}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatNum(v), "Interactions"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="interactions" fill="#0d9488" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyHint floor={data.privacyFloor} />
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Activité quotidienne
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Volume total d'interactions par jour ({data.days} jours)
              </p>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyChartData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => [formatNum(v), "Interactions"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="interactions"
                      name="Interactions"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyHint floor={data.privacyFloor} />
              )}
            </div>
          </div>

          {/* Top services list */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Top 10 services les plus engagés
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Services référencés ayant reçu le plus d'interactions citoyennes dans la région
            </p>
            {data.topServices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="py-2 pr-4 font-semibold">#</th>
                      <th className="py-2 pr-4 font-semibold">Service</th>
                      <th className="py-2 pr-4 font-semibold">Catégorie</th>
                      <th className="py-2 pr-4 font-semibold text-right">Interactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topServices.map((s, i) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-gray-400 font-mono">{i + 1}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{s.name}</span>
                            {s.isUrgent && (
                              <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                                Urgent
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{s.category}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                          {formatNum(s.interactions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyHint floor={data.privacyFloor} />
            )}
          </div>

          {/* Privacy footer */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Confidentialité :</strong> aucun identifiant
            individuel n'est exposé. Toutes les agrégations en dessous de{" "}
            <strong>{data.privacyFloor}</strong> événements sont supprimées pour empêcher
            la ré-identification. Les visiteurs anonymes (sans compte) sont regroupés en
            une seule cohorte. Données calculées le{" "}
            {new Date(data.generatedAt).toLocaleString("fr-CA")} sur la période depuis le{" "}
            {new Date(data.since).toLocaleDateString("fr-CA")}.
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  hint: string;
  color: "teal" | "blue" | "red" | "violet";
}) {
  const colorMap = {
    teal: "text-teal-700",
    blue: "text-blue-700",
    red: "text-red-700",
    violet: "text-violet-700",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{formatNum(value)}</p>
      <p className="text-sm text-gray-700 font-medium mt-1">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

function EmptyHint({ floor }: { floor: number }) {
  return (
    <div className="text-center py-12 text-sm text-gray-400">
      Aucune donnée suffisante.
      <br />
      <span className="text-xs">
        (Seuils anti-ré-identification : ≥ {floor} événements requis)
      </span>
    </div>
  );
}

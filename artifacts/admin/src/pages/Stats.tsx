import { useEffect, useState } from "react";

type ProvinceRow = { province: string; count: number };
type CategoryRow = { category: string; count: number };
type StatsResponse = {
  days: number;
  total: number;
  byProvince: ProvinceRow[];
  byCategory: CategoryRow[];
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
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/search-stats?days=${days}`, {
          headers: { "x-admin-key": adminKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as StatsResponse;
        if (!cancelled) setStats(data);
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
              Total recherches
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

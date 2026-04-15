import { useQuery } from "@tanstack/react-query";
import { fetchMeta } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#dc2626", "#d97706", "#16a34a"];

export default function Dashboard({ adminKey }: { adminKey: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta", adminKey],
    queryFn: () => fetchMeta(adminKey),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Chargement des statistiques…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          Erreur lors du chargement des stats.
        </div>
      </div>
    );
  }

  const { stats, cities, categories } = data!;

  const statsCards = [
    { label: "Total services", value: stats.total, icon: "🏢", color: "teal" },
    { label: "Services actifs", value: stats.active, icon: "✅", color: "emerald" },
    { label: "Services urgents", value: stats.urgent, icon: "🚨", color: "red" },
    { label: "À l'échelle provinciale", value: stats.provinceWide, icon: "🌐", color: "blue" },
  ];

  const cityData = cities.map((c, i) => ({ name: c, color: COLORS[i % COLORS.length] }));
  const catData = categories.map((c, i) => ({
    name: c.length > 14 ? c.slice(0, 14) + "…" : c,
    full: c,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble des services communautaires</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value?.toLocaleString("fr-CA") ?? "—"}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Villes couvertes</h2>
          <div className="space-y-2">
            {cityData.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm text-gray-700">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Catégories</h2>
          <div className="space-y-2">
            {catData.map((c) => (
              <div key={c.full} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm text-gray-700">{c.full}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition par statut</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "Actifs", value: Number(stats.active) },
                { name: "Inactifs", value: Number(stats.total) - Number(stats.active) },
                { name: "Urgents", value: Number(stats.urgent) },
                { name: "Provinciaux", value: Number(stats.provinceWide) },
              ]}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#0d9488" />
                <Cell fill="#94a3b8" />
                <Cell fill="#dc2626" />
                <Cell fill="#0891b2" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

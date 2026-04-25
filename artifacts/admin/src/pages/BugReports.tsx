import { useEffect, useState } from "react";

type BugReport = {
  id: number;
  name: string;
  email: string | null;
  message: string;
  appVersion: string | null;
  platform: string | null;
  status: "new" | "triaged" | "fixed" | "wontfix";
  createdAt: string;
};

const STATUS_COLORS: Record<BugReport["status"], string> = {
  new: "bg-orange-50 text-orange-700 border-orange-200",
  triaged: "bg-blue-50 text-blue-700 border-blue-200",
  fixed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  wontfix: "bg-gray-50 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<BugReport["status"], string> = {
  new: "Nouveau",
  triaged: "Trié",
  fixed: "Corrigé",
  wontfix: "Ignoré",
};

export default function BugReports({ adminKey }: { adminKey: string }) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | BugReport["status"]>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bug-reports?limit=200", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [adminKey]);

  async function updateStatus(id: number, status: BugReport["status"]) {
    try {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    }
  }

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const counts = {
    new: reports.filter((r) => r.status === "new").length,
    triaged: reports.filter((r) => r.status === "triaged").length,
    fixed: reports.filter((r) => r.status === "fixed").length,
    wontfix: reports.filter((r) => r.status === "wontfix").length,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signalements de bogues</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reports.length} signalement{reports.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
        >
          Rafraîchir
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: "all" as const, label: "Tous", count: reports.length },
          { key: "new" as const, label: "Nouveaux", count: counts.new },
          { key: "triaged" as const, label: "Triés", count: counts.triaged },
          { key: "fixed" as const, label: "Corrigés", count: counts.fixed },
          { key: "wontfix" as const, label: "Ignorés", count: counts.wontfix },
        ]).map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              filter === chip.key
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {chip.label} <span className="opacity-70">({chip.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Erreur : {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          Aucun signalement {filter !== "all" ? `« ${STATUS_LABELS[filter as BugReport["status"]]} »` : ""}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">#{r.id}</span>
                    <span className="text-gray-700">{r.name}</span>
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="text-xs text-teal-700 hover:underline truncate max-w-[180px]"
                      >
                        {r.email}
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex flex-wrap gap-3">
                    <span>
                      {new Date(r.createdAt).toLocaleString("fr-CA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    {r.platform && <span>📱 {r.platform}</span>}
                    {r.appVersion && <span>v{r.appVersion}</span>}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed">
                {r.message}
              </p>

              <div className="flex flex-wrap gap-2">
                {(["new", "triaged", "fixed", "wontfix"] as const)
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(r.id, s)}
                      className="text-xs px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      Marquer {STATUS_LABELS[s].toLowerCase()}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

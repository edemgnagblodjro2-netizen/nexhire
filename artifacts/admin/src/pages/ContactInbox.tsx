import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type ContactSubmission = {
  id: number;
  name: string;
  email: string;
  org: string | null;
  phone: string | null;
  service: string | null;
  message: string;
  lang: string;
  status: "new" | "read" | "archived";
  emailSent: number;
  createdAt: string;
};

const STATUS_COLORS: Record<ContactSubmission["status"], string> = {
  new: "bg-orange-50 text-orange-700 border-orange-200",
  read: "bg-blue-50 text-blue-700 border-blue-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<ContactSubmission["status"], string> = {
  new: "Nouveau",
  read: "Lu",
  archived: "Archivé",
};

type DateRange = "all" | "7d" | "30d";

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "7d", label: "7 derniers jours" },
  { key: "30d", label: "30 derniers jours" },
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  const matchRegex = new RegExp(`^${escaped}$`, "i");
  return parts.map((part, i) =>
    matchRegex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function ContactInbox({ adminKey }: { adminKey: string }) {
  const queryClient = useQueryClient();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ContactSubmission["status"]>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [archivingAllRead, setArchivingAllRead] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showMarkReadConfirm, setShowMarkReadConfirm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact?limit=500", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [adminKey]);

  async function updateStatus(id: number, status: ContactSubmission["status"]) {
    const prev_status = submissions.find((s) => s.id === id)?.status;
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
      if (prev_status === "new" && status !== "new") {
        queryClient.invalidateQueries({ queryKey: ["contact-stats", adminKey] });
      }
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    }
  }

  async function archiveAllRead() {
    setArchivingAllRead(true);
    try {
      const res = await fetch("/api/contact/mark-all-archived", {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.status === "read" ? { ...s, status: "archived" } : s)),
      );
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    } finally {
      setArchivingAllRead(false);
    }
  }

  async function markAllAsRead() {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/contact/mark-all-read", {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.status === "new" ? { ...s, status: "read" } : s)),
      );
      queryClient.invalidateQueries({ queryKey: ["contact-stats", adminKey] });
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    } finally {
      setMarkingAllRead(false);
    }
  }

  function handleToggleExpand(id: number, submission: ContactSubmission) {
    const isOpening = expanded !== id;
    setExpanded(isOpening ? id : null);
    if (isOpening && submission.status === "new") {
      updateStatus(id, "read");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const cutoff =
      dateRange === "7d"
        ? now - 7 * 24 * 60 * 60 * 1000
        : dateRange === "30d"
          ? now - 30 * 24 * 60 * 60 * 1000
          : null;

    return submissions.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (cutoff !== null && new Date(s.createdAt).getTime() < cutoff) return false;
      if (q) {
        const haystack = [s.name, s.email, s.org ?? "", s.service ?? "", s.message]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, filter, search, dateRange]);

  const counts = {
    new: submissions.filter((s) => s.status === "new").length,
    read: submissions.filter((s) => s.status === "read").length,
    archived: submissions.filter((s) => s.status === "archived").length,
  };

  const hasActiveFilters = search.trim() !== "" || dateRange !== "all";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boîte de réception — Contact</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasActiveFilters ? (
              <>
                <span className="font-medium text-teal-700">{filtered.length}</span> résultat
                {filtered.length !== 1 ? "s" : ""} sur {submissions.length} message
                {submissions.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {submissions.length} message{submissions.length !== 1 ? "s" : ""} au total
              </>
            )}
            {counts.new > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {counts.new} nouveau{counts.new !== 1 ? "x" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.read > 0 && (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={archivingAllRead}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition disabled:opacity-50"
            >
              {archivingAllRead ? "En cours…" : `Tout archiver les messages lus (${counts.read})`}
            </button>
          )}
          {counts.new > 0 && (
            <button
              onClick={() => setShowMarkReadConfirm(true)}
              disabled={markingAllRead}
              className="px-3 py-2 text-sm rounded-lg bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 transition disabled:opacity-50"
            >
              {markingAllRead ? "En cours…" : `Tout marquer comme lu (${counts.new})`}
            </button>
          )}
          <button
            onClick={load}
            className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, organisation, service, message…"
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-200 rounded-lg p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                dateRange === opt.key
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: "all" as const, label: "Tous", count: submissions.length },
          { key: "new" as const, label: "Nouveaux", count: counts.new },
          { key: "read" as const, label: "Lus", count: counts.read },
          { key: "archived" as const, label: "Archivés", count: counts.archived },
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
          {hasActiveFilters ? (
            <div>
              <p className="mb-2">Aucun résultat pour ces filtres.</p>
              <button
                onClick={() => { setSearch(""); setDateRange("all"); }}
                className="text-sm text-teal-600 hover:underline"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            `Aucun message ${filter !== "all" ? `« ${STATUS_LABELS[filter as ContactSubmission["status"]]} »` : ""}`
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expanded === s.id;
            const q = search.trim();
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border shadow-sm transition-all ${
                  s.status === "new" ? "border-orange-200" : "border-gray-100"
                }`}
              >
                <button
                  className="w-full text-left p-5"
                  onClick={() => handleToggleExpand(s.id, s)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {s.status === "new" && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        )}
                        <span className="font-bold text-gray-900">{highlight(s.name, q)}</span>
                        <a
                          href={`mailto:${s.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-teal-700 hover:underline truncate max-w-[220px]"
                        >
                          {highlight(s.email, q)}
                        </a>
                        {s.org && (
                          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            {highlight(s.org, q)}
                          </span>
                        )}
                        {s.service && (
                          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            {highlight(s.service, q)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {highlight(s.message, q)}
                      </p>
                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                        <span>
                          {new Date(s.createdAt).toLocaleString("fr-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {s.phone && <span>📞 {s.phone}</span>}
                        <span className="uppercase opacity-60">{s.lang}</span>
                        {s.emailSent === 0 && (
                          <span className="text-amber-600">⚠ email non envoyé</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[s.status]}`}
                      >
                        {STATUS_LABELS[s.status]}
                      </span>
                      <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-4 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {highlight(s.message, q)}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4 items-center">
                      <span className="text-xs text-gray-400 mr-1">Marquer comme :</span>
                      {(["new", "read", "archived"] as const)
                        .filter((status) => status !== s.status)
                        .map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(s.id, status)}
                            className="text-xs px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        ))}
                      <a
                        href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.service ? `[CivicAI] ${s.service}` : "[CivicAI] Votre demande de contact")}`}
                        className="ml-auto text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition"
                        onClick={() => s.status === "new" && updateStatus(s.id, "read")}
                      >
                        Répondre par email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Archiver les messages lus ?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Cette action va archiver{" "}
              <span className="font-semibold text-gray-900">{counts.read}</span>{" "}
              message{counts.read !== 1 ? "s" : ""} lu{counts.read !== 1 ? "s" : ""}. Elle ne peut pas être annulée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowArchiveConfirm(false);
                  archiveAllRead();
                }}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {showMarkReadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Marquer tous les messages comme lus ?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Cette action va marquer{" "}
              <span className="font-semibold text-gray-900">{counts.new}</span>{" "}
              message{counts.new !== 1 ? "s" : ""} comme lu{counts.new !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMarkReadConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowMarkReadConfirm(false);
                  markAllAsRead();
                }}
                className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

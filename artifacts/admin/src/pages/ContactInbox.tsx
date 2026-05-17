import { useEffect, useState } from "react";

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

export default function ContactInbox({ adminKey }: { adminKey: string }) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ContactSubmission["status"]>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

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
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    }
  }

  function handleToggleExpand(id: number, submission: ContactSubmission) {
    const isOpening = expanded !== id;
    setExpanded(isOpening ? id : null);
    if (isOpening && submission.status === "new") {
      updateStatus(id, "read");
    }
  }

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.status === filter);
  const counts = {
    new: submissions.filter((s) => s.status === "new").length,
    read: submissions.filter((s) => s.status === "read").length,
    archived: submissions.filter((s) => s.status === "archived").length,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boîte de réception — Contact</h1>
          <p className="text-sm text-gray-500 mt-1">
            {submissions.length} message{submissions.length !== 1 ? "s" : ""} au total
            {counts.new > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {counts.new} nouveau{counts.new !== 1 ? "x" : ""}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
        >
          Rafraîchir
        </button>
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
          Aucun message {filter !== "all" ? `« ${STATUS_LABELS[filter as ContactSubmission["status"]]} »` : ""}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expanded === s.id;
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
                        <span className="font-bold text-gray-900">{s.name}</span>
                        <a
                          href={`mailto:${s.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-teal-700 hover:underline truncate max-w-[220px]"
                        >
                          {s.email}
                        </a>
                        {s.org && (
                          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            {s.org}
                          </span>
                        )}
                        {s.service && (
                          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            {s.service}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {s.message}
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
                      {s.message}
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
    </div>
  );
}

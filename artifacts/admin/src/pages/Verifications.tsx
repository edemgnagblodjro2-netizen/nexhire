import { useEffect, useState } from "react";
import {
  adminApproveVerification,
  adminListVerifications,
  adminRejectVerification,
  type Organisation,
  type VerificationRequest,
} from "@/lib/orgApi";

type Row = { request: VerificationRequest; org: Organisation | null };

const STATUS_TABS = [
  { key: "pending", label: "En attente", color: "bg-blue-100 text-blue-700" },
  { key: "auto_approved", label: "Auto-approuvées", color: "bg-emerald-100 text-emerald-700" },
  { key: "approved", label: "Approuvées", color: "bg-emerald-100 text-emerald-700" },
  { key: "rejected", label: "Refusées", color: "bg-red-100 text-red-700" },
] as const;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-CA", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Verifications({ adminKey }: { adminKey: string }) {
  const [tab, setTab] = useState<typeof STATUS_TABS[number]["key"]>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListVerifications(adminKey, tab);
      setRows(data.requests);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [tab]);

  async function handleApprove(id: string) {
    if (!confirm("Approuver cette demande et activer le badge Vérifié ?")) return;
    setActionId(id);
    try {
      await adminApproveVerification(adminKey, id);
      await reload();
    } catch (err: any) {
      alert(err.message || "Erreur approbation.");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Motif de refus (visible par l'organisme) :");
    if (!reason || !reason.trim()) return;
    setActionId(id);
    try {
      await adminRejectVerification(adminKey, id, reason.trim());
      await reload();
    } catch (err: any) {
      alert(err.message || "Erreur refus.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vérifications d'organismes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Modérez les demandes de badge « Vérifié » envoyées par les organismes payants.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
              tab === t.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400">Chargement…</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
          Aucune demande dans cette catégorie.
        </div>
      )}

      <div className="space-y-4">
        {rows.map(({ request: r, org }) => {
          let auto: { passed: boolean; reason: string; details?: any } | null = null;
          try { auto = r.autoCheckResult ? JSON.parse(r.autoCheckResult) : null; } catch { /* ignore */ }
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{r.legalName}</h3>
                  <p className="text-sm text-gray-500">
                    Organisme : {org?.name || "—"} · Soumis le {formatDate(r.createdAt)}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  r.status === "approved" || r.status === "auto_approved" ? "bg-emerald-100 text-emerald-700" :
                  r.status === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {r.status === "auto_approved" ? "Auto-approuvée" :
                   r.status === "approved" ? "Approuvée" :
                   r.status === "rejected" ? "Refusée" : "En attente"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row k="NEQ" v={<span className="font-mono">{r.neq}</span>} />
                <Row k="N° ARC" v={<span className="font-mono">{r.arcCharityNumber || "—"}</span>} />
                <Row k="Année de fondation" v={r.foundedYear} />
                <Row k="Téléphone" v={r.contactPhone} />
                <Row k="Site web" v={r.website ? (
                  <a href={r.website} target="_blank" rel="noreferrer" className="text-blue-600 underline">{r.website}</a>
                ) : "—"} />
                <Row k="Email organisme" v={org?.email || "—"} />
              </div>

              <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                <strong className="text-gray-700">Mission :</strong>
                <p className="text-gray-600 mt-1">{r.mission}</p>
              </div>

              {auto && (
                <div className={`mt-3 p-3 rounded-lg text-sm border ${
                  auto.passed ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <strong>Vérifications auto :</strong> {auto.reason}
                </div>
              )}

              {r.status === "rejected" && r.rejectionReason && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <strong>Motif de refus :</strong> {r.rejectionReason}
                </div>
              )}

              {r.status === "pending" && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={actionId === r.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm"
                  >
                    ✓ Approuver
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    disabled={actionId === r.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm"
                  >
                    ✗ Refuser
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{k}</div>
      <div className="text-gray-900">{v}</div>
    </div>
  );
}

import { useEffect, useState } from "react";

// v1.1.9 — File d'attente des corrections géolocalisation proposées
// par les usagers depuis l'écran "Position fausse" de l'app mobile.
// Auto-approbation côté API quand 3 corrections concordantes pour un
// même service ; tout le reste passe par cette page.

type Service = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geocodePrecisionM: number | null;
  verifiedAt: string | null;
};

type Correction = {
  id: number;
  serviceId: string;
  proposedAddress: string | null;
  proposedCity: string | null;
  proposedLat: number | null;
  proposedLng: number | null;
  note: string | null;
  status: string;
  appVersion: string | null;
  createdAt: string;
};

type Row = { correction: Correction; service: Service | null };

type StatusFilter = "pending" | "approved" | "auto_approved" | "rejected";

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: "En attente",
  approved: "Approuvées",
  auto_approved: "Auto-approuvées",
  rejected: "Refusées",
};

export default function Corrections({ adminKey }: { adminKey: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/service-corrections?status=${status}&limit=200`, {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.corrections ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, status]);

  async function act(id: number, kind: "approve" | "reject") {
    if (kind === "reject" && !confirm("Refuser cette correction ?")) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/service-corrections/${id}/${kind}`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setRows((prev) => prev.filter((r) => r.correction.id !== id));
    } catch (err) {
      alert(`Échec : ${(err as Error).message}`);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Corrections géolocalisation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Propositions envoyées par les usagers depuis le bouton « Position fausse » de l'app mobile.
          Les corrections concordantes (3+) sont approuvées automatiquement.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
              status === s
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:border-gray-300"
        >
          Rafraîchir
        </button>
      </div>

      {loading && <p className="text-gray-500">Chargement…</p>}
      {error && <p className="text-red-600">Erreur : {error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-gray-500 italic">Aucune correction « {STATUS_LABELS[status].toLowerCase()} ».</p>
      )}

      <div className="space-y-3">
        {rows.map(({ correction: c, service: s }) => (
          <div
            key={c.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Service</p>
                <p className="font-semibold text-gray-900">
                  {s?.name ?? c.serviceId}{" "}
                  <span className="text-gray-400 font-normal">— {s?.city ?? "?"}</span>
                </p>
                {s?.address && (
                  <p className="text-sm text-gray-600 mt-0.5">Actuel : {s.address}</p>
                )}
                {s?.lat != null && s?.lng != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Coords actuelles : {s.lat.toFixed(5)}, {s.lng.toFixed(5)}{" "}
                    {s.geocodePrecisionM != null && `· précision ~${s.geocodePrecisionM} m`}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleString("fr-CA")}
                </p>
                {c.appVersion && (
                  <p className="text-xs text-gray-400 mt-0.5">{c.appVersion}</p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Correction proposée
              </p>
              {c.proposedAddress && (
                <p className="text-sm text-gray-800">📍 {c.proposedAddress}</p>
              )}
              {c.proposedCity && (
                <p className="text-sm text-gray-700">🏙 Ville : {c.proposedCity}</p>
              )}
              {c.proposedLat != null && c.proposedLng != null && (
                <p className="text-sm text-gray-700">
                  🛰 GPS : {c.proposedLat.toFixed(5)}, {c.proposedLng.toFixed(5)}{" "}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.proposedLat},${c.proposedLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 underline"
                  >
                    voir sur la carte
                  </a>
                </p>
              )}
              {c.note && (
                <p className="text-sm text-gray-700 italic">💬 « {c.note} »</p>
              )}
            </div>

            {status === "pending" && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => act(c.id, "reject")}
                  disabled={acting === c.id}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Refuser
                </button>
                <button
                  onClick={() => act(c.id, "approve")}
                  disabled={acting === c.id}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  ✓ Approuver et appliquer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

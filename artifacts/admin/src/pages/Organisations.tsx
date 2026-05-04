import { useEffect, useMemo, useState } from "react";
import {
  adminListOrganisations,
  adminToggleOrgBadge,
  type AdminOrgRow,
} from "@/lib/orgApi";

const KIND_TABS = [
  { key: "all", label: "Tous" },
  { key: "organisme", label: "Organismes" },
  { key: "partenaire", label: "Partenaires" },
] as const;

type KindKey = typeof KIND_TABS[number]["key"];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {}
  return null;
}

export default function Organisations({ adminKey }: { adminKey: string }) {
  const [tab, setTab] = useState<KindKey>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminOrgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListOrganisations(adminKey, tab, search);
      setRows(data);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleToggleBadge(row: AdminOrgRow) {
    const next = !row.org.badgeVerified;
    const verb = next ? "ACTIVER" : "RETIRER";
    if (
      !confirm(
        `${verb} le badge ✓ pour « ${row.org.name} » ?\n\n` +
          (next
            ? "L'organisme apparaîtra avec un badge « Vérifié ✓ » dans les résultats de recherche, sera mis en avant et bénéficiera des privilèges associés."
            : "Le badge sera retiré immédiatement. Les privilèges visuels ne seront plus affichés."),
      )
    )
      return;
    setActionId(row.org.id);
    try {
      const updated = await adminToggleOrgBadge(adminKey, row.org.id, next);
      setRows((prev) =>
        prev.map((r) =>
          r.org.id === row.org.id
            ? { ...r, org: { ...r.org, badgeVerified: updated.badgeVerified } }
            : r,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour du badge.");
    } finally {
      setActionId(null);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.org.name ?? ""} ${r.org.email ?? ""} ${r.user?.email ?? ""} ${r.org.city ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const verified = filteredRows.filter((r) => r.org.badgeVerified).length;
    return { total, verified, unverified: total - verified };
  }, [filteredRows]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organismes & Partenaires</h1>
        <p className="text-gray-500 text-sm mt-1">
          Liste des inscriptions Organisme et Partenaire. Activez le badge ✓ après
          avoir échangé par courriel et vérifié l'authenticité du compte.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
        {KIND_TABS.map((t) => (
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

      {/* Search + stats */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, courriel, ville...)"
          className="flex-1 min-w-[260px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={reload}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
        >
          🔄 Actualiser
        </button>
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{stats.total}</span> au total ·{" "}
          <span className="text-emerald-700">{stats.verified} vérifié{stats.verified > 1 ? "s" : ""}</span> ·{" "}
          <span className="text-gray-500">{stats.unverified} en attente</span>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400">Chargement…</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!loading && filteredRows.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
          Aucune inscription dans cette catégorie.
        </div>
      )}

      <div className="space-y-3">
        {filteredRows.map((row) => {
          const r = row.org;
          const u = row.user;
          const verified = !!r.badgeVerified;
          const kindLabel =
            r.kind === "partenaire" ? "Partenaire" : r.kind === "intervenant" ? "Intervenant" : "Organisme";
          const kindColor =
            r.kind === "partenaire"
              ? "bg-purple-100 text-purple-700"
              : r.kind === "intervenant"
              ? "bg-amber-100 text-amber-700"
              : "bg-teal-100 text-teal-700";
          const websiteSafe = safeUrl(r.website);
          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{r.name}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${kindColor}`}>
                      {kindLabel}
                    </span>
                    {verified && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                        ✓ Badge vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Inscrit le {formatDate(u?.createdAt ?? r.createdAt)}
                    {r.city ? ` · ${r.city}` : ""}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleBadge(row)}
                  disabled={actionId === r.id}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                    verified
                      ? "bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {actionId === r.id
                    ? "..."
                    : verified
                    ? "✗ Retirer le badge"
                    : "✓ Activer le badge"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field
                  k="Contact"
                  v={
                    <span>
                      {u?.firstName || u?.lastName
                        ? `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim()
                        : "—"}
                    </span>
                  }
                />
                <Field
                  k="Courriel compte"
                  v={
                    u?.email ? (
                      <a href={`mailto:${u.email}`} className="text-blue-600 underline">
                        {u.email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field
                  k="Courriel organisme"
                  v={
                    r.email ? (
                      <a href={`mailto:${r.email}`} className="text-blue-600 underline">
                        {r.email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field k="Téléphone" v={r.phone || "—"} />
                <Field
                  k="Site web"
                  v={
                    websiteSafe ? (
                      <a
                        href={websiteSafe}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline truncate inline-block max-w-full align-bottom"
                      >
                        {websiteSafe}
                      </a>
                    ) : r.website ? (
                      <span className="text-gray-600 font-mono text-xs">{r.website}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field k="ID organisme" v={<span className="font-mono text-xs text-gray-500">{r.id.slice(0, 8)}…</span>} />
              </div>

              {r.description && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                  {r.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{k}</div>
      <div className="text-gray-900 truncate">{v}</div>
    </div>
  );
}

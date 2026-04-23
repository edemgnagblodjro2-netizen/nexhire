import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchServices, fetchMeta, deleteService, toggleService, verifyService } from "@/lib/api";
import type { Service, QualityFilter } from "@/lib/api";
import ServiceModal from "@/components/ServiceModal";

const PAGE_SIZE = 25;

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; activeBg: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", activeBg: "bg-emerald-600 text-white" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   activeBg: "bg-amber-600 text-white" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200",  activeBg: "bg-orange-600 text-white" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200",    activeBg: "bg-rose-600 text-white" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     activeBg: "bg-red-600 text-white" },
};

function QualityChip({
  label, value, total, color, active, onClick,
}: {
  label: string; value: number; total: number; color: string; active: boolean; onClick: () => void;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.amber;
  const pct = total > 0 ? Math.round((Number(value) / Number(total)) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2 rounded-xl border border-transparent transition shadow-sm ${
        active ? c.activeBg : `${c.bg} ${c.text} hover:ring-2 hover:${c.ring}`
      }`}
    >
      <div className={`text-xs font-medium ${active ? "opacity-80" : "opacity-70"}`}>{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <div className="text-lg font-bold leading-none">{Number(value).toLocaleString("fr-CA")}</div>
        <div className={`text-[10px] ${active ? "opacity-70" : "opacity-60"}`}>{pct}%</div>
      </div>
    </button>
  );
}

export default function Services({ adminKey }: { adminKey: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [quality, setQuality] = useState<QualityFilter>("");
  const [editService, setEditService] = useState<Service | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["services", adminKey, page, debouncedSearch, city, category, activeFilter, quality],
    queryFn: () =>
      fetchServices(adminKey, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        city: city || undefined,
        category: category || undefined,
        active: activeFilter || undefined,
        quality: quality || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: meta } = useQuery({
    queryKey: ["meta", adminKey],
    queryFn: () => fetchMeta(adminKey),
    staleTime: 5 * 60_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["services"] });
    qc.invalidateQueries({ queryKey: ["meta"] });
  }

  async function handleToggle(svc: Service) {
    try {
      await toggleService(adminKey, svc.id, !svc.active);
      invalidate();
    } catch {}
  }

  async function handleDelete(svc: Service) {
    setDeleting(svc.id);
    try {
      await deleteService(adminKey, svc.id, true);
      invalidate();
    } catch {}
    setDeleting(null);
    setConfirmDelete(null);
  }

  async function handleVerify(svc: Service) {
    setVerifying(svc.id);
    try {
      await verifyService(adminKey, svc.id, !svc.verifiedAt);
      invalidate();
    } catch {}
    setVerifying(null);
  }

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total > 0 ? `${total.toLocaleString("fr-CA")} services` : "Chargement…"}
            {quality && <span className="ml-2 text-amber-600">· filtre: {quality}</span>}
          </p>
        </div>
        <button
          onClick={() => setEditService(null)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
        >
          <span>＋</span> Nouveau service
        </button>
      </div>

      {/* ── Data quality dashboard ── */}
      {meta?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          <QualityChip
            label="Vérifiés"
            value={meta.stats.verified}
            total={meta.stats.active}
            color="emerald"
            active={quality === "verified"}
            onClick={() => { setQuality(quality === "verified" ? "" : "verified"); setPage(1); }}
          />
          <QualityChip
            label="Non vérifiés"
            value={meta.stats.unverified}
            total={meta.stats.active}
            color="amber"
            active={quality === "unverified"}
            onClick={() => { setQuality(quality === "unverified" ? "" : "unverified"); setPage(1); }}
          />
          <QualityChip
            label="Périmés (>6 mois)"
            value={meta.stats.stale}
            total={meta.stats.active}
            color="orange"
            active={quality === "stale"}
            onClick={() => { setQuality(quality === "stale" ? "" : "stale"); setPage(1); }}
          />
          <QualityChip
            label="Sans GPS"
            value={meta.stats.missingGps}
            total={meta.stats.active}
            color="rose"
            active={quality === "missing-gps"}
            onClick={() => { setQuality(quality === "missing-gps" ? "" : "missing-gps"); setPage(1); }}
          />
          <QualityChip
            label="Sans adresse"
            value={meta.stats.missingAddress}
            total={meta.stats.active}
            color="rose"
            active={quality === "missing-address"}
            onClick={() => { setQuality(quality === "missing-address" ? "" : "missing-address"); setPage(1); }}
          />
          <QualityChip
            label="Sans téléphone"
            value={meta.stats.missingPhone}
            total={meta.stats.active}
            color="rose"
            active={quality === "missing-phone"}
            onClick={() => { setQuality(quality === "missing-phone" ? "" : "missing-phone"); setPage(1); }}
          />
          <QualityChip
            label="Tél. suspect"
            value={meta.stats.suspectPhone}
            total={meta.stats.active}
            color="red"
            active={quality === "suspect-phone"}
            onClick={() => { setQuality(quality === "suspect-phone" ? "" : "suspect-phone"); setPage(1); }}
          />
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
        <div className="p-4 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un service…"
            className="input flex-1 min-w-48"
          />
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="input w-44"
          >
            <option value="">Toutes les villes</option>
            {meta?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="input w-44"
          >
            <option value="">Toutes catégories</option>
            {meta?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value as any); setPage(1); }}
            className="input w-36"
          >
            <option value="">Tous statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          Erreur de chargement.
        </div>
      )}

      {!isLoading && data && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Ville</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Téléphone</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Qualité</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Vérifié</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Actif</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((svc, i) => (
                  <tr
                    key={svc.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${
                      i % 2 === 0 ? "" : "bg-gray-50/20"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">{svc.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{svc.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                        {svc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{svc.city || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{svc.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {svc.isUrgent && <span title="Urgent" className="text-red-500 text-xs">🚨</span>}
                        {(!svc.address || svc.address.trim() === "") && (
                          <span title="Sans adresse" className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">ADR</span>
                        )}
                        {(svc.lat == null || svc.lng == null) && (
                          <span title="Sans GPS" className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">GPS</span>
                        )}
                        {!svc.phone && (
                          <span title="Sans téléphone" className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">TÉL</span>
                        )}
                        {svc.phone && /(-5555|-5558|-0555|555-555)/.test(svc.phone) && (
                          <span title="Téléphone suspect" className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-semibold">⚠ TÉL</span>
                        )}
                        {svc.address && svc.lat != null && svc.phone && !/(-5555|-5558|-0555|555-555)/.test(svc.phone) && !svc.isUrgent && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleVerify(svc)}
                        disabled={verifying === svc.id}
                        title={
                          svc.verifiedAt
                            ? `Vérifié le ${new Date(svc.verifiedAt).toLocaleDateString("fr-CA")}${svc.verifiedBy ? ` par ${svc.verifiedBy}` : ""} — cliquer pour annuler`
                            : "Marquer comme vérifié"
                        }
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition disabled:opacity-50 ${
                          svc.verifiedAt
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                        }`}
                      >
                        {svc.verifiedAt
                          ? `✓ ${new Date(svc.verifiedAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "2-digit" })}`
                          : "Marquer ✓"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(svc)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          svc.active ? "bg-teal-500" : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            svc.active ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditService(svc)}
                          className="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirmDelete(svc)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      Aucun service trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Page {page} sur {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  ← Préc.
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Suiv. →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editService !== undefined && (
        <ServiceModal
          adminKey={adminKey}
          service={editService}
          onClose={() => setEditService(undefined)}
          onSaved={() => {
            setEditService(undefined);
            invalidate();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-6">
              Voulez-vous vraiment supprimer{" "}
              <strong>{confirmDelete.name}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Annuler
              </button>
              <button
                disabled={deleting === confirmDelete.id}
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {deleting === confirmDelete.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

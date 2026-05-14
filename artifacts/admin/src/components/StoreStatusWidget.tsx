import { useQuery } from "@tanstack/react-query";
import { fetchStoreStatus, type StoreVersion } from "@/lib/api";

type Props = { adminKey: string };

const SEVERITY_STYLES: Record<
  StoreVersion["stateSeverity"],
  { badge: string; dot: string; card: string }
> = {
  live: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    card: "border-emerald-100",
  },
  review: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-400 animate-pulse",
    card: "border-amber-100",
  },
  pending: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-400",
    card: "border-blue-100",
  },
  rejected: {
    badge: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    card: "border-red-100",
  },
  unknown: {
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    card: "border-gray-100",
  },
};

function VersionBadge({ v }: { v: StoreVersion }) {
  const s = SEVERITY_STYLES[v.stateSeverity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {v.stateLabel}
    </span>
  );
}

function PlatformCard({
  platform,
  icon,
  live,
  inReview,
  error,
  fetchedAt,
  storeUrl,
  note,
}: {
  platform: string;
  icon: string;
  live: StoreVersion | null;
  inReview?: StoreVersion | null;
  error?: string;
  fetchedAt: string;
  storeUrl?: string;
  note?: string;
}) {
  const fetched = new Date(fetchedAt);
  const timeStr = fetched.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{platform}</span>
        </div>
        <span className="text-xs text-gray-400">màj {timeStr}</span>
      </div>

      {error && !live && !inReview ? (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Impossible de récupérer le statut — {error}
        </div>
      ) : (
        <div className="space-y-3">
          {live && (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Version en ligne</p>
                <p className="text-base font-bold text-gray-900">v{live.version}</p>
              </div>
              <VersionBadge v={live} />
            </div>
          )}

          {inReview && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Version en cours</p>
                <p className="text-base font-bold text-gray-900">v{inReview.version}</p>
              </div>
              <VersionBadge v={inReview} />
            </div>
          )}

          {!live && !inReview && !error && (
            <p className="text-xs text-gray-400 italic">Aucune version trouvée</p>
          )}
        </div>
      )}

      {note && (
        <p className="text-xs text-gray-400 italic border-t border-dashed border-gray-100 pt-2">{note}</p>
      )}

      {storeUrl && (
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs text-teal-600 hover:text-teal-700 hover:underline mt-auto self-start"
        >
          Voir Play Console ↗
        </a>
      )}
    </div>
  );
}

export default function StoreStatusWidget({ adminKey }: Props) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["store-status", adminKey],
    queryFn: () => fetchStoreStatus(adminKey),
    staleTime: 4 * 60 * 1000, // 4 min — server cache is 5 min
    refetchOnWindowFocus: false,
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Statut des stores</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-gray-400 hover:text-teal-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rafraîchir"
        >
          {isFetching ? "Chargement…" : "↻ Rafraîchir"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-4 text-sm text-gray-400">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Récupération des statuts stores…
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          Erreur lors du chargement des statuts stores. Vérifiez les secrets ASC.
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlatformCard
            platform="App Store (iOS)"
            icon=""
            live={data.ios.live}
            inReview={data.ios.inReview}
            error={data.ios.error}
            fetchedAt={data.ios.fetchedAt}
          />
          <PlatformCard
            platform="Google Play (Android)"
            icon="🤖"
            live={data.android.live}
            error={data.android.error}
            fetchedAt={data.android.fetchedAt}
            storeUrl="https://play.google.com/console"
            note="Version live uniquement — le statut de review Android est disponible dans Play Console."
          />
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Page admin "En direct"
//
// Affiche en temps réel (rafraîchissement auto toutes les 10 s) :
//   - le nombre d'utilisateurs actifs (dernier ping < 2 min),
//   - une carte avec les positions (si l'utilisateur a accepté la géoloc),
//   - un tableau détaillé : qui, où, sur quel écran, version de l'app, etc.,
//   - les 5 derniers événements de chaque session pour suivre le parcours,
//   - un bouton "Envoyer une notification" pour pousser un message ciblé
//     (par exemple pour proposer le premium à un utilisateur engagé).
// ─────────────────────────────────────────────────────────────────────────────

interface RecentEvent {
  at: string;
  type: string;
  screen: string | null;
}

interface LiveSession {
  sessionId: string;
  userId: string | null;
  userLabel: string | null;
  userEmail: string | null;
  userIsPremium: boolean;
  startedAt: string;
  lastSeenAt: string;
  secondsAgo: number;
  currentScreen: string | null;
  province: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  appVersion: string | null;
  platform: string | null;
  deviceModel: string | null;
  recentEvents: RecentEvent[];
}

interface LiveResponse {
  windowSeconds: number;
  generatedAt: string;
  total: number;
  sessions: LiveSession[];
}

const REFRESH_MS = 10_000;

function timeAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function fmtScreen(s: string | null): string {
  if (!s) return "—";
  return s.replace(/^\//, "") || "accueil";
}

export default function Live({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LiveSession | null>(null);

  // Form d'envoi de notif
  const [notifTitle, setNotifTitle] = useState(
    "🌟 Débloquez plus avec Premium",
  );
  const [notifBody, setNotifBody] = useState(
    "Recherches illimitées, accès hors-ligne et plus encore. Essayez 7 jours gratuits.",
  );
  const [audience, setAudience] = useState<"session" | "user" | "all_free">(
    "session",
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  // Pour les audiences massives : on demande à l'admin de retaper « ENVOYER »
  // dans un champ + un window.confirm avant l'appel réseau.
  const [confirmInput, setConfirmInput] = useState("");
  const isMassAudience = audience === "all_free";

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/live", {
          headers: { "x-admin-key": adminKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LiveResponse;
        if (!stopped) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      } finally {
        if (!stopped) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [adminKey]);

  async function handleSendNotification() {
    if (!selected) return;
    if (isMassAudience) {
      if (confirmInput !== "ENVOYER") {
        setSendResult(
          "❌ Pour cibler tous les non-premium, tape ENVOYER dans le champ de confirmation.",
        );
        return;
      }
      const ok = window.confirm(
        `⚠️ Tu vas envoyer cette notification à TOUS les utilisateurs non-premium. Continuer ?\n\nTitre : ${notifTitle}`,
      );
      if (!ok) {
        setSendResult("Envoi annulé.");
        return;
      }
    }
    setSending(true);
    setSendResult(null);
    try {
      const body: Record<string, unknown> = {
        audience,
        title: notifTitle,
        body: notifBody,
      };
      if (audience === "session") body.sessionId = selected.sessionId;
      if (audience === "user" && selected.userId)
        body.userId = selected.userId;
      if (isMassAudience) body.confirm = "ENVOYER";
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        targeted?: number;
        sent?: number;
        errors?: Array<{ token: string; reason: string }>;
        error?: string;
      };
      if (!res.ok) {
        setSendResult(`❌ ${json.error ?? "Erreur"}`);
      } else {
        const errs =
          json.errors && json.errors.length > 0
            ? ` (${json.errors.length} erreur${json.errors.length > 1 ? "s" : ""})`
            : "";
        setSendResult(
          `✅ Envoyée à ${json.sent ?? 0} appareil${(json.sent ?? 0) > 1 ? "s" : ""} sur ${json.targeted ?? 0} ciblé${(json.targeted ?? 0) > 1 ? "s" : ""}${errs}`,
        );
      }
    } catch (err) {
      setSendResult(`❌ ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  // Carte 100 % locale : on dessine les points sur un SVG schématique du
  // Canada (Loi 25 — aucune coordonnée n'est envoyée à un service externe).
  // Bornes approximatives : lat 41–70, lng -141 à -52.
  function renderMap() {
    const located = (data?.sessions ?? []).filter(
      (s) => s.lat !== null && s.lng !== null,
    );
    // Heatmap par province (toujours visible, pas de PII)
    const byProvince = new Map<string, number>();
    for (const s of data?.sessions ?? []) {
      const k = s.province ?? "?";
      byProvince.set(k, (byProvince.get(k) ?? 0) + 1);
    }
    const provRows = Array.from(byProvince.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const W = 900;
    const H = 360;
    const project = (lat: number, lng: number) => {
      const x = ((lng + 141) / (141 - 52)) * W;
      const y = H - ((lat - 41) / (70 - 41)) * H;
      return { x, y };
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl overflow-hidden border border-gray-100 bg-gradient-to-br from-slate-50 to-slate-100 relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full block"
            role="img"
            aria-label="Répartition des utilisateurs actifs au Canada"
          >
            <rect width={W} height={H} fill="#f8fafc" />
            {/* Grille discrète */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h${i}`}
                x1={0}
                x2={W}
                y1={(H * i) / 4}
                y2={(H * i) / 4}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={`v${i}`}
                y1={0}
                y2={H}
                x1={(W * i) / 5}
                x2={(W * i) / 5}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}
            {located.map((s) => {
              const { x, y } = project(s.lat!, s.lng!);
              return (
                <g key={s.sessionId}>
                  <circle cx={x} cy={y} r={10} fill="#14b8a6" opacity={0.25} />
                  <circle cx={x} cy={y} r={4} fill="#0d9488" />
                </g>
              );
            })}
            <text
              x={W - 8}
              y={H - 8}
              textAnchor="end"
              fontSize={10}
              fill="#94a3b8"
            >
              Carte locale — aucune donnée envoyée à un tiers
            </text>
          </svg>
          <div className="px-4 py-2 text-xs text-gray-500 bg-white border-t border-gray-100">
            {located.length} session{located.length > 1 ? "s" : ""} avec
            position GPS partagée
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Par province
          </h3>
          {provRows.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune donnée</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {provRows.map(([prov, n]) => (
                <li
                  key={prov}
                  className="flex items-center justify-between text-gray-700"
                >
                  <span className="font-medium">{prov}</span>
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🟢 En direct
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Utilisateurs actifs à l'instant T (rafraîchi toutes les 10
            secondes). Fenêtre de présence : {data?.windowSeconds ?? 120}s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {data?.total ?? 0} actif{(data?.total ?? 0) > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          Erreur : {error}
        </div>
      )}

      <div className="mb-6">{renderMap()}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Sessions actives
            </h2>
          </div>
          {(data?.sessions ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Personne en ligne en ce moment.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(data?.sessions ?? []).map((s) => (
                <button
                  key={s.sessionId}
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setSendResult(null);
                    if (!s.userId) setAudience("session");
                  }}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${
                    selected?.sessionId === s.sessionId ? "bg-teal-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">
                          {s.userLabel ?? "Visiteur anonyme"}
                        </span>
                        {s.userIsPremium && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                            PREMIUM
                          </span>
                        )}
                        {!s.userId && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            non connecté
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        Écran : <strong className="text-gray-700">{fmtScreen(s.currentScreen)}</strong>
                        {s.city && ` · ${s.city}`}
                        {s.province && ` (${s.province})`}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {s.platform ?? "?"} · v{s.appVersion ?? "?"}
                        {s.deviceModel && ` · ${s.deviceModel}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700 border border-green-100">
                        actif il y a {timeAgo(s.secondsAgo)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit sticky top-6">
          {!selected ? (
            <div className="text-sm text-gray-400 text-center py-8">
              Sélectionne une session pour voir son parcours et lui envoyer
              une notification.
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Détails de la session
              </h3>
              <dl className="text-xs space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Utilisateur</dt>
                  <dd className="text-gray-900 font-medium text-right truncate ml-3">
                    {selected.userLabel ?? "Anonyme"}
                  </dd>
                </div>
                {selected.userEmail && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Courriel</dt>
                    <dd className="text-gray-900 text-right truncate ml-3">
                      {selected.userEmail}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Écran courant</dt>
                  <dd className="text-gray-900 text-right">
                    {fmtScreen(selected.currentScreen)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Démarré</dt>
                  <dd className="text-gray-900 text-right">
                    {new Date(selected.startedAt).toLocaleTimeString("fr-CA")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Dernier ping</dt>
                  <dd className="text-gray-900 text-right">
                    il y a {timeAgo(selected.secondsAgo)}
                  </dd>
                </div>
                {selected.city && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Lieu</dt>
                    <dd className="text-gray-900 text-right">
                      {selected.city}
                      {selected.province && ` (${selected.province})`}
                    </dd>
                  </div>
                )}
                {selected.lat !== null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">GPS</dt>
                    <dd className="text-gray-900 text-right text-[10px]">
                      {selected.lat?.toFixed(3)}, {selected.lng?.toFixed(3)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Version</dt>
                  <dd className="text-gray-900 text-right">
                    {selected.platform} · v{selected.appVersion ?? "?"}
                  </dd>
                </div>
              </dl>

              {selected.recentEvents.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">
                    Parcours récent
                  </p>
                  <ol className="text-[11px] space-y-1">
                    {selected.recentEvents.map((ev, i) => (
                      <li
                        key={i}
                        className="flex justify-between gap-2 text-gray-600"
                      >
                        <span className="font-mono">
                          {ev.type}
                          {ev.screen && (
                            <span className="text-gray-400">
                              {" "}
                              → {fmtScreen(ev.screen)}
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400 shrink-0">
                          {new Date(ev.at).toLocaleTimeString("fr-CA")}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  📨 Envoyer une notification push
                </p>
                <select
                  value={audience}
                  onChange={(e) =>
                    setAudience(
                      e.target.value as "session" | "user" | "all_free",
                    )
                  }
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2"
                >
                  <option value="session">
                    Cet appareil seulement
                  </option>
                  <option value="user" disabled={!selected.userId}>
                    Tous les appareils de ce compte
                    {!selected.userId && " (non connecté)"}
                  </option>
                  <option value="all_free">
                    Tous les utilisateurs non-premium
                  </option>
                </select>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Titre"
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2"
                />
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Message"
                  rows={3}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2 resize-none"
                />
                {isMassAudience && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[11px] text-amber-800 mb-1.5 font-medium">
                      ⚠️ Envoi massif. Tape <code className="font-mono bg-white px-1 rounded">ENVOYER</code> pour confirmer.
                    </p>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) =>
                        setConfirmInput(e.target.value.toUpperCase())
                      }
                      placeholder="ENVOYER"
                      className="w-full text-xs font-mono border border-amber-300 rounded px-2 py-1.5 uppercase"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={
                    sending ||
                    !notifTitle ||
                    !notifBody ||
                    (isMassAudience && confirmInput !== "ENVOYER")
                  }
                  className={`w-full ${
                    isMassAudience
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-teal-600 hover:bg-teal-700"
                  } disabled:bg-gray-300 text-white text-xs font-medium py-2 rounded-lg transition-colors`}
                >
                  {sending
                    ? "Envoi…"
                    : isMassAudience
                    ? "Envoyer en masse"
                    : "Envoyer maintenant"}
                </button>
                {sendResult && (
                  <p className="text-[11px] mt-2 text-gray-700">
                    {sendResult}
                  </p>
                )}
                {selected.userIsPremium && audience !== "session" && (
                  <p className="text-[10px] mt-2 text-amber-600">
                    ⚠️ Cet utilisateur est déjà premium.
                  </p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

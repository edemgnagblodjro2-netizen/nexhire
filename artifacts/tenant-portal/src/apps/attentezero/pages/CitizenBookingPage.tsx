import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";

const BASE = "/api";

async function getBooking(token: string) {
  const r = await fetch(`${BASE}/queue/booking/${token}`);
  if (!r.ok) throw new Error("not_found");
  return r.json();
}
async function getSiblings(token: string) {
  const r = await fetch(`${BASE}/queue/booking/${token}/siblings`);
  if (!r.ok) return { siblings: [] };
  return r.json();
}
async function doAction(token: string, action: string, body?: unknown) {
  const r = await fetch(`${BASE}/queue/booking/${token}/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? `HTTP ${r.status}`);
  return data;
}
async function getSlots(tenantId: string) {
  const r = await fetch(`${BASE}/queue/public-slots?tenantId=${tenantId}`);
  if (!r.ok) throw new Error("slots_error");
  return r.json();
}

type MainStep = "loading" | "view" | "late_choice" | "reschedule" | "error";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}
function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}

const SC: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  scheduled:   { label: "Confirmé",    color: "#0d9488", bg: "#f0fdf9", icon: "✅" },
  arrived:     { label: "Arrivé",      color: "#7c3aed", bg: "#faf5ff", icon: "🏃" },
  late:        { label: "En retard",   color: "#d97706", bg: "#fffbeb", icon: "⏰" },
  absent:      { label: "Absent",      color: "#dc2626", bg: "#fef2f2", icon: "❌" },
  cancelled:   { label: "Annulé",      color: "#64748b", bg: "#f8fafc", icon: "🚫" },
  completed:   { label: "Terminé",     color: "#059669", bg: "#f0fdf4", icon: "🎉" },
  rescheduled: { label: "Reprogrammé", color: "#2563eb", bg: "#eff6ff", icon: "📅" },
};

const FINAL = ["cancelled", "absent", "completed", "rescheduled"];

// ── Per-sibling action card ────────────────────────────────────────────────
function SiblingCard({
  sib, isActive, onRefresh,
}: {
  sib: any; isActive: boolean; onRefresh: () => void;
}) {
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState("");
  const [msgOk, setMsgOk]   = useState(true);
  const [, setLocation]     = useLocation();

  const cfg = SC[sib.status] ?? SC.scheduled;
  const isFinal = FINAL.includes(sib.status);

  async function act(action: string, body?: unknown) {
    setBusy(true); setMsg("");
    try {
      if (action === "pay-penalty") {
        const d = await doAction(sib.citizenToken, "pay-penalty");
        if (d.checkoutUrl) window.location.href = d.checkoutUrl;
        return;
      }
      await doAction(sib.citizenToken, action, body);
      onRefresh();
      if (action === "arrive")  { setMsgOk(true);  setMsg("Arrivée enregistrée !"); }
      if (action === "cancel")  { setMsgOk(true);  setMsg("Rendez-vous annulé."); }
      if (action === "absent")  { setMsgOk(true);  setMsg("Absence enregistrée."); }
    } catch (e: any) {
      setMsgOk(false);
      if (e.message === "cancellation_limit_reached")
        setMsg("Droit d'annulation déjà utilisé cette semaine.");
      else if (e.message === "invalid_status")
        setMsg("Action non disponible dans l'état actuel.");
      else setMsg("Erreur — réessayez.");
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      border: isActive ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
      borderRadius: 16, padding: "16px 18px", marginBottom: 12,
      background: isActive ? "#f0fdf9" : "#fff",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{sib.serviceName ?? "Service"}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {sib.slotDatetime ? fmtShort(sib.slotDatetime) : "—"}
          </div>
        </div>
        <div style={{
          background: cfg.bg, border: `1.5px solid ${cfg.color}33`,
          borderRadius: 10, padding: "5px 10px",
          fontSize: 11, fontWeight: 700, color: cfg.color,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{
          borderRadius: 8, padding: "8px 12px", marginBottom: 10,
          background: msgOk ? "#f0fdf9" : "#fef2f2",
          border: `1px solid ${msgOk ? "#99f6e4" : "#fecaca"}`,
          color: msgOk ? "#0f766e" : "#dc2626", fontSize: 13,
        }}>{msg}</div>
      )}

      {/* Different token → link to manage page */}
      {!isActive && !isFinal && (
        <button
          style={{ fontSize: 12, color: "#0d9488", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", marginBottom: 8 }}
          onClick={() => setLocation(`/rdv/${sib.citizenToken}`)}
        >
          Gérer ce RDV →
        </button>
      )}

      {/* Actions for active card or for siblings */}
      {!isFinal && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {sib.status === "scheduled" && (
            <>
              <button style={actBtn("#0d9488")} disabled={busy} onClick={() => act("arrive")}>
                🏃 Arrivé(e)
              </button>
              <button style={actBtn("#d97706")} disabled={busy} onClick={() => act("late")}>
                ⏰ En retard
              </button>
              <button style={actBtn("#dc2626")} disabled={busy} onClick={() => act("absent")}>
                ❌ Absent(e)
              </button>
              {!sib.cancellationUsed && (
                <button
                  style={actBtn("#64748b")}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Annuler le rendez-vous "${sib.serviceName}" ?`)) act("cancel");
                  }}
                >
                  🚫 Annuler
                </button>
              )}
              {sib.cancellationUsed && (
                <span style={{ fontSize: 11, color: "#94a3b8", alignSelf: "center" }}>
                  Annulation utilisée
                </span>
              )}
            </>
          )}
          {sib.status === "late" && (
            <>
              {!sib.penaltyPaidAt && (
                <button style={actBtn("#d97706")} disabled={busy} onClick={() => act("pay-penalty")}>
                  💳 Payer pénalité
                </button>
              )}
              <button
                style={actBtn("#2563eb")}
                disabled={busy}
                onClick={() => setLocation(`/rdv/${sib.citizenToken}`)}
              >
                📅 Reprogrammer
              </button>
            </>
          )}
          {sib.status === "arrived" && (
            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
              🎯 En attente d'être appelé(e)
            </span>
          )}
        </div>
      )}

      {isFinal && (
        <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
          {sib.status === "cancelled" && "Ce rendez-vous a été annulé."}
          {sib.status === "completed" && "Rendez-vous terminé. Merci !"}
          {sib.status === "absent" && "Absence enregistrée."}
          {sib.status === "rescheduled" && "Reprogrammé vers un autre créneau."}
        </div>
      )}
    </div>
  );
}

function actBtn(bg: string): React.CSSProperties {
  return {
    padding: "8px 14px", background: bg, color: "#fff",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", flexShrink: 0,
  };
}

// ── Main component ─────────────────────────────────────────────────────────
export function CitizenBookingPage() {
  const [, params]  = useRoute("/rdv/:token");
  const [, setLocation] = useLocation();
  const token       = params?.token ?? "";

  const [step, setStep]       = useState<MainStep>("loading");
  const [data, setData]       = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [slots, setSlots]     = useState<any[]>([]);
  const [selSlot, setSelSlot] = useState("");
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState("");
  const [msgOk, setMsgOk]     = useState(true);
  const [cancellingAll, setCancelAll] = useState(false);

  const penaltyStatus = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("penalty") : null;

  const load = useCallback(async () => {
    if (!token) { setStep("error"); return; }
    try {
      const [d, sib] = await Promise.all([getBooking(token), getSiblings(token)]);
      setData(d);
      setSiblings(sib.siblings ?? []);
      if (penaltyStatus === "paid" && d.booking.status === "scheduled") {
        setMsg("Pénalité payée — votre rendez-vous est confirmé !"); setMsgOk(true);
      }
      setStep("view");
    } catch { setStep("error"); }
  }, [token, penaltyStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCancelAll() {
    const active = siblings.filter(s => !FINAL.includes(s.status));
    if (active.length === 0) return;
    if (!window.confirm(`Annuler ${active.length} rendez-vous en même temps ? Cette action utilisera votre droit d'annulation.`)) return;
    setCancelAll(true); setMsg(""); 
    let cancelled = 0; let errors: string[] = [];
    for (const sib of active) {
      try {
        await doAction(sib.citizenToken, "cancel");
        cancelled++;
      } catch (e: any) {
        errors.push(e.message === "cancellation_limit_reached"
          ? `${sib.serviceName} : droit d'annulation épuisé`
          : `${sib.serviceName} : erreur`);
      }
    }
    await load();
    if (errors.length === 0) {
      setMsgOk(true); setMsg(`${cancelled} rendez-vous annulé${cancelled > 1 ? "s" : ""}.`);
    } else {
      setMsgOk(false); setMsg(`${cancelled} annulé${cancelled > 1 ? "s" : ""}, ${errors.join(" · ")}`);
    }
    setCancelAll(false);
  }

  async function handleReschedule() {
    if (!selSlot) return;
    setBusy(true); setMsg("");
    try {
      const d = await doAction(token, "reschedule", { newSlotId: selSlot });
      if (d.newToken) setLocation(`/rdv/${d.newToken}`);
    } catch (e: any) {
      setMsgOk(false);
      setMsg(e.message === "slot_not_available" ? "Ce créneau n'est plus disponible." : "Erreur — réessayez.");
    } finally { setBusy(false); }
  }

  async function loadSlotsForReschedule() {
    if (!data?.booking?.tenantId) return;
    try {
      const d = await getSlots(data.booking.tenantId);
      setSlots(d.slots ?? []);
      setStep("reschedule");
    } catch {
      setMsgOk(false); setMsg("Impossible de charger les créneaux.");
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={s.shell}>
        <div style={s.spinner} />
        <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>Chargement…</p>
      </div>
    );
  }

  if (step === "error" || !data) {
    return (
      <div style={s.shell}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: 20 }}>Rendez-vous introuvable</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 280 }}>
          Ce lien est invalide ou a expiré. Vérifiez votre email de confirmation.
        </p>
      </div>
    );
  }

  const { booking, slot, queuePosition } = data;
  const statusCfg = SC[booking.status] ?? SC.scheduled;
  const isFinal   = FINAL.includes(booking.status);

  // Other bookings (not the current token)
  const others = siblings.filter(sib => sib.citizenToken !== token);
  const activeOthers = others.filter(sib => !FINAL.includes(sib.status));
  const totalActive = (!isFinal ? 1 : 0) + activeOthers.length;

  // ── Reschedule ─────────────────────────────────────────────────────────────
  if (step === "reschedule") {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <h1 style={s.title}>Nouveau créneau</h1>
          <p style={s.sub}>{slot?.serviceName ?? "Service"}</p>
        </div>

        <Flash msg={msg} ok={msgOk} />

        <div style={s.card}>
          {slots.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Aucun créneau disponible. Revenez plus tard.
            </p>
          ) : slots.map((sl: any) => (
            <button key={sl.id} style={{ ...s.slotBtn, borderColor: selSlot === sl.id ? "#0d9488" : "#e2e8f0", background: selSlot === sl.id ? "#f0fdf9" : "#fff" }}
              onClick={() => setSelSlot(sl.id)}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtShort(sl.slotDatetime)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {sl.capacity - sl.bookedCount} place{sl.capacity - sl.bookedCount > 1 ? "s" : ""} dispo
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={{ ...s.btnPrimary, opacity: (!selSlot || busy) ? 0.6 : 1 }}
            disabled={!selSlot || busy} onClick={handleReschedule}>
            {busy ? "Reprogrammation…" : "✅ Confirmer ce créneau"}
          </button>
          <button style={s.btnGhost} onClick={() => setStep("late_choice")}>← Retour</button>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Late choice ────────────────────────────────────────────────────────────
  if (step === "late_choice") {
    const penaltyDollars = ((booking.penaltyAmountCents ?? 500) / 100).toFixed(2);
    return (
      <div style={s.page}>
        <div style={{ ...s.header, background: "linear-gradient(135deg,#d97706 0%,#b45309 100%)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
          <h1 style={s.title}>Vous êtes en retard</h1>
          <p style={s.sub}>Choisissez comment procéder</p>
        </div>
        <Flash msg={msg} ok={msgOk} />
        <div style={s.card}>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Votre retard a été signalé. Choisissez une option :
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button style={s.choiceCard}
              onClick={async () => {
                setBusy(true);
                try { const d = await doAction(token, "pay-penalty"); if (d.checkoutUrl) window.location.href = d.checkoutUrl; }
                catch { setMsgOk(false); setMsg("Impossible d'ouvrir le paiement."); }
                finally { setBusy(false); }
              }} disabled={busy}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>💳</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Payer la pénalité</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{penaltyDollars} $ CAD — RDV maintenu</div>
            </button>
            <button style={s.choiceCard} onClick={loadSlotsForReschedule} disabled={busy}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Reprogrammer</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Choisir un autre créneau</div>
            </button>
          </div>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <h1 style={s.title}>Mes rendez-vous</h1>
        <p style={s.sub}>{booking.citizenName}</p>
      </div>

      <Flash msg={msg} ok={msgOk} />

      {/* ── ALL bookings — multi-service cards ───────────────────────────── */}
      <div style={{ padding: "14px 16px 0" }}>
        {/* Current booking first */}
        <SiblingCard
          sib={{ ...siblings.find(s => s.citizenToken === token) ?? {}, citizenToken: token, status: booking.status, serviceName: slot?.serviceName, slotDatetime: slot?.slotDatetime, cancellationUsed: booking.cancellationUsed, penaltyAmountCents: booking.penaltyAmountCents, penaltyPaidAt: booking.penaltyPaidAt }}
          isActive={true}
          onRefresh={load}
        />

        {/* Other services */}
        {others.map(sib => (
          <SiblingCard key={sib.id} sib={sib} isActive={false} onRefresh={load} />
        ))}

        {/* Queue position info (for scheduled current) */}
        {booking.status === "scheduled" && queuePosition && (
          <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 10, margin: "0 0 0 0" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0d9488" }}>#{queuePosition}</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Position dans la file</div>
              <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{slot?.serviceName ?? "Service"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action — Cancel all */}
      {totalActive > 1 && (
        <div style={{ padding: "14px 16px 0" }}>
          <button
            style={{ ...s.btnGhost, borderColor: "#fca5a5", color: "#dc2626" }}
            onClick={handleCancelAll}
            disabled={cancellingAll}
          >
            {cancellingAll ? "Annulation en cours…" : `🚫 Annuler tous mes RDV (${totalActive})`}
          </button>
        </div>
      )}

      {/* Rules */}
      <div style={{ ...s.card, background: "#fffbeb", border: "1px solid #fde68a", margin: "14px 16px 0" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
          <strong>Règles :</strong> Max 2 RDV/semaine · 1 annulation/semaine ·
          En retard = pénalité ou reprogrammation.
        </p>
      </div>

      {/* Late choice quick access */}
      {booking.status === "late" && (
        <div style={{ padding: "14px 16px 0" }}>
          <button style={{ ...s.btnPrimary, background: "#d97706" }} onClick={() => setStep("late_choice")}>
            ⏰ Voir mes options (retard)
          </button>
        </div>
      )}

      <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
    </div>
  );
}

function Flash({ msg, ok }: { msg: string; ok: boolean }) {
  if (!msg) return null;
  return (
    <div style={{
      margin: "12px 16px 0", borderRadius: 12, padding: "12px 16px",
      fontSize: 14, fontWeight: 600, border: "1.5px solid",
      background: ok ? "#f0fdf9" : "#fef2f2",
      borderColor: ok ? "#99f6e4" : "#fecaca",
      color: ok ? "#0f766e" : "#dc2626",
    }}>{msg}</div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 24,
  },
  spinner: {
    width: 40, height: 40, borderRadius: "50%",
    border: "3px solid #e2e8f0", borderTopColor: "#0d9488",
    animation: "spin 0.8s linear infinite",
  },
  page: {
    minHeight: "100dvh", background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    maxWidth: 480, margin: "0 auto", paddingBottom: 48,
  },
  header: {
    background: "linear-gradient(135deg,#0f766e 0%,#0d9488 100%)",
    padding: "40px 24px 32px", textAlign: "center", color: "#fff",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  sub:   { margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  card: {
    background: "#fff", margin: "14px 16px 0", borderRadius: 16,
    padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  slotBtn: {
    display: "block", width: "100%", padding: "14px 16px",
    border: "2px solid", borderRadius: 12, background: "#fff",
    textAlign: "left", cursor: "pointer", marginBottom: 8,
  },
  btnPrimary: {
    display: "block", width: "100%", padding: "14px 20px",
    background: "#0d9488", color: "#fff", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12,
  },
  btnGhost: {
    display: "block", width: "100%", padding: "12px 20px",
    background: "transparent", color: "#64748b", border: "1px solid #e2e8f0",
    borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 10,
  },
  choiceCard: {
    display: "block", width: "100%", padding: "20px 16px",
    border: "2px solid #e2e8f0", borderRadius: 16,
    background: "#fff", textAlign: "center", cursor: "pointer",
  },
  footer: {
    fontSize: 11, color: "#cbd5e1", marginTop: 32,
    textAlign: "center", lineHeight: 1.6,
  },
};

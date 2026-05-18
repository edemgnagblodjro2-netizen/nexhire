import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";

const BASE = "/api";

async function getBooking(token: string) {
  const r = await fetch(`${BASE}/queue/booking/${token}`);
  if (!r.ok) throw new Error("not_found");
  return r.json();
}

async function doAction(token: string, action: string, body?: unknown) {
  const r = await fetch(`${BASE}/queue/booking/${token}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}

function formatShort(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  scheduled:   { label: "Confirmé",     color: "#0d9488", bg: "#f0fdf9", icon: "✅" },
  arrived:     { label: "Arrivé",       color: "#7c3aed", bg: "#faf5ff", icon: "🏃" },
  late:        { label: "En retard",    color: "#d97706", bg: "#fffbeb", icon: "⏰" },
  absent:      { label: "Absent",       color: "#dc2626", bg: "#fef2f2", icon: "❌" },
  cancelled:   { label: "Annulé",       color: "#64748b", bg: "#f8fafc", icon: "🚫" },
  completed:   { label: "Terminé",      color: "#059669", bg: "#f0fdf4", icon: "🎉" },
  rescheduled: { label: "Reprogrammé",  color: "#2563eb", bg: "#eff6ff", icon: "📅" },
};

export function CitizenBookingPage() {
  const [, params] = useRoute("/rdv/:token");
  const [, setLocation] = useLocation();
  const token = params?.token ?? "";

  const [step, setStep]         = useState<MainStep>("loading");
  const [data, setData]         = useState<any>(null);
  const [slots, setSlots]       = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState("");
  const [msgType, setMsgType]   = useState<"ok" | "err">("ok");

  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const penaltyStatus = searchParams.get("penalty");

  const load = useCallback(async () => {
    if (!token) { setStep("error"); return; }
    try {
      const d = await getBooking(token);
      setData(d);
      // If penalty just paid, show success message
      if (penaltyStatus === "paid" && d.booking.status === "scheduled") {
        setMsg("Pénalité payée — votre rendez-vous est confirmé !");
        setMsgType("ok");
      }
      setStep("view");
    } catch {
      setStep("error");
    }
  }, [token, penaltyStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleArrive() {
    setBusy(true); setMsg("");
    try {
      await doAction(token, "arrive");
      await load();
      setMsg("Votre arrivée a été signalée. Merci !");
      setMsgType("ok");
    } catch (e: any) {
      setMsg(e.message === "invalid_status" ? "Action non disponible dans l'état actuel." : "Erreur — réessayez.");
      setMsgType("err");
    } finally { setBusy(false); }
  }

  async function handleLate() {
    setBusy(true); setMsg("");
    try {
      await doAction(token, "late");
      await load();
      setStep("late_choice");
    } catch (e: any) {
      setMsg("Impossible de signaler le retard.");
      setMsgType("err");
    } finally { setBusy(false); }
  }

  async function handleAbsent() {
    setBusy(true); setMsg("");
    try {
      await doAction(token, "absent");
      await load();
      setMsg("Votre absence a été signalée.");
      setMsgType("ok");
    } catch (e: any) {
      setMsg("Impossible de signaler l'absence.");
      setMsgType("err");
    } finally { setBusy(false); }
  }

  async function handleCancel() {
    if (!window.confirm("Confirmer l'annulation ? Vous n'aurez droit qu'à 1 annulation cette semaine.")) return;
    setBusy(true); setMsg("");
    try {
      await doAction(token, "cancel");
      await load();
      setMsg("Rendez-vous annulé. La place est disponible pour d'autres.");
      setMsgType("ok");
    } catch (e: any) {
      if (e.message === "cancellation_limit_reached") {
        setMsg("Vous avez déjà utilisé votre droit d'annulation cette semaine.");
      } else {
        setMsg("Annulation impossible — état du rendez-vous invalide.");
      }
      setMsgType("err");
    } finally { setBusy(false); }
  }

  async function handlePayPenalty() {
    setBusy(true); setMsg("");
    try {
      const d = await doAction(token, "pay-penalty");
      if (d.checkoutUrl) window.location.href = d.checkoutUrl;
    } catch {
      setMsg("Impossible d'ouvrir le paiement. Réessayez.");
      setMsgType("err");
    } finally { setBusy(false); }
  }

  async function loadSlotsForReschedule() {
    if (!data?.booking?.tenantId) return;
    try {
      const d = await getSlots(data.booking.tenantId);
      setSlots(d.slots ?? []);
      setStep("reschedule");
    } catch {
      setMsg("Impossible de charger les créneaux disponibles.");
      setMsgType("err");
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) return;
    setBusy(true); setMsg("");
    try {
      const d = await doAction(token, "reschedule", { newSlotId: selectedSlot });
      if (d.newToken) {
        setLocation(`/rdv/${d.newToken}`);
      }
    } catch (e: any) {
      setMsg(e.message === "slot_not_available" ? "Ce créneau n'est plus disponible." : "Erreur — réessayez.");
      setMsgType("err");
    } finally { setBusy(false); }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={s.shell}>
        <div style={s.spinner} />
        <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>Chargement de votre rendez-vous…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.scheduled;
  const isFinal = ["cancelled", "absent", "completed", "rescheduled"].includes(booking.status);

  // ── Reschedule picker ──────────────────────────────────────────────────────
  if (step === "reschedule") {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <h1 style={s.title}>Choisir un nouveau créneau</h1>
          <p style={s.sub}>Sélectionnez le moment qui vous convient</p>
        </div>

        {msg && <div style={{ ...s.msgBox, background: msgType === "ok" ? "#f0fdf9" : "#fef2f2", borderColor: msgType === "ok" ? "#99f6e4" : "#fecaca", color: msgType === "ok" ? "#0f766e" : "#dc2626" }}>{msg}</div>}

        <div style={s.card}>
          {slots.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Aucun créneau disponible pour le moment. Revenez plus tard.
            </p>
          ) : slots.map((sl: any) => (
            <button
              key={sl.id}
              style={{
                ...s.slotBtn,
                borderColor: selectedSlot === sl.id ? "#0d9488" : "#e2e8f0",
                background: selectedSlot === sl.id ? "#f0fdf9" : "#fff",
                color: selectedSlot === sl.id ? "#0f766e" : "#1e293b",
              }}
              onClick={() => setSelectedSlot(sl.id)}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{formatShort(sl.slotDatetime)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {sl.capacity - sl.bookedCount} place{sl.capacity - sl.bookedCount > 1 ? "s" : ""} disponible{sl.capacity - sl.bookedCount > 1 ? "s" : ""}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button
            style={{ ...s.btnPrimary, opacity: (!selectedSlot || busy) ? 0.6 : 1 }}
            disabled={!selectedSlot || busy}
            onClick={handleReschedule}
          >
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

        {msg && <div style={{ ...s.msgBox, background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>{msg}</div>}

        <div style={s.card}>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Votre retard a été signalé. Vous avez deux options pour conserver votre accès au service :
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button style={s.choiceCard} onClick={handlePayPenalty} disabled={busy}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>💳</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Payer la pénalité</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{penaltyDollars} $ CAD — votre rendez-vous est maintenu</div>
            </button>

            <button style={s.choiceCard} onClick={loadSlotsForReschedule} disabled={busy}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Reprogrammer</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Choisir un autre créneau disponible</div>
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
      {/* Header */}
      <div style={s.header}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <h1 style={s.title}>Mon rendez-vous</h1>
        <p style={s.sub}>
          {booking.citizenName} · {slot?.serviceName ?? "Service"}
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ ...s.msgBox, background: msgType === "ok" ? "#f0fdf9" : "#fef2f2", borderColor: msgType === "ok" ? "#99f6e4" : "#fecaca", color: msgType === "ok" ? "#0f766e" : "#dc2626" }}>
          {msg}
        </div>
      )}

      {/* Status badge */}
      <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 36 }}>{statusCfg.icon}</div>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Statut</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: statusCfg.color, marginTop: 2 }}>{statusCfg.label}</div>
        </div>
        <div style={{ marginLeft: "auto", background: statusCfg.bg, border: `1.5px solid ${statusCfg.color}22`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: statusCfg.color }}>
          {booking.status}
        </div>
      </div>

      {/* Appointment details */}
      <div style={s.card}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>📅 Date & heure</span>
          <span style={s.infoVal}>{slot ? formatDatetime(slot.slotDatetime) : "—"}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>🏢 Service</span>
          <span style={s.infoVal}>{slot?.serviceName ?? "—"}</span>
        </div>
        {booking.status === "scheduled" && (
          <div style={s.infoRow}>
            <span style={s.infoLabel}>🔢 Position</span>
            <span style={{ ...s.infoVal, color: "#0d9488" }}>#{queuePosition} dans la file</span>
          </div>
        )}
        <div style={s.infoRow}>
          <span style={s.infoLabel}>✉️ Email</span>
          <span style={s.infoVal}>{booking.citizenEmail}</span>
        </div>
      </div>

      {/* Rules reminder */}
      <div style={{ ...s.card, background: "#fffbeb", border: "1px solid #fde68a" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
          <strong>Règles :</strong> Maximum 2 rendez-vous par semaine · 1 annulation autorisée par semaine ·
          En cas de retard, vous pouvez payer la pénalité ou reprogrammer.
        </p>
      </div>

      {/* Actions — only if not in a final state */}
      {!isFinal && (
        <div style={{ padding: "0 16px" }}>
          {booking.status === "scheduled" && (
            <>
              <button style={s.btnPrimary} disabled={busy} onClick={handleArrive}>
                {busy ? "…" : "🏃 Je suis arrivé(e)"}
              </button>
              <button style={{ ...s.btnWarning }} disabled={busy} onClick={handleLate}>
                {busy ? "…" : "⏰ Je suis en retard"}
              </button>
              <button style={{ ...s.btnDanger }} disabled={busy} onClick={handleAbsent}>
                {busy ? "…" : "❌ Je ne peux pas venir"}
              </button>
              {!booking.cancellationUsed && (
                <button style={s.btnGhost} disabled={busy} onClick={handleCancel}>
                  🚫 Annuler ce rendez-vous
                </button>
              )}
              {booking.cancellationUsed && (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
                  Droit d'annulation déjà utilisé cette semaine
                </p>
              )}
            </>
          )}

          {booking.status === "late" && (
            <button style={{ ...s.btnPrimary, background: "#d97706" }} disabled={busy} onClick={() => setStep("late_choice")}>
              ⏰ Voir mes options (retard)
            </button>
          )}

          {booking.status === "arrived" && (
            <div style={{ ...s.card, textAlign: "center", background: "#faf5ff" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <p style={{ margin: 0, color: "#7c3aed", fontWeight: 700 }}>
                Votre arrivée est enregistrée. Veuillez patienter — vous serez appelé(e) bientôt.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Final state messages */}
      {booking.status === "cancelled" && (
        <div style={{ ...s.card, textAlign: "center" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Ce rendez-vous a été annulé. La place a été libérée pour d'autres personnes.
          </p>
        </div>
      )}

      {booking.status === "completed" && (
        <div style={{ ...s.card, textAlign: "center", background: "#f0fdf4" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <p style={{ margin: 0, color: "#059669", fontWeight: 700 }}>
            Rendez-vous terminé. Merci de votre visite !
          </p>
        </div>
      )}

      <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: 24,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    borderTopColor: "#0d9488",
    animation: "spin 0.8s linear infinite",
  },
  page: {
    minHeight: "100dvh",
    background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    paddingBottom: 48,
  },
  header: {
    background: "linear-gradient(135deg,#0f766e 0%,#0d9488 100%)",
    padding: "40px 24px 32px",
    textAlign: "center",
    color: "#fff",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  sub: { margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  card: {
    background: "#fff",
    margin: "14px 16px 0",
    borderRadius: 16,
    padding: "18px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  msgBox: {
    margin: "12px 16px 0",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    border: "1.5px solid",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
    gap: 12,
  },
  infoLabel: { fontSize: 13, color: "#64748b", flexShrink: 0 },
  infoVal: { fontSize: 14, fontWeight: 600, color: "#1e293b", textAlign: "right" },
  btnPrimary: {
    display: "block",
    width: "100%",
    padding: "14px 20px",
    background: "#0d9488",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 12,
  },
  btnWarning: {
    display: "block",
    width: "100%",
    padding: "14px 20px",
    background: "#d97706",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 10,
  },
  btnDanger: {
    display: "block",
    width: "100%",
    padding: "14px 20px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 10,
  },
  btnGhost: {
    display: "block",
    width: "100%",
    padding: "12px 20px",
    background: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 10,
  },
  slotBtn: {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    border: "2px solid",
    borderRadius: 12,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
    marginBottom: 8,
  },
  choiceCard: {
    display: "block",
    width: "100%",
    padding: "20px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  footer: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 32,
    textAlign: "center",
  },
};

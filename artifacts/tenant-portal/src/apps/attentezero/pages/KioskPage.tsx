import { useState } from "react";
import { useRoute, useLocation } from "wouter";

const BASE = "/api";

async function lookupBookings(tenantId: string, contact: string) {
  const r = await fetch(`${BASE}/queue/kiosk/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, contact: contact.trim() }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? `HTTP ${r.status}`);
  return data as { bookings: any[]; config: KioskConfig };
}

async function doArrive(citizenToken: string) {
  const r = await fetch(`${BASE}/queue/booking/${citizenToken}/arrive`, {
    method: "POST", headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as any).error); }
  return r.json();
}

async function getLateTicket(citizenToken: string) {
  const r = await fetch(`${BASE}/queue/kiosk/late-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citizenToken }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? `HTTP ${r.status}`);
  return data as { checkoutUrl: string; proposedSlotDatetime: string; canFit: boolean };
}

interface KioskConfig {
  closingTime: string;
  serviceIntervalMin: number;
  lateWalkInFeeCents: number;
  timezone: string;
}

function fmtTime(iso: string, tz = "America/Toronto") {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  }).format(new Date(iso));
}
function fmtFull(iso: string, tz = "America/Toronto") {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  }).format(new Date(iso));
}

const SC: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  scheduled: { label: "Confirmé",   color: "#0d9488", bg: "#f0fdf9", icon: "✅" },
  arrived:   { label: "Arrivé",     color: "#7c3aed", bg: "#faf5ff", icon: "🏃" },
  late:      { label: "En retard",  color: "#d97706", bg: "#fffbeb", icon: "⏰" },
  absent:    { label: "Absent",     color: "#dc2626", bg: "#fef2f2", icon: "❌" },
  cancelled: { label: "Annulé",     color: "#64748b", bg: "#f8fafc", icon: "🚫" },
  completed: { label: "Terminé",    color: "#059669", bg: "#f0fdf4", icon: "🎉" },
};
const FINAL = ["cancelled", "absent", "completed", "rescheduled"];

type Step = "lookup" | "found" | "late_detail" | "arrived" | "no_booking" | "error";

interface FoundBooking { booking: any; slot: any; isLate: boolean; }

export function KioskPage() {
  const [, params]      = useRoute("/kiosk/:tenantId");
  const [, setLocation] = useLocation();
  const tenantId        = params?.tenantId ?? "";

  const [step, setStep]           = useState<Step>("lookup");
  const [contact, setContact]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [found, setFound]         = useState<FoundBooking[]>([]);
  const [config, setConfig]       = useState<KioskConfig | null>(null);
  const [lateBooking, setLateBook] = useState<FoundBooking | null>(null);
  const [lateOffer, setLateOffer] = useState<{ canFit: boolean; proposedSlotDatetime: string; fee: number } | null>(null);
  const [paying, setPaying]       = useState(false);

  async function handleLookup() {
    if (!contact.trim()) { setError("Entrez votre email ou numéro de téléphone."); return; }
    setLoading(true); setError("");
    try {
      const d = await lookupBookings(tenantId, contact);
      setConfig(d.config);
      if (!d.bookings || d.bookings.length === 0) { setStep("no_booking"); return; }

      const now = new Date();
      const enriched: FoundBooking[] = d.bookings.map((b: any) => {
        const slotTime = b.slotDatetime ? new Date(b.slotDatetime) : null;
        const isLate = slotTime ? slotTime < now : false;
        return { booking: b, slot: { slotDatetime: b.slotDatetime, serviceName: b.serviceName }, isLate };
      });
      setFound(enriched);
      setStep("found");
    } catch (e: any) {
      setError("Impossible de trouver votre rendez-vous. Vérifiez votre information.");
    } finally { setLoading(false); }
  }

  async function handleArrive(fb: FoundBooking) {
    setLoading(true); setError("");
    try {
      await doArrive(fb.booking.citizenToken);
      setStep("arrived");
    } catch (e: any) {
      setError(e.message === "invalid_status" ? "Action non disponible pour ce statut." : "Erreur — réessayez.");
    } finally { setLoading(false); }
  }

  async function openLateOptions(fb: FoundBooking) {
    setLateBook(fb); setLoading(true); setError("");
    try {
      const d = await getLateTicket(fb.booking.citizenToken);
      setLateOffer({ canFit: d.canFit, proposedSlotDatetime: d.proposedSlotDatetime, fee: config?.lateWalkInFeeCents ?? 500 });
      setStep("late_detail");
    } catch (e: any) {
      setError("Impossible de vérifier les disponibilités.");
    } finally { setLoading(false); }
  }

  async function handlePayLate() {
    if (!lateBooking) return;
    setPaying(true);
    try {
      const d = await getLateTicket(lateBooking.booking.citizenToken);
      if (d.checkoutUrl) window.location.href = d.checkoutUrl;
    } catch { setError("Paiement indisponible. Réessayez."); }
    finally { setPaying(false); }
  }

  // ── Shared header ─────────────────────────────────────────────────────────
  const Header = ({ title, sub, accent }: { title: string; sub?: string; accent?: string }) => (
    <div style={{
      background: accent ?? "linear-gradient(135deg,#0f766e 0%,#0d9488 100%)",
      padding: "40px 24px 32px", textAlign: "center", color: "#fff",
    }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>
        {accent?.includes("d97706") ? "⏰" : "📋"}
      </div>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{title}</h1>
      {sub && <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{sub}</p>}
    </div>
  );

  // ── Step: Lookup ───────────────────────────────────────────────────────────
  if (step === "lookup") {
    return (
      <div style={s.page}>
        <Header title="Bienvenue !" sub="Présentez votre rendez-vous" />
        <div style={s.card}>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Entrez l'adresse email ou le numéro de téléphone utilisé lors de votre réservation.
          </p>
          <input
            style={s.input}
            type="text"
            placeholder="ex. marie@exemple.com ou 514 000-0000"
            value={contact}
            onChange={e => setContact(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
            autoFocus
          />
          {error && <div style={s.errBox}>{error}</div>}
          <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleLookup} disabled={loading}>
            {loading ? "Recherche…" : "🔍 Trouver mon rendez-vous"}
          </button>
        </div>
        <div style={{ ...s.card, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
            📌 <strong>Rappel :</strong> Arrivez à l'heure pour éviter les pénalités. En cas de retard, des options sont disponibles.
          </p>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Step: No booking ───────────────────────────────────────────────────────
  if (step === "no_booking") {
    return (
      <div style={s.page}>
        <Header title="Aucun rendez-vous" sub="Aucune réservation trouvée pour aujourd'hui" />
        <div style={s.card}>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Nous n'avons trouvé aucun rendez-vous actif pour <strong>{contact}</strong> aujourd'hui.
          </p>
          <button style={s.btnPrimary} onClick={() => setLocation(`/reserver/${tenantId}`)}>
            📅 Prendre un rendez-vous
          </button>
          <button style={s.btnGhost} onClick={() => { setContact(""); setError(""); setStep("lookup"); }}>
            ← Réessayer avec une autre info
          </button>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Step: Found bookings ───────────────────────────────────────────────────
  if (step === "found") {
    return (
      <div style={s.page}>
        <Header title="Vos rendez-vous" sub={`Trouvés pour : ${contact}`} />
        {error && <div style={{ ...s.errBox, margin: "12px 16px 0" }}>{error}</div>}
        <div style={{ padding: "14px 16px 0" }}>
          {found.map((fb) => {
            const cfg = SC[fb.booking.status] ?? SC.scheduled;
            const isFinal = FINAL.includes(fb.booking.status);
            const tz = config?.timezone ?? "America/Toronto";
            return (
              <div key={fb.booking.id} style={{
                background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                border: fb.isLate && !isFinal ? "2px solid #f59e0b" : "1.5px solid #e2e8f0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{fb.slot?.serviceName ?? "Service"}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                      {fb.slot?.slotDatetime ? fmtFull(fb.slot.slotDatetime, tz) : "—"}
                    </div>
                  </div>
                  <div style={{
                    background: cfg.bg, border: `1.5px solid ${cfg.color}33`,
                    borderRadius: 10, padding: "5px 10px",
                    fontSize: 12, fontWeight: 700, color: cfg.color,
                  }}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>

                {/* Actions */}
                {!isFinal && (
                  <>
                    {!fb.isLate && fb.booking.status === "scheduled" && (
                      <button
                        style={{ ...s.btnPrimary, marginTop: 0 }}
                        onClick={() => handleArrive(fb)}
                        disabled={loading}
                      >
                        🏃 Je suis arrivé(e) — confirmer ma présence
                      </button>
                    )}
                    {(fb.isLate || fb.booking.status === "late") && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 14px", marginTop: 4 }}>
                        <div style={{ fontWeight: 700, color: "#92400e", fontSize: 13, marginBottom: 8 }}>
                          ⚠️ Votre créneau est passé — vous êtes en retard
                        </div>
                        <button
                          style={{ ...s.btnPrimary, background: "#d97706", marginTop: 0 }}
                          onClick={() => openLateOptions(fb)}
                          disabled={loading}
                        >
                          {loading ? "Vérification…" : "⏰ Voir mes options"}
                        </button>
                      </div>
                    )}
                    {fb.booking.status === "arrived" && (
                      <div style={{ background: "#faf5ff", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
                        <div style={{ color: "#7c3aed", fontWeight: 700, fontSize: 14 }}>
                          Arrivée enregistrée. Veuillez patienter.
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isFinal && (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                    Ce rendez-vous est terminé / annulé.
                  </div>
                )}
              </div>
            );
          })}

          <button style={s.btnGhost} onClick={() => { setContact(""); setError(""); setStep("lookup"); }}>
            ← Changer d'information
          </button>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Step: Late options ─────────────────────────────────────────────────────
  if (step === "late_detail" && lateBooking && lateOffer) {
    const tz = config?.timezone ?? "America/Toronto";
    const feeDollars = ((lateOffer.fee) / 100).toFixed(2);
    const proposedHHMM = lateOffer.proposedSlotDatetime ? fmtTime(lateOffer.proposedSlotDatetime, tz) : "—";
    return (
      <div style={s.page}>
        <Header
          title="Vous êtes en retard"
          sub={`Service : ${lateBooking.slot?.serviceName ?? "Service"}`}
          accent="linear-gradient(135deg,#d97706 0%,#b45309 100%)"
        />
        <div style={s.card}>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
            Votre créneau de <strong>{lateBooking.slot?.slotDatetime ? fmtTime(lateBooking.slot.slotDatetime, tz) : "—"}</strong> est passé.
            Choisissez une option pour continuer :
          </p>

          {lateOffer.canFit ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Option A: Pay for immediate walk-in slot */}
              <div style={{
                border: "2px solid #0d9488", borderRadius: 16, padding: "20px 18px",
                background: "#f0fdf9",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💳</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f766e" }}>
                  Payer {feeDollars} $ et obtenir un ticket maintenant
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.6 }}>
                  Créneau immédiat assigné à <strong>{proposedHHMM}</strong>
                  {" "}(avant la fermeture à {config?.closingTime ?? "17:00"})
                </div>
                <button
                  style={{ ...s.btnPrimary, marginTop: 14, opacity: paying ? 0.7 : 1 }}
                  onClick={handlePayLate}
                  disabled={paying}
                >
                  {paying ? "Redirection vers le paiement…" : `💳 Payer ${feeDollars} $ → Créneau ${proposedHHMM}`}
                </button>
              </div>

              {/* Option B: Reschedule */}
              <div style={{
                border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "20px 18px",
                background: "#fff",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Reprogrammer gratuitement</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                  Choisissez un nouveau créneau pour une autre journée
                </div>
                <button
                  style={{ ...s.btnGhost, marginTop: 12 }}
                  onClick={() => setLocation(`/reserver/${tenantId}`)}
                >
                  📅 Choisir un autre créneau →
                </button>
              </div>
            </div>
          ) : (
            /* Can't fit before closing — only reschedule */
            <div>
              <div style={{
                background: "#fef2f2", border: "1.5px solid #fecaca",
                borderRadius: 14, padding: "16px 18px", marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 14, marginBottom: 6 }}>
                  🔒 Plus de place disponible aujourd'hui
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  Le service ferme à <strong>{config?.closingTime ?? "17:00"}</strong> et il ne reste pas assez de temps
                  pour vous accueillir. Aucun paiement ne sera demandé.
                </div>
              </div>
              <button style={s.btnPrimary} onClick={() => setLocation(`/reserver/${tenantId}`)}>
                📅 Reprogrammer pour une autre journée
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ ...s.errBox, margin: "12px 16px 0" }}>{error}</div>}

        <button style={{ ...s.btnGhost, margin: "12px 16px 0" }} onClick={() => setStep("found")}>
          ← Retour
        </button>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Step: Arrived ──────────────────────────────────────────────────────────
  if (step === "arrived") {
    return (
      <div style={s.page}>
        <Header title="Arrivée confirmée !" sub="Merci — veuillez patienter" />
        <div style={{ ...s.card, textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d9488", marginBottom: 8 }}>
            Votre présence est enregistrée
          </div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
            Veuillez vous asseoir et attendre d'être appelé(e).
            L'agent vous appellera sous peu.
          </div>
        </div>
        <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh", background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    maxWidth: 480, margin: "0 auto", paddingBottom: 48,
  },
  card: {
    background: "#fff", margin: "14px 16px 0", borderRadius: 16,
    padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  input: {
    display: "block", width: "100%", boxSizing: "border-box",
    padding: "14px 16px", border: "1.5px solid #e2e8f0", borderRadius: 12,
    fontSize: 15, color: "#1e293b", background: "#f8fafc",
    outline: "none", marginBottom: 12,
  },
  errBox: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
    padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 12,
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
  footer: {
    fontSize: 11, color: "#cbd5e1", marginTop: 32,
    textAlign: "center", lineHeight: 1.6,
  },
};

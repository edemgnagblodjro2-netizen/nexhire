import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";

const BASE = "/api";

async function getSlots(tenantId: string) {
  const r = await fetch(`${BASE}/queue/public-slots?tenantId=${tenantId}`);
  if (!r.ok) throw new Error("slots_error");
  return r.json();
}

async function bookSlot(body: {
  tenantId: string; slotId: string;
  citizenName: string; citizenEmail: string; citizenPhone?: string;
}) {
  const r = await fetch(`${BASE}/queue/book`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? `HTTP ${r.status}`);
  return data;
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  }).format(new Date(iso));
}

type Step = "loading" | "service" | "slots" | "form" | "error";

interface Confirmed { token: string; serviceName: string; slotDatetime: string; }

export function BookAppointmentPage() {
  const [, params]    = useRoute("/reserver/:tenantId");
  const [, setLocation] = useLocation();
  const tenantId      = params?.tenantId ?? "";

  const [step, setStep]           = useState<Step>("loading");
  const [allSlots, setAllSlots]   = useState<any[]>([]);
  const [services, setServices]   = useState<string[]>([]);
  const [selService, setSelSvc]   = useState("");
  const [selectedSlot, setSel]    = useState("");
  const [form, setForm]           = useState({ name: "", email: "", phone: "" });
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState("");
  const [confirmed, setConfirmed] = useState<Confirmed[]>([]);

  useEffect(() => {
    if (!tenantId) { setStep("error"); return; }
    getSlots(tenantId)
      .then((d) => {
        const slots = d.slots ?? [];
        setAllSlots(slots);
        const svcs = [...new Set<string>(slots.map((s: any) => s.serviceName as string))];
        setServices(svcs);
        setStep(svcs.length > 1 ? "service" : "slots");
        if (svcs.length === 1) setSelSvc(svcs[0]);
      })
      .catch(() => setStep("error"));
  }, [tenantId]);

  const filteredSlots = selService
    ? allSlots.filter((s) => s.serviceName === selService)
    : allSlots;

  async function handleBook() {
    if (!form.name.trim() || !form.email.trim() || !selectedSlot) {
      setError("Veuillez remplir tous les champs obligatoires."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Adresse email invalide."); return;
    }
    setSub(true); setError("");
    try {
      const d = await bookSlot({
        tenantId, slotId: selectedSlot,
        citizenName: form.name.trim(), citizenEmail: form.email.trim(),
        citizenPhone: form.phone.trim() || undefined,
      });
      const slot = allSlots.find(s => s.id === selectedSlot);
      setConfirmed(prev => [...prev, {
        token: d.token,
        serviceName: slot?.serviceName ?? selService,
        slotDatetime: slot?.slotDatetime ?? "",
      }]);
      // Reset slot/service selection for next booking
      setSel(""); setSelSvc(""); setError("");
      setStep(services.length > 1 ? "service" : "slots");
    } catch (e: any) {
      if (e.message === "slot_full")              setError("Ce créneau vient d'être pris. Choisissez-en un autre.");
      else if (e.message === "weekly_limit_reached") setError("Limite de 2 rendez-vous par semaine atteinte.");
      else if (e.message === "slot_expired")      setError("Ce créneau est passé. Choisissez-en un autre.");
      else setError("Erreur lors de la réservation. Réessayez.");
    } finally { setSub(false); }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={s.shell}>
        <div style={s.spinner} />
        <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>Chargement des créneaux…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div style={s.shell}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: 20 }}>Service introuvable</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 280 }}>
          Ce lien de réservation n'est plus valide.
        </p>
      </div>
    );
  }

  // ── Confirmed bookings summary (always at top when there are some) ──────────
  const ConfirmedBanner = () => confirmed.length === 0 ? null : (
    <div style={{ ...s.card, background: "#f0fdf9", border: "1.5px solid #5eead4", marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 10 }}>
        ✅ {confirmed.length} rendez-vous confirmé{confirmed.length > 1 ? "s" : ""}
      </div>
      {confirmed.map((c) => (
        <div key={c.token} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #ccfbf1" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0d9488" }}>{c.serviceName}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{c.slotDatetime ? fmt(c.slotDatetime) : "—"}</div>
          <button
            style={{ fontSize: 11, color: "#0d9488", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4, textDecoration: "underline" }}
            onClick={() => setLocation(`/rdv/${c.token}`)}
          >
            Gérer ce RDV →
          </button>
        </div>
      ))}
      {confirmed.length > 1 && (
        <button
          style={{ ...s.btnPrimary, fontSize: 13, padding: "10px 16px", marginTop: 4 }}
          onClick={() => setLocation(`/rdv/${confirmed[0].token}`)}
        >
          Voir tous mes rendez-vous →
        </button>
      )}
    </div>
  );

  // ── Service picker ─────────────────────────────────────────────────────────
  if (step === "service") {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
          <h1 style={s.title}>Prendre un rendez-vous</h1>
          <p style={s.sub}>Choisissez un service</p>
        </div>

        <ConfirmedBanner />

        <div style={s.card}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Services disponibles
          </p>
          {services.map((svc) => {
            const count = allSlots.filter(sl => sl.serviceName === svc).length;
            const alreadyBooked = confirmed.some(c => c.serviceName === svc);
            return (
              <button
                key={svc}
                style={{
                  ...s.slotBtn,
                  borderColor: alreadyBooked ? "#5eead4" : "#e2e8f0",
                  background: alreadyBooked ? "#f0fdf9" : "#fafafa",
                  opacity: alreadyBooked ? 0.75 : 1,
                }}
                onClick={() => { setSelSvc(svc); setSel(""); setStep("slots"); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{svc}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      {count} créneau{count > 1 ? "x" : ""} disponible{count > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 18 }}>{alreadyBooked ? "✅" : "→"}</div>
                </div>
              </button>
            );
          })}

          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            📌 Max 2 rendez-vous par semaine toutes services confondus.
          </div>
        </div>

        {confirmed.length > 0 && (
          <div style={{ padding: "12px 16px 0" }}>
            <button style={s.btnGhost} onClick={() => setLocation(`/rdv/${confirmed[0].token}`)}>
              ✅ Terminer et voir mes RDV
            </button>
          </div>
        )}

        <p style={s.footer}>Sans compte · Sans application · 100% gratuit<br />Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Slot selection ─────────────────────────────────────────────────────────
  if (step === "slots") {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <h1 style={s.title}>Choisir un créneau</h1>
          <p style={s.sub}>
            {selService || "Tous les services"}
          </p>
        </div>

        <ConfirmedBanner />

        {/* Service filter dropdown if multiple services */}
        {services.length > 1 && (
          <div style={{ padding: "14px 16px 0" }}>
            <label style={s.label}>Service</label>
            <div style={{ position: "relative" }}>
              <select
                value={selService}
                onChange={e => { setSelSvc(e.target.value); setSel(""); }}
                style={s.select}
              >
                <option value="">Tous les services</option>
                {services.map(svc => <option key={svc} value={svc}>{svc}</option>)}
              </select>
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64748b" }}>▾</div>
            </div>
          </div>
        )}

        <div style={s.card}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            📌 Max <strong>2 RDV/semaine</strong>. Un email de confirmation vous sera envoyé.
          </div>

          {filteredSlots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Aucun créneau disponible pour ce service.<br />Revenez plus tard.
              </p>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {filteredSlots.length} créneau{filteredSlots.length > 1 ? "x" : ""} disponible{filteredSlots.length > 1 ? "s" : ""}
              </p>
              {filteredSlots.map((sl: any) => {
                const available = sl.capacity - sl.bookedCount;
                return (
                  <button
                    key={sl.id}
                    style={{
                      ...s.slotBtn,
                      borderColor: selectedSlot === sl.id ? "#0d9488" : "#e2e8f0",
                      background: selectedSlot === sl.id ? "#f0fdf9" : "#fafafa",
                    }}
                    onClick={() => setSel(sl.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: selectedSlot === sl.id ? "#0f766e" : "#1e293b" }}>
                          {fmt(sl.slotDatetime)}
                        </div>
                        {services.length > 1 && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{sl.serviceName}</div>
                        )}
                      </div>
                      <div style={{
                        background: available <= 2 ? "#fef2f2" : "#f0fdf9",
                        color: available <= 2 ? "#dc2626" : "#059669",
                        border: `1px solid ${available <= 2 ? "#fecaca" : "#bbf7d0"}`,
                        borderRadius: 8, padding: "4px 10px",
                        fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {available} place{available > 1 ? "s" : ""}
                      </div>
                    </div>
                    {selectedSlot === sl.id && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#0d9488", fontWeight: 600 }}>✓ Sélectionné</div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div style={{ padding: "12px 16px 0" }}>
          {selectedSlot && (
            <button style={s.btnPrimary} onClick={() => setStep("form")}>
              Continuer →
            </button>
          )}
          {services.length > 1 && (
            <button style={s.btnGhost} onClick={() => { setSel(""); setStep("service"); }}>
              ← Changer de service
            </button>
          )}
        </div>

        <p style={s.footer}>Sans compte · Sans application · 100% gratuit<br />Propulsé par AttenteZéro — CivicAI</p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const chosenSlot = allSlots.find((sl) => sl.id === selectedSlot);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
        <h1 style={s.title}>Vos coordonnées</h1>
        {chosenSlot && (
          <p style={s.sub}>
            {chosenSlot.serviceName} · {fmt(chosenSlot.slotDatetime)}
          </p>
        )}
      </div>

      <ConfirmedBanner />

      <div style={s.card}>
        <div style={s.field}>
          <label style={s.label}>Prénom et nom <span style={{ color: "#dc2626" }}>*</span></label>
          <input style={s.input} type="text" placeholder="ex. Marie Tremblay"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Email <span style={{ color: "#dc2626" }}>*</span></label>
          <input style={s.input} type="email" placeholder="ex. marie@exemple.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            Le lien de gestion de tous vos RDV sera envoyé à cette adresse
          </p>
        </div>

        <div style={s.field}>
          <label style={s.label}>Téléphone (optionnel)</label>
          <input style={s.input} type="tel" placeholder="ex. 514 000-0000"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button
          style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1 }}
          onClick={handleBook} disabled={submitting}
        >
          {submitting ? "Réservation en cours…" : "✅ Confirmer ce rendez-vous"}
        </button>

        <button style={s.btnGhost} onClick={() => { setStep("slots"); setError(""); }}>
          ← Changer de créneau
        </button>
      </div>

      <div style={{ ...s.card, background: "#fffbeb", border: "1px solid #fde68a" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
          ⚠️ <strong>Règles :</strong> Max 2 RDV/semaine · 1 annulation autorisée · Retard = pénalité ou reprogrammation.
        </p>
      </div>

      <p style={s.footer}>Propulsé par AttenteZéro — CivicAI</p>
    </div>
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
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "#fff" },
  sub: { margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  card: {
    background: "#fff", margin: "14px 16px 0", borderRadius: 16,
    padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  slotBtn: {
    display: "block", width: "100%", padding: "14px 16px",
    border: "2px solid", borderRadius: 12, cursor: "pointer",
    textAlign: "left", marginBottom: 8,
    transition: "border-color 0.15s, background 0.15s",
  },
  field: { marginBottom: 16 },
  label: {
    display: "block", fontSize: 12, fontWeight: 600, color: "#374151",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4,
  },
  input: {
    display: "block", width: "100%", boxSizing: "border-box",
    padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 10,
    fontSize: 15, color: "#1e293b", background: "#f8fafc", outline: "none",
  },
  select: {
    display: "block", width: "100%", boxSizing: "border-box",
    padding: "12px 36px 12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 14, color: "#1e293b", background: "#f8fafc", outline: "none",
    appearance: "none", cursor: "pointer",
  },
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
    padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 12,
  },
  btnPrimary: {
    display: "block", width: "100%", padding: "14px 20px",
    background: "#0d9488", color: "#fff", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4,
  },
  btnGhost: {
    display: "block", width: "100%", padding: "12px 20px",
    background: "transparent", color: "#64748b", border: "1px solid #e2e8f0",
    borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 10,
  },
  footer: {
    fontSize: 11, color: "#cbd5e1", marginTop: 32,
    textAlign: "center", lineHeight: 1.8,
  },
};

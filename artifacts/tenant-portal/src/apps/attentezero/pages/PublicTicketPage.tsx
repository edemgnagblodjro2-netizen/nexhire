import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";

const BASE = "/api";

async function fetchInfo(slug: string) {
  const r = await fetch(`${BASE}/attentezero/public/${slug}/info`);
  if (!r.ok) throw new Error("not_found");
  return r.json();
}

async function createTicket(slug: string, body: { client_name?: string; phone?: string }) {
  const r = await fetch(`${BASE}/attentezero/public/${slug}/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function pollTicket(slug: string, ticketId: string) {
  const r = await fetch(`${BASE}/attentezero/public/${slug}/ticket/${ticketId}`);
  if (!r.ok) throw new Error("poll_error");
  return r.json();
}

type Step = "landing" | "form" | "ticket" | "called" | "served" | "error";

export function PublicTicketPage() {
  const [, params] = useRoute("/apps/attentezero-public/:slug");
  const slug = params?.slug ?? "demo";

  const [step, setStep]               = useState<Step>("landing");
  const [info, setInfo]               = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [form, setForm]               = useState({ name: "", phone: "" });
  const [submitting, setSubmitting]   = useState(false);
  const [ticketData, setTicketData]   = useState<any>(null);
  const [errorMsg, setErrorMsg]       = useState("");

  useEffect(() => {
    fetchInfo(slug)
      .then((d) => { setInfo(d); setLoadingInfo(false); })
      .catch(() => { setStep("error"); setLoadingInfo(false); });
  }, [slug]);

  // Poll ticket status every 8 s
  const poll = useCallback(async () => {
    if (!ticketData?.ticket?.id) return;
    try {
      const d = await pollTicket(slug, ticketData.ticket.id);
      setTicketData(d);
      if (d.ticket.status === "called") setStep("called");
      if (d.ticket.status === "served") setStep("served");
    } catch { /* ignore transient */ }
  }, [slug, ticketData?.ticket?.id]);

  useEffect(() => {
    if (step !== "ticket" && step !== "called") return;
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [step, poll]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const d = await createTicket(slug, {
        client_name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setTicketData(d);
      setStep("ticket");
    } catch (e: any) {
      setErrorMsg("Impossible de créer un ticket. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingInfo) {
    return (
      <div style={styles.shell}>
        <div style={styles.spinner} />
        <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>Chargement…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (step === "error" || !info) {
    return (
      <div style={styles.shell}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: 20 }}>Portail introuvable</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 280 }}>
          Ce lien n'est plus valide ou l'organisation n'est pas disponible.
        </p>
      </div>
    );
  }

  const tenantName: string = info.tenantName ?? slug;
  const totalWaiting: number = info.totalWaiting ?? 0;

  // ── Landing ────────────────────────────────────────────────────────────────
  if (step === "landing") {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <div style={styles.logo}>🏥</div>
          <h1 style={styles.title}>{tenantName}</h1>
          <p style={styles.sub}>Portail citoyen — Prise de ticket</p>
        </div>

        <div style={styles.card}>
          <div style={styles.statRow}>
            <div style={styles.statBox}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>{totalWaiting}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>personnes en attente</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>~{totalWaiting * 4} min</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>attente estimée</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <p style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", fontWeight: 600 }}>
            Prenez un ticket sans file d'attente physique
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            Restez assis ou dehors — vous serez averti quand c'est votre tour sur cet écran.
          </p>
          <button style={styles.btnPrimary} onClick={() => setStep("form")}>
            🎫 Prendre un ticket
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 24, textAlign: "center" }}>
          Sans compte • Sans application • 100% gratuit
        </p>
        <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8, textAlign: "center" }}>
          Propulsé par AttenteZéro — CivicAI
        </p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>{tenantName}</h1>
          <p style={styles.sub}>Informations optionnelles</p>
        </div>

        <div style={styles.card}>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
            Ces informations nous aident à vous retrouver si vous n'êtes plus devant l'écran. Entièrement optionnel.
          </p>

          <div style={styles.field}>
            <label style={styles.label}>Votre prénom (optionnel)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="ex. Marie"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Téléphone (optionnel)</label>
            <input
              style={styles.input}
              type="tel"
              placeholder="ex. 514 000-0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          {errorMsg && (
            <div style={styles.errorBox}>{errorMsg}</div>
          )}

          <button
            style={{ ...styles.btnPrimary, opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Création…" : "✅ Confirmer et obtenir mon ticket"}
          </button>

          <button style={styles.btnGhost} onClick={() => setStep("landing")}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // ── Ticket (waiting) ───────────────────────────────────────────────────────
  if (step === "ticket" && ticketData) {
    const { ticket, position, estimated_wait_min } = ticketData;
    const pct = Math.max(5, Math.min(95, (1 / Math.max(position, 1)) * 100));

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <p style={styles.sub}>{tenantName}</p>
          <h1 style={{ ...styles.title, fontSize: 16, margin: "4px 0 0" }}>Votre ticket</h1>
        </div>

        <div style={{ ...styles.card, textAlign: "center" }}>
          <div style={styles.ticketBig}>{ticket.number}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {ticket.client_name ? `Bonjour ${ticket.client_name} 👋` : "Ticket enregistré"}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Position dans la file</span>
            <span style={styles.infoVal}>#{position}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Attente estimée</span>
            <span style={styles.infoVal}>~{estimated_wait_min} min</span>
          </div>

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>

          <div style={styles.noticeBox}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>📱 Gardez cette page ouverte</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              Cette page se met à jour automatiquement toutes les 8 secondes. Vous serez averti ici quand votre numéro est appelé.
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, textAlign: "center" }}>
          Mise à jour automatique • Ne fermez pas cette page
        </p>
      </div>
    );
  }

  // ── Called ─────────────────────────────────────────────────────────────────
  if (step === "called" && ticketData) {
    const { ticket } = ticketData;
    return (
      <div style={styles.page}>
        <div style={{ ...styles.header, background: "linear-gradient(135deg,#0d9488 0%,#059669 100%)" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔔</div>
          <h1 style={{ ...styles.title, fontSize: 22 }}>C'est votre tour !</h1>
          <p style={styles.sub}>Présentez-vous au guichet maintenant</p>
        </div>

        <div style={{ ...styles.card, textAlign: "center" }}>
          <div style={styles.ticketBig}>{ticket.number}</div>
          {ticket.guichet && (
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: "#0d9488" }}>
              Guichet {ticket.guichet}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
            {ticket.client_name ? `${ticket.client_name} — ` : ""}Présentez-vous immédiatement
          </div>
        </div>

        <div style={{ ...styles.noticeBox, margin: "0 16px" }}>
          <div style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>
            Si vous n'êtes pas disponible, signalez votre absence à l'accueil.
          </div>
        </div>
      </div>
    );
  }

  // ── Served ─────────────────────────────────────────────────────────────────
  if (step === "served") {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.header, background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <h1 style={{ ...styles.title, fontSize: 22 }}>Service terminé</h1>
          <p style={styles.sub}>Merci de votre visite !</p>
        </div>
        <div style={styles.card}>
          <p style={{ margin: 0, textAlign: "center", color: "#475569", fontSize: 14 }}>
            Votre dossier a été traité. Vous pouvez fermer cette page.
          </p>
          <button style={{ ...styles.btnPrimary, marginTop: 20 }} onClick={() => setStep("landing")}>
            Prendre un nouveau ticket
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 24, textAlign: "center" }}>
          Propulsé par AttenteZéro — CivicAI
        </p>
      </div>
    );
  }

  return null;
}

// ── Inline styles (no Tailwind — public page has no auth shell) ──────────────
const styles: Record<string, React.CSSProperties> = {
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
    paddingBottom: 40,
  },
  header: {
    background: "linear-gradient(135deg,#0f766e 0%,#0d9488 100%)",
    padding: "40px 24px 32px",
    textAlign: "center",
    color: "#fff",
  },
  logo: { fontSize: 40, marginBottom: 8 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  sub: { margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" },
  card: {
    background: "#fff",
    margin: "16px 16px 0",
    borderRadius: 16,
    padding: "20px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
  },
  statRow: { display: "flex", gap: 12 },
  statBox: {
    flex: 1,
    background: "#f0fdf9",
    borderRadius: 12,
    padding: "14px 12px",
    textAlign: "center",
    border: "1px solid #ccfbf1",
  },
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
    marginTop: 4,
    letterSpacing: 0.1,
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
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 15,
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 12,
  },
  ticketBig: {
    fontSize: 72,
    fontWeight: 900,
    color: "#0d9488",
    letterSpacing: -2,
    lineHeight: 1,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  infoLabel: { fontSize: 13, color: "#64748b" },
  infoVal: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  progressBar: { height: 8, background: "#e2e8f0", borderRadius: 8, margin: "16px 0", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#0d9488,#10b981)", borderRadius: 8, transition: "width 0.6s ease" },
  noticeBox: {
    background: "#f0fdf9",
    border: "1px solid #ccfbf1",
    borderRadius: 12,
    padding: "14px 16px",
    marginTop: 16,
  },
};

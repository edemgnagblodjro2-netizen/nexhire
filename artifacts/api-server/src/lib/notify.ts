// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Notifications par courriel (best-effort).
//
// Si RESEND_API_KEY et NOTIFY_EMAIL sont configurés, on envoie un courriel
// via l'API Resend. Sinon, on journalise simplement et on ne bloque rien.
//
// Resend a été choisi parce que :
//   - API REST simple (pas de dépendance npm),
//   - 3 000 courriels gratuits par mois,
//   - bonne livraison transactionnelle.
// L'utilisateur peut ajouter sa clé plus tard sans toucher au code.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotifyEmailInput {
  subject: string;
  text: string;
  html?: string;
}

export async function sendOwnerEmail(input: NotifyEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.NOTIFY_FROM_EMAIL ?? "AttenteZéro <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.log(`[notify] (skipped — RESEND_API_KEY or NOTIFY_EMAIL missing) ${input.subject}`);
    return { sent: false, reason: "missing-config" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[notify] resend failed: ${resp.status} ${errText}`);
      return { sent: false, reason: `http-${resp.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.warn(`[notify] resend error: ${(err as Error).message}`);
    return { sent: false, reason: "exception" };
  }
}

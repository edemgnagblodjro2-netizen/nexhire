// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Envoi de notifications push via l'API Expo Push.
//
// Documentation : https://docs.expo.dev/push-notifications/sending-notifications/
// L'API est gratuite et ne requiert aucune clé. On envoie par lots de 100
// pour respecter la limite du service Expo.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoSendResult {
  sent: number;
  errors: Array<{ token: string; reason: string }>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

function isValidExpoToken(t: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);
}

export async function sendExpoPushBatch(
  messages: ExpoPushMessage[],
): Promise<ExpoSendResult> {
  const result: ExpoSendResult = { sent: 0, errors: [] };
  const valid = messages.filter((m) => isValidExpoToken(m.to));

  for (const m of messages) {
    if (!isValidExpoToken(m.to)) {
      result.errors.push({ token: m.to, reason: "invalid-token-format" });
    }
  }

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!resp.ok) {
        for (const m of batch) {
          result.errors.push({ token: m.to, reason: `http-${resp.status}` });
        }
        continue;
      }
      const json = (await resp.json()) as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      tickets.forEach((t, idx) => {
        if (t.status === "ok") {
          result.sent += 1;
        } else {
          result.errors.push({
            token: batch[idx]?.to ?? "?",
            reason: t.details?.error ?? t.message ?? "unknown",
          });
        }
      });
    } catch (err) {
      for (const m of batch) {
        result.errors.push({
          token: m.to,
          reason: `exception:${(err as Error).message.slice(0, 60)}`,
        });
      }
    }
  }
  return result;
}

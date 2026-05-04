import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Période d'essai du chatbot IA flottant.
//
// Modèle freemium : 15 questions/jour pendant 3 jours offerts à tout
// visiteur (anonyme ou connecté). Au-delà des 3 jours, le canal flottant
// retourne 429 + CTA Premium et l'utilisateur doit s'abonner pour continuer.
//
// Une ligne par "client" (préfixe "u:" + userId pour les connectés, "ip:"
// + clientIp pour les anonymes). On stocke la date du tout premier message
// envoyé via le chatbot flottant : c'est le point de départ de la fenêtre
// de 3 jours.
//
// Le quota quotidien (15/jour) reste géré en mémoire (Map) côté serveur
// car il se réinitialise chaque nuit ; seule la borne supérieure (date de
// début d'essai) est persistée pour résister aux redémarrages.
// ─────────────────────────────────────────────────────────────────────────────
export const aiTrialsTable = pgTable(
  "ai_trials",
  {
    clientKey: varchar("client_key", { length: 128 }).primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("IDX_ai_trials_started").on(t.startedAt)],
);

export type AiTrial = typeof aiTrialsTable.$inferSelect;
export type InsertAiTrial = typeof aiTrialsTable.$inferInsert;

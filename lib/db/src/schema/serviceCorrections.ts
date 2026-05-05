import { doublePrecision, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { servicesTable } from "./services";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro v1.1.9 — Corrections géolocalisation proposées par les usagers.
//
// Permet à un usager qui constate qu'une fiche pointe au mauvais endroit de
// proposer la bonne adresse / les bonnes coordonnées. Système d'auto-validation :
// quand 3 corrections concordantes sont reçues pour un même service, on
// accepte automatiquement (sinon, validation manuelle dans le panneau admin).
//
// Pas de PII stockée : juste un hash IP pour le rate-limit anti-spam.
// ─────────────────────────────────────────────────────────────────────────────
export const serviceCorrectionsTable = pgTable(
  "service_corrections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    serviceId: varchar("service_id")
      .notNull()
      .references(() => servicesTable.id, { onDelete: "cascade" }),
    // Ce que l'usager propose comme bonne info
    proposedAddress: text("proposed_address"),
    proposedLat: doublePrecision("proposed_lat"),
    proposedLng: doublePrecision("proposed_lng"),
    proposedCity: text("proposed_city"),
    note: text("note"), // commentaire libre de l'usager (ex : "le bâtiment est en arrière, entrée latérale")
    // État
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    // 'pending' = en attente | 'approved' = appliqué | 'rejected' = refusé par admin
    // | 'auto_approved' = appliqué automatiquement (3 confirmations concordantes)
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    // Anti-abus
    ipHash: varchar("ip_hash", { length: 64 }),
    appVersion: varchar("app_version", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_service_corrections_service").on(table.serviceId),
    index("IDX_service_corrections_status").on(table.status),
    index("IDX_service_corrections_created").on(table.createdAt),
  ],
);

export type ServiceCorrection = typeof serviceCorrectionsTable.$inferSelect;
export type InsertServiceCorrection = typeof serviceCorrectionsTable.$inferInsert;

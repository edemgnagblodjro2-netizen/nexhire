import { integer, pgTable, text, timestamp, varchar, index } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Signalement de bogues (bug reports).
//
// Formulaire accessible depuis l'onglet "Plus" → "Signaler un bogue".
// Citoyens et organismes peuvent envoyer un message décrivant un problème
// rencontré dans l'application. Les rapports sont stockés sans IP brute
// (uniquement sha256(ip+sel)) pour permettre le rate-limit sans PII.
// ─────────────────────────────────────────────────────────────────────────────
export const bugReportsTable = pgTable(
  "bug_reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 200 }),
    message: text("message").notNull(),
    appVersion: varchar("app_version", { length: 40 }),
    platform: varchar("platform", { length: 32 }),
    userId: varchar("user_id"),
    ipHash: varchar("ip_hash", { length: 64 }),
    status: varchar("status", { length: 16 }).notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_bug_reports_created").on(table.createdAt),
    index("IDX_bug_reports_status").on(table.status),
  ],
);

export type BugReport = typeof bugReportsTable.$inferSelect;
export type InsertBugReport = typeof bugReportsTable.$inferInsert;

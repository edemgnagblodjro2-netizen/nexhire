import { check, integer, pgTable, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// CivicAI — Soumissions du formulaire de contact.
//
// Toutes les soumissions du formulaire de contact CivicAI.ca sont persistées
// ici AVANT l'envoi de l'email. Si l'envoi échoue, le message n'est pas perdu.
//
// Statuts :
//   new       → reçu, non lu
//   read      → lu par un admin
//   archived  → traité / archivé
// ─────────────────────────────────────────────────────────────────────────────
export const contactSubmissionsTable = pgTable(
  "contact_submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    org: varchar("org", { length: 200 }),
    phone: varchar("phone", { length: 40 }),
    service: varchar("service", { length: 120 }),
    message: text("message").notNull(),
    lang: varchar("lang", { length: 4 }).notNull().default("fr"),
    status: varchar("status", { length: 16 }).notNull().default("new"),
    emailSent: integer("email_sent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_contact_submissions_created").on(table.createdAt),
    index("IDX_contact_submissions_status").on(table.status),
    check("CHK_contact_submissions_status", sql`${table.status} IN ('new', 'read', 'archived')`),
  ],
);

export type ContactSubmission = typeof contactSubmissionsTable.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissionsTable.$inferInsert;

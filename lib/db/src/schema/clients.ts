import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { organisationsTable } from "./organisations";

// ─── Clients (people followed by an intervenant or institution) ──────────
export const clientsTable = pgTable(
  "clients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    // The owning organisation (kind="intervenant" for solo, kind="institution" for B2B teams)
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    // The user who created the record (for audit)
    createdByUserId: varchar("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    phone: text("phone"),
    email: text("email"),
    dateOfBirth: text("date_of_birth"), // ISO date string, kept as text for partial dates
    address: text("address"),
    city: text("city"),
    // Free-form summary (current situation, language, allergies, etc.)
    summary: text("summary"),
    // Risk level — helps surface urgent cases
    riskLevel: varchar("risk_level", { length: 16 }).notNull().default("none"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_clients_org").on(table.organisationId),
    index("IDX_clients_phone").on(table.phone),
    index("IDX_clients_lastname").on(table.lastName),
  ],
);

export type Client = typeof clientsTable.$inferSelect;
export type InsertClient = typeof clientsTable.$inferInsert;

// ─── Case notes (chronological journal per client) ───────────────────────
export const caseNotesTable = pgTable(
  "case_notes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    authorUserId: varchar("author_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Optional category: contact, rdv, refer, alerte, autre
    kind: varchar("kind", { length: 16 }).notNull().default("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_case_notes_client").on(table.clientId, table.createdAt),
    index("IDX_case_notes_org").on(table.organisationId),
  ],
);

export type CaseNote = typeof caseNotesTable.$inferSelect;
export type InsertCaseNote = typeof caseNotesTable.$inferInsert;

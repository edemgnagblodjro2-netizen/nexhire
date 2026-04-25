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
    // Workflow status — drives the activity feed shown to all org members.
    // Values: en_attente | en_cours | en_pause | termine
    status: varchar("status", { length: 16 }).notNull().default("en_cours"),
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

// ─── Client activity feed (shared across all members of the org) ─────────
// One row per significant event: client created, status changed, risk changed,
// note added, archived, etc. The feed is queried by org and ordered by createdAt.
export const clientActivitiesTable = pgTable(
  "client_activities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    // created | status_changed | risk_changed | note_added | archived | unarchived
    kind: varchar("kind", { length: 24 }).notNull(),
    // Free-form payload (e.g. "{from:'en_cours',to:'termine'}" or note excerpt).
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_client_activities_org_time").on(table.organisationId, table.createdAt),
    index("IDX_client_activities_client").on(table.clientId, table.createdAt),
  ],
);

export type ClientActivity = typeof clientActivitiesTable.$inferSelect;
export type InsertClientActivity = typeof clientActivitiesTable.$inferInsert;

// ─── Per-user "last seen activity" timestamp per org (for unread badge) ──
export const clientActivityReadsTable = pgTable(
  "client_activity_reads",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_client_activity_reads_pk").on(table.userId, table.organisationId),
  ],
);

export type ClientActivityRead = typeof clientActivityReadsTable.$inferSelect;

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

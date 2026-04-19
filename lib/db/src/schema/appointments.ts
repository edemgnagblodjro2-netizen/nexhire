import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { organisationsTable } from "./organisations";
import { clientsTable } from "./clients";

/**
 * appointments — scheduled rendez-vous between an intervenant/organisme and a client.
 * Status flow: scheduled → confirmed → done | cancelled | noshow
 */
export const appointmentsTable = pgTable(
  "appointments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(30),
    location: text("location"),
    notes: text("notes"),
    // scheduled | confirmed | done | cancelled | noshow
    status: varchar("status", { length: 16 }).notNull().default("scheduled"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_appointments_org_when").on(table.organisationId, table.scheduledAt),
    index("IDX_appointments_client").on(table.clientId),
  ],
);

export type Appointment = typeof appointmentsTable.$inferSelect;
export type InsertAppointment = typeof appointmentsTable.$inferInsert;

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { usersTable } from "./auth";

export const verificationRequestsTable = pgTable(
  "verification_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    neq: varchar("neq", { length: 16 }).notNull(),
    arcCharityNumber: varchar("arc_charity_number", { length: 32 }),
    legalName: text("legal_name").notNull(),
    foundedYear: varchar("founded_year", { length: 4 }).notNull(),
    contactPhone: text("contact_phone").notNull(),
    website: text("website"),
    mission: text("mission").notNull(),
    // pending | auto_approved | approved | rejected
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    autoCheckResult: text("auto_check_result"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: varchar("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_verifs_org").on(table.organisationId),
    index("IDX_verifs_status").on(table.status),
  ],
);

export type VerificationRequest = typeof verificationRequestsTable.$inferSelect;
export type InsertVerificationRequest = typeof verificationRequestsTable.$inferInsert;

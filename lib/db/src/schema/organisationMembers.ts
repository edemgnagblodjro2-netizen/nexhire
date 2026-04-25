import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { organisationsTable } from "./organisations";

/**
 * organisation_members — multi-seat support for Organisme & Institution plans.
 *
 * Workflow:
 * 1. Owner creates an organisation at registration → row inserted automatically
 *    (status='active', role='owner', userId set).
 * 2. Owner/admin invites a teammate by email → row inserted with userId=null,
 *    status='invited', invitedEmail set.
 * 3. When that email registers OR logs in, the row is claimed: userId set,
 *    status='active', joinedAt set.
 *
 * Members of an org can read/write the same clients & appointments as the owner.
 */
export const organisationMembersTable = pgTable(
  "organisation_members",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email").notNull(), // always lowercase
    role: varchar("role", { length: 16 }).notNull().default("member"), // owner | admin | member
    status: varchar("status", { length: 16 }).notNull().default("invited"), // invited | active | revoked | declined
    invitedByUserId: varchar("invited_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    /** When the invitee accepted or declined the invitation. */
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    /** Free-form note from the invitee — typically a disponibility statement when declining. */
    responseNote: text("response_note"),
    /** Set to false once the inviter has seen the response (used to badge unread declines). */
    responseSeenByInviter: varchar("response_seen_by_inviter", { length: 4 }).notNull().default("no"), // yes | no
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("UQ_org_members_email").on(table.organisationId, table.invitedEmail),
    index("IDX_org_members_user_status").on(table.userId, table.status),
    index("IDX_org_members_org_status").on(table.organisationId, table.status),
  ],
);

export type OrganisationMember = typeof organisationMembersTable.$inferSelect;
export type InsertOrganisationMember = typeof organisationMembersTable.$inferInsert;

import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { servicesTable } from "./services";

export const organisationsTable = pgTable(
  "organisations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    description: text("description"),
    serviceId: varchar("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
    badgeVerified: boolean("badge_verified").notNull().default(false),
    // "organisme" (public B2B org) | "intervenant" (private self-org for field workers)
    kind: varchar("kind", { length: 16 }).notNull().default("organisme"),
    professionalTitle: text("professional_title"),
    affiliation: text("affiliation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_organisations_user").on(table.userId),
    index("IDX_organisations_service").on(table.serviceId),
  ],
);

export type Organisation = typeof organisationsTable.$inferSelect;
export type InsertOrganisation = typeof organisationsTable.$inferInsert;

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisationsTable.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id"),
    stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
    plan: varchar("plan", { length: 16 }).notNull().default("standard"),
    interval: varchar("interval", { length: 8 }).notNull().default("month"),
    status: varchar("status", { length: 24 }).notNull().default("trialing"),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("IDX_subscriptions_org").on(table.organisationId)],
);

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;

export const serviceViewsTable = pgTable(
  "service_views",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    serviceId: varchar("service_id").notNull(),
    action: varchar("action", { length: 16 }).notNull().default("view"),
    userId: varchar("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_service_views_service").on(table.serviceId),
    index("IDX_service_views_created").on(table.createdAt),
    index("IDX_service_views_service_created").on(table.serviceId, table.createdAt),
  ],
);

export type ServiceView = typeof serviceViewsTable.$inferSelect;
export type InsertServiceView = typeof serviceViewsTable.$inferInsert;

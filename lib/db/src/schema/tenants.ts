import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyName: text("company_name").notNull(),
  schemaName: text("schema_name").notNull().unique(),
  subdomain: text("subdomain").unique(),
  customDomain: text("custom_domain").unique(),
  appType: text("app_type").notNull(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  enabledProducts: jsonb("enabled_products").$type<string[]>().notNull().default([]),
  enabledServices: jsonb("enabled_services").$type<string[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<{
    neq?: string;
    phone?: string;
    address?: string;
    city?: string;
    sector?: string;
    userCount?: string;
    contactTitle?: string;
    clientMessage?: string;
  }>().default({}),
  dbHost: text("db_host"),
  dbName: text("db_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

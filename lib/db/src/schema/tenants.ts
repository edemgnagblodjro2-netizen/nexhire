import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
  dbHost: text("db_host"),
  dbName: text("db_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

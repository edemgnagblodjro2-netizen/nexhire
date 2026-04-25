import { boolean, doublePrecision, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const servicesTable = pgTable(
  "services",
  {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull().default(""),
    city: text("city").notNull().default(""),
    phone: text("phone").notNull().default(""),
    website: text("website").notNull().default(""),
    description: text("description").notNull().default(""),
    address: text("address"),
    hours: text("hours"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    isProvinceWide: boolean("is_province_wide").notNull().default(false),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    active: boolean("active").notNull().default(true),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verificationNote: text("verification_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_services_city_active").on(table.city, table.active),
    index("IDX_services_active").on(table.active),
  ],
);

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;

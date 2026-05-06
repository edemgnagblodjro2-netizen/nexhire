import { index, integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { servicesTable } from "./services";

export const serviceRatingsTable = pgTable(
  "service_ratings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    serviceId: varchar("service_id")
      .notNull()
      .references(() => servicesTable.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 16 }).notNull(),
    userId: varchar("user_id"),
    ipHash: varchar("ip_hash", { length: 64 }),
    appVersion: varchar("app_version", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_service_ratings_service").on(table.serviceId),
    index("IDX_service_ratings_created").on(table.createdAt),
    // Concurrency-safe single vote per service per ipHash. Combined with
    // ON CONFLICT DO NOTHING in the insert, simultaneous requests can never
    // produce duplicate rows.
    uniqueIndex("UQ_service_ratings_service_ip").on(table.serviceId, table.ipHash),
  ],
);

export type ServiceRating = typeof serviceRatingsTable.$inferSelect;
export type InsertServiceRating = typeof serviceRatingsTable.$inferInsert;

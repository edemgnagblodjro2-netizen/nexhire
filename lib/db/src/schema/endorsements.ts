import { index, integer, pgTable, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const endorsementsTable = pgTable(
  "endorsements",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    endorserId: varchar("endorser_id").notNull(),
    candidateId: varchar("candidate_id").notNull(),
    quality: varchar("quality", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_endorsement").on(table.endorserId, table.candidateId, table.quality),
    index("idx_endorsements_candidate").on(table.candidateId),
    index("idx_endorsements_endorser").on(table.endorserId),
  ],
);

export type Endorsement = typeof endorsementsTable.$inferSelect;
export type InsertEndorsement = typeof endorsementsTable.$inferInsert;

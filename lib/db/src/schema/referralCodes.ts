import { integer, pgTable, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Programme ambassadeur.
//
// Chaque utilisateur peut obtenir un code court (8 caractères) à partager.
// Quand un nouveau venu s'inscrit avec ce code, on incrémente claimedCount.
// L'utilisation des récompenses (mois premium offerts) est gérée côté app.
// ─────────────────────────────────────────────────────────────────────────────
export const referralCodesTable = pgTable(
  "referral_codes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    code: varchar("code", { length: 16 }).notNull(),
    claimedCount: integer("claimed_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_referral_codes_code").on(table.code),
    uniqueIndex("UQ_referral_codes_user").on(table.userId),
    index("IDX_referral_codes_created").on(table.createdAt),
  ],
);

export type ReferralCode = typeof referralCodesTable.$inferSelect;
export type InsertReferralCode = typeof referralCodesTable.$inferInsert;

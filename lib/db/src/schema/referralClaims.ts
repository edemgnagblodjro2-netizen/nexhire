import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Registre des réclamations de codes ambassadeur.
//
// Une ligne par réclamation. La PK sur claimant_user_id garantit qu'un même
// utilisateur ne peut réclamer qu'une seule fois (anti-spam).
// ─────────────────────────────────────────────────────────────────────────────
export const referralClaimsTable = pgTable(
  "referral_claims",
  {
    claimantUserId: varchar("claimant_user_id", { length: 64 }).primaryKey(),
    code: varchar("code", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("IDX_referral_claims_code").on(table.code)],
);

export type ReferralClaim = typeof referralClaimsTable.$inferSelect;

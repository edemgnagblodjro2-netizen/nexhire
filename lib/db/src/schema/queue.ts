import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * queue_config — configuration kiosk par tenant.
 * closingTime: "HH:MM" heure locale (ex: "17:00")
 * serviceIntervalMin: durée d'un créneau en minutes
 * lateWalkInFeeCents: montant de la pénalité retard en cents CAD
 */
export const queueConfig = pgTable("queue_config", {
  id:                  varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId:            varchar("tenant_id").notNull().unique(),
  closingTime:         text("closing_time").notNull().default("17:00"),
  timezone:            text("timezone").notNull().default("America/Toronto"),
  serviceIntervalMin:  integer("service_interval_min").notNull().default(30),
  lateWalkInFeeCents:  integer("late_walk_in_fee_cents").notNull().default(500),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * queue_slots — plages horaires disponibles par tenant/service.
 * L'agent crée des créneaux (ex: 9h, 9h30, 10h).
 * booked_count s'incrémente à chaque réservation, se décrémente à l'annulation.
 */
export const queueSlots = pgTable(
  "queue_slots",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull(),
    serviceName: text("service_name").notNull().default("Service principal"),
    slotDatetime: timestamp("slot_datetime", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull().default(1),
    bookedCount: integer("booked_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("IDX_queue_slots_tenant_dt").on(t.tenantId, t.slotDatetime),
  ]
);

/**
 * queue_bookings — réservation citoyenne.
 * Aucun compte requis — le citoyen accède via un token unique (magic link).
 *
 * Règles métier :
 * - Max 2 réservations actives par semaine (weekKey = YYYY-WW, tracé par email+phone)
 * - cancellationUsed : le citoyen ne peut annuler qu'une seule fois
 * - Si en retard : penaltyAmountCents (configuré par le tenant), à payer via Stripe OU reprogrammer
 * - Statuts : scheduled → arrived | late | absent | cancelled | completed
 */
export const queueBookings = pgTable(
  "queue_bookings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull(),
    slotId: varchar("slot_id").notNull().references(() => queueSlots.id, { onDelete: "cascade" }),

    // Lien unique citoyen — token 32 chars hexadécimal
    citizenToken: varchar("citizen_token", { length: 64 }).notNull().unique(),

    // Identité citoyen (pas de compte)
    citizenName: text("citizen_name").notNull(),
    citizenEmail: text("citizen_email").notNull(),
    citizenPhone: text("citizen_phone"),

    // Contrôle des règles métier
    weekKey: varchar("week_key", { length: 8 }).notNull(), // ex: "2025-W21"
    cancellationUsed: boolean("cancellation_used").notNull().default(false),

    // Statut du rendez-vous
    // scheduled | arrived | late | absent | cancelled | completed | rescheduled
    status: varchar("status", { length: 16 }).notNull().default("scheduled"),

    // Pénalité de retard (montant en cents, ex: 500 = 5.00$)
    penaltyAmountCents: integer("penalty_amount_cents"),
    penaltyPaidAt: timestamp("penalty_paid_at", { withTimezone: true }),
    penaltyStripeSessionId: text("penalty_stripe_session_id"),

    // Reprogrammation
    rescheduledToSlotId: varchar("rescheduled_to_slot_id"),

    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    lateSignaledAt: timestamp("late_signaled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("IDX_queue_bookings_token").on(t.citizenToken),
    index("IDX_queue_bookings_tenant_week").on(t.tenantId, t.weekKey, t.citizenEmail),
    index("IDX_queue_bookings_slot").on(t.slotId),
  ]
);

export type QueueSlot = typeof queueSlots.$inferSelect;
export type InsertQueueSlot = typeof queueSlots.$inferInsert;
export type QueueBooking = typeof queueBookings.$inferSelect;
export type InsertQueueBooking = typeof queueBookings.$inferInsert;

import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Analytics avancés
//
// 3 tables :
//   - analytic_events  : journal de TOUS les événements (vue d'écran, recherche,
//                        appel, itinéraire, etc.) — alimente le funnel + les
//                        statistiques de conversion.
//   - active_sessions  : présence en temps réel (dernier ping). Sert à la page
//                        admin "En direct" qui affiche les utilisateurs actifs
//                        à l'instant T avec leur écran courant et localisation.
//   - push_tokens      : jetons Expo Push enregistrés par les apps mobiles,
//                        utilisés pour envoyer des notifications ciblées
//                        (ex. upsell premium, alertes urgentes).
//
// La géolocalisation est OPT-IN côté mobile : seul l'utilisateur qui a
// accepté la permission "Position" voit ses coordonnées remonter ici.
// ─────────────────────────────────────────────────────────────────────────────

export const analyticEventsTable = pgTable(
  "analytic_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    userId: varchar("user_id"),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    serviceId: varchar("service_id"),
    screen: varchar("screen", { length: 120 }),
    province: varchar("province", { length: 8 }),
    city: varchar("city", { length: 120 }),
    lat: real("lat"),
    lng: real("lng"),
    appVersion: varchar("app_version", { length: 20 }),
    platform: varchar("platform", { length: 16 }),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("IDX_analytic_events_created").on(t.createdAt),
    index("IDX_analytic_events_type").on(t.eventType),
    index("IDX_analytic_events_session").on(t.sessionId),
    index("IDX_analytic_events_user").on(t.userId),
    index("IDX_analytic_events_service").on(t.serviceId),
  ],
);

export type AnalyticEvent = typeof analyticEventsTable.$inferSelect;
export type InsertAnalyticEvent = typeof analyticEventsTable.$inferInsert;

export const activeSessionsTable = pgTable(
  "active_sessions",
  {
    sessionId: varchar("session_id", { length: 64 }).primaryKey(),
    userId: varchar("user_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentScreen: varchar("current_screen", { length: 120 }),
    province: varchar("province", { length: 8 }),
    city: varchar("city", { length: 120 }),
    lat: real("lat"),
    lng: real("lng"),
    appVersion: varchar("app_version", { length: 20 }),
    platform: varchar("platform", { length: 16 }),
    deviceModel: varchar("device_model", { length: 80 }),
  },
  (t) => [
    index("IDX_active_sessions_last_seen").on(t.lastSeenAt),
    index("IDX_active_sessions_user").on(t.userId),
  ],
);

export type ActiveSession = typeof activeSessionsTable.$inferSelect;
export type InsertActiveSession = typeof activeSessionsTable.$inferInsert;

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    token: varchar("token", { length: 256 }).notNull(),
    userId: varchar("user_id"),
    sessionId: varchar("session_id", { length: 64 }),
    platform: varchar("platform", { length: 16 }),
    appVersion: varchar("app_version", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("UQ_push_tokens_token").on(t.token),
    index("IDX_push_tokens_user").on(t.userId),
    index("IDX_push_tokens_session").on(t.sessionId),
  ],
);

export type PushToken = typeof pushTokensTable.$inferSelect;
export type InsertPushToken = typeof pushTokensTable.$inferInsert;

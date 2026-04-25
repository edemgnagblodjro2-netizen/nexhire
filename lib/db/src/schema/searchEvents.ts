import { integer, pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Statistiques de recherche anonymes.
//
// Une ligne par recherche initiée depuis l'app mobile. Aucune donnée
// personnelle n'est stockée :
//   - province : code de la province ciblée par la recherche (ou "ALL"),
//   - category : catégorie sélectionnée (ou "all"),
//   - queryLen : simple longueur du texte recherché (jamais le texte lui-même),
//   - createdAt : horodatage.
//
// Sert au panneau admin pour répondre à : « Quelle province génère le plus
// de recherches cette semaine ? » sans jamais traquer l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────────
export const searchEventsTable = pgTable(
  "search_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    province: varchar("province", { length: 8 }).notNull().default("ALL"),
    category: varchar("category", { length: 32 }).notNull().default("all"),
    queryLen: integer("query_len").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_search_events_created").on(table.createdAt),
    index("IDX_search_events_province").on(table.province),
  ],
);

export type SearchEvent = typeof searchEventsTable.$inferSelect;
export type InsertSearchEvent = typeof searchEventsTable.$inferInsert;

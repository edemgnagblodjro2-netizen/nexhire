import { boolean, doublePrecision, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const servicesTable = pgTable(
  "services",
  {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull().default(""),
    city: text("city").notNull().default(""),
    province: text("province").notNull().default("QC"),
    phone: text("phone").notNull().default(""),
    website: text("website").notNull().default(""),
    description: text("description").notNull().default(""),
    address: text("address"),
    hours: text("hours"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    isProvinceWide: boolean("is_province_wide").notNull().default(false),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    // v1.1.9 — Phase 1 du chantier "fiabilité géolocalisation".
    // serviceType : sépare lieux physiques / lignes téléphoniques / organismes régionaux
    //   - 'physical' : a une adresse, doit avoir des coords précises (carte + cercle)
    //   - 'phone'    : lignes 211/811/911/écoute → AUCUNE coord, n'apparaît pas sur la carte
    //   - 'regional' : couvre une zone (région/province) → pas un point précis
    // geocodePrecisionM : rayon en mètres dans lequel on est sûr que le point tombe.
    //   - 30-100 m  : rooftop / verifié → vert
    //   - 100-300 m : adresse approximative → jaune
    //   - > 300 m   : niveau ville/quartier → rouge "position imprécise"
    //   - null      : pas applicable (phone) ou pas encore calculé
    serviceType: varchar("service_type", { length: 16 }).notNull().default("physical"),
    geocodePrecisionM: integer("geocode_precision_m"),
    geocodeSource: varchar("geocode_source", { length: 32 }), // 'auto-text' | 'google' | 'user-correction' | null
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
    index("IDX_services_type").on(table.serviceType),
  ],
);

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;

import { db, servicesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const servicesModule = await import("../../../artifacts/service-qc/data/services.js");
const SERVICES: any[] = servicesModule.SERVICES;

async function seed() {
  console.log(`Seeding ${SERVICES.length} services…`);

  const rows = SERVICES.map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    subcategory: s.subcategory ?? "",
    city: s.city ?? "",
    province: s.province ?? "QC",
    phone: s.phone ?? "",
    website: s.website ?? "",
    description: s.description ?? "",
    address: s.address ?? null,
    hours: s.hours ?? null,
    isUrgent: s.isUrgent ?? false,
    isProvinceWide: s.isProvinceWide ?? false,
    lat: s.coordinates?.lat ?? null,
    lng: s.coordinates?.lng ?? null,
    active: true,
  }));

  await db
    .insert(servicesTable)
    .values(rows)
    .onConflictDoUpdate({
      target: servicesTable.id,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        subcategory: sql`excluded.subcategory`,
        city: sql`excluded.city`,
        phone: sql`excluded.phone`,
        website: sql`excluded.website`,
        description: sql`excluded.description`,
        address: sql`excluded.address`,
        hours: sql`excluded.hours`,
        isUrgent: sql`excluded.is_urgent`,
        isProvinceWide: sql`excluded.is_province_wide`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
      },
    });

  const count = await db.$count(servicesTable);
  console.log(`✅ Done — ${count} services in database.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

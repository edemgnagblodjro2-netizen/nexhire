/**
 * Sync the bundled `artifacts/service-qc/data/services.ts` file with the
 * latest values from the admin database.
 *
 * Usage: pnpm --filter @workspace/scripts sync-services
 *
 * Behaviour:
 * - For each service in the bundled file, look up its row in the DB by id.
 * - If found, overwrite mutable fields (name, city, phone, website,
 *   description, address, hours, coordinates) with the DB values.
 * - Preserve bundle-only metadata (languages, badgeVerified, featured,
 *   organisationId, isUrgent, isProvinceWide, category, subcategory,
 *   province, id) — those don't live in the admin DB.
 * - Childcare services are NOT seeded into the DB (handled via La Place 0-5),
 *   so their bundled values are kept untouched.
 *
 * The file's HEADER (types, labels, exports above the SERVICES array) and
 * FOOTER (helpers below the array) are preserved verbatim. Only the array
 * body is regenerated.
 */

import { db, servicesTable } from "@workspace/db";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SERVICES_TS = resolve(
  process.cwd(),
  "../artifacts/service-qc/data/services.ts",
);

const ARRAY_START_MARKER = "export const SERVICES: Service[] = [";
const ARRAY_END_MARKER = "\n];\n";

type DbRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address: string | null;
  hours: string | null;
  isUrgent: boolean | null;
  isProvinceWide: boolean | null;
  lat: string | number | null;
  lng: string | number | null;
};

function jsStringLiteral(value: string): string {
  // Use double quotes; escape backslashes, double quotes, and newlines.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "")}"`;
}

function emitEntry(svc: any): string {
  const lines: string[] = ["  {"];
  const push = (key: string, raw: string) => lines.push(`    ${key}: ${raw},`);

  push("id", jsStringLiteral(svc.id));
  push("name", jsStringLiteral(svc.name));
  push("category", jsStringLiteral(svc.category));
  push("subcategory", jsStringLiteral(svc.subcategory ?? ""));
  push("city", jsStringLiteral(svc.city ?? ""));
  if (svc.province) push("province", jsStringLiteral(svc.province));
  push("phone", jsStringLiteral(svc.phone ?? ""));
  if (svc.website) push("website", jsStringLiteral(svc.website));
  push("description", jsStringLiteral(svc.description ?? ""));
  if (svc.isUrgent) push("isUrgent", "true");
  if (svc.isProvinceWide) push("isProvinceWide", "true");
  if (svc.hours) push("hours", jsStringLiteral(svc.hours));
  if (svc.address) push("address", jsStringLiteral(svc.address));
  if (svc.coordinates && typeof svc.coordinates.lat === "number" && typeof svc.coordinates.lng === "number") {
    push(
      "coordinates",
      `{ lat: ${svc.coordinates.lat}, lng: ${svc.coordinates.lng} }`,
    );
  }
  if (svc.badgeVerified) push("badgeVerified", "true");
  if (svc.featured) push("featured", "true");
  if (svc.organisationId) push("organisationId", jsStringLiteral(svc.organisationId));
  if (Array.isArray(svc.languages) && svc.languages.length > 0) {
    push("languages", `[${svc.languages.map((l: string) => jsStringLiteral(l)).join(", ")}]`);
  }

  lines.push("  }");
  return lines.join("\n");
}

async function main() {
  console.log("📥 Reading bundled services.ts…");
  const fileText = readFileSync(SERVICES_TS, "utf-8");
  const startIdx = fileText.indexOf(ARRAY_START_MARKER);
  if (startIdx === -1) throw new Error("Cannot find SERVICES array start marker");
  const headerEnd = startIdx + ARRAY_START_MARKER.length;
  const endIdx = fileText.indexOf(ARRAY_END_MARKER, headerEnd);
  if (endIdx === -1) throw new Error("Cannot find SERVICES array end marker");

  const header = fileText.slice(0, headerEnd);
  const footer = fileText.slice(endIdx); // starts with "\n];\n"

  console.log("📥 Importing bundled SERVICES (for ids and bundle-only fields)…");
  const bundleMod: any = await import(
    "../../artifacts/service-qc/data/services.js" as any
  );
  const BUNDLE: any[] = bundleMod.SERVICES;
  console.log(`   → ${BUNDLE.length} entries in bundle.`);

  console.log("📥 Loading services from DB…");
  const dbRows = (await db.select().from(servicesTable)) as unknown as DbRow[];
  const dbById = new Map<string, DbRow>();
  for (const row of dbRows) dbById.set(row.id, row);
  console.log(`   → ${dbRows.length} rows in DB.`);

  let patched = 0;
  let unchanged = 0;
  let bundleOnly = 0;

  const merged = BUNDLE.map((bundle) => {
    const row = dbById.get(bundle.id);
    if (!row) {
      bundleOnly++;
      return bundle;
    }
    let changed = false;
    const out: any = { ...bundle };
    const setIf = (k: string, v: any) => {
      if (v !== null && v !== undefined && v !== "" && out[k] !== v) {
        out[k] = v;
        changed = true;
      }
    };
    setIf("name", row.name);
    setIf("city", row.city);
    setIf("phone", row.phone);
    setIf("website", row.website);
    setIf("description", row.description);
    setIf("address", row.address);
    setIf("hours", row.hours);
    if (row.lat != null && row.lng != null) {
      const lat = typeof row.lat === "string" ? Number(row.lat) : row.lat;
      const lng = typeof row.lng === "string" ? Number(row.lng) : row.lng;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const cur = out.coordinates;
        if (!cur || cur.lat !== lat || cur.lng !== lng) {
          out.coordinates = { lat, lng };
          changed = true;
        }
      }
    }
    if (changed) patched++;
    else unchanged++;
    return out;
  });

  console.log(`✏️  Patched: ${patched}  ·  Unchanged: ${unchanged}  ·  Bundle-only (e.g. childcare): ${bundleOnly}`);

  console.log("📝 Writing new services.ts…");
  const body = "\n" + merged.map(emitEntry).join(",\n") + ",";
  const out = header + body + footer;
  writeFileSync(SERVICES_TS, out, "utf-8");

  console.log("✅ Done. Total entries written: " + merged.length);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});

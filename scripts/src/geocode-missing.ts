import { db, servicesTable } from "@workspace/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AttenteZero/1.0 (contact@attentezero.ca)";
const DELAY_MS = 1100;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = `${address}, ${city}, Québec, Canada`;
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const data = (await res.json()) as any[];
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 44 || lat > 63 || lng < -80 || lng > -56) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function main() {
  const candidates = await db
    .select()
    .from(servicesTable)
    .where(
      and(
        eq(servicesTable.active, true),
        or(isNull(servicesTable.lat), isNull(servicesTable.lng)),
      ),
    );

  const withAddr = candidates.filter((c) => c.address && c.address.trim() && c.city && c.city.trim());
  const withoutAddr = candidates.length - withAddr.length;

  console.log(`Found ${candidates.length} services without GPS`);
  console.log(`  → ${withAddr.length} have address+city → will geocode`);
  console.log(`  → ${withoutAddr} have no address → skipped`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < withAddr.length; i++) {
    const s = withAddr[i];
    process.stdout.write(`[${i + 1}/${withAddr.length}] ${s.name.slice(0, 50)} … `);
    const coords = await geocode(s.address!.trim(), s.city.trim());
    if (coords) {
      await db
        .update(servicesTable)
        .set({ lat: coords.lat, lng: coords.lng })
        .where(eq(servicesTable.id, s.id));
      console.log(`✓ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      ok++;
    } else {
      console.log("✗ not found");
      fail++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${ok} geocoded, ${fail} failed, ${withoutAddr} skipped (no address).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

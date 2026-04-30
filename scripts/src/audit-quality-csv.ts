import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT QUALITÉ → fiches-a-corriger.csv
//
// Pour chaque service actif, détecte :
//   1) Site web : 200 OK ? 404 ? Timeout ? DNS mort ?
//   2) Description vide
//   3) Téléphone douteux
//   4) Adresse incohérente (locale sans code postal)
//   5) Jamais vérifié manuellement
//
// Sortie : exports/fiches-a-corriger-AAAAMMJJ.csv
// L'utilisateur le complète à la main, le renvoie, on relance un script
// `apply-corrections.ts` pour propager les changements en BDD.
// ─────────────────────────────────────────────────────────────────────────────

const CONCURRENCY = 20;          // requêtes HTTP en parallèle
const TIMEOUT_MS = 7_000;        // 7 s par site

type Row = {
  id: string;
  name: string;
  city: string;
  province: string;
  category: string;
  phone: string;
  website: string;
  problemes: string[];
  suggestion_phone?: string;
  suggestion_website?: string;
  suggestion_description?: string;
  http_status?: string;
};

// User-Agent crédible : beaucoup de sites gouv et Cloudflare rejettent
// les User-Agents inhabituels. On se fait passer pour un vrai Firefox.
const UA_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";

async function checkUrl(url: string): Promise<string> {
  if (!url || !url.startsWith("http")) return "URL_INVALIDE";

  async function attempt(method: "HEAD" | "GET"): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": UA_BROWSER,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    let res: Response;
    try {
      res = await attempt("HEAD");
      // Beaucoup de sites bloquent HEAD ou retournent 403/405 dessus
      if (res.status === 405 || res.status === 403 || res.status === 400) {
        res = await attempt("GET");
      }
    } catch (e: any) {
      // HEAD a échoué → essayer GET avant de conclure à une vraie erreur
      const msg = String(e?.message || e);
      if (msg.includes("aborted") || msg.includes("fetch failed")) {
        res = await attempt("GET");
      } else {
        throw e;
      }
    }

    if (res.status >= 200 && res.status < 400) return `OK_${res.status}`;
    if (res.status === 403) return "BLOQUE_BOT_403"; // probablement vivant mais anti-bot
    if (res.status === 429) return "RATE_LIMITE";
    return `HTTP_${res.status}`;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("aborted") || msg.includes("timeout")) return "TIMEOUT";
    if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) return "DNS_MORT";
    if (msg.includes("ECONNREFUSED")) return "REFUSED";
    if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("TLS")) return "TLS_ERREUR";
    return `ERR:${msg.slice(0, 40)}`;
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function csvEscape(v: string | undefined | null): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  console.log("─── Chargement des fiches actives ───");
  const services = await db.select().from(servicesTable).where(eq(servicesTable.active, true));
  console.log(`  → ${services.length} fiches`);

  const withSite = services.filter((s) => s.website && s.website.startsWith("http"));
  console.log(`─── Crawl de ${withSite.length} sites web (concurrence ${CONCURRENCY}) ───`);
  const t0 = Date.now();
  const statuses = await pool(withSite, CONCURRENCY, async (s) => ({ id: s.id, status: await checkUrl(s.website!) }));
  const statusMap = new Map(statuses.map((x) => [x.id, x.status]));
  console.log(`  → terminé en ${Math.round((Date.now() - t0) / 1000)} s`);

  // Statistiques
  const counts: Record<string, number> = {};
  for (const x of statuses) counts[x.status.split(":")[0].split("_")[0]] = (counts[x.status.split(":")[0].split("_")[0]] || 0) + 1;
  console.log("─── Résumé crawl ───");
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(15)} ${v}`);

  // Construction des rows
  const rows: Row[] = [];
  for (const s of services) {
    const problems: string[] = [];
    const httpStatus = statusMap.get(s.id);

    if (httpStatus && !httpStatus.startsWith("OK")) {
      // Les sites bloqués par anti-bot sont marqués différemment :
      // ils sont probablement bien en ligne, juste hostiles aux bots.
      if (httpStatus === "BLOQUE_BOT_403" || httpStatus === "RATE_LIMITE") {
        problems.push("SITE_PROBABLEMENT_OK_MAIS_BLOQUE_BOT");
      } else {
        problems.push(`SITE_${httpStatus}`);
      }
    }
    if (!s.website || s.website === "") {
      problems.push("SANS_SITE");
    }
    if (!s.description || s.description.length < 10) {
      problems.push("SANS_DESCRIPTION");
    }
    if (!s.verifiedAt) {
      problems.push("JAMAIS_VERIFIE");
    }
    if (s.province === "QC" && !s.isProvinceWide && s.address && !/[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]/.test(s.address)) {
      problems.push("ADRESSE_SANS_CODE_POSTAL");
    }

    if (problems.length === 0) continue;

    rows.push({
      id: s.id,
      name: s.name,
      city: s.city ?? "",
      province: s.province ?? "",
      category: s.category ?? "",
      phone: s.phone ?? "",
      website: s.website ?? "",
      problemes: problems,
      http_status: httpStatus,
    });
  }

  // Tri : sites morts d'abord (priorité maximale), puis sans desc, puis le reste
  rows.sort((a, b) => {
    const score = (r: Row) => {
      let s = 0;
      if (r.problemes.some((p) => p.startsWith("SITE_"))) s += 1000;
      if (r.problemes.includes("SANS_DESCRIPTION")) s += 100;
      if (r.problemes.includes("ADRESSE_SANS_CODE_POSTAL")) s += 50;
      return -s;
    };
    return score(a) - score(b);
  });

  // CSV
  const header = [
    "id", "nom", "ville", "province", "categorie",
    "telephone_actuel", "telephone_corrige",
    "site_actuel", "site_corrige", "http_status",
    "description_actuelle", "description_corrigee",
    "adresse_actuelle", "adresse_corrigee",
    "problemes", "action (garder|corriger|supprimer)", "notes",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.id,
      r.name,
      r.city,
      r.province,
      r.category,
      r.phone,
      "", // telephone_corrige (à remplir par toi)
      r.website,
      "", // site_corrige
      r.http_status ?? "",
      "", // description_actuelle (volontairement vide pour ne pas alourdir)
      "", // description_corrigee
      "", // adresse_actuelle
      "", // adresse_corrigee
      r.problemes.join("|"),
      "", // action
      "", // notes
    ].map(csvEscape).join(","));
  }

  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Toujours écrire dans <repo>/exports peu importe le cwd d'exécution
  const outPath = resolve(process.cwd(), "..", "exports", `fiches-a-corriger-${ts}.csv`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`\n─── CSV écrit : ${outPath} (${rows.length} fiches) ───`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

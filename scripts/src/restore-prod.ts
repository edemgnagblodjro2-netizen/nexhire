import { readFileSync, readdirSync } from "fs";
import { execSync } from "child_process";

const URL = "https://quebec-aid-finder.replit.app/api/admin/services/bulk";
const KEY = process.env.ADMIN_API_KEY;
if (!KEY) { console.error("ADMIN_API_KEY manquant"); process.exit(1); }

const file = process.argv[2] || (() => {
  const files = readdirSync("backups").filter(f => f.startsWith("services-prod-")).sort();
  if (!files.length) { console.error("Aucun backup trouvé dans backups/"); process.exit(1); }
  const latest = files[files.length - 1]!;
  console.log(`📂 Utilise le plus récent : ${latest}`);
  return `backups/${latest}`;
})();

const services = JSON.parse(readFileSync(file, "utf-8"));
console.log(`📤 Restauration de ${services.length} services depuis ${file}`);

const CHUNK = 500;
let totalCreated = 0, totalSkipped = 0, totalErrors = 0;
for (let i = 0; i < services.length; i += CHUNK) {
  const chunk = services.slice(i, i + CHUNK);
  const tmp = `/tmp/restore-chunk-${i}.json`;
  require("fs").writeFileSync(tmp, JSON.stringify(chunk));
  const res = execSync(
    `curl -s --max-time 90 -X POST -H "x-admin-key: ${KEY}" -H "Content-Type: application/json" --data-binary @${tmp} "${URL}"`
  ).toString();
  const r = JSON.parse(res);
  totalCreated += r.created || 0;
  totalSkipped += r.skipped || 0;
  totalErrors += r.errors || 0;
  console.log(`  chunk ${i}-${i+chunk.length}: created=${r.created} skipped=${r.skipped} errors=${r.errors}`);
}
console.log(`\n✅ Total : created=${totalCreated} skipped=${totalSkipped} errors=${totalErrors}`);

import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const URL = "https://quebec-aid-finder.replit.app/api/services";
const date = new Date().toISOString().slice(0, 10);
const path = `backups/services-prod-${date}.json`;

mkdirSync("backups", { recursive: true });
const data = execSync(`curl -s "${URL}"`).toString();
const services = JSON.parse(data);
writeFileSync(path, JSON.stringify(services, null, 0));
console.log(`✅ Backup ${path} — ${services.length} services`);

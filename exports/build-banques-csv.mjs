import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("artifacts/service-qc/data/services.ts", "utf8");
const re = /\{\s*id:\s*"([^"]+)"[^}]*category:\s*"banking"[^}]*\}/g;
const rows = [["id","name","subcategory","city","province","phone","website","address","description"]];
const get = (obj, key) => {
  const m = obj.match(new RegExp(`${key}:\\s*"((?:\\\\"|[^"])*)"`));
  return m ? m[1].replace(/\\"/g,'"') : "";
};
const csv = (s) => `"${String(s).replace(/"/g,'""')}"`;
let m;
while ((m = re.exec(src))) {
  const o = m[0];
  rows.push([
    get(o,"id"), get(o,"name"), get(o,"subcategory"),
    get(o,"city"), get(o,"province"), get(o,"phone"),
    get(o,"website"), get(o,"address"), get(o,"description"),
  ]);
}
writeFileSync("exports/banques.csv", rows.map(r => r.map(csv).join(",")).join("\n") + "\n");
console.log(`OK ${rows.length-1} banques`);

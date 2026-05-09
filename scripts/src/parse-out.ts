import * as fs from "node:fs";

const TXT = "/tmp/outaouais.txt";
const OUT_JSON = "/tmp/out-extracted.json";

type Fiche = {
  name: string;
  category_pdf: string;
  subcategory_pdf: string;
  address?: string;
  city?: string;
  postal?: string;
  phone?: string;
  fax?: string;
  website?: string;
  email?: string;
  services?: string;
  clientele?: string;
  territoire?: string;
  horaire?: string;
  frais?: string;
  financement?: string;
  statut?: string;
};

const TOC_CATEGORIES = [
  "Action Communautaire",
  "Aînés",
  "Alimentation",
  "Autochtones",
  "Éducation et alphabétisation",
  "Emploi et soutien au revenu",
  "Enfance, jeunesse et famille",
  "Friperie et aide matérielle",
  "Handicaps",
  "Immigration et communautés culturelles",
  "Itinérance",
  "Justice et défense des droits",
  "Logement",
  "Santé",
  "Santé mentale et dépendances",
  "Services gouvernementaux",
  "Sexe et genre",
  "Sports, loisirs et culture",
  "Transport",
  "Violence et maltraitance",
];

const lines = fs.readFileSync(TXT, "utf8").split("\n");

function isUppercaseTitle(s: string): boolean {
  const t = s.trim();
  if (t.length < 4) return false;
  if (/[a-zàâäçèéêëîïôöùûüÿ]/.test(t)) return false;
  if (!/[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŸ]/.test(t)) return false;
  // Avoid page numbers / TOC entries
  if (/^[0-9]+$/.test(t)) return false;
  return true;
}

function stripPageHeaders(arr: string[]): string[] {
  return arr.filter((l) => {
    const t = l.trim();
    if (/^[0-9]+$/.test(t)) return false; // page number
    return true;
  });
}

// Find where the actual content starts (after TOC). TOC ends around the first occurrence
// of "Action Communautaire" appearing without a page number trailing.
let contentStart = 0;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === "Action Communautaire" && i > 50) {
    contentStart = i;
    break;
  }
}

const body = stripPageHeaders(lines.slice(contentStart));

// Walk: track current category and subcategory.
// Heuristic:
//  - A line that exactly matches one of TOC_CATEGORIES (or is in that set) -> set current category.
//  - A line in lowercase-with-first-cap that is short and standalone between blank lines and not a fiche
//    -> set current subcategory.
//  - A UPPERCASE line that follows a blank line and is followed by an address-like line -> start of fiche.

const fiches: Fiche[] = [];
let currentCat = "";
let currentSub = "";

let i = 0;
while (i < body.length) {
  const raw = body[i];
  const t = raw.trim();

  // Category header (alone on its line, matching TOC)
  if (TOC_CATEGORIES.includes(t)) {
    currentCat = t;
    currentSub = "";
    i++;
    continue;
  }

  // Subcategory header: lower case sentence, short, between blank lines, no colon, not uppercase
  if (
    t.length > 3 &&
    t.length < 80 &&
    !/^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŸ]{4,}/.test(t) &&
    /^[A-ZÉÈÀÂÊÎÔÛÇ][a-zéèàâêîôûç' -]/.test(t) &&
    !t.includes(":") &&
    !/[0-9]/.test(t) &&
    (i === 0 || body[i - 1].trim() === "") &&
    (i + 1 < body.length && body[i + 1].trim() === "")
  ) {
    currentSub = t;
    i++;
    continue;
  }

  // Fiche start: UPPERCASE title
  if (isUppercaseTitle(t)) {
    const f: Fiche = {
      name: t,
      category_pdf: currentCat,
      subcategory_pdf: currentSub,
    };
    i++;

    // Collect block until "Statut: ..." line OR until next UPPERCASE title (safety)
    const block: string[] = [];
    while (i < body.length) {
      const bt = body[i].trim();
      if (bt.startsWith("Statut:")) {
        f.statut = bt.replace(/^Statut:\s*/, "").trim();
        i++;
        break;
      }
      // Update category/subcategory if encountered mid-walk
      if (TOC_CATEGORIES.includes(bt)) {
        currentCat = bt;
        currentSub = "";
        // Don't break the fiche; just skip
        i++;
        continue;
      }
      // Another fiche starts before Statut? Save what we have and break.
      if (isUppercaseTitle(bt) && block.length > 4) {
        break;
      }
      block.push(body[i]);
      i++;
    }

    // Parse block
    // Address: usually the first non-empty line, contains a comma + postal code OR street pattern
    let addrLine = "";
    let phoneLine = "";
    const otherLines: string[] = [];
    let foundAddr = false;
    let foundPhone = false;
    let currentField: keyof Fiche | null = null;
    const fieldBuf: Record<string, string[]> = {};

    for (const bl of block) {
      const lt = bl.trim();
      if (!lt) continue;

      // First non-empty: address
      if (!foundAddr) {
        addrLine = lt;
        foundAddr = true;
        continue;
      }

      // Then phone (line starting with digits or 1-XXX or contains "Téléc.")
      if (!foundPhone && /^(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(lt)) {
        phoneLine = lt;
        foundPhone = true;
        continue;
      }

      // Field markers
      const fieldMatch = lt.match(/^(Site internet|Courriel|Services|Clientèle|Territoire desservi|Horaire|Frais|Financement|Autre[s]? téléphone[s]?):\s*(.*)$/);
      if (fieldMatch) {
        const map: Record<string, keyof Fiche> = {
          "Site internet": "website",
          Courriel: "email",
          Services: "services",
          Clientèle: "clientele",
          "Territoire desservi": "territoire",
          Horaire: "horaire",
          Frais: "frais",
          Financement: "financement",
        };
        const field = map[fieldMatch[1]];
        if (field) {
          currentField = field;
          fieldBuf[field] = [fieldMatch[2]];
        } else {
          currentField = null;
        }
        continue;
      }

      // Continuation
      if (currentField) {
        fieldBuf[currentField as string].push(lt);
      } else {
        otherLines.push(lt);
      }
    }

    for (const k of Object.keys(fieldBuf)) {
      (f as any)[k] = fieldBuf[k].join(" ").replace(/\s+/g, " ").trim();
    }

    // Parse address: split on commas, last piece = postal, before-last = QC, before = city
    if (addrLine) {
      f.address = addrLine;
      const parts = addrLine.split(",").map((p) => p.trim());
      const postalRe = /[A-Z]\d[A-Z]\s?\d[A-Z]\d/;
      const postalIdx = parts.findIndex((p) => postalRe.test(p));
      if (postalIdx > 0) {
        f.postal = parts[postalIdx].match(postalRe)?.[0];
        // City: skip "Montréal" / "QC" / postal — find the city (the part 2-3 before postal)
        // Pattern: <num+rue>, <city or arrondissement>, <Montréal>, <QC>, <postal>
        // Use the part right before postal that isn't QC and isn't Montréal
        for (let p = postalIdx - 1; p >= 0; p--) {
          const v = parts[p].trim();
          if (!v) continue;
          if (/^(QC|Québec)$/i.test(v)) continue;
          if (/^Montréal$/i.test(v) && postalIdx - p < 3) {
            // skip Montréal label, look further
            continue;
          }
          f.city = v;
          break;
        }
        if (!f.city) f.city = "Montréal";
      }
    }

    // Parse phone
    if (phoneLine) {
      const phoneMatch = phoneLine.match(/^((?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
      if (phoneMatch) f.phone = phoneMatch[1].trim();
      const faxMatch = phoneLine.match(/Téléc\.?:\s*((?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
      if (faxMatch) f.fax = faxMatch[1].trim();
    }

    fiches.push(f);
    continue;
  }

  i++;
}

fs.writeFileSync(OUT_JSON, JSON.stringify(fiches, null, 2));

// Stats
const byCat: Record<string, number> = {};
const noPhone: Fiche[] = [];
const noAddr: Fiche[] = [];
for (const f of fiches) {
  byCat[f.category_pdf || "(?)"] = (byCat[f.category_pdf || "(?)"] || 0) + 1;
  if (!f.phone) noPhone.push(f);
  if (!f.address) noAddr.push(f);
}

console.log(`Total fiches parsed: ${fiches.length}`);
console.log(`Without phone: ${noPhone.length}`);
console.log(`Without address: ${noAddr.length}`);
console.log("");
console.log("By category:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(45)} ${v}`);
}
console.log("");
console.log(`Saved: ${OUT_JSON}`);

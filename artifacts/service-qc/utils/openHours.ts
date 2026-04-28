/**
 * Open-hours parser — best-effort. Returns true / false / null (undetermined).
 *
 * Supports common French / English hour-string patterns we have in our DB:
 *   "24h/24", "24/7", "Ouvert 24h"           → always true
 *   "Lun-Ven 9h-17h"                          → matches weekdays
 *   "Lundi au vendredi 9:00 - 17:00"          → idem
 *   "Lun, Mar, Jeu : 9h-12h, 13h-17h"         → multiple ranges per day
 *   "Mon-Fri 9am-5pm"                         → English
 *   "Ouvert tous les jours 8h-20h"            → 7/7
 *   Anything we cannot parse → null (badge hidden, never wrong info)
 */

const DAYS_FR: Record<string, number> = {
  dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6,
};
const DAYS_EN: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const ALWAYS_OPEN_PATTERNS = [
  /24\s*[h\/]?\s*24/i,
  /24\s*\/\s*7/i,
  /tous?\s*les\s*jours.*24/i,
  /always\s*open/i,
];

const SEVEN_DAY_PATTERNS = [
  /tous?\s*les\s*jours/i,
  /7\s*\/\s*7/i,
  /every\s*day/i,
  /daily/i,
];

function dayCodeToIndex(token: string): number | null {
  const t = token.toLowerCase().slice(0, 3);
  if (t in DAYS_FR) return DAYS_FR[t];
  if (t in DAYS_EN) return DAYS_EN[t];
  if (token.toLowerCase().startsWith("dimanche")) return 0;
  if (token.toLowerCase().startsWith("lundi")) return 1;
  if (token.toLowerCase().startsWith("mardi")) return 2;
  if (token.toLowerCase().startsWith("mercredi")) return 3;
  if (token.toLowerCase().startsWith("jeudi")) return 4;
  if (token.toLowerCase().startsWith("vendredi")) return 5;
  if (token.toLowerCase().startsWith("samedi")) return 6;
  return null;
}

function parseTime(s: string): number | null {
  // "9", "9h", "9h30", "09:00", "9am", "5pm", "17:30"
  const cleaned = s.trim().toLowerCase();
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    if (ampmMatch[3] === "pm" && h < 12) h += 12;
    if (ampmMatch[3] === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  const m = cleaned.match(/^(\d{1,2})(?:[h:](\d{0,2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] && m[2].length > 0 ? parseInt(m[2], 10) : 0;
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Returns:
 *   true  → currently open
 *   false → currently closed
 *   null  → could not determine (no badge)
 */
export function isOpenNow(hoursRaw: string | undefined | null, now: Date = new Date()): boolean | null {
  if (!hoursRaw) return null;
  const hours = hoursRaw.trim();
  if (!hours) return null;

  // Always-open
  for (const re of ALWAYS_OPEN_PATTERNS) if (re.test(hours)) return true;

  // Weekday + hour-range matcher
  // Strategy: split into segments, each may apply to specific days or all days
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  // Try to find at least one applicable range matching today
  // Look for patterns like "Lun-Ven 9h-17h" or "Lundi au vendredi 9:00-17:00"
  // Also "tous les jours 8h-20h"
  const segments = hours.split(/[;|·]/);
  let foundAnyApplicable = false;

  for (const segRaw of segments) {
    const seg = segRaw.trim();
    if (!seg) continue;

    // Determine which days this segment applies to
    let applicableDays: number[] = [];
    let isSeven = SEVEN_DAY_PATTERNS.some((re) => re.test(seg));
    if (isSeven) {
      applicableDays = ALL_DAYS;
    } else {
      // Look for day range "Lun-Ven" / "Mon-Fri"
      const rangeMatch = seg.match(/(lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:[-–]|au|to)\s*(lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (rangeMatch) {
        const a = dayCodeToIndex(rangeMatch[1]);
        const b = dayCodeToIndex(rangeMatch[2]);
        if (a !== null && b !== null) {
          if (a <= b) for (let d = a; d <= b; d++) applicableDays.push(d);
          else { for (let d = a; d <= 6; d++) applicableDays.push(d); for (let d = 0; d <= b; d++) applicableDays.push(d); }
        }
      } else {
        // Look for single day mentions
        const dayMatches = seg.matchAll(/\b(lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi);
        for (const m of dayMatches) {
          const idx = dayCodeToIndex(m[1]);
          if (idx !== null) applicableDays.push(idx);
        }
      }
    }

    if (applicableDays.length === 0) {
      // No day info → assume applies every day
      applicableDays = ALL_DAYS;
    }

    if (!applicableDays.includes(today)) continue;

    // Find hour ranges in this segment "9h-17h", "9:00-17:00", "9am-5pm"
    const rangeRegex = /(\d{1,2}(?:[h:]\d{0,2})?(?:\s*[ap]m)?)\s*[-–à]\s*(\d{1,2}(?:[h:]\d{0,2})?(?:\s*[ap]m)?)/gi;
    let m: RegExpExecArray | null;
    while ((m = rangeRegex.exec(seg))) {
      const start = parseTime(m[1]);
      const end = parseTime(m[2]);
      if (start === null || end === null) continue;
      foundAnyApplicable = true;
      if (start <= end) {
        if (minutesNow >= start && minutesNow < end) return true;
      } else {
        // overnight, e.g. 22h-06h
        if (minutesNow >= start || minutesNow < end) return true;
      }
    }
  }

  return foundAnyApplicable ? false : null;
}

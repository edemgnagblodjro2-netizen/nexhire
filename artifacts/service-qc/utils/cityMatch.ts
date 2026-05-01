/**
 * City name normalization for accurate matching.
 *
 * Why: city names contain accents and prefixes that cause substring collisions
 * (e.g. "Victoria" .includes() matches "Victoriaville", "Laval" matches "Lavaltrie").
 * We normalize before comparison and ALWAYS compare with exact equality, never substring.
 */
export function normalizeCity(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function citiesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeCity(a) === normalizeCity(b);
}

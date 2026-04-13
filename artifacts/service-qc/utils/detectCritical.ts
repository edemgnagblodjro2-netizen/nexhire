export interface CriticalAlert {
  level: "crisis" | "warning";
  numbers: { label: string; number: string }[];
}

const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /\bme tuer\b/i,
  /me suicid/i,
  /envie de mourir/i,
  /plus envie de vivre/i,
  /\bfin de ma vie\b/i,
  /\bme faire du mal\b/i,
  /\bme blesser\b/i,
  /\bj.en peux plus\b/i,
  /\boverdose\b/i,
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /don.t want to live/i,
  /\bself.harm\b/i,
  /\bhurt myself\b/i,
  /\bme matar\b/i,
  /\bquitarme la vida\b/i,
];

const DANGER_PATTERNS = [
  /\ben danger\b/i,
  /\bviolence\b/i,
  /\bviolent\b/i,
  /\bviolée?\b/i,
  /\bagression\b/i,
  /\bfrappée?\b/i,
  /\bbattue?\b/i,
  /\bmenacée?\b/i,
  /\bpeur de ma vie\b/i,
  /\bpeur pour ma vie\b/i,
  /\bconjoint(e)? violent/i,
  /\bharcèlement\b/i,
  /\bunsafe\b/i,
  /\bfear for my life\b/i,
  /\bthreatened\b/i,
  /\bassaulted\b/i,
  /\braped?\b/i,
  /\bdomestic violence\b/i,
  /\bviolencia\b/i,
  /\ben peligro\b/i,
];

export function detectCriticalSituation(text: string): CriticalAlert | null {
  const normalised = text.toLowerCase();

  if (CRISIS_PATTERNS.some((re) => re.test(normalised))) {
    return {
      level: "crisis",
      numbers: [
        { label: "Urgences", number: "911" },
        { label: "Prévention suicide 24h", number: "1-866-277-3553" },
        { label: "Tel-Aide (écoute)", number: "514-935-1101" },
      ],
    };
  }

  if (DANGER_PATTERNS.some((re) => re.test(normalised))) {
    return {
      level: "warning",
      numbers: [
        { label: "Urgences", number: "911" },
        { label: "SOS Violence conjugale 24h", number: "1-800-363-9010" },
        { label: "DPJ (enfants en danger)", number: "1-800-463-9019" },
      ],
    };
  }

  return null;
}

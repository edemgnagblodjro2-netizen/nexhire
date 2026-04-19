export interface CriticalAlert {
  level: "crisis" | "warning" | "violence";
  numbers: { label: string; number: string }[];
  showQuickExit?: boolean;
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
  /\bdose mortelle\b/i,
  /\bsauter du pont\b/i,
  /\ben finir\b/i,
  /\bdisparaître\b/i,
  /\bvaut plus la peine\b/i,
  /\bvaut pas la peine\b/i,
  /\brien à perdre\b/i,
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /don.t want to live/i,
  /\bself.harm\b/i,
  /\bhurt myself\b/i,
  /\bno reason to live\b/i,
  /\bme matar\b/i,
  /\bquitarme la vida\b/i,
  /\bquiero morir\b/i,
  /\banhianm\b/i,
  /انتحار/,
  /أريد الموت/,
];

const VIOLENCE_PATTERNS = [
  /\bconjoint(e)? violent/i,
  /\bmari (me )?frappe/i,
  /\bil (me )?bat\b/i,
  /\bil m.a frappée?\b/i,
  /\bviolence conjugale\b/i,
  /\bviolée?\b/i,
  /\braped?\b/i,
  /\bdomestic violence\b/i,
  /\bagression sexuelle\b/i,
  /\bsexual assault\b/i,
  /\bharcèlement sexuel\b/i,
  /\babusée? sexuellement\b/i,
  /\bil va me tuer\b/i,
  /\bgoing to kill me\b/i,
  /\bafraid of (my husband|my boyfriend|my partner)\b/i,
  /\bpeur de mon (mari|conjoint|chum)\b/i,
];

const DANGER_PATTERNS = [
  /\ben danger\b/i,
  /\bviolence\b/i,
  /\bviolent\b/i,
  /\bagression\b/i,
  /\bfrappée?\b/i,
  /\bbattue?\b/i,
  /\bmenacée?\b/i,
  /\bpeur de ma vie\b/i,
  /\bpeur pour ma vie\b/i,
  /\bharcèlement\b/i,
  /\barme à feu\b/i,
  /\bcouteau\b/i,
  /\bunsafe\b/i,
  /\bfear for my life\b/i,
  /\bthreatened\b/i,
  /\bassaulted\b/i,
  /\bweapon\b/i,
  /\bgun\b/i,
  /\bknife\b/i,
  /\bviolencia\b/i,
  /\ben peligro\b/i,
];

export function detectCriticalSituation(text: string): CriticalAlert | null {
  const normalised = text.toLowerCase();

  if (CRISIS_PATTERNS.some((re) => re.test(normalised))) {
    return {
      level: "crisis",
      numbers: [
        { label: "911 Urgences", number: "911" },
        { label: "988 Suicide Prévention", number: "988" },
        { label: "Suicide Action 24h", number: "1-866-277-3553" },
        { label: "Tel-Aide écoute", number: "514-935-1101" },
      ],
    };
  }

  if (VIOLENCE_PATTERNS.some((re) => re.test(normalised))) {
    return {
      level: "violence",
      showQuickExit: true,
      numbers: [
        { label: "911 Urgences", number: "911" },
        { label: "SOS Violence Conjugale 24h", number: "1-800-363-9010" },
        { label: "Interligne LGBTQ+", number: "1-888-505-1010" },
      ],
    };
  }

  if (DANGER_PATTERNS.some((re) => re.test(normalised))) {
    return {
      level: "warning",
      numbers: [
        { label: "911 Urgences", number: "911" },
        { label: "SOS Violence conjugale 24h", number: "1-800-363-9010" },
        { label: "DPJ enfants en danger", number: "1-800-463-9019" },
      ],
    };
  }

  return null;
}

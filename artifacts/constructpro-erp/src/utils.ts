export function fmt(n: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

const BDG_CLASS: Record<string, string> = {
  actif: 'bg', retard: 'ba', démarrage: 'bb', termine: 'bgr', attente: 'ba',
  soumis: 'bb', accepte: 'bg', impayee: 'ba', refuse: 'br', valide: 'bg',
  'expire-bientot': 'ba', clos: 'bgr', 'en cours': 'bb', mineur: 'bg',
  moyen: 'ba', grave: 'br', disponible: 'bg', partiel: 'ba', conge: 'bgr',
  transit: 'ba', maintenance: 'br', embauche: 'bg', cours: 'bb',
};

const BDG_LABEL: Record<string, string> = {
  actif: 'Actif', retard: 'En retard', démarrage: 'Démarrage', termine: 'Terminé',
  attente: 'En attente', soumis: 'Soumis', accepte: 'Accepté', impayee: 'Impayée',
  refuse: 'Refusé', valide: 'Valide', 'expire-bientot': 'Expire bientôt',
  clos: 'Clos', 'en cours': 'En cours', mineur: 'Mineur', moyen: 'Moyen',
  grave: 'Grave', disponible: 'Disponible', partiel: 'Partiel', conge: 'Congé',
  transit: 'En transit', maintenance: 'Maintenance', embauche: 'Embauché ✓', cours: 'En cours',
};

export function bdgClass(st: string): string {
  return BDG_CLASS[st] || 'bgr';
}

export function bdgLabel(st: string): string {
  return BDG_LABEL[st] || st;
}

export function chantierColor(st: string): string {
  return st === 'retard' ? 'var(--amber)' : 'var(--green)';
}

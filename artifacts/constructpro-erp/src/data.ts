export const CH = [
  { id: 'A', name: 'Résidences du Lac', phase: 'Structure — Dalle B', pct: 74, chef: 'Sophie T.', st: 'actif', budget: 1200000, dep: 890000 },
  { id: 'B', name: 'Entrepôt Industriel', phase: 'Charpente métallique', pct: 41, chef: 'Julie D.', st: 'retard', budget: 850000, dep: 480000 },
  { id: 'C', name: 'Centre Médical Est', phase: 'Fondations', pct: 12, chef: 'Julie D.', st: 'actif', budget: 2100000, dep: 252000 },
  { id: 'D', name: 'Tour Laurier', phase: 'Excavation', pct: 5, chef: 'À affecter', st: 'démarrage', budget: 3400000, dep: 170000 },
  { id: 'E', name: 'Hôtel Nord', phase: 'Finition intérieure', pct: 95, chef: 'Marc L.', st: 'actif', budget: 620000, dep: 589000 },
];

export const EMP = [
  { id: 'ML', nom: 'Marc Leblanc', titre: 'Directeur de projet', cat: 'direction', exp: 12, dispo: 'disponible', chantier: 'Tous', skills: ['Gestion projet', 'Budget', 'CCQ', 'Planification'], av: 'av-t' },
  { id: 'ST', nom: 'Sophie Tremblay', titre: 'Contremaître sénior', cat: 'direction', exp: 9, dispo: 'disponible', chantier: 'A', skills: ['Coffrage', 'Béton', 'SST'], av: 'av-b' },
  { id: 'JD', nom: 'Julie Deschamps', titre: 'Contremaître', cat: 'direction', exp: 6, dispo: 'partiel', chantier: 'B/C', skills: ['Maçonnerie', 'Inspection'], av: 'av-p' },
  { id: 'FR', nom: 'François Roy', titre: 'Charpentier A', cat: 'structure', exp: 8, dispo: 'disponible', chantier: 'A', skills: ['Charpente', 'Coffrage'], av: 'av-a' },
  { id: 'KM', nom: 'Kevin Morin', titre: 'Opérateur machinerie', cat: 'structure', exp: 7, dispo: 'disponible', chantier: 'C', skills: ['Excavatrice', 'Grue', 'Classe 1'], av: 'av-g' },
  { id: 'PB', nom: 'Patrick Bergeron', titre: 'Ferrailleur', cat: 'structure', exp: 5, dispo: 'disponible', chantier: 'A', skills: ['Armature acier', 'Béton armé'], av: 'av-g' },
  { id: 'CL', nom: 'Claude Lapointe', titre: 'Plombier maître', cat: 'mep', exp: 10, dispo: 'partiel', chantier: 'A/E', skills: ['Plomberie', 'Chauffage', 'RBQ'], av: 'av-b' },
  { id: 'LG', nom: 'Louis Gagné', titre: 'Électricien maître', cat: 'mep', exp: 8, dispo: 'disponible', chantier: 'B', skills: ['600V', 'Domotique', 'RBQ'], av: 'av-t' },
  { id: 'NF', nom: 'Nathalie Fortin', titre: 'Finisseur A', cat: 'finition', exp: 6, dispo: 'conge', chantier: '—', skills: ['Peinture', 'Gypse', 'Isolation'], av: 'av-a' },
  { id: 'RL', nom: 'Robert Laberge', titre: 'Carreleur', cat: 'finition', exp: 4, dispo: 'disponible', chantier: 'E', skills: ['Céramique', 'Plancher'], av: 'av-g' },
];

export const CANDIDATS = [
  { nom: 'Mehdi Alaoui', poste: 'Soudeur', exp: '6 ans', st: 'attente', skills: ['TIG/MIG', 'Acier struct.'], date: '10 mai', av: 'av-b' },
  { nom: 'Annie Côté', poste: 'Électricienne', exp: '4 ans', st: 'attente', skills: ['RBQ', '600V'], date: '9 mai', av: 'av-t' },
  { nom: 'Tom Nguyen', poste: 'Soudeur', exp: '3 ans', st: 'attente', skills: ['MIG'], date: '8 mai', av: 'av-g' },
  { nom: 'Pablo Reyes', poste: 'Soudeur', exp: '8 ans', st: 'cours', skills: ['TIG/MIG', 'CWB'], date: 'Entrevue 14 mai', av: 'av-a' },
  { nom: 'Sara Beaulieu', poste: 'Électricienne', exp: '7 ans', st: 'cours', skills: ['RBQ maître', 'Domotique'], date: 'Références', av: 'av-t' },
  { nom: 'Jean-F. Paquin', poste: 'Charpentier', exp: '5 ans', st: 'embauche', skills: ['Charpente'], date: 'Début 19 mai', av: 'av-b' },
  { nom: 'Lise Bergeron', poste: 'Finisseur', exp: '2 ans', st: 'refuse', skills: ['Peinture'], date: 'Archivé', av: 'av-a' },
];

export const INCIDENTS = [
  { id: 'INC-003', ch: 'B', titre: 'Chute matériau — planche 2×4', grav: 'mineur', st: 'clos', date: '10 mai', rap: 'P. Roy', cnesst: true },
  { id: 'INC-002', ch: 'A', titre: 'Quasi-accident — glissade échafaudage', grav: 'moyen', st: 'en cours', date: '8 mai', rap: 'S. Tremblay', cnesst: false },
  { id: 'INC-001', ch: 'C', titre: 'Bris équipement — marteau-piqueur', grav: 'mineur', st: 'clos', date: '2 mai', rap: 'K. Morin', cnesst: false },
];

export const EQUIP = [
  { nom: 'Excavatrice CAT 320', type: 'Machinerie lourde', ch: 'C', st: 'actif', insp: '2025-06-01', h: 1240 },
  { nom: 'Grue mobile Liebherr', type: 'Levage', ch: 'A', st: 'actif', insp: '2025-05-20', h: 890 },
  { nom: 'Compacteur Dynapac', type: 'Compactage', ch: 'D', st: 'transit', insp: '2025-07-01', h: 560 },
  { nom: 'Marteau-piqueur Hilti', type: 'Outillage', ch: 'C', st: 'maintenance', insp: '2025-05-15', h: 340 },
];

export const PERMIS = [
  { proj: 'A', type: 'Permis de construction', num: 'PC-2025-0441', emis: '2025-02-10', exp: '2026-02-10', st: 'valide' },
  { proj: 'B', type: "Permis d'occupation", num: 'PO-2025-0318', emis: '2025-01-15', exp: '2025-12-15', st: 'valide' },
  { proj: 'C', type: 'Permis de construction', num: 'PC-2025-0612', emis: '2025-05-01', exp: '2026-05-01', st: 'valide' },
  { proj: 'D', type: "Permis d'excavation", num: 'PEX-2025-0044', emis: '2025-04-20', exp: '2025-10-20', st: 'valide' },
  { proj: 'E', type: 'Permis de rénovation', num: 'PR-2024-0889', emis: '2024-11-01', exp: '2025-06-01', st: 'expire-bientot' },
];

export const DEVIS = [
  { ref: 'DEV-041', client: 'Groupe Laval Inc.', type: 'Commercial', montant: 320000, date: '2 mai 2025', st: 'attente' },
  { ref: 'DEV-040', client: 'Municipalité St-Lin', type: 'Infra publique', montant: 1200000, date: '28 avr 2025', st: 'soumis' },
  { ref: 'DEV-039', client: 'Résidences Boréal', type: 'Résidentiel', montant: 485000, date: '20 avr 2025', st: 'accepte' },
  { ref: 'FAC-018', client: 'Résidences Boréal', type: 'Facture #1', montant: 150000, date: '5 mai 2025', st: 'impayee' },
  { ref: 'DEV-038', client: 'Logistik Pro', type: 'Industriel', montant: 210000, date: '15 avr 2025', st: 'refuse' },
];

export const SOUST = [
  { nom: 'Béton Nordique Inc.', spec: 'Béton prémélangé', ch: 'A/C', contrat: '145 000$', st: 'actif', rbq: true, cnesst: true },
  { nom: 'Électro-Concept QC', spec: 'Électricité comm.', ch: 'B', contrat: '88 000$', st: 'actif', rbq: true, cnesst: true },
  { nom: 'Plomberie Laurentides', spec: 'Plomberie', ch: 'A', contrat: '62 000$', st: 'attente', rbq: true, cnesst: false },
  { nom: 'Acier Montréal', spec: 'Structure métal', ch: 'B', contrat: '310 000$', st: 'retard', rbq: false, cnesst: true },
];

export const FT = [
  { emp: 'Sophie Tremblay', ch: 'A', date: '2025-05-13', h: 9, taux: 'CCQ-N2', tache: 'Surveillance coulée béton' },
  { emp: 'François Roy', ch: 'A', date: '2025-05-13', h: 8, taux: 'CCQ-N1', tache: 'Coffrage bâtiment C' },
  { emp: 'Kevin Morin', ch: 'C', date: '2025-05-13', h: 10, taux: 'CCQ-OP', tache: 'Excavation zone nord' },
  { emp: 'Louis Gagné', ch: 'B', date: '2025-05-13', h: 8, taux: 'CCQ-EL', tache: 'Installation conduits' },
  { emp: 'Claude Lapointe', ch: 'A', date: '2025-05-12', h: 7, taux: 'CCQ-PL', tache: 'Manchons passage dalle' },
];

export const MATS = [
  { nom: 'Béton prémélangé', u: 'm³', stock: 42, min: 150, c: 'C' },
  { nom: 'Acier en barre', u: 't', stock: 8.5, min: 12, c: 'B' },
  { nom: 'Isolant fibre de verre', u: 'rouleaux', stock: 35, min: 80, c: 'A' },
  { nom: 'Bois de charpente', u: 'm²', stock: 620, min: 400, c: 'A' },
  { nom: 'Gravier 0-20mm', u: 'm³', stock: 310, min: 200, c: 'B' },
  { nom: 'Fenêtres PVC std.', u: 'unités', stock: 24, min: 10, c: 'E' },
];

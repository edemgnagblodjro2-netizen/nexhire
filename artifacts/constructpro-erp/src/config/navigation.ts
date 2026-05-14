export type Role = 'bureau' | 'terrain' | 'client';

export interface NavItem {
  id?: string;
  icon: string;
  label: string;
  badge?: number;
}

export interface NavGroup {
  s: string;
  items: NavItem[];
  locked?: boolean;
}

export interface RoleConfig {
  label: string;
  uname: string;
  utitle: string;
  av: string;
  avc: string;
  nav: NavGroup[];
  defaultPanel: string;
}

export const ROLES: Record<Role, RoleConfig> = {
  bureau: {
    label: "Espace bureau",
    uname: "Marc Leblanc",
    utitle: "Direction",
    av: "ML",
    avc: "av-t",
    defaultPanel: 'dashboard',
    nav: [
      { s: "Vue d'ensemble", items: [
        { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Tableau de bord' },
        { id: 'chantiers', icon: 'ti-crane', label: 'Chantiers' },
      ]},
      { s: "Opérations", items: [
        { id: 'feuilles', icon: 'ti-clock', label: 'Feuilles de temps' },
        { id: 'rapports', icon: 'ti-file-description', label: 'Rapports journaliers' },
        { id: 'equipements', icon: 'ti-bulldozer', label: 'Équipements' },
        { id: 'materiaux', icon: 'ti-package', label: 'Matériaux & stocks' },
      ]},
      { s: "RH & Équipe", items: [
        { id: 'equipe', icon: 'ti-users', label: 'Équipe & compétences' },
        { id: 'affectation', icon: 'ti-arrows-transfer-up', label: 'Affectation & Gantt' },
        { id: 'recrutement', icon: 'ti-user-plus', label: 'Recrutement', badge: 3 },
        { id: 'formation', icon: 'ti-certificate', label: 'Formations & SST' },
      ]},
      { s: "Finance", items: [
        { id: 'devis', icon: 'ti-file-invoice', label: 'Devis & facturation' },
        { id: 'sous-traitants', icon: 'ti-briefcase', label: 'Sous-traitants' },
        { id: 'budget', icon: 'ti-chart-bar', label: 'Budget & rapports' },
      ]},
      { s: "Conformité", items: [
        { id: 'permis', icon: 'ti-license', label: 'Permis & conformité' },
        { id: 'incidents', icon: 'ti-alert-triangle', label: 'Incidents SST', badge: 1 },
        { id: 'plans', icon: 'ti-blueprint', label: 'Plans & dessins' },
      ]},
      { s: "Système", items: [
        { id: 'roles', icon: 'ti-shield', label: 'Rôles & accès' },
        { id: 'communication', icon: 'ti-message-circle', label: 'Communications' },
        { id: 'client-portail', icon: 'ti-user-circle', label: 'Portail client' },
      ]},
    ],
  },
  terrain: {
    label: "Espace terrain",
    uname: "Sophie Tremblay",
    utitle: "Contremaître sénior",
    av: "ST",
    avc: "av-b",
    defaultPanel: 'terrain-accueil',
    nav: [
      { s: "Mon chantier", items: [
        { id: 'terrain-accueil', icon: 'ti-home', label: 'Accueil' },
        { id: 'terrain-taches', icon: 'ti-checkbox', label: 'Mes tâches' },
        { id: 'terrain-rapport', icon: 'ti-file-text', label: 'Rapport journalier' },
        { id: 'terrain-pointage', icon: 'ti-clock', label: 'Mon pointage' },
      ]},
      { s: "Chantier A", items: [
        { id: 'terrain-materiaux', icon: 'ti-package', label: 'Matériaux' },
        { id: 'terrain-plans', icon: 'ti-blueprint', label: 'Plans (lecture)' },
        { id: 'terrain-incidents', icon: 'ti-alert-triangle', label: 'Signaler incident' },
      ]},
      { s: "Communication", items: [
        { id: 'communication', icon: 'ti-message-circle', label: 'Messages' },
      ]},
      { s: "Bloqué — bureau", locked: true, items: [
        { icon: 'ti-lock', label: 'Finances & devis' },
        { icon: 'ti-lock', label: 'Paie & salaires' },
        { icon: 'ti-lock', label: 'Recrutement RH' },
        { icon: 'ti-lock', label: 'Dossiers employés' },
      ]},
    ],
  },
  client: {
    label: "Portail client",
    uname: "Jean Brodeur",
    utitle: "Client — Résidences Boréal",
    av: "JB",
    avc: "av-gr",
    defaultPanel: 'client-dashboard',
    nav: [
      { s: "Mon projet", items: [
        { id: 'client-dashboard', icon: 'ti-home', label: 'Avancement' },
        { id: 'client-docs', icon: 'ti-file', label: 'Documents' },
        { id: 'client-factures', icon: 'ti-receipt', label: 'Factures' },
        { id: 'client-photos', icon: 'ti-camera', label: 'Photos chantier' },
      ]},
    ],
  },
};

export const PANEL_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  chantiers: 'Chantiers',
  feuilles: 'Feuilles de temps CCQ',
  rapports: 'Rapports journaliers',
  equipements: 'Équipements & machinerie',
  materiaux: 'Matériaux & stocks',
  equipe: 'Équipe & compétences',
  affectation: 'Affectation & planification',
  recrutement: 'Recrutement RH',
  formation: 'Formations & SST',
  devis: 'Devis & facturation',
  'sous-traitants': 'Sous-traitants',
  budget: 'Budget & rapports',
  permis: 'Permis & conformité',
  incidents: 'Incidents SST',
  plans: 'Plans & dessins',
  roles: 'Rôles & accès',
  communication: 'Communications',
  'client-portail': 'Portail client',
  'terrain-accueil': 'Mon accueil',
  'terrain-taches': 'Mes tâches',
  'terrain-rapport': 'Rapport journalier',
  'terrain-pointage': 'Mon pointage',
  'terrain-materiaux': 'Matériaux chantier',
  'terrain-plans': 'Plans (lecture)',
  'terrain-incidents': 'Signaler un incident',
  'client-dashboard': 'Avancement de mon projet',
  'client-docs': 'Mes documents',
  'client-factures': 'Mes factures',
  'client-photos': 'Photos du chantier',
};

export const PANEL_ICONS: Record<string, string> = {
  dashboard: 'ti-layout-dashboard',
  chantiers: 'ti-crane',
  feuilles: 'ti-clock',
  rapports: 'ti-file-description',
  equipements: 'ti-bulldozer',
  materiaux: 'ti-package',
  equipe: 'ti-users',
  affectation: 'ti-arrows-transfer-up',
  recrutement: 'ti-user-plus',
  formation: 'ti-certificate',
  devis: 'ti-file-invoice',
  'sous-traitants': 'ti-briefcase',
  budget: 'ti-chart-bar',
  permis: 'ti-license',
  incidents: 'ti-alert-triangle',
  plans: 'ti-blueprint',
  roles: 'ti-shield',
  communication: 'ti-message-circle',
  'client-portail': 'ti-user-circle',
  'terrain-accueil': 'ti-home',
  'terrain-taches': 'ti-checkbox',
  'terrain-rapport': 'ti-file-text',
  'terrain-pointage': 'ti-clock',
  'terrain-materiaux': 'ti-package',
  'terrain-plans': 'ti-blueprint',
  'terrain-incidents': 'ti-alert-triangle',
  'client-dashboard': 'ti-home',
  'client-docs': 'ti-file',
  'client-factures': 'ti-receipt',
  'client-photos': 'ti-camera',
};

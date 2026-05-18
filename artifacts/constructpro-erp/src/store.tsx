import { createContext, useContext, useState, ReactNode } from 'react';
import { CH, DEVIS, FT, CANDIDATS, INCIDENTS, MATS } from './data';

export type Chantier   = typeof CH[number]      & { pct: number; st: string; phase: string };
export type Devis      = typeof DEVIS[number];
export type Feuille    = typeof FT[number];
export type Candidat   = typeof CANDIDATS[number];
export type Incident   = typeof INCIDENTS[number];
export type Materiau   = typeof MATS[number];

interface Store {
  chantiers:  Chantier[];
  devis:      Devis[];
  feuilles:   Feuille[];
  candidats:  Candidat[];
  incidents:  Incident[];
  materiaux:  Materiau[];

  updateChantier:   (id: string, changes: Partial<Chantier>) => void;
  addDevis:         (d: Omit<Devis, 'ref'>) => void;
  updateDevis:      (ref: string, changes: Partial<Devis>) => void;
  addFeuille:       (f: Feuille) => void;
  updateCandidat:   (nom: string, st: string) => void;
  addIncident:      (i: Incident) => void;
  updateMateriau:   (nom: string, changes: Partial<Materiau>) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [chantiers,  setChantiers]  = useState<Chantier[]>(CH as Chantier[]);
  const [devis,      setDevis]      = useState<Devis[]>(DEVIS as Devis[]);
  const [feuilles,   setFeuilles]   = useState<Feuille[]>(FT as Feuille[]);
  const [candidats,  setCandidats]  = useState<Candidat[]>(CANDIDATS as Candidat[]);
  const [incidents,  setIncidents]  = useState<Incident[]>(INCIDENTS as Incident[]);
  const [materiaux,  setMateriaux]  = useState<Materiau[]>(MATS as Materiau[]);

  const nextRef = () => `DEV-${String(Math.max(...devis.filter(d=>d.ref.startsWith('DEV')).map(d=>parseInt(d.ref.split('-')[1]||'0'))) + 1).padStart(3,'0')}`;

  return (
    <Ctx.Provider value={{
      chantiers, devis, feuilles, candidats, incidents, materiaux,
      updateChantier: (id, ch) => setChantiers(prev => prev.map(c => c.id === id ? { ...c, ...ch } : c)),
      addDevis:       (d)      => setDevis(prev => [{ ...d, ref: nextRef() }, ...prev]),
      updateDevis:    (ref, ch)=> setDevis(prev => prev.map(d => d.ref === ref ? { ...d, ...ch } : d)),
      addFeuille:     (f)      => setFeuilles(prev => [f, ...prev]),
      updateCandidat: (nom,st) => setCandidats(prev => prev.map(c => c.nom === nom ? { ...c, st } : c)),
      addIncident:    (i)      => setIncidents(prev => [i, ...prev]),
      updateMateriau: (nom,ch) => setMateriaux(prev => prev.map(m => m.nom === nom ? { ...m, ...ch } : m)),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}

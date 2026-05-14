import { useState } from 'react';

const TASKS = [
  { t: 'Vérifier coffrages avant coulée béton bâtiment B', prio: 'haute', done: true, d: 'Auj.' },
  { t: 'Valider armatures avec Patrick Bergeron', prio: 'haute', done: true, d: 'Auj.' },
  { t: 'Rapport journalier fin de journée', prio: 'normale', done: false, d: 'Auj. 16h' },
  { t: 'Réunion coordination équipe 16h', prio: 'normale', done: false, d: 'Auj. 16h' },
  { t: 'Inspecter zone barricadée dalle B', prio: 'haute', done: false, d: 'Demain' },
  { t: 'Coordonner livraison matériaux bâtiment C', prio: 'normale', done: false, d: 'Jeudi' },
];

export default function TerrainTaches() {
  const [checked, setChecked] = useState(TASKS.map(t => t.done));

  return (
    <div className="card">
      <div className="chdr"><div className="ctitle"><i className="ti ti-checkbox" />Mes tâches — semaine du 13 mai</div></div>
      {TASKS.map((tk, i) => (
        <div key={i} className="chi" onClick={() => setChecked(prev => prev.map((v, j) => j === i ? !v : v))}>
          <div className={`chb ${checked[i] ? 'chk' : ''}`}>
            {checked[i] && <i className="ti ti-check" />}
          </div>
          <span className="chlbl" style={{ flex: 1, ...(checked[i] ? { textDecoration: 'line-through', color: 'var(--txt3)' } : {}) }}>{tk.t}</span>
          <span className={`bdg ${tk.prio === 'haute' ? 'br' : 'bgr'}`}>{tk.prio}</span>
          <span style={{ fontSize: 10, color: 'var(--txt3)', marginLeft: 6 }}>{tk.d}</span>
        </div>
      ))}
    </div>
  );
}

import AlertBanner from '../../components/AlertBanner';
import ProgressBar from '../../components/ProgressBar';

const MATS_TERRAIN = [
  { n: 'Bois de charpente', s: 620, max: 800, l: '—' },
  { n: 'Béton (livraison auj.)', s: 42, max: 200, l: "Aujourd'hui 14h" },
  { n: 'Isolant fibre de verre', s: 35, max: 100, l: 'Vendredi' },
  { n: 'Armatures acier', s: 180, max: 300, l: '—' },
];

export default function TerrainMateriaux() {
  return (
    <>
      <AlertBanner variant="b" icon="ti-info-circle">
        Vue terrain: quantités seulement. Prix et fournisseurs masqués.
      </AlertBanner>
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-package" />Matériaux — Chantier A</div></div>
        <table className="tbl">
          <thead>
            <tr><th>Matériau</th><th>Disponible</th><th>Niveau</th><th>Livraison prévue</th></tr>
          </thead>
          <tbody>
            {MATS_TERRAIN.map((m, i) => {
              const pct = Math.round(m.s / m.max * 100);
              const mc = pct < 30 ? 'var(--red)' : pct < 60 ? 'var(--amber)' : 'var(--green)';
              return (
                <tr key={i}>
                  <td><strong>{m.n}</strong></td>
                  <td>{m.s} / {m.max}</td>
                  <td style={{ width: 90 }}><ProgressBar pct={pct} color={mc} /></td>
                  <td style={{ color: m.l.includes('hui') ? 'var(--blue)' : 'var(--txt2)' }}>{m.l}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

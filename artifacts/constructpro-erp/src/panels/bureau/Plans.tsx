const PLANS = [
  { doc: 'Plan structural R+1 — dalle B', c: 'A', ver: 'v3.2', appro: 'Ing. Simard', date: '10 mai', terrain: true },
  { doc: 'Plan électrique RDC', c: 'B', ver: 'v1.0', appro: 'Ing. Côté', date: '5 mai', terrain: true },
  { doc: 'Plan plomberie — colonnes', c: 'A', ver: 'v2.1', appro: 'En attente', date: '—', terrain: false },
  { doc: 'Coupe transversale fondations', c: 'C', ver: 'v1.0', appro: 'Ing. Simard', date: '1 mai', terrain: true },
  { doc: 'Devis descriptif complet', c: 'D', ver: 'v1.0', appro: 'Arch. Larivée', date: '20 avr.', terrain: false },
];

export default function Plans() {
  return (
    <div className="card">
      <div className="chdr">
        <div className="ctitle"><i className="ti ti-blueprint" />Plans & dessins techniques</div>
        <button className="btn pri"><i className="ti ti-upload" /> Déposer plan</button>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Document</th><th>Chantier</th><th>Version</th><th>Approuvé par</th><th>Date</th><th>Accès terrain</th></tr>
        </thead>
        <tbody>
          {PLANS.map((p, i) => (
            <tr key={i}>
              <td><strong>{p.doc}</strong></td>
              <td><span className="bdg bb">{p.c}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.ver}</td>
              <td style={p.appro === 'En attente' ? { color: 'var(--amber)' } : { color: 'var(--txt2)' }}>{p.appro}</td>
              <td style={{ color: 'var(--txt2)' }}>{p.date}</td>
              <td>{p.terrain ? <span className="bdg bg">✓ Visible terrain</span> : <span className="bdg bgr">Bureau seul</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

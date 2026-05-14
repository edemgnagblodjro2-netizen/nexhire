import Badge from '../../components/Badge';
import { fmt } from '../../utils';

const FACTURES = [
  { ref: 'FAC-018', desc: 'Acompte 1 — Fondations', montant: 150000, date: '5 mai 2025', st: 'impayee', echeance: '20 mai 2025' },
  { ref: 'FAC-015', desc: 'Acompte initial — signature', montant: 100000, date: '25 mars 2025', st: 'actif', echeance: '10 avr. 2025' },
];

export default function ClientFactures() {
  return (
    <>
      <div className="krow k2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi"><div className="klbl">Total facturé</div><div className="kval" style={{ fontSize: 16 }}>250 000$</div></div>
        <div className="kpi"><div className="klbl">Payé</div><div className="kval" style={{ fontSize: 16, color: 'var(--green)' }}>100 000$</div></div>
        <div className="kpi"><div className="klbl">En attente</div><div className="kval" style={{ fontSize: 16, color: 'var(--red)' }}>150 000$</div></div>
      </div>
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-receipt" />Mes factures</div></div>
        <table className="tbl">
          <thead>
            <tr><th>Réf.</th><th>Description</th><th>Montant</th><th>Émise</th><th>Échéance</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {FACTURES.map((f, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--txt2)' }}>{f.ref}</td>
                <td><strong>{f.desc}</strong></td>
                <td style={{ fontWeight: 600 }}>{fmt(f.montant)}</td>
                <td style={{ color: 'var(--txt2)' }}>{f.date}</td>
                <td style={{ color: f.st === 'impayee' ? 'var(--amber)' : 'var(--txt2)', fontWeight: f.st === 'impayee' ? 600 : undefined }}>{f.echeance}</td>
                <td><Badge st={f.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

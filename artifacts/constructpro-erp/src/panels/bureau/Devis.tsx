import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { DEVIS } from '../../data';
import { fmt } from '../../utils';

export default function Devis() {
  return (
    <>
      <div className="krow k4">
        <KpiCard label="Devis ce mois" value="8" />
        <KpiCard label="Taux acceptation" value="62%" />
        <KpiCard label="Valeur soumise" value="3,1M$" />
        <KpiCard label="Impayées" value="540K$" valueColor="var(--red)" />
      </div>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-file-invoice" />Devis & facturation</div>
          <button className="btn pri"><i className="ti ti-plus" /> Nouveau devis</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Réf.</th><th>Client</th><th>Type</th><th>Montant</th><th>Date</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {DEVIS.map((d, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--txt2)' }}>{d.ref}</td>
                <td><strong>{d.client}</strong></td>
                <td><span className="bdg bgr">{d.type}</span></td>
                <td style={{ fontWeight: 600 }}>{fmt(d.montant)}</td>
                <td style={{ color: 'var(--txt2)' }}>{d.date}</td>
                <td><Badge st={d.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

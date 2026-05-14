import Badge from '../../components/Badge';
import AlertBanner from '../../components/AlertBanner';
import { PERMIS } from '../../data';

export default function Permis() {
  return (
    <>
      <AlertBanner variant="a" icon="ti-alert-triangle">
        <strong>Permis Hôtel Nord</strong> expire le 1er juin 2025. Renouveler avant le 25 mai.
      </AlertBanner>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-license" />Permis de construction & conformité</div>
          <button className="btn pri"><i className="ti ti-plus" /> Ajouter permis</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Projet</th><th>Type</th><th>N° permis</th><th>Émis</th><th>Expire</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {PERMIS.map((p, i) => (
              <tr key={i}>
                <td><span className="bdg bb">{p.proj}</span></td>
                <td style={{ fontWeight: 500 }}>{p.type}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--txt2)' }}>{p.num}</td>
                <td style={{ color: 'var(--txt2)' }}>{p.emis}</td>
                <td style={p.st === 'expire-bientot' ? { color: 'var(--amber)', fontWeight: 600 } : { color: 'var(--txt2)' }}>{p.exp}</td>
                <td><Badge st={p.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

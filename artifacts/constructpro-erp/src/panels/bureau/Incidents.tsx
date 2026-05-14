import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { INCIDENTS } from '../../data';

export default function Incidents() {
  return (
    <>
      <div className="krow k4">
        <KpiCard label="Incidents YTD" value="3" />
        <KpiCard label="Ouverts" value="1" valueColor="var(--red)" />
        <KpiCard label="Déclarés CNESST" value="1" />
        <KpiCard label="Jours sans incident" value="3" valueColor="var(--green)" />
      </div>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-alert-triangle" />Registre SST</div>
          <button className="btn red"><i className="ti ti-alert-triangle" /> Signaler incident</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>ID</th><th>Chantier</th><th>Description</th><th>Gravité</th><th>CNESST</th><th>Date</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {INCIDENTS.map((inc, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--txt2)' }}>{inc.id}</td>
                <td><span className="bdg bb">{inc.ch}</span></td>
                <td style={{ fontSize: 11 }}>{inc.titre}</td>
                <td><Badge st={inc.grav} /></td>
                <td>{inc.cnesst ? <span className="bdg bg">Soumis</span> : <span className="bdg bgr">N/A</span>}</td>
                <td style={{ color: 'var(--txt2)' }}>{inc.date}</td>
                <td><Badge st={inc.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

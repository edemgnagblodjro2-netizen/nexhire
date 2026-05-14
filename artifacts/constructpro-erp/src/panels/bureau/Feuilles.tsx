import AlertBanner from '../../components/AlertBanner';
import { FT } from '../../data';

export default function Feuilles() {
  return (
    <>
      <AlertBanner variant="b" icon="ti-info-circle">
        Heures conformes à la classification CCQ. Export automatique disponible pour la paie.
      </AlertBanner>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-clock" />Feuilles de temps — semaine du 12 mai 2025</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" onClick={() => alert('Export CCQ simulé!')}><i className="ti ti-download" /> Export CCQ</button>
            <button className="btn pri"><i className="ti ti-plus" /> Nouvelle entrée</button>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Chantier</th>
              <th>Date</th>
              <th>Heures</th>
              <th>Classification</th>
              <th>Tâche</th>
            </tr>
          </thead>
          <tbody>
            {FT.map((f, i) => (
              <tr key={i}>
                <td><strong>{f.emp}</strong></td>
                <td><span className="bdg bb">{f.ch}</span></td>
                <td style={{ color: 'var(--txt2)' }}>{f.date}</td>
                <td><strong>{f.h}h</strong></td>
                <td><span className="bdg bp" style={{ fontFamily: 'monospace' }}>{f.taux}</span></td>
                <td style={{ color: 'var(--txt2)' }}>{f.tache}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertBanner variant="g" icon="ti-check">
        Mode hors-ligne supporté — les pointages sont sauvegardés localement et synchronisés au retour réseau.
      </AlertBanner>
    </>
  );
}

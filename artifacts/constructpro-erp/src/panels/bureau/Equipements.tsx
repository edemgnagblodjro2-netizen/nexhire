import Badge from '../../components/Badge';
import AlertBanner from '../../components/AlertBanner';
import { EQUIP } from '../../data';

export default function Equipements() {
  return (
    <>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-bulldozer" />Parc d'équipements</div>
          <button className="btn pri"><i className="ti ti-plus" /> Ajouter</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Équipement</th><th>Type</th><th>Chantier</th><th>Heures</th><th>Inspection</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {EQUIP.map((e, i) => {
              const urgent = e.insp <= '2025-05-20';
              return (
                <tr key={i}>
                  <td><strong>{e.nom}</strong></td>
                  <td><span className="bdg bgr">{e.type}</span></td>
                  <td><span className="bdg bb">{e.ch}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.h}h</td>
                  <td style={urgent ? { color: 'var(--amber)', fontWeight: 600 } : { color: 'var(--txt2)' }}>{e.insp}</td>
                  <td><Badge st={e.st} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AlertBanner variant="a" icon="ti-tool">
        <strong>Inspection imminente</strong> — Grue mobile Liebherr avant le 20 mai.
      </AlertBanner>
    </>
  );
}

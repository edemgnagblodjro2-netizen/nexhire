import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { EMP } from '../../data';

export default function Equipe() {
  return (
    <>
      <div className="krow k4">
        <KpiCard label="Effectif total" value="18" />
        <KpiCard label="Disponibles" value="14" />
        <KpiCard label="Partiel / congé" value="4" />
        <KpiCard label="Postes à combler" value="3" valueColor="var(--red)" />
      </div>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-users" />Répertoire équipe</div>
          <button className="btn pri"><i className="ti ti-plus" /> Ajouter employé</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Employé</th><th>Titre</th><th>Catégorie</th><th>Exp.</th><th>Compétences</th><th>Chantier</th><th>Dispo</th></tr>
          </thead>
          <tbody>
            {EMP.map((e, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div className={`av-sm ${e.av}`}>{e.id}</div>
                    <strong>{e.nom}</strong>
                  </div>
                </td>
                <td style={{ color: 'var(--txt2)' }}>{e.titre}</td>
                <td><span className="bdg bgr">{e.cat}</span></td>
                <td>{e.exp} ans</td>
                <td>{e.skills.slice(0, 2).map((s, j) => <span key={j} className="tag">{s}</span>)}</td>
                <td><span className="bdg bb">{e.chantier}</span></td>
                <td><Badge st={e.dispo} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

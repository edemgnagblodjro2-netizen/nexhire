import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import KpiCard from '../../components/KpiCard';
import { MATS } from '../../data';

export default function Materiaux() {
  return (
    <>
      <div className="krow k4">
        <KpiCard label="Références actives" value="148" />
        <KpiCard label="Alertes stock bas" value="4" valueColor="var(--red)" />
        <KpiCard label="Commandes en transit" value="6" />
        <KpiCard label="Valeur en stock" value="284K$" />
      </div>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-package" />Inventaire principal</div>
          <button className="btn pri"><i className="ti ti-plus" /> Commander</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Matériau</th><th>Unité</th><th>En stock</th><th>Min.</th><th>Chantier</th><th>Niveau</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {MATS.map((m, i) => {
              const pct = Math.min(Math.round(m.stock / m.min * 100), 100);
              const mc = pct < 50 ? 'var(--red)' : pct < 75 ? 'var(--amber)' : 'var(--green)';
              const ms = pct < 50 ? 'retard' : pct < 75 ? 'attente' : 'actif';
              return (
                <tr key={i}>
                  <td><strong>{m.nom}</strong></td>
                  <td style={{ color: 'var(--txt2)' }}>{m.u}</td>
                  <td><strong>{m.stock}</strong></td>
                  <td style={{ color: 'var(--txt2)' }}>{m.min}</td>
                  <td><span className="bdg bb">{m.c}</span></td>
                  <td style={{ width: 80 }}><ProgressBar pct={pct} color={mc} /></td>
                  <td><Badge st={ms} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

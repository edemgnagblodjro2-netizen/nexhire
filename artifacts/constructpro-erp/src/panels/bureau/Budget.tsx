import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import AlertBanner from '../../components/AlertBanner';
import ProgressBar from '../../components/ProgressBar';
import { CH } from '../../data';
import { fmt } from '../../utils';

export default function Budget() {
  return (
    <>
      <AlertBanner variant="r" icon="ti-lock">
        <strong>Section confidentielle — bureau seulement.</strong> Non visible par l'équipe terrain.
      </AlertBanner>
      <div className="krow k4">
        <KpiCard label="Budget total engagé" value="8,2M$" />
        <KpiCard label="Dépenses YTD" value="2,4M$" />
        <KpiCard label="Marge brute" value="342K$" valueColor="var(--green)" />
        <KpiCard label="Masse salariale/mois" value="312K$" />
      </div>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-chart-bar" />Budget par chantier</div>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Chantier</th><th>Budget</th><th>Dépensé</th><th>Reste</th><th>Utilisation</th><th>Santé</th></tr>
          </thead>
          <tbody>
            {CH.map((c, i) => {
              const pctB = Math.round(c.dep / c.budget * 100);
              const reste = c.budget - c.dep;
              const bcolor = pctB > 90 ? 'var(--red)' : pctB > 70 ? 'var(--amber)' : 'var(--blue)';
              const bst = pctB > 90 ? 'retard' : pctB > 70 ? 'attente' : 'actif';
              return (
                <tr key={i}>
                  <td><strong>{c.id} · {c.name.split(' ').slice(0, 2).join(' ')}</strong></td>
                  <td>{fmt(c.budget)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(c.dep)}</td>
                  <td>{fmt(reste)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="pb" style={{ width: 60 }}>
                        <div className="pf" style={{ width: `${pctB}%`, background: bcolor }} />
                      </div>
                      {pctB}%
                    </div>
                  </td>
                  <td><Badge st={bst} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

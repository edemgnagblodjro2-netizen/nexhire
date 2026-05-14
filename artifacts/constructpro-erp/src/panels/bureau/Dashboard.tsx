import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import KpiCard from '../../components/KpiCard';
import AlertBanner from '../../components/AlertBanner';
import { CH, FT } from '../../data';
import { fmt, chantierColor } from '../../utils';

export default function Dashboard() {
  const todayFT = FT.filter(f => f.date === '2025-05-13');
  return (
    <>
      <div className="krow k4">
        <KpiCard label="Chantiers actifs" value="5" sub="↑ +1 ce mois" subColor="var(--green)" />
        <KpiCard label="Valeur en cours" value="8,2M$" sub="5 projets" />
        <KpiCard label="Employés actifs" value="44" sub="sur 52 total" />
        <KpiCard label="Incidents ouverts" value="1" valueColor="var(--red)" sub="Action requise" subColor="var(--red)" />
      </div>

      <div className="g2">
        <div>
          <div className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-crane" />Avancement chantiers</div>
            </div>
            {CH.map(c => {
              const pctBudget = Math.round(c.dep / c.budget * 100);
              return (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.id} · {c.name}</span>
                    <Badge st={c.st} />
                  </div>
                  <ProgressBar pct={c.pct} color={chantierColor(c.st)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>
                    <span>{c.phase} · {c.chef}</span>
                    <span>{c.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-alert-triangle" />Alertes & actions requises</div>
            </div>
            <AlertBanner variant="r" icon="ti-alert-triangle"><strong>Soudeur manquant</strong> — Entrepôt Industriel bloqué phase charpente</AlertBanner>
            <AlertBanner variant="a" icon="ti-package"><strong>Stock béton critique</strong> — 42m³ restants, seuil min. 150m³</AlertBanner>
            <AlertBanner variant="a" icon="ti-license"><strong>Permis rénov. Hôtel Nord</strong> expire le 1er juin 2025</AlertBanner>
            <AlertBanner variant="b" icon="ti-user-plus"><strong>3 candidats</strong> en attente de révision RH</AlertBanner>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-cash" />Finances — bureau seulement</div>
              <span className="bdg br"><i className="ti ti-lock" /> Confidentiel</span>
            </div>
            <div className="krow k2">
              <div className="kpi"><div className="klbl">Marge brute YTD</div><div className="kval" style={{ fontSize: 16 }}>342K$</div></div>
              <div className="kpi"><div className="klbl">Factures impayées</div><div className="kval" style={{ fontSize: 16, color: 'var(--red)' }}>540K$</div></div>
              <div className="kpi"><div className="klbl">Masse salariale/mois</div><div className="kval" style={{ fontSize: 16 }}>312K$</div></div>
              <div className="kpi"><div className="klbl">Devis signés YTD</div><div className="kval" style={{ fontSize: 16 }}>8/11</div></div>
            </div>
          </div>

          <div className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-clock" />Pointages du jour</div>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>Employé</th><th>Chantier</th><th>Heures</th></tr>
              </thead>
              <tbody>
                {todayFT.map((f, i) => {
                  const parts = f.emp.split(' ');
                  return (
                    <tr key={i}>
                      <td>{parts[0]} {parts[1][0]}.</td>
                      <td><span className="bdg bb">{f.ch}</span></td>
                      <td><strong>{f.h}h</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-user-plus" />Recrutement pipeline</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div><div style={{ fontSize: 20, fontWeight: 700 }}>3</div><div style={{ fontSize: 10, color: 'var(--txt2)' }}>En attente</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>2</div><div style={{ fontSize: 10, color: 'var(--txt2)' }}>En cours</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>1</div><div style={{ fontSize: 10, color: 'var(--txt2)' }}>Embauché</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>3</div><div style={{ fontSize: 10, color: 'var(--txt2)' }}>Postes vacants</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import { CH } from '../../data';
import { fmt, chantierColor } from '../../utils';

export default function Chantiers() {
  return (
    <>
      <div className="krow k4" style={{ gridTemplateColumns: `repeat(${CH.length}, 1fr)` }}>
        {CH.map(c => (
          <div key={c.id} className="kpi">
            <div className="klbl">Chantier {c.id}</div>
            <div className="kval" style={{ fontSize: 16 }}>{c.pct}%</div>
            <div className="ksub"><Badge st={c.st} /></div>
          </div>
        ))}
      </div>

      {CH.map(c => {
        const pctB = Math.round(c.dep / c.budget * 100);
        const reste = c.budget - c.dep;
        const bcolor = pctB > 90 ? 'var(--red)' : 'var(--blue)';
        return (
          <div key={c.id} className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-crane" />{c.id} · {c.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge st={c.st} />
                <span className="bdg bgr">{c.chef}</span>
              </div>
            </div>
            <div className="g2">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--txt2)' }}>Avancement</span>
                  <strong>{c.pct}%</strong>
                </div>
                <ProgressBar pct={c.pct} color={chantierColor(c.st)} />
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>Phase: <strong>{c.phase}</strong></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--txt2)' }}>Budget</span>
                  <span>{fmt(c.budget)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--txt2)' }}>Dépensé</span>
                  <span>{fmt(c.dep)} ({pctB}%)</span>
                </div>
                <ProgressBar pct={pctB} color={bcolor} />
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>Reste: {fmt(reste)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

import Badge from '../../components/Badge';
import { CH, EMP } from '../../data';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'Jl', 'A', 'S', 'O', 'N', 'D'];

const GANTT_DATA = [
  { id: 'A', phases: [{ s: 2, e: 4, c: '#5DCAA5', l: 'Fond.' }, { s: 4, e: 8, c: '#378ADD', l: 'Struct.' }, { s: 7, e: 10, c: '#EF9F27', l: 'MEP' }, { s: 9, e: 11, c: '#AFA9EC', l: 'Fin.' }] },
  { id: 'B', phases: [{ s: 1, e: 3, c: '#5DCAA5', l: 'Fond.' }, { s: 3, e: 9, c: '#378ADD', l: 'Struct.' }, { s: 8, e: 11, c: '#EF9F27', l: 'MEP' }] },
  { id: 'C', phases: [{ s: 5, e: 7, c: '#5DCAA5', l: 'Fond.' }, { s: 7, e: 11, c: '#378ADD', l: 'Struct.' }] },
  { id: 'D', phases: [{ s: 4, e: 6, c: '#5DCAA5', l: 'Excav.' }, { s: 6, e: 10, c: '#378ADD', l: 'Struct.' }] },
  { id: 'E', phases: [{ s: 0, e: 2, c: '#EF9F27', l: 'MEP' }, { s: 2, e: 5, c: '#AFA9EC', l: 'Fin.' }] },
];

export default function Affectation() {
  return (
    <div className="g2">
      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-arrows-transfer-up" />Délégations par chantier</div></div>
          {CH.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--bord)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.id} · {c.name}</span>
                <Badge st={c.st} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {EMP.filter(e => e.chantier.includes(c.id)).map(e2 => (
                  <div key={e2.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--surf2)', borderRadius: 20, border: '1px solid var(--bord)' }}>
                    <div className={`av-sm ${e2.av}`} style={{ width: 18, height: 18, fontSize: 8 }}>{e2.id}</div>
                    <span style={{ fontSize: 11 }}>{e2.nom.split(' ')[0]} {e2.nom.split(' ')[1][0]}.</span>
                  </div>
                ))}
                {c.id === 'B' && <div style={{ padding: '3px 8px', background: 'var(--abg)', borderRadius: 20, border: '1px dashed var(--amber)', fontSize: 11, color: 'var(--atxt)' }}>Soudeur manquant</div>}
                {c.id === 'D' && <div style={{ padding: '3px 8px', background: 'var(--abg)', borderRadius: 20, border: '1px dashed var(--amber)', fontSize: 11, color: 'var(--atxt)' }}>Chef requis</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-calendar-stats" />Gantt 2025</div></div>
          <div className="gantt-wrap">
            <table className="gtbl">
              <thead>
                <tr>
                  <th className="gl" style={{ width: 100 }}>Chantier</th>
                  {MONTHS.map(m => <th key={m}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {GANTT_DATA.map(row => (
                  <tr key={row.id}>
                    <td style={{ paddingLeft: 8, fontSize: 11, fontWeight: 600 }}>{row.id}</td>
                    {MONTHS.map((_, mi) => {
                      const phase = row.phases.find(p => mi >= p.s && mi < p.e);
                      return (
                        <td key={mi} style={{ padding: '3px 2px' }}>
                          {phase && (
                            <div className="gbar" style={{ background: phase.c }}>{phase.l}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

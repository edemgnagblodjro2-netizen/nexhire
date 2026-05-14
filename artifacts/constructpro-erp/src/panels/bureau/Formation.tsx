import { EMP } from '../../data';

const CERTS = [
  { l: 'ASP Construction à jour', pct: 88, c: 'var(--green)' },
  { l: 'Premiers secours', pct: 72, c: 'var(--amber)' },
  { l: 'Travail en hauteur', pct: 60, c: 'var(--red)' },
  { l: 'SIMDUT 2015', pct: 95, c: 'var(--green)' },
  { l: 'Conduite chariot élévateur', pct: 45, c: 'var(--red)' },
  { l: 'Espace clos', pct: 78, c: 'var(--amber)' },
];

const FORMATIONS = [
  { nom: 'SST remise à niveau', date: '19 mai 2025', emp: 12 },
  { nom: 'ASP Construction renouvellement', date: '2 juin 2025', emp: 5 },
  { nom: 'Travail en hauteur (3m+)', date: '10 juin 2025', emp: 8 },
];

const CERT_STATES: [string, string, string, string][] = [
  ['ST', 'bg', 'ba', 'bg'],
  ['ML', 'bg', 'bg', 'bg'],
  ['JD', 'bg', 'bg', 'bg'],
  ['FR', 'bg', 'br', 'bg'],
  ['KM', 'bg', 'bg', 'bg'],
  ['LG', 'ba', 'bg', 'bg'],
];

function CertIcon({ cls }: { cls: string }) {
  if (cls === 'bg') return <span className="bdg bg">✓</span>;
  if (cls === 'ba') return <span className="bdg ba">⚠</span>;
  return <span className="bdg br">!</span>;
}

export default function Formation() {
  return (
    <div className="g2">
      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-certificate" />Certifications — taux de conformité</div></div>
          {CERTS.map((cert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--txt2)', width: 180, flexShrink: 0 }}>{cert.l}</span>
              <div className="pb" style={{ flex: 1 }}>
                <div className="pf" style={{ width: `${cert.pct}%`, background: cert.c }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--txt2)', width: 30, textAlign: 'right' }}>{cert.pct}%</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-calendar-event" />Formations planifiées</div></div>
          {FORMATIONS.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < FORMATIONS.length - 1 ? '1px solid var(--bord)' : undefined }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r)', background: 'var(--pbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-certificate" style={{ fontSize: 16, color: 'var(--ptxt)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{f.nom}</div>
                <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{f.date} · {f.emp} employés</div>
              </div>
              <span className="bdg br">Obligatoire</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-users" />Statut certifications par employé</div></div>
          <table className="tbl">
            <thead>
              <tr><th>Employé</th><th>ASP</th><th>Hauteur</th><th>SIMDUT</th></tr>
            </thead>
            <tbody>
              {CERT_STATES.map((cs, i) => {
                const emp = EMP.find(e => e.id === cs[0]);
                if (!emp) return null;
                return (
                  <tr key={i}>
                    <td>{emp.nom.split(' ')[0]} {emp.nom.split(' ')[1][0]}.</td>
                    <td><CertIcon cls={cs[1]} /></td>
                    <td><CertIcon cls={cs[2]} /></td>
                    <td><CertIcon cls={cs[3]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

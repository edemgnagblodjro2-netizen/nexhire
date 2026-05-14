import KpiCard from '../../components/KpiCard';
import ProgressBar from '../../components/ProgressBar';

const JALONS = [
  { label: 'Fondations', pct: 100, c: 'var(--green)', date: '15 mars' },
  { label: 'Structure', pct: 65, c: 'var(--blue)', date: 'En cours' },
  { label: 'MEP', pct: 0, c: 'var(--txt3)', date: 'Prévu juillet' },
  { label: 'Finition', pct: 0, c: 'var(--txt3)', date: 'Prévu oct.' },
];

export default function ClientDashboard() {
  return (
    <>
      <div className="krow k3">
        <KpiCard label="Avancement global" value="39%" sub="Phase structure" />
        <KpiCard label="Budget client" value="485 000$" sub="DEV-039 accepté" />
        <KpiCard label="Livraison prévue" value="Déc. 2025" sub="Résidences Boréal" />
      </div>

      <div className="g2">
        <div>
          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-chart-line" />Avancement des phases</div></div>
            {JALONS.map((j, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{j.label}</span>
                  <span style={{ color: 'var(--txt2)' }}>{j.date}</span>
                </div>
                <ProgressBar pct={j.pct} color={j.c} />
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{j.pct}% complété</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-message-circle" />Messages de votre chargé de projet</div></div>
            {[
              { who: 'Marc Leblanc', msg: 'Bonjour! La coulée béton dalle B est terminée avec succès. Prochaine étape: armatures semaine prochaine.', time: 'Auj. 11:30' },
              { who: 'Sophie Tremblay', msg: 'Visite de chantier disponible vendredi 16 mai à 10h si vous souhaitez voir l\'avancement.', time: 'Hier' },
            ].map((m, i) => (
              <div key={i} className="tli">
                <div className="av-sm av-t" style={{ flexShrink: 0 }}>{m.who.split(' ').map(x => x[0]).join('')}</div>
                <div className="tli-body">
                  <div className="tli-title">{m.who}</div>
                  <div className="tli-sub">{m.msg}</div>
                </div>
                <div className="tli-time">{m.time}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-calendar-check" />Prochains jalons</div></div>
            {[
              { label: 'Inspection structure', date: '22 mai', badge: 'bb' },
              { label: 'Visite client optionnelle', date: '16 mai', badge: 'bt' },
              { label: 'Coulée dalle B — terminée', date: '13 mai', badge: 'bg' },
            ].map((j, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 2 ? '1px solid var(--bord)' : undefined }}>
                <span style={{ fontSize: 12 }}>{j.label}</span>
                <span className={`bdg ${j.badge}`}>{j.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

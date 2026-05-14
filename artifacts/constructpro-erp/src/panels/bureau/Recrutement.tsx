import Badge from '../../components/Badge';
import { CANDIDATS } from '../../data';

const COLS = [
  { key: 'attente', icon: 'ti-clock', label: 'En attente' },
  { key: 'cours', icon: 'ti-loader', label: 'En cours' },
  { key: 'termine', icon: 'ti-check', label: 'Terminé' },
];

export default function Recrutement() {
  return (
    <div className="kanban">
      {COLS.map(col => {
        const cards = CANDIDATS.filter(c => {
          if (col.key === 'termine') return c.st === 'embauche' || c.st === 'refuse';
          return c.st === col.key;
        });
        return (
          <div key={col.key}>
            <div className="kchdr">
              <div className="kctitle"><i className={`ti ${col.icon}`} />{col.label}</div>
              <span className="kcount">{cards.length}</span>
            </div>
            {cards.map((cd, ki) => {
              const initials = cd.nom.split(' ').map(x => x[0]).join('').slice(0, 2);
              const extraClass = cd.st === 'cours' ? 'kact' : (cd.st === 'embauche' || cd.st === 'refuse') ? 'kdone' : '';
              return (
                <div key={ki} className={`kcard ${extraClass}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <div className={`av-sm ${cd.av}`}>{initials}</div>
                    <div>
                      <div className="kname">{cd.nom}</div>
                      <div className="ksub2">{cd.poste} · {cd.exp}</div>
                    </div>
                  </div>
                  {cd.skills.map((s, si) => <span key={si} className="bdg bgr">{s} </span>)}
                  {cd.st === 'cours' && <div style={{ fontSize: 10, padding: '3px 6px', background: 'var(--bbg)', color: 'var(--btxt)', borderRadius: 4, marginTop: 5 }}>{cd.date}</div>}
                  {cd.st === 'embauche' && <div style={{ fontSize: 10, padding: '3px 6px', background: 'var(--gbg)', color: 'var(--gtxt)', borderRadius: 4, marginTop: 5 }}>{cd.date}</div>}
                  <div className="kfoot" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{cd.date}</span>
                    <Badge st={cd.st} />
                  </div>
                </div>
              );
            })}
            <div className="kadd"><i className="ti ti-plus" /> Ajouter</div>
          </div>
        );
      })}
    </div>
  );
}

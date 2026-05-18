import { useState } from 'react';
import Badge from '../../components/Badge';
import { useStore } from '../../store';

const COLS = [
  { key: 'attente', icon: 'ti-clock',  label: 'En attente' },
  { key: 'cours',   icon: 'ti-loader', label: 'En cours' },
  { key: 'termine', icon: 'ti-check',  label: 'Terminé' },
];

const POSTES = ['Charpentier', 'Soudeur', 'Électricien', 'Plombier', 'Opérateur machinerie', 'Contremaître', 'Finisseur', 'Maçon'];
const EMPTY_FORM = { nom: '', poste: 'Charpentier', exp: '', skills: '', date: '' };

export default function Recrutement() {
  const { candidats, updateCandidat } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [localCandidats, setLocalCandidats] = useState(candidats);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [flash, setFlash] = useState('');

  function advance(nom: string, from: string) {
    const next = from === 'attente' ? 'cours' : from === 'cours' ? 'embauche' : null;
    if (!next) return;
    updateCandidat(nom, next);
    setLocalCandidats(prev => prev.map(c => c.nom === nom ? { ...c, st: next } : c));
  }
  function reject(nom: string) {
    updateCandidat(nom, 'refuse');
    setLocalCandidats(prev => prev.map(c => c.nom === nom ? { ...c, st: 'refuse' } : c));
  }
  function addCandidat() {
    if (!form.nom.trim()) { setFlash('Entrez le nom du candidat.'); return; }
    const nc = {
      nom: form.nom, poste: form.poste,
      exp: form.exp || '—',
      st: 'attente' as const,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [],
      date: form.date || new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }),
      av: 'av-g',
    };
    setLocalCandidats(prev => [nc as any, ...prev]);
    setForm({ ...EMPTY_FORM });
    setFlash('');
    setShowForm(false);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--txt2)' }}>
          Glissez ou utilisez les boutons pour faire avancer un candidat dans le processus.
        </div>
        <button className="btn pri" onClick={() => setShowForm(v => !v)}>
          <i className="ti ti-user-plus" /> Ajouter candidat
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
            <i className="ti ti-user-plus" style={{ marginRight: 6 }} /> Nouveau candidat
          </div>
          {flash && (
            <div style={{ background: '#fef2f2', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
              {flash}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Nom *</label>
              <input className="inp" style={{ width: '100%' }} placeholder="Prénom Nom"
                value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Poste</label>
              <select className="inp" style={{ width: '100%' }} value={form.poste}
                onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}>
                {POSTES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Expérience</label>
              <input className="inp" style={{ width: '100%' }} placeholder="ex. 5 ans"
                value={form.exp} onChange={e => setForm(f => ({ ...f, exp: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Compétences (séparées par virgule)</label>
              <input className="inp" style={{ width: '100%' }} placeholder="ex. TIG/MIG, CWB"
                value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn pri" onClick={addCandidat}><i className="ti ti-check" /> Ajouter</button>
          </div>
        </div>
      )}

      <div className="kanban">
        {COLS.map(col => {
          const cards = localCandidats.filter(c => {
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
                const initials = cd.nom.split(' ').map((x: string) => x[0]).join('').slice(0, 2);
                const extraClass = cd.st === 'cours' ? 'kact' : (cd.st === 'embauche' || cd.st === 'refuse') ? 'kdone' : '';
                return (
                  <div key={ki} className={`kcard ${extraClass}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <div className={`av-sm ${cd.av}`}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{cd.nom}</div>
                        <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{cd.poste} · {cd.exp}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {(cd.skills as string[]).map((sk: string, si: number) => (
                        <span key={si} className="bdg bgr" style={{ fontSize: 9 }}>{sk}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 8 }}>{cd.date}</div>

                    {/* Action buttons */}
                    {cd.st === 'attente' && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn" style={{ flex: 1, fontSize: 10, padding: '3px 0', background: 'var(--blue)', color: '#fff', border: 'none' }}
                          onClick={() => advance(cd.nom, 'attente')}>
                          → Entrevue
                        </button>
                        <button className="btn" style={{ fontSize: 10, padding: '3px 8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                          onClick={() => reject(cd.nom)}>
                          ✕
                        </button>
                      </div>
                    )}
                    {cd.st === 'cours' && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn" style={{ flex: 1, fontSize: 10, padding: '3px 0', background: 'var(--green)', color: '#fff', border: 'none' }}
                          onClick={() => advance(cd.nom, 'cours')}>
                          ✓ Embaucher
                        </button>
                        <button className="btn" style={{ fontSize: 10, padding: '3px 8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                          onClick={() => reject(cd.nom)}>
                          ✕
                        </button>
                      </div>
                    )}
                    {(cd.st === 'embauche') && (
                      <Badge st="actif" />
                    )}
                    {(cd.st === 'refuse') && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Archivé</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

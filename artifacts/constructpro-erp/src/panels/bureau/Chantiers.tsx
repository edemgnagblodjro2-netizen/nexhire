import { useState } from 'react';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import { useStore } from '../../store';
import { fmt, chantierColor } from '../../utils';

const STATUS_OPTIONS = ['actif', 'retard', 'pause', 'terminé', 'démarrage'];

export default function Chantiers() {
  const { chantiers, updateChantier } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ pct: 0, phase: '', st: 'actif' });
  const [saved, setSaved] = useState<string | null>(null);

  function openEdit(c: typeof chantiers[number]) {
    setDraft({ pct: c.pct, phase: c.phase, st: c.st });
    setEditing(c.id);
  }

  function saveEdit(id: string) {
    updateChantier(id, { pct: draft.pct, phase: draft.phase, st: draft.st });
    setEditing(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <>
      <div className="krow k4" style={{ gridTemplateColumns: `repeat(${chantiers.length}, 1fr)` }}>
        {chantiers.map(c => (
          <div key={c.id} className="kpi">
            <div className="klbl">Chantier {c.id}</div>
            <div className="kval" style={{ fontSize: 16 }}>{c.pct}%</div>
            <div className="ksub"><Badge st={c.st} /></div>
          </div>
        ))}
      </div>

      {chantiers.map(c => {
        const pctB = Math.round(c.dep / c.budget * 100);
        const reste = c.budget - c.dep;
        const bcolor = pctB > 90 ? 'var(--red)' : 'var(--blue)';
        const isEditing = editing === c.id;
        return (
          <div key={c.id} className="card">
            <div className="chdr">
              <div className="ctitle"><i className="ti ti-crane" />{c.id} · {c.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge st={c.st} />
                <span className="bdg bgr">{c.chef}</span>
                {saved === c.id && <span className="bdg ba" style={{ color: 'var(--green)' }}>✓ Sauvegardé</span>}
                {!isEditing
                  ? <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => openEdit(c)}>
                      <i className="ti ti-edit" /> Modifier
                    </button>
                  : <>
                      <button className="btn pri" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => saveEdit(c.id)}>
                        <i className="ti ti-check" /> Sauvegarder
                      </button>
                      <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setEditing(null)}>
                        Annuler
                      </button>
                    </>
                }
              </div>
            </div>

            <div className="g2">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--txt2)' }}>Avancement</span>
                  <strong>{isEditing ? draft.pct : c.pct}%</strong>
                </div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="range" min={0} max={100} value={draft.pct}
                      onChange={e => setDraft(d => ({ ...d, pct: +e.target.value }))}
                      style={{ width: '100%', accentColor: 'var(--green)' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 2 }}>Phase</label>
                        <input
                          className="inp"
                          value={draft.phase}
                          onChange={e => setDraft(d => ({ ...d, phase: e.target.value }))}
                          style={{ width: '100%', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 2 }}>Statut</label>
                        <select
                          className="inp"
                          value={draft.st}
                          onChange={e => setDraft(d => ({ ...d, st: e.target.value }))}
                          style={{ width: '100%', fontSize: 12 }}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <ProgressBar pct={c.pct} color={chantierColor(c.st)} />
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>Phase: <strong>{c.phase}</strong></div>
                  </>
                )}
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

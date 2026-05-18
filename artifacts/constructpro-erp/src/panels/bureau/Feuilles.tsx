import { useState } from 'react';
import AlertBanner from '../../components/AlertBanner';
import { useStore } from '../../store';

const TAUX = ['CCQ-N1', 'CCQ-N2', 'CCQ-OP', 'CCQ-EL', 'CCQ-PL', 'CCQ-FER'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY = { emp: '', ch: 'A', date: todayISO(), h: 8, taux: 'CCQ-N1', tache: '' };

export default function Feuilles() {
  const { feuilles, addFeuille, chantiers } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [flash, setFlash] = useState('');
  const [saved, setSaved] = useState(false);

  const totalH = feuilles.reduce((s, f) => s + f.h, 0);

  function handleSave() {
    if (!form.emp.trim() || !form.tache.trim()) {
      setFlash("Remplissez l'employ\u00e9 et la t\u00e2che.");
      return;
    }
    addFeuille({ ...form, h: Number(form.h) });
    setForm({ ...EMPTY });
    setFlash('');
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <AlertBanner variant="b" icon="ti-info-circle">
        Heures conformes à la classification CCQ. Export automatique disponible pour la paie.
      </AlertBanner>

      {saved && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
          padding: '10px 16px', fontSize: 13, color: '#15803d', marginBottom: 4,
        }}>
          ✓ Entrée ajoutée avec succès.
        </div>
      )}

      <div className="card">
        <div className="chdr">
          <div className="ctitle">
            <i className="ti ti-clock" />
            Feuilles de temps — {new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" onClick={() => alert('Export CCQ simulé !')}>
              <i className="ti ti-download" /> Export CCQ
            </button>
            <button className="btn pri" onClick={() => setShowForm(v => !v)}>
              <i className="ti ti-plus" /> Nouvelle entrée
            </button>
          </div>
        </div>

        {/* Inline form */}
        {showForm && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              <i className="ti ti-clock-plus" style={{ marginRight: 6 }} /> Nouvelle entrée
            </div>
            {flash && (
              <div style={{ background: '#fef2f2', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
                {flash}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Employé *</label>
                <input className="inp" placeholder="Nom complet" value={form.emp}
                  onChange={e => setForm(f => ({ ...f, emp: e.target.value }))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Chantier</label>
                <select className="inp" style={{ width: '100%' }} value={form.ch}
                  onChange={e => setForm(f => ({ ...f, ch: e.target.value }))}>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Date</label>
                <input className="inp" type="date" style={{ width: '100%' }} value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Heures</label>
                <input className="inp" type="number" min={1} max={14} style={{ width: '100%' }} value={form.h}
                  onChange={e => setForm(f => ({ ...f, h: +e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Classification CCQ</label>
                <select className="inp" style={{ width: '100%' }} value={form.taux}
                  onChange={e => setForm(f => ({ ...f, taux: e.target.value }))}>
                  {TAUX.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', marginBottom: 3 }}>Tâche *</label>
                <input className="inp" placeholder="Description de la tâche" style={{ width: '100%' }} value={form.tache}
                  onChange={e => setForm(f => ({ ...f, tache: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setShowForm(false); setFlash(''); }}>Annuler</button>
              <button className="btn pri" onClick={handleSave}>
                <i className="ti ti-check" /> Enregistrer
              </button>
            </div>
          </div>
        )}

        <table className="tbl">
          <thead>
            <tr>
              <th>Employé</th><th>Chantier</th><th>Date</th><th>Heures</th><th>Classification</th><th>Tâche</th>
            </tr>
          </thead>
          <tbody>
            {feuilles.map((f, i) => (
              <tr key={i} style={i === 0 && saved ? { background: '#f0fdf4' } : {}}>
                <td style={{ fontWeight: 600 }}>{f.emp}</td>
                <td><span className="bdg bgr">{f.ch}</span></td>
                <td style={{ color: 'var(--txt2)', fontSize: 11 }}>{f.date}</td>
                <td><strong>{f.h}h</strong></td>
                <td><span className="bdg ba">{f.taux}</span></td>
                <td style={{ color: 'var(--txt2)' }}>{f.tache}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12, color: 'var(--txt2)', textAlign: 'right' }}>
          Total : <strong style={{ color: 'var(--txt)' }}>{totalH}h</strong> — {feuilles.length} entrées
        </div>
      </div>
    </>
  );
}

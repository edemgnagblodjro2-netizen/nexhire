import { useState } from 'react';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { useStore } from '../../store';
import { fmt } from '../../utils';

const TYPES = ['Résidentiel', 'Commercial', 'Industriel', 'Infra publique', 'Rénovation'];
const STATUTS = ['attente', 'soumis', 'accepte', 'refuse', 'impayee'];
const STATUT_LABELS: Record<string, string> = {
  attente: 'En attente', soumis: 'Soumis', accepte: 'Accepté', refuse: 'Refusé', impayee: 'Impayée'
};

const today = () => new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });

interface Modal { open: boolean; ref: string; client: string; type: string; montant: string; st: string; }
const EMPTY: Modal = { open: false, ref: '', client: '', type: 'Résidentiel', montant: '', st: 'attente' };

export default function Devis() {
  const { devis, addDevis, updateDevis } = useStore();
  const [modal, setModal] = useState<Modal>(EMPTY);
  const [flash, setFlash] = useState('');

  const signed  = devis.filter(d => d.st === 'accepte').length;
  const total   = devis.length;
  const valeur  = devis.reduce((s, d) => s + d.montant, 0);
  const impayee = devis.filter(d => d.st === 'impayee').reduce((s, d) => s + d.montant, 0);

  function openNew() {
    setModal({ ...EMPTY, open: true });
  }
  function openEdit(d: typeof devis[number]) {
    setModal({ open: true, ref: d.ref, client: d.client, type: d.type, montant: String(d.montant), st: d.st });
  }

  function handleSave() {
    if (!modal.client.trim() || !modal.montant) { setFlash('Remplissez le client et le montant.'); return; }
    const montant = parseInt(modal.montant.replace(/\D/g, ''), 10);
    if (!montant) { setFlash('Montant invalide.'); return; }

    if (modal.ref) {
      updateDevis(modal.ref, { client: modal.client, type: modal.type, montant, st: modal.st, date: today() });
    } else {
      addDevis({ client: modal.client, type: modal.type, montant, st: modal.st, date: today() });
    }
    setModal(EMPTY);
    setFlash('');
  }

  return (
    <>
      <div className="krow k4">
        <KpiCard label="Devis total"       value={String(total)} />
        <KpiCard label="Taux acceptation"  value={total ? `${Math.round(signed/total*100)}%` : '—'} />
        <KpiCard label="Valeur soumise"    value={valeur >= 1000000 ? `${(valeur/1000000).toFixed(1)}M$` : `${Math.round(valeur/1000)}K$`} />
        <KpiCard label="Impayées"          value={impayee ? `${Math.round(impayee/1000)}K$` : '0$'} valueColor={impayee ? 'var(--red)' : undefined} />
      </div>

      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-file-invoice" />Devis & facturation</div>
          <button className="btn pri" onClick={openNew}><i className="ti ti-plus" /> Nouveau devis</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Réf.</th><th>Client</th><th>Type</th><th>Montant</th><th>Date</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {devis.map((d, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--txt2)' }}>{d.ref}</td>
                <td><strong>{d.client}</strong></td>
                <td><span className="bdg bgr">{d.type}</span></td>
                <td style={{ fontWeight: 600 }}>{fmt(d.montant)}</td>
                <td style={{ color: 'var(--txt2)' }}>{d.date}</td>
                <td><Badge st={d.st} /></td>
                <td>
                  <button
                    className="btn"
                    style={{ padding: '2px 8px', fontSize: 10 }}
                    onClick={() => openEdit(d)}
                  >
                    <i className="ti ti-edit" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 440, maxWidth: '95vw',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                <i className="ti ti-file-plus" style={{ marginRight: 8 }} />
                {modal.ref ? 'Modifier le devis' : 'Nouveau devis'}
              </h3>
              <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setModal(EMPTY)}>✕</button>
            </div>

            {flash && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                {flash}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>Client *</label>
                <input className="inp" style={{ width: '100%' }} placeholder="Nom du client ou organisme"
                  value={modal.client} onChange={e => setModal(m => ({ ...m, client: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>Type</label>
                <select className="inp" style={{ width: '100%' }} value={modal.type}
                  onChange={e => setModal(m => ({ ...m, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>Montant ($) *</label>
                <input className="inp" style={{ width: '100%' }} placeholder="ex. 250000" type="number"
                  value={modal.montant} onChange={e => setModal(m => ({ ...m, montant: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--txt2)', display: 'block', marginBottom: 4 }}>Statut</label>
                <select className="inp" style={{ width: '100%' }} value={modal.st}
                  onChange={e => setModal(m => ({ ...m, st: e.target.value }))}>
                  {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setModal(EMPTY)}>Annuler</button>
              <button className="btn pri" onClick={handleSave}>
                <i className="ti ti-check" /> {modal.ref ? 'Enregistrer' : 'Créer le devis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

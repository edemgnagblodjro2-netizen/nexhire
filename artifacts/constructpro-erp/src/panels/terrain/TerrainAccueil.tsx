import AlertBanner from '../../components/AlertBanner';
import ProgressBar from '../../components/ProgressBar';
import { useState } from 'react';

const UPDATES = [
  { icon: 'ti-user-check', txt: 'Louis Gagné affecté chantier B dès lundi', time: 'Auj. 9h' },
  { icon: 'ti-calendar', txt: 'Visite client vendredi — chantier propre requis', time: 'Auj.' },
  { icon: 'ti-truck', txt: 'Livraison béton reportée à 14h', time: 'Hier' },
];

export default function TerrainAccueil() {
  const [checked, setChecked] = useState([true, true, false, false]);

  return (
    <>
      <AlertBanner variant="g" icon="ti-check">
        Bonjour Sophie! Vous êtes affectée au <strong>Chantier A — Résidences du Lac</strong> aujourd'hui.
      </AlertBanner>

      <div className="g2">
        <div>
          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-crane" />Mon chantier — Résidences du Lac</div></div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--txt2)' }}>Avancement</span><strong>74%</strong>
              </div>
              <ProgressBar pct={74} color="var(--green)" />
              <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>Phase: Structure — Dalle B</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="bdg bb">12 personnes aujourd'hui</span>
              <span className="bdg ba">Livraison béton 14h</span>
            </div>
          </div>

          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-checkbox" />Mes tâches du jour</div></div>
            {['Vérifier coffrages avant coulée béton', 'Valider armatures avec Patrick Bergeron', 'Rapport fin de journée', 'Réunion équipe 16h'].map((t, i) => (
              <div key={i} className="chi" onClick={() => setChecked(prev => prev.map((v, j) => j === i ? !v : v))}>
                <div className={`chb ${checked[i] ? 'chk' : ''}`}>
                  {checked[i] && <i className="ti ti-check" />}
                </div>
                <span style={{ flex: 1, ...(checked[i] ? { textDecoration: 'line-through', color: 'var(--txt3)' } : {}) }}>{t}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="chdr"><div className="ctitle"><i className="ti ti-bell" />Mises à jour du bureau</div></div>
            {UPDATES.map((u, i) => (
              <div key={i} className="tli">
                <div style={{ width: 26, height: 26, borderRadius: 'var(--r)', background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${u.icon}`} style={{ fontSize: 13, color: 'var(--txt2)' }} />
                </div>
                <div className="tli-body"><div className="tli-title">{u.txt}</div></div>
                <div className="tli-time">{u.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div className="phone-wrap">
          <div className="phone">
            <div className="ph-notch"><div className="ph-pill" /></div>
            <div className="ph-hdr">
              <div className="ph-title">Bonjour Sophie</div>
              <div className="ph-sub">Chantier A · 13 mai 2025</div>
            </div>
            <div className="ph-body">
              <div className="ph-sec">Ma délégation</div>
              <div className="ph-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Résidences du Lac</span>
                  <span className="bdg bg" style={{ fontSize: 9 }}>74%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt2)' }}>Contremaître · Dalle B</div>
              </div>
              <div className="ph-sec">Tâches</div>
              <div className="ph-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', borderBottom: '1px solid var(--bord)' }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--green)', border: '1px solid var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}><i className="ti ti-check" /></div>
                  <span style={{ fontSize: 10, color: 'var(--txt3)', textDecoration: 'line-through' }}>Vérifier coffrages</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, border: '1px solid var(--bord2)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10 }}>Rapport fin de journée</span>
                </div>
              </div>
              <div className="ph-sec">Mises à jour</div>
              <div className="ph-card"><div style={{ fontSize: 10, color: 'var(--txt2)' }}>Louis G. affecté chantier B lundi</div></div>
            </div>
            <div className="ph-nav">
              <div className="pni on"><i className="ti ti-home" />Accueil</div>
              <div className="pni"><i className="ti ti-checkbox" />Tâches</div>
              <div className="pni"><i className="ti ti-clock" />Pointer</div>
              <div className="pni"><i className="ti ti-message-circle" />Chat</div>
              <div className="pni"><i className="ti ti-alert-triangle" />Incident</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

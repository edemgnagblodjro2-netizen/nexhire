/**
 * AgentHub Platform — App: Gouvernance IA
 * Conformité Loi 25 · Politique IA · Registre des outils
 */

const LOI25 = [
  { id: 'p1a', phase: 'Phase 1 — Sept. 2022', label: 'Désignation d\'un Responsable de la Protection des Renseignements Personnels (RPRP)' },
  { id: 'p1b', phase: 'Phase 1 — Sept. 2022', label: 'Coordonnées du RPRP publiées sur le site web de l\'organisation' },
  { id: 'p2a', phase: 'Phase 2 — Sept. 2023', label: 'Registre des incidents de confidentialité mis en place' },
  { id: 'p2b', phase: 'Phase 2 — Sept. 2023', label: 'Procédure de notification des incidents à la CAI et aux personnes concernées' },
  { id: 'p2c', phase: 'Phase 2 — Sept. 2023', label: 'Politique de confidentialité claire, accessible et compréhensible pour les membres' },
  { id: 'p2d', phase: 'Phase 2 — Sept. 2023', label: 'Évaluation des facteurs relatifs à la vie privée (EFVP) pour les nouveaux projets numériques' },
  { id: 'p2e', phase: 'Phase 2 — Sept. 2023', label: 'Droits des individus documentés et applicables : accès, rectification, portabilité' },
  { id: 'p2f', phase: 'Phase 2 — Sept. 2023', label: 'Consentement explicite pour la collecte et l\'utilisation des données personnelles' },
  { id: 'p3a', phase: 'Phase 3 — Sept. 2024', label: 'Droit à la désindexation et au déréférencement mis en œuvre' },
  { id: 'p3b', phase: 'Phase 3 — Sept. 2024', label: 'Destruction sécurisée des données en fin de cycle de vie documentée' },
  { id: 'p3c', phase: 'Phase 3 — Sept. 2024', label: 'Consentement et transparence pour les décisions automatisées par IA' },
  { id: 'p3d', phase: 'Phase 3 — Sept. 2024', label: 'Divulgation de l\'utilisation de l\'IA aux personnes concernées (chatbots, scoring, etc.)' },
  { id: 'ga',  phase: 'Gouvernance IA',        label: 'Formation du personnel sur la protection des données et l\'IA responsable' },
  { id: 'gb',  phase: 'Gouvernance IA',        label: 'Contrats avec fournisseurs tiers IA conformes à la Loi 25' },
  { id: 'gc',  phase: 'Gouvernance IA',        label: 'Politique d\'utilisation responsable de l\'IA rédigée et communiquée aux équipes' },
];

const S_COLOR = { done: '#10b981', partial: '#f59e0b', todo: '#e2e8f0' };
const S_ICON  = { done: '✓', partial: '◐', todo: '' };

let _st = null;

const _key  = (slug) => `aghub_gov_${slug}`;

function _load(slug) {
  try {
    const s = JSON.parse(localStorage.getItem(_key(slug)) || '{}');
    return { tab: 'conformite', checklist: s.checklist || {}, registre: s.registre || [], pol: s.pol || {} };
  } catch { return { tab: 'conformite', checklist: {}, registre: [], pol: {} }; }
}

function _save() {
  try { localStorage.setItem(_key(_st.slug), JSON.stringify({ checklist: _st.checklist, registre: _st.registre, pol: _st.pol })); } catch {}
}

function _score() {
  const done    = LOI25.filter(i => _st.checklist[i.id] === 'done').length;
  const partial = LOI25.filter(i => _st.checklist[i.id] === 'partial').length;
  return Math.round((done + partial * 0.5) / LOI25.length * 100);
}

function _scoreColor(s) { return s >= 75 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'; }

// ── Render root ───────────────────────────────────────────────────────────────
function _render(el) {
  const sc = _score(), cc = _scoreColor(sc);
  const phases = [...new Set(LOI25.map(i => i.phase))];

  el.innerHTML = `
<div class="gov-wrap">
  <div class="gov-header">
    <div>
      <h1 class="gov-h1">Gouvernance IA</h1>
      <p class="gov-sub">Conformité Loi 25 · Politique d'utilisation · Registre des outils IA</p>
    </div>
    <div class="gov-ring">
      <svg viewBox="0 0 36 36" style="width:88px;height:88px;transform:rotate(-90deg)">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" stroke-width="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="${cc}" stroke-width="3"
          stroke-dasharray="${sc} ${100-sc}" stroke-dashoffset="25" stroke-linecap="round"/>
      </svg>
      <div class="gov-ring-val" style="color:${cc}">${sc}%</div>
      <div class="gov-ring-lbl">Conformité</div>
    </div>
  </div>

  <div class="gov-tabs">
    <button class="gov-tab${_st.tab==='conformite'?' gov-tab-a':''}" data-tab="conformite">⚖️ Conformité Loi 25</button>
    <button class="gov-tab${_st.tab==='politique'?' gov-tab-a':''}" data-tab="politique">📋 Politique IA</button>
    <button class="gov-tab${_st.tab==='registre'?' gov-tab-a':''}" data-tab="registre">🗂️ Registre des outils</button>
  </div>

  <div id="gov-panel">
    ${_st.tab === 'conformite' ? _renderConformite(phases) : ''}
    ${_st.tab === 'politique'  ? _renderPolitique()        : ''}
    ${_st.tab === 'registre'   ? _renderRegistre()         : ''}
  </div>
</div>`;

  _bind(el);
}

// ── Tab: Conformité ───────────────────────────────────────────────────────────
function _renderConformite(phases) {
  return phases.map(ph => {
    const items = LOI25.filter(i => i.phase === ph);
    const done  = items.filter(i => _st.checklist[i.id] === 'done').length;
    return `
<div class="gov-phase">
  <div class="gov-phase-hd">
    <span class="gov-phase-title">${ph}</span>
    <span class="gov-phase-ct">${done}/${items.length} complétés</span>
  </div>
  ${items.map(item => {
    const st = _st.checklist[item.id] || 'todo';
    return `
<div class="gov-item">
  <div class="gov-dot" style="background:${S_COLOR[st]}" data-dot="${item.id}">${S_ICON[st]}</div>
  <span class="gov-item-lbl">${item.label}</span>
  <select class="gov-sel" data-sel="${item.id}">
    <option value="todo"    ${st==='todo'   ?'selected':''}>À faire</option>
    <option value="partial" ${st==='partial'?'selected':''}>En cours</option>
    <option value="done"    ${st==='done'   ?'selected':''}>Complété</option>
  </select>
</div>`;
  }).join('')}
</div>`;
  }).join('');
}

// ── Tab: Politique ────────────────────────────────────────────────────────────
function _renderPolitique() {
  const p = _st.pol;
  const generated = p.nom_org ? _genPolitique(p) : '';
  return `
<div class="gov-pol">
  <div class="gov-card">
    <h3 class="gov-card-title">Informations sur votre organisation</h3>
    <div class="gov-grid2">
      <div class="gov-field"><label>Nom de l'organisation *</label>
        <input class="gov-inp" id="pn" value="${p.nom_org||''}" placeholder="Ex: CCI3R — Chambre de Commerce et d'Industries"/></div>
      <div class="gov-field"><label>Secteur d'activité</label>
        <input class="gov-inp" id="ps" value="${p.secteur||''}" placeholder="Ex: Association d'affaires"/></div>
      <div class="gov-field"><label>Responsable désigné·e (RPRP)</label>
        <input class="gov-inp" id="pr" value="${p.responsable||''}" placeholder="Ex: Geneviève Fortin"/></div>
      <div class="gov-field"><label>Email du RPRP</label>
        <input class="gov-inp" id="pe" value="${p.email||''}" placeholder="rprp@organisation.ca"/></div>
      <div class="gov-field" style="grid-column:1/-1"><label>Principaux usages de l'IA dans votre organisation</label>
        <textarea class="gov-inp gov-ta" id="pu" placeholder="Ex: assistance aux conseillers, analyse des données membres, automatisation des communications...">${p.usage_ia||''}</textarea></div>
    </div>
    <button class="gov-btn-p" id="pol-gen">Générer la politique</button>
  </div>
  ${generated ? `
  <div class="gov-card gov-pol-out">
    <div class="gov-pol-out-hd">
      <h3 class="gov-card-title" style="margin:0">Politique d'utilisation responsable de l'IA</h3>
      <div style="display:flex;gap:8px">
        <button class="gov-btn-outline" id="pol-copy">Copier</button>
        <button class="gov-btn-outline" id="pol-print">Imprimer / PDF</button>
      </div>
    </div>
    <div class="gov-pol-text" id="pol-txt">${generated}</div>
  </div>` : ''}
</div>`;
}

function _genPolitique(p) {
  const date = new Date().toLocaleDateString('fr-CA', { year:'numeric', month:'long', day:'numeric' });
  return `<p><strong>${p.nom_org}</strong><br><em>Politique d'utilisation responsable de l'intelligence artificielle</em><br><em>En vigueur le ${date}</em></p>

<p><strong>1. Objectif</strong><br>
La présente politique définit les principes d'utilisation de l'intelligence artificielle (IA) au sein de ${p.nom_org}${p.secteur ? ', dans le secteur ' + p.secteur : ''}. Elle vise à encadrer une utilisation éthique, transparente et conforme à la Loi modernisant des dispositions législatives en matière de protection des renseignements personnels (Loi 25) du Québec.</p>

<p><strong>2. Responsable désigné·e</strong><br>
Le ou la Responsable de la Protection des Renseignements Personnels (RPRP) est ${p.responsable || '[nom à compléter]'}${p.email ? ' (' + p.email + ')' : ''}. Toute question relative à l'utilisation de l'IA et à la protection des données personnelles doit lui être adressée.</p>

<p><strong>3. Usages de l'IA</strong><br>
${p.usage_ia ? p.usage_ia : 'L\'organisation utilise des outils d\'intelligence artificielle pour améliorer ses services aux membres et optimiser ses opérations internes.'}</p>

<p><strong>4. Principes d'utilisation</strong><br>
• <strong>Transparence</strong> : toute utilisation de l'IA envers des tiers est divulguée clairement.<br>
• <strong>Consentement</strong> : la collecte et le traitement de données personnelles requièrent un consentement explicite.<br>
• <strong>Minimisation</strong> : seules les données strictement nécessaires sont collectées et traitées.<br>
• <strong>Sécurité</strong> : les systèmes IA sont soumis aux mêmes mesures de sécurité que les autres systèmes de l'organisation.<br>
• <strong>Responsabilité humaine</strong> : un superviseur humain est impliqué dans toute décision significative assistée par l'IA.</p>

<p><strong>5. Décisions automatisées</strong><br>
Toute décision significative fondée sur un traitement automatisé est soumise à un examen humain. Les personnes concernées ont le droit d'être informées et de demander une révision par une personne physique.</p>

<p><strong>6. Conformité Loi 25</strong><br>
${p.nom_org} s'engage à respecter intégralement la Loi 25. Tout incident de confidentialité est consigné dans le registre des incidents et, le cas échéant, signalé à la Commission d'accès à l'information (CAI) et aux personnes concernées dans les délais prescrits.</p>

<p><strong>7. Révision</strong><br>
Cette politique est révisée annuellement ou à la suite de changements réglementaires significatifs. La version en vigueur est disponible auprès du RPRP.</p>`;
}

// ── Tab: Registre ─────────────────────────────────────────────────────────────
function _renderRegistre() {
  const list = _st.registre;
  return `
<div class="gov-reg">
  <div class="gov-reg-hd">
    <div>
      <h3 class="gov-card-title" style="margin:0">Registre des outils IA</h3>
      <p style="font-size:13px;color:#64748b;margin:4px 0 0">Inventaire des outils d'intelligence artificielle utilisés dans votre organisation (exigé par la Loi 25 pour les outils traitant des données personnelles).</p>
    </div>
    <button class="gov-btn-p" id="reg-add">+ Ajouter un outil</button>
  </div>
  ${list.length === 0 ? `
  <div class="gov-empty">
    <div style="font-size:48px;margin-bottom:12px">🤖</div>
    <p>Aucun outil enregistré.<br>Ajoutez les outils IA utilisés dans votre organisation pour maintenir votre registre de conformité.</p>
  </div>` : `
  <div class="gov-table-wrap">
    <table class="gov-table">
      <thead><tr>
        <th>Outil</th><th>Catégorie</th><th>Usage</th>
        <th>Données perso.</th><th>Conformant</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map((o,i) => `
        <tr>
          <td class="gov-td-name">${o.nom}</td>
          <td><span class="gov-tag">${o.categorie}</span></td>
          <td style="font-size:13px;color:#475569">${o.usage||'—'}</td>
          <td>${o.dp ? '<span class="gov-badge b-warn">Oui</span>' : '<span class="gov-badge b-ok">Non</span>'}</td>
          <td>${o.conf==='oui'?'<span class="gov-badge b-ok">✓ Oui</span>':o.conf==='partiel'?'<span class="gov-badge b-warn">◐ Partiel</span>':'<span class="gov-badge b-err">✗ Non</span>'}</td>
          <td><button class="gov-del" data-del="${i}">×</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`}

  <div class="gov-modal" id="reg-modal" style="display:none">
    <div class="gov-modal-box">
      <h3 style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0f172a">Nouvel outil IA</h3>
      <div class="gov-grid2">
        <div class="gov-field"><label>Nom de l'outil *</label>
          <input class="gov-inp" id="r-nom" placeholder="ChatGPT, Copilot, ATLAS..."/></div>
        <div class="gov-field"><label>Catégorie</label>
          <select class="gov-inp" id="r-cat">
            <option>Génération de texte</option><option>Analyse de données</option>
            <option>Automatisation</option><option>Service client</option>
            <option>Recrutement / RH</option><option>Traduction</option><option>Autre</option>
          </select></div>
        <div class="gov-field" style="grid-column:1/-1"><label>Usage principal</label>
          <input class="gov-inp" id="r-usage" placeholder="Décrivez comment cet outil est utilisé dans votre organisation"/></div>
        <div class="gov-field"><label>Traite des données personnelles ?</label>
          <select class="gov-inp" id="r-dp"><option value="0">Non</option><option value="1">Oui</option></select></div>
        <div class="gov-field"><label>Conformant Loi 25 ?</label>
          <select class="gov-inp" id="r-conf"><option value="oui">Oui</option><option value="partiel">Partiellement</option><option value="non">Non évalué</option></select></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button class="gov-btn-outline" id="r-cancel">Annuler</button>
        <button class="gov-btn-p" id="r-save">Enregistrer</button>
      </div>
    </div>
  </div>
</div>`;
}

// ── Event binding ─────────────────────────────────────────────────────────────
function _bind(el) {
  el.querySelectorAll('.gov-tab').forEach(b => b.addEventListener('click', () => { _st.tab = b.dataset.tab; _render(el); }));

  el.querySelectorAll('[data-sel]').forEach(s => s.addEventListener('change', () => {
    _st.checklist[s.dataset.sel] = s.value; _save(); _render(el);
  }));

  const polGen = el.querySelector('#pol-gen');
  if (polGen) polGen.addEventListener('click', () => {
    _st.pol = { nom_org: el.querySelector('#pn')?.value||'', secteur: el.querySelector('#ps')?.value||'', responsable: el.querySelector('#pr')?.value||'', email: el.querySelector('#pe')?.value||'', usage_ia: el.querySelector('#pu')?.value||'' };
    _save(); _render(el);
  });

  const polCopy = el.querySelector('#pol-copy');
  if (polCopy) polCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(el.querySelector('#pol-txt')?.innerText||'').then(() => { polCopy.textContent='✓ Copié!'; setTimeout(()=>polCopy.textContent='Copier',2000); });
  });

  const polPrint = el.querySelector('#pol-print');
  if (polPrint) polPrint.addEventListener('click', () => window.print());

  const regAdd = el.querySelector('#reg-add');
  if (regAdd) regAdd.addEventListener('click', () => { el.querySelector('#reg-modal').style.display='flex'; el.querySelector('#r-nom')?.focus(); });

  const rCancel = el.querySelector('#r-cancel');
  if (rCancel) rCancel.addEventListener('click', () => { el.querySelector('#reg-modal').style.display='none'; });

  const rSave = el.querySelector('#r-save');
  if (rSave) rSave.addEventListener('click', () => {
    const nom = el.querySelector('#r-nom')?.value?.trim();
    if (!nom) return;
    _st.registre.push({ nom, categorie: el.querySelector('#r-cat')?.value||'Autre', usage: el.querySelector('#r-usage')?.value||'', dp: el.querySelector('#r-dp')?.value==='1', conf: el.querySelector('#r-conf')?.value||'oui' });
    _save(); el.querySelector('#reg-modal').style.display='none'; _render(el);
  });

  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    _st.registre.splice(parseInt(b.dataset.del),1); _save(); _render(el);
  }));
}

// ── Styles ────────────────────────────────────────────────────────────────────
function _css() {
  if (document.getElementById('gov-css')) return;
  const s = document.createElement('style'); s.id='gov-css';
  s.textContent = `
.gov-wrap{padding:32px;max-width:960px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif}
.gov-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;gap:16px;flex-wrap:wrap}
.gov-h1{font-size:22px;font-weight:700;color:#0f172a;margin:0 0 4px}
.gov-sub{font-size:13px;color:#64748b;margin:0}
.gov-ring{position:relative;flex-shrink:0;text-align:center;width:88px}
.gov-ring-val{position:absolute;top:24px;left:0;right:0;font-size:18px;font-weight:800}
.gov-ring-lbl{position:absolute;bottom:8px;left:0;right:0;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8}
.gov-tabs{display:flex;gap:2px;border-bottom:1px solid #e2e8f0;margin-bottom:24px;flex-wrap:wrap}
.gov-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 16px;font-size:13px;font-weight:500;color:#64748b;cursor:pointer;margin-bottom:-1px;white-space:nowrap}
.gov-tab-a{color:#7c3aed;border-bottom-color:#7c3aed}
.gov-phase{margin-bottom:20px}
.gov-phase-hd{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;margin-bottom:6px}
.gov-phase-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#475569}
.gov-phase-ct{font-size:11px;color:#94a3b8}
.gov-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f8fafc}
.gov-dot{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;border:2px solid rgba(0,0,0,.06)}
.gov-item-lbl{flex:1;font-size:13px;color:#334155;line-height:1.4}
.gov-sel{font-size:11px;border:1px solid #e2e8f0;border-radius:6px;padding:3px 6px;color:#475569;background:white;cursor:pointer;flex-shrink:0}
.gov-pol{display:flex;flex-direction:column;gap:20px}
.gov-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px}
.gov-card-title{font-size:14px;font-weight:600;color:#0f172a;margin:0 0 16px}
.gov-pol-out .gov-card-title{margin:0}
.gov-pol-out-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.gov-pol-text{font-size:13px;line-height:1.9;color:#334155}
.gov-pol-text p{margin:0 0 12px}
.gov-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gov-field{display:flex;flex-direction:column;gap:5px}
.gov-field label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
.gov-inp{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;width:100%;box-sizing:border-box;font-family:inherit;outline:none;background:white}
.gov-inp:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
.gov-ta{resize:vertical;min-height:72px}
.gov-btn-p{background:#7c3aed;color:white;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;margin-top:16px;white-space:nowrap}
.gov-btn-p:hover{background:#6d28d9}
.gov-btn-outline{background:none;border:1px solid #e2e8f0;color:#475569;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.gov-btn-outline:hover{border-color:#7c3aed;color:#7c3aed}
.gov-reg-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.gov-reg-hd .gov-btn-p{margin-top:0}
.gov-empty{text-align:center;padding:48px 24px;color:#94a3b8;font-size:14px;line-height:1.6}
.gov-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0}
.gov-table{width:100%;border-collapse:collapse;font-size:13px}
.gov-table th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.gov-table td{padding:11px 14px;border-bottom:1px solid #f8fafc;color:#334155}
.gov-table tr:last-child td{border-bottom:none}
.gov-td-name{font-weight:600;color:#0f172a}
.gov-tag{background:#f1f5f9;color:#475569;font-size:11px;padding:2px 8px;border-radius:99px;white-space:nowrap}
.gov-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap}
.b-ok{background:#dcfce7;color:#16a34a}
.b-warn{background:#fef9c3;color:#ca8a04}
.b-err{background:#fee2e2;color:#dc2626}
.gov-del{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;padding:0 4px;line-height:1}
.gov-del:hover{color:#ef4444}
.gov-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000}
.gov-modal-box{background:white;border-radius:16px;padding:28px;width:540px;max-width:92vw;max-height:90vh;overflow-y:auto}
@media(max-width:600px){.gov-wrap{padding:16px}.gov-grid2{grid-template-columns:1fr}.gov-sel{display:none}}
@media print{.gov-tabs,.gov-btn-p,.gov-btn-outline,.gov-reg-hd button{display:none}.gov-pol-text{font-size:12pt;line-height:1.8}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container, ctx) {
    _css();
    const d = _load(ctx.partnerSlug);
    _st = { ...d, slug: ctx.partnerSlug };
    _render(container);
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
  },
};

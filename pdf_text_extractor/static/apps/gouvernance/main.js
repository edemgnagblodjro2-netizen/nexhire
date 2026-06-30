/**
 * AgentHub Platform — App: Gouvernance IA
 * Multi-framework : Loi 25 Québec · ISO 42001 · NIST AI RMF
 */

const FRAMEWORKS = {
  loi25: {
    id:    'loi25',
    label: 'Loi 25 — Québec',
    icon:  '⚖️',
    desc:  'Loi modernisant des dispositions législatives en matière de protection des renseignements personnels (2022-2024)',
    items: [
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
    ],
  },
  iso42001: {
    id:    'iso42001',
    label: 'ISO 42001',
    icon:  '🌐',
    desc:  'Norme internationale pour les systèmes de management de l\'intelligence artificielle (2023)',
    items: [
      { id: 'i01', phase: '4 — Contexte de l\'organisme', label: 'Compréhension de l\'organisation et de son contexte IA (parties prenantes, domaine d\'application)' },
      { id: 'i02', phase: '4 — Contexte de l\'organisme', label: 'Détermination du périmètre du système de management IA documenté' },
      { id: 'i03', phase: '5 — Leadership',               label: 'Engagement de la direction sur la politique IA et l\'attribution des responsabilités' },
      { id: 'i04', phase: '5 — Leadership',               label: 'Politique de système de management IA établie, communiquée et accessible' },
      { id: 'i05', phase: '6 — Planification',            label: 'Évaluation des risques IA : identification, analyse et traitement documentés' },
      { id: 'i06', phase: '6 — Planification',            label: 'Objectifs IA définis, mesurables et suivis dans le temps' },
      { id: 'i07', phase: '7 — Support',                  label: 'Ressources, compétences et sensibilisation IA du personnel évaluées' },
      { id: 'i08', phase: '8 — Réalisation',              label: 'Processus de développement ou d\'acquisition de systèmes IA documentés' },
      { id: 'i09', phase: '8 — Réalisation',              label: 'Évaluation d\'impact IA réalisée avant déploiement de tout système à risque élevé' },
      { id: 'i10', phase: '9 — Évaluation',               label: 'Surveillance, mesure, analyse et évaluation du système de management IA' },
      { id: 'i11', phase: '9 — Évaluation',               label: 'Audit interne du système de management IA planifié et réalisé' },
      { id: 'i12', phase: '10 — Amélioration',            label: 'Non-conformités identifiées, traitées et utilisées pour l\'amélioration continue' },
    ],
  },
  nist_ai_rmf: {
    id:    'nist_ai_rmf',
    label: 'NIST AI RMF',
    icon:  '🇺🇸',
    desc:  'AI Risk Management Framework — National Institute of Standards and Technology (2023)',
    items: [
      { id: 'n01', phase: 'GOVERN — Culture',     label: 'Politiques, processus et pratiques organisationnels sur la gestion des risques IA établis' },
      { id: 'n02', phase: 'GOVERN — Culture',     label: 'Rôles et responsabilités pour la gestion des risques IA définis et assignés' },
      { id: 'n03', phase: 'GOVERN — Culture',     label: 'Formation et sensibilisation des équipes aux risques IA réalisées' },
      { id: 'n04', phase: 'MAP — Contextualiser', label: 'Contexte d\'utilisation des systèmes IA documenté (cas d\'usage, parties prenantes, objectifs)' },
      { id: 'n05', phase: 'MAP — Contextualiser', label: 'Catégorisation des risques IA par impact potentiel (probabilité × gravité)' },
      { id: 'n06', phase: 'MEASURE — Évaluer',    label: 'Métriques d\'évaluation des risques IA définies et appliquées aux systèmes déployés' },
      { id: 'n07', phase: 'MEASURE — Évaluer',    label: 'Tests de biais, d\'équité et de robustesse des modèles IA documentés' },
      { id: 'n08', phase: 'MEASURE — Évaluer',    label: 'Evaluation de la transparence et de l\'explicabilité des décisions IA' },
      { id: 'n09', phase: 'MANAGE — Traiter',     label: 'Plans de traitement des risques IA identifiés mis en place et suivis' },
      { id: 'n10', phase: 'MANAGE — Traiter',     label: 'Procédure de retrait ou de correction d\'un système IA défaillant documentée' },
      { id: 'n11', phase: 'MANAGE — Traiter',     label: 'Monitoring continu des systèmes IA en production (dérive, incidents, performances)' },
    ],
  },
};

const LOI25 = FRAMEWORKS.loi25.items;

const S_COLOR = { done: 'var(--color-ok)', partial: 'var(--color-warn)', todo: 'var(--border)' };
const S_ICON  = { done: '✓', partial: '◐', todo: '' };

let _st = null;

const _key  = (slug, fw) => `aghub_gov_${slug}_${fw}`;

function _load(slug, fw) {
  try {
    const s = JSON.parse(localStorage.getItem(_key(slug, fw)) || '{}');
    return { tab: 'conformite', framework: fw, checklist: s.checklist || {}, registre: s.registre || [], pol: s.pol || {} };
  } catch { return { tab: 'conformite', framework: fw, checklist: {}, registre: [], pol: {} }; }
}

function _save() {
  try {
    localStorage.setItem(
      _key(_st.slug, _st.framework),
      JSON.stringify({ checklist: _st.checklist, registre: _st.registre, pol: _st.pol })
    );
  } catch {}
}

function _items() { return (FRAMEWORKS[_st.framework] || FRAMEWORKS.loi25).items; }

function _score() {
  const items   = _items();
  const done    = items.filter(i => _st.checklist[i.id] === 'done').length;
  const partial = items.filter(i => _st.checklist[i.id] === 'partial').length;
  return Math.round((done + partial * 0.5) / items.length * 100);
}

function _scoreColor(s) { return s >= 75 ? 'var(--color-ok)' : s >= 45 ? 'var(--color-warn)' : 'var(--color-err)'; }

// ── Render root ───────────────────────────────────────────────────────────────
function _render(el) {
  const sc  = _score(), cc = _scoreColor(sc);
  const fw  = FRAMEWORKS[_st.framework] || FRAMEWORKS.loi25;
  const items = _items();
  const phases = [...new Set(items.map(i => i.phase))];

  el.innerHTML = `
<div class="gov-wrap">
  <div class="ds-page-header">
    <div class="ds-ph-left">
      <h1 class="ds-ph-title">Gouvernance IA</h1>
      <p class="ds-ph-sub">${fw.icon} ${fw.label} · Politique d'utilisation · Registre des outils IA</p>
      <p class="ds-ph-desc">${fw.desc}</p>
      <div class="ds-ph-meta">
        <span class="ds-ph-meta-item">Conformité actuelle :&nbsp;<strong style="color:${cc}">${sc}%</strong></span>
        <span class="ds-ph-meta-sep">·</span>
        <span class="ds-ph-meta-item">${_items().length} points de contrôle</span>
      </div>
    </div>
    <div class="gov-ring">
      <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg)">
        <circle cx="18" cy="18" r="15.9" fill="none" style="stroke:var(--border)" stroke-width="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="${cc}" stroke-width="3"
          stroke-dasharray="${sc} ${100-sc}" stroke-dashoffset="25" stroke-linecap="round"/>
      </svg>
      <div class="gov-ring-val" style="color:${cc}">${sc}%</div>
      <div class="gov-ring-lbl">Conformité</div>
    </div>
  </div>

  <div class="gov-fw-picker">
    <span class="gov-fw-label">Référentiel :</span>
    ${Object.values(FRAMEWORKS).map(f => `
      <button class="gov-fw-btn${_st.framework===f.id?' gov-fw-btn-a':''}" data-fw="${f.id}">${f.icon} ${f.label}</button>
    `).join('')}
  </div>

  <div class="gov-tabs">
    <button class="gov-tab${_st.tab==='conformite'?' gov-tab-a':''}" data-tab="conformite">${fw.icon} Conformité ${fw.label}</button>
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
  const allItems = _items();

  // Bloc "3 actions prioritaires" — items non complétés, dans l'ordre naturel
  const unchecked = allItems.filter(i => _st.checklist[i.id] !== 'done');
  const top3 = unchecked.slice(0, 3);

  const priorityBlock = top3.length > 0 ? `
<div class="gov-priority-block">
  <div class="gov-priority-hd">
    <span>🎯</span>
    <h3>Actions prioritaires</h3>
    <span class="gov-priority-count">${unchecked.length} item${unchecked.length > 1 ? 's' : ''} restant${unchecked.length > 1 ? 's' : ''}</span>
  </div>
  <div class="gov-priority-list">
    ${top3.map((item, i) => `
    <div class="gov-priority-item">
      <span class="gov-priority-num">${i + 1}</span>
      <div class="gov-priority-info">
        <div class="gov-priority-phase">${item.phase}</div>
        <div class="gov-priority-label">${item.label}</div>
      </div>
      <button class="gov-check-quick" data-quick="${item.id}">Compléter ✓</button>
    </div>`).join('')}
  </div>
</div>` : `
<div class="ds-ph-context" style="background:var(--color-ok-soft);border-color:var(--color-ok-border);color:var(--color-ok-on);margin-bottom:20px">
  <span class="ds-ph-context-icon">✅</span>
  <div><strong>Référentiel complété !</strong> Tous les points de contrôle sont cochés pour ${(FRAMEWORKS[_st.framework] || FRAMEWORKS.loi25).label}.</div>
</div>`;

  return priorityBlock + phases.map(ph => {
    const items = allItems.filter(i => i.phase === ph);
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
      <p style="font-size:13px;color:var(--text-sub);margin:4px 0 0">Inventaire des outils d'intelligence artificielle utilisés dans votre organisation (exigé par la Loi 25 pour les outils traitant des données personnelles).</p>
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
          <td style="font-size:13px;color:var(--text-2)">${o.usage||'—'}</td>
          <td>${o.dp ? '<span class="gov-badge b-warn">Oui</span>' : '<span class="gov-badge b-ok">Non</span>'}</td>
          <td>${o.conf==='oui'?'<span class="gov-badge b-ok">✓ Oui</span>':o.conf==='partiel'?'<span class="gov-badge b-warn">◐ Partiel</span>':'<span class="gov-badge b-err">✗ Non</span>'}</td>
          <td><button class="gov-del" data-del="${i}">×</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`}

  <div class="gov-modal" id="reg-modal" style="display:none">
    <div class="gov-modal-box">
      <h3 style="margin:0 0 20px;font-size:16px;font-weight:700;color:var(--text)">Nouvel outil IA</h3>
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
  el.querySelectorAll('.gov-fw-btn').forEach(b => b.addEventListener('click', () => {
    if (_st.framework === b.dataset.fw) return;
    _save();
    const loaded = _load(_st.slug, b.dataset.fw);
    _st.framework = b.dataset.fw;
    _st.checklist = loaded.checklist;
    _st.tab = 'conformite';
    _render(el);
  }));

  el.querySelectorAll('.gov-tab').forEach(b => b.addEventListener('click', () => { _st.tab = b.dataset.tab; _render(el); }));

  el.querySelectorAll('[data-sel]').forEach(s => s.addEventListener('change', () => {
    _st.checklist[s.dataset.sel] = s.value; _save(); _render(el);
  }));

  el.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => {
    _st.checklist[b.dataset.quick] = 'done'; _save(); _render(el);
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
.gov-wrap{padding:var(--sp-8);max-width:960px;margin:0 auto;font-family:var(--font)}
.gov-fw-picker{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.gov-fw-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.gov-fw-btn{background:var(--bg);border:1px solid var(--border);color:var(--text-2);border-radius:var(--r);padding:6px 12px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s}
.gov-fw-btn:hover{border-color:var(--primary);color:var(--primary)}
.gov-fw-btn-a{background:var(--primary-lt);border-color:var(--primary);color:var(--primary);font-weight:600}
.gov-ring{position:relative;flex-shrink:0;text-align:center;width:88px}
.gov-ring-val{position:absolute;top:24px;left:0;right:0;font-size:18px;font-weight:800}
.gov-ring-lbl{position:absolute;bottom:8px;left:0;right:0;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.gov-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:24px;flex-wrap:wrap}
.gov-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 16px;font-size:13px;font-weight:500;color:var(--text-sub);cursor:pointer;margin-bottom:-1px;white-space:nowrap}
.gov-tab-a{color:var(--primary);border-bottom-color:var(--primary)}
.gov-phase{margin-bottom:20px}
.gov-phase-hd{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-2);margin-bottom:6px}
.gov-phase-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-2)}
.gov-phase-ct{font-size:11px;color:var(--muted)}
.gov-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bg)}
.gov-dot{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;border:2px solid rgba(0,0,0,.06)}
.gov-item-lbl{flex:1;font-size:13px;color:var(--text-body);line-height:1.4}
.gov-sel{font-size:11px;border:1px solid var(--border);border-radius:6px;padding:3px 6px;color:var(--text-2);background:var(--card);cursor:pointer;flex-shrink:0}
.gov-pol{display:flex;flex-direction:column;gap:20px}
.gov-card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-6)}
.gov-card-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 16px}
.gov-pol-out .gov-card-title{margin:0}
.gov-pol-out-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.gov-pol-text{font-size:13px;line-height:1.9;color:var(--text-body)}
.gov-pol-text p{margin:0 0 12px}
.gov-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gov-field{display:flex;flex-direction:column;gap:5px}
.gov-field label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text-sub)}
.gov-inp{border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;font-size:13px;color:var(--text);width:100%;box-sizing:border-box;font-family:inherit;outline:none;background:var(--card)}
.gov-inp:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-a10)}
.gov-ta{resize:vertical;min-height:72px}
.gov-btn-p{background:var(--primary);color:white;border:none;border-radius:var(--r);padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;margin-top:16px;white-space:nowrap}
.gov-btn-p:hover{background:var(--primary-dk)}
.gov-btn-outline{background:none;border:1px solid var(--border);color:var(--text-2);border-radius:var(--r);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.gov-btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.gov-reg-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.gov-reg-hd .gov-btn-p{margin-top:0}
.gov-empty{text-align:center;padding:48px 24px;color:var(--muted);font-size:14px;line-height:1.6}
.gov-table-wrap{overflow-x:auto;border-radius:var(--r-lg);border:1px solid var(--border)}
.gov-table{width:100%;border-collapse:collapse;font-size:13px}
.gov-table th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border)}
.gov-table td{padding:11px 14px;border-bottom:1px solid var(--border-2);color:var(--text-body)}
.gov-table tr:last-child td{border-bottom:none}
.gov-td-name{font-weight:600;color:var(--text)}
.gov-tag{background:var(--bg-2);color:var(--text-2);font-size:11px;padding:2px 8px;border-radius:var(--r-pill);white-space:nowrap}
.gov-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--r-pill);white-space:nowrap}
.b-ok{background:var(--color-ok-bg);color:var(--color-ok-text)}
.b-warn{background:var(--color-warn-bg);color:var(--color-warn-text)}
.b-err{background:var(--color-err-bg);color:var(--color-err-text)}
.gov-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px;line-height:1}
.gov-del:hover{color:var(--color-err)}
.gov-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000}
.gov-modal-box{background:var(--card);border-radius:var(--r-xl);padding:28px;width:540px;max-width:92vw;max-height:90vh;overflow-y:auto}
.gov-priority-block{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 5%,var(--card)),var(--card));border:1px solid var(--primary-a10);border-radius:var(--r-lg);padding:20px 24px;margin-bottom:20px}
.gov-priority-hd{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.gov-priority-hd h3{font-size:15px;font-weight:700;color:var(--text);margin:0;flex:1}
.gov-priority-count{background:var(--bg-2);color:var(--muted);font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--r-pill)}
.gov-priority-list{display:flex;flex-direction:column;gap:8px}
.gov-priority-item{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:11px 16px}
.gov-priority-num{width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.gov-priority-info{flex:1;min-width:0}
.gov-priority-phase{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
.gov-priority-label{font-size:13px;font-weight:600;color:var(--text);line-height:1.4}
.gov-check-quick{font-size:12px;font-weight:600;color:var(--color-ok-text);background:var(--color-ok-bg);border:none;border-radius:var(--r);padding:6px 12px;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:var(--font);transition:opacity .15s}
.gov-check-quick:hover{opacity:.8}
@media(max-width:600px){.gov-wrap{padding:var(--sp-4)}.gov-grid2{grid-template-columns:1fr}.gov-sel{display:none}.gov-check-quick{display:none}}
@media print{.gov-tabs,.gov-btn-p,.gov-btn-outline,.gov-reg-hd button{display:none}.gov-pol-text{font-size:12pt;line-height:1.8}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container, ctx) {
    _css();
    const fw = ctx.appConfig?.compliance_framework || 'loi25';
    _st = { ..._load(ctx.partnerSlug, fw), slug: ctx.partnerSlug };
    _render(container);
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
  },
};

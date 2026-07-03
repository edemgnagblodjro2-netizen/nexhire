/**
 * Gestion budgétaire
 * GET  /api/budget          — liste des entrées (filtres: dept_id, year, category)
 * POST /api/budget          — créer une entrée
 * PATCH /api/budget/{id}    — modifier
 * DELETE /api/budget/{id}   — supprimer
 * GET  /api/budget/summary  — synthèse alloué vs réel par catégorie + par département
 */

const _CSS_ID = 'bg-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.bg{padding:28px 32px;max-width:1200px;margin:0 auto;font-family:var(--font)}
.bg-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.bg-hd-left{display:flex;align-items:center;gap:14px}
.bg-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#059669,#0d9488);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.bg-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.bg-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

.bg-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.bg-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.bg-kpi-icon{font-size:20px;margin-bottom:8px}
.bg-kpi-val{font-size:18px;font-weight:800;color:var(--text);line-height:1}
.bg-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.bg-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.bg-kpi-sub.ok{color:#16a34a}.bg-kpi-sub.warn{color:#d97706}.bg-kpi-sub.err{color:#dc2626}

.bg-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.bg-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}
.bg-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.bg-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.bg-card-body{padding:18px}

.bg-cat-row{margin-bottom:16px}
.bg-cat-row:last-child{margin-bottom:0}
.bg-cat-lbl{display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px}
.bg-cat-name{font-weight:600;color:var(--text)}
.bg-cat-vals{color:var(--muted)}
.bg-bar-track{height:7px;background:var(--bg-2);border-radius:99px;overflow:hidden}
.bg-bar-fill{height:100%;border-radius:99px;transition:width .5s ease}
.bg-bar-fill.ok{background:#22c55e}
.bg-bar-fill.warn{background:#f59e0b}
.bg-bar-fill.err{background:#ef4444}

.bg-table-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.bg-table-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.bg-table-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.bg-table{width:100%;border-collapse:collapse;font-size:12px}
.bg-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 12px 10px;border-bottom:1px solid var(--border)}
.bg-table td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.bg-table tr:last-child td{border-bottom:none}
.bg-table tr:hover td{background:var(--bg-2)}

.bg-year-sel{display:flex;align-items:center;gap:8px;margin-bottom:18px}
.bg-year-sel label{font-size:12px;font-weight:600;color:var(--muted)}
.bg-year-sel select{padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;outline:none}

.bg-btn{padding:6px 12px;font-size:12px;font-weight:600;border-radius:var(--r);border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.bg-btn-primary{background:var(--primary);color:#fff}.bg-btn-primary:hover{opacity:.85}
.bg-btn-ghost{background:var(--bg-2);color:var(--text);border:1px solid var(--border)}.bg-btn-ghost:hover{background:var(--border)}
.bg-btn-danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}.bg-btn-danger:hover{background:#fecaca}

.bg-empty{text-align:center;padding:40px;color:var(--muted);font-size:13px}

.bg-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center}
.bg-modal{background:#fff;border-radius:var(--r-lg);padding:28px;width:min(480px,92vw);box-shadow:0 16px 40px rgba(0,0,0,.18)}
.bg-modal h4{font-size:16px;font-weight:700;color:var(--text);margin:0 0 20px}
.bg-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bg-form-grid .full{grid-column:1/-1}
.bg-field{display:flex;flex-direction:column;gap:4px}
.bg-field label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.bg-field input,.bg-field select,.bg-field textarea{padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
.bg-field input:focus,.bg-field select:focus{border-color:var(--primary)}
.bg-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}

.bg-loader{display:flex;align-items:center;justify-content:center;gap:10px;padding:60px;color:var(--muted)}
.bg-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:#059669;border-radius:50%;animation:bgspin .7s linear infinite}
@keyframes bgspin{to{transform:rotate(360deg)}}

@media(max-width:900px){.bg-kpis,.bg-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.bg-kpis,.bg-grid{grid-template-columns:1fr};.bg-form-grid{grid-template-columns:1fr}}
.bg-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:24px}
.bg-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.bg-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.bg-tab:hover:not(.active){color:var(--text-2)}
.bg-atlas{background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:18px 22px;margin-bottom:20px}
.bg-atlas-hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bg-atlas-item{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-body);line-height:1.45}
.bg-atlas-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);margin-top:4px;flex-shrink:0}
.bg-ai-cost-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:16px}
.bg-ai-cost-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.bg-ai-cost-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
`;
  document.head.appendChild(s);
}

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }

function _exportCSV(entries, year) {
  const header = ['Catégorie','Libellé','Année','Mois','Alloué (CAD)','Réel (CAD)','Écart (CAD)'];
  const rows = entries.map(e => [
    _catFr(e.category), e.label||'', e.year, e.month ? MONTHS[e.month-1] : 'Annuel',
    e.allocated||0, e.actual||0, ((e.allocated||0)-(e.actual||0)).toFixed(2),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `budget_${year}.csv`;
  a.click();
}

async function _exportPDF(summary, entries, year) {
  const cats = (summary?.by_category||[]).map(c => `- ${_catFr(c.category)}: ${_fmt(c.actual)} / ${_fmt(c.allocated)} alloué`).join('\n') || 'Aucune donnée';
  const totalAlloc = (summary?.by_category||[]).reduce((s,c)=>s+(c.allocated||0),0);
  const totalActual = (summary?.by_category||[]).reduce((s,c)=>s+(c.actual||0),0);
  const question = `Rapport budgétaire ${year}`;
  const answer = `## Résumé ${year}\n\nBudget alloué total : ${_fmt(totalAlloc)}\nDépenses réelles : ${_fmt(totalActual)}\nÉcart : ${_fmt(totalAlloc-totalActual)}\n\n### Par catégorie\n${cats}`;
  const charts = (summary?.by_category||[]).length ? [{
    type: 'bar', title: `Budget vs Réel ${year}`,
    labels: (summary.by_category||[]).map(c => _catFr(c.category)),
    values: (summary.by_category||[]).map(c => c.actual||0),
  }] : [];
  const btn = document.querySelector('#bg-export-pdf');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Génération…'; }
  try {
    const r = await fetch('/api/agent/export', { method:'POST', headers:{..._h(),'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ question, answer, format:'pdf', title:`Rapport budgétaire ${year}`, period_label: String(year), charts }) });
    if (!r.ok) throw new Error(r.status);
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `budget_${year}.pdf`; a.click();
  } catch (err) { alert(`Erreur PDF : ${err.message}`); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '⬇ PDF'; } }
}

async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
  if (r.status === 204) return null;
  return r.json();
}

function _fmt(v, currency = 'CAD') {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}
function _pct(actual, allocated) {
  if (!allocated) return 0;
  return Math.min(Math.round((actual / allocated) * 100), 200);
}
function _barClass(p) { return p > 100 ? 'err' : p > 80 ? 'warn' : 'ok'; }

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function _catFr(c) {
  return { salaires: 'Salaires', it: 'Informatique', marketing: 'Marketing', operations: 'Opérations', rh: 'Ressources humaines', formation: 'Formation', fournitures: 'Fournitures', loyer: 'Loyer', telecom: 'Télécoms', other: 'Autre', logiciel: 'Logiciels', software: 'Logiciels', hardware: 'Matériel', cloud: 'Infonuagique' }[c] || c || '—';
}

function _renderKPIs(summary) {
  const cats = summary?.by_category || [];
  const totalAlloc = cats.reduce((s, c) => s + (c.allocated || 0), 0);
  const totalActual = cats.reduce((s, c) => s + (c.actual || 0), 0);
  const ecart = totalAlloc - totalActual;
  const pct = _pct(totalActual, totalAlloc);
  return `
    <div class="bg-kpis">
      <div class="bg-kpi"><div class="bg-kpi-icon">📊</div><div class="bg-kpi-val">${_fmt(totalAlloc)}</div><div class="bg-kpi-lbl">Budget alloué</div><div class="bg-kpi-sub ok">Toutes catégories</div></div>
      <div class="bg-kpi"><div class="bg-kpi-icon">💸</div><div class="bg-kpi-val">${_fmt(totalActual)}</div><div class="bg-kpi-lbl">Dépenses réelles</div><div class="bg-kpi-sub ${_barClass(pct)}">${pct}% consommé</div></div>
      <div class="bg-kpi"><div class="bg-kpi-icon">${ecart >= 0 ? '✅' : '🚨'}</div><div class="bg-kpi-val">${_fmt(Math.abs(ecart))}</div><div class="bg-kpi-lbl">Écart budgétaire</div><div class="bg-kpi-sub ${ecart >= 0 ? 'ok' : 'err'}">${ecart >= 0 ? 'sous budget' : 'dépassement'}</div></div>
      <div class="bg-kpi"><div class="bg-kpi-icon">📂</div><div class="bg-kpi-val">${cats.length}</div><div class="bg-kpi-lbl">Catégories</div><div class="bg-kpi-sub ok">actives</div></div>
    </div>`;
}

function _renderCats(summary) {
  const cats = summary?.by_category || [];
  if (!cats.length) return `<div class="bg-empty">Aucune donnée de catégorie.</div>`;
  return cats.map(c => {
    const p = _pct(c.actual, c.allocated);
    return `
      <div class="bg-cat-row">
        <div class="bg-cat-lbl">
          <span class="bg-cat-name">${_catFr(c.category)}</span>
          <span class="bg-cat-vals">${_fmt(c.actual)} / ${_fmt(c.allocated)} — <strong>${p}%</strong></span>
        </div>
        <div class="bg-bar-track"><div class="bg-bar-fill ${_barClass(p)}" style="width:${Math.min(p,100)}%"></div></div>
      </div>`;
  }).join('');
}

function _renderDepts(summary) {
  const depts = summary?.by_department || [];
  if (!depts.length) return `<div class="bg-empty">Aucune donnée par département.</div>`;
  return depts.map(d => {
    const p = _pct(d.actual, d.allocated);
    return `
      <div class="bg-cat-row">
        <div class="bg-cat-lbl">
          <span class="bg-cat-name">${d.department_name || 'Sans département'}</span>
          <span class="bg-cat-vals">${_fmt(d.actual)} / ${_fmt(d.allocated)}</span>
        </div>
        <div class="bg-bar-track"><div class="bg-bar-fill ${_barClass(p)}" style="width:${Math.min(p,100)}%"></div></div>
      </div>`;
  }).join('');
}

function _renderEntries(entries) {
  if (!entries.length) return `<div class="bg-empty">Aucune entrée budgétaire.<br>Cliquez sur <strong>Ajouter une entrée</strong> pour commencer.</div>`;
  return `
    <table class="bg-table">
      <thead><tr><th>Catégorie</th><th>Libellé</th><th>Période</th><th>Alloué</th><th>Réel</th><th>Écart</th><th></th></tr></thead>
      <tbody>
        ${entries.map(e => {
          const ecart = (e.allocated || 0) - (e.actual || 0);
          const period = e.month ? `${MONTHS[e.month-1]} ${e.year}` : `${e.year}`;
          return `<tr>
            <td><strong>${_catFr(e.category)}</strong></td>
            <td style="color:var(--muted)">${e.label || '—'}</td>
            <td style="color:var(--muted)">${period}</td>
            <td>${_fmt(e.allocated, e.currency)}</td>
            <td>${_fmt(e.actual, e.currency)}</td>
            <td style="font-weight:700;color:${ecart>=0?'#16a34a':'#dc2626'}">${ecart>=0?'+':''}${_fmt(ecart, e.currency)}</td>
            <td><button class="bg-btn bg-btn-danger bg-del-btn" data-id="${e.id}">Suppr.</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function _openModal(year, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'bg-modal-overlay';
  overlay.innerHTML = `
    <div class="bg-modal" role="dialog">
      <h4>📊 Ajouter une entrée budgétaire</h4>
      <div class="bg-form-grid">
        <div class="bg-field"><label>Catégorie *</label>
          <select id="bg-cat">
            ${['salaires','it','marketing','operations','rh','formation','fournitures','loyer','telecom','logiciel','hardware','cloud','other'].map(k=>`<option value="${k}">${_catFr(k)}</option>`).join('')}
          </select>
        </div>
        <div class="bg-field"><label>Libellé</label><input id="bg-label" placeholder="Ex: Abonnements SaaS Q1" /></div>
        <div class="bg-field"><label>Année *</label><input type="number" id="bg-year" value="${year}" min="2020" max="2030" /></div>
        <div class="bg-field"><label>Mois (optionnel)</label>
          <select id="bg-month">
            <option value="">— Annuel —</option>
            ${MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}
          </select>
        </div>
        <div class="bg-field"><label>Montant alloué (CAD)</label><input type="number" id="bg-alloc" placeholder="0" /></div>
        <div class="bg-field"><label>Montant réel (CAD)</label><input type="number" id="bg-actual" placeholder="0" /></div>
      </div>
      <div class="bg-modal-actions">
        <button class="bg-btn bg-btn-ghost" id="bg-cancel">Annuler</button>
        <button class="bg-btn bg-btn-primary" id="bg-save">Ajouter</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#bg-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#bg-save').addEventListener('click', async () => {
    const cat = overlay.querySelector('#bg-cat').value;
    const yr  = parseInt(overlay.querySelector('#bg-year').value);
    const saveBtn = overlay.querySelector('#bg-save');
    if (!cat || !yr) return;
    saveBtn.disabled = true; saveBtn.textContent = '⏳…';
    const mo = overlay.querySelector('#bg-month').value;
    const payload = {
      category:  cat,
      label:     overlay.querySelector('#bg-label').value.trim() || null,
      year:      yr,
      month:     mo ? parseInt(mo) : null,
      allocated: parseFloat(overlay.querySelector('#bg-alloc').value) || 0,
      actual:    parseFloat(overlay.querySelector('#bg-actual').value) || 0,
      currency:  'CAD',
    };
    try {
      await _api('/api/budget', { method: 'POST', body: JSON.stringify(payload) });
      overlay.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false; saveBtn.textContent = 'Ajouter';
      alert(`Erreur : ${err.message}`);
    }
  });
}

async function _load(container) {
  _css();
  const currentYear = new Date().getFullYear();
  let _year = currentYear;
  let _tab = 'dashboard';
  let _lastSummary = { by_category: [], by_department: [] };
  let _lastEntries = [];

  async function _refresh() {
    const [summary, entries] = await Promise.all([
      _api(`/api/budget/summary?year=${_year}`).catch(() => ({ by_category: [], by_department: [] })),
      _api(`/api/budget?year=${_year}`).catch(() => []),
    ]);
    _lastSummary = summary; _lastEntries = entries;
    _render(summary, entries);
  }

  function _renderDepenses(entries) {
    const main = container.querySelector('#bg-main');
    if (!main) return;
    const actual = [...entries].filter(e => (e.actual||0) > 0).sort((a,b)=>(b.actual||0)-(a.actual||0));
    main.innerHTML = `<div class="bg-atlas"><div class="bg-atlas-hd"><span style="font-size:20px">🤖</span><strong style="font-size:13px;color:var(--text)">ATLAS recommande</strong></div><div class="bg-atlas-item"><span class="bg-atlas-dot"></span>Comparez les dépenses réelles avec les allocations pour identifier les dépassements et ajuster les prévisions du prochain trimestre.</div></div>
    <div class="bg-table-card"><div class="bg-table-card-hd"><h3>💸 Dépenses réelles ${_year}</h3><button class="bg-btn bg-btn-ghost" onclick="window._bgExportCSV()">⬇ CSV</button></div>
    <div>${!actual.length ? `<div class="bg-empty">Aucune dépense enregistrée pour ${_year}.</div>` : `<table class="bg-table"><thead><tr><th>Catégorie</th><th>Libellé</th><th>Période</th><th>Alloué</th><th>Réel</th><th>Écart</th></tr></thead><tbody>
    ${actual.map(e=>{const ecart=(e.allocated||0)-(e.actual||0);return`<tr><td><strong>${_catFr(e.category)}</strong></td><td style="color:var(--muted)">${e.label||'—'}</td><td style="color:var(--muted)">${e.month?`${MONTHS[e.month-1]} ${e.year}`:e.year}</td><td>${_fmt(e.allocated,e.currency)}</td><td style="font-weight:600">${_fmt(e.actual,e.currency)}</td><td style="font-weight:700;color:${ecart>=0?'#16a34a':'#dc2626'}">${ecart>=0?'+':''}${_fmt(ecart,e.currency)}</td></tr>`;}).join('')}
    </tbody></table>`}</div></div>`;
    window._bgExportCSV = () => _exportCSV(actual, _year);
  }

  function _renderPrevisions(summary) {
    const main = container.querySelector('#bg-main');
    if (!main) return;
    const cats = summary?.by_category || [];
    main.innerHTML = `<div class="bg-atlas"><div class="bg-atlas-hd"><span style="font-size:20px">🤖</span><strong style="font-size:13px;color:var(--text)">ATLAS recommande</strong></div><div class="bg-atlas-item"><span class="bg-atlas-dot"></span>Projetez vos dépenses sur les 12 prochains mois en basant les prévisions sur les tendances des 3 derniers trimestres pour plus de précision.</div></div>
    <div class="bg-table-card"><div class="bg-table-card-hd"><h3>📈 Prévisions ${_year + 1}</h3></div>
    <div>${!cats.length ? `<div class="bg-empty">Aucune donnée historique disponible pour générer des prévisions.</div>` : `<table class="bg-table"><thead><tr><th>Catégorie</th><th>Réel ${_year}</th><th>Prévision ${_year+1} (+5%)</th><th>Tendance</th></tr></thead><tbody>
    ${cats.map(c=>{const prev=(c.actual||0)*1.05;return`<tr><td><strong>${_catFr(c.category)}</strong></td><td>${_fmt(c.actual)}</td><td style="font-weight:700;color:var(--primary)">${_fmt(prev)}</td><td style="color:${c.actual>(c.allocated||0)?'#dc2626':'#16a34a'}">${c.actual>(c.allocated||0)?'↑ Dépassement':'↓ Sous budget'}</td></tr>`;}).join('')}
    </tbody></table>`}</div></div>`;
  }

  function _renderCoutsIA(entries) {
    const main = container.querySelector('#bg-main');
    if (!main) return;
    const aiEntries = entries.filter(e => ['logiciel','cloud','it'].includes(e.category));
    const total = aiEntries.reduce((s,e)=>s+(e.actual||0),0);
    main.innerHTML = `<div class="bg-atlas"><div class="bg-atlas-hd"><span style="font-size:20px">🤖</span><strong style="font-size:13px;color:var(--text)">ATLAS recommande</strong></div><div class="bg-atlas-item"><span class="bg-atlas-dot"></span>Ciblez un ratio coût IA / valeur générée ≤ 15% du budget total. Les outils IA sous-utilisés (< 60% d'adoption) sont les premiers à optimiser.</div></div>
    <div class="bg-kpis" style="margin-bottom:20px">
      <div class="bg-kpi"><div class="bg-kpi-icon">🤖</div><div class="bg-kpi-val" style="font-size:16px">${_fmt(total)}</div><div class="bg-kpi-lbl">Coûts IA estimés</div><div class="bg-kpi-sub ok">IT + Cloud + Logiciel</div></div>
      <div class="bg-kpi"><div class="bg-kpi-icon">📊</div><div class="bg-kpi-val">${aiEntries.length}</div><div class="bg-kpi-lbl">Lignes budgétaires</div><div class="bg-kpi-sub ok">concernées</div></div>
    </div>
    <div class="bg-ai-cost-card"><div class="bg-ai-cost-hd"><h3>💡 Coûts par outil IA (estimatif)</h3></div>
    <div style="padding:18px">
      ${[['Microsoft 365 Copilot','Abonnement IA Microsoft','logiciel',850],['OpenAI API','Appels API GPT-4','cloud',320],['AgentHub Platform','Licence AgentHub','logiciel',480],['AWS Bedrock','Inférence IA','cloud',210]].map(([name,desc,cat,cost])=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">${name}</div><div style="font-size:11px;color:var(--muted)">${desc}</div></div>
        <div style="font-size:13px;font-weight:700;color:var(--text)">${_fmt(cost)}/mois</div>
        <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:#dbeafe;color:#1d4ed8;font-weight:700">${_catFr(cat)}</span>
      </div>`).join('')}
    </div></div>`;
  }

  function _renderRapports(summary, entries) {
    const main = container.querySelector('#bg-main');
    if (!main) return;
    const total = (summary?.by_category||[]).reduce((s,c)=>s+(c.actual||0),0);
    const alloc = (summary?.by_category||[]).reduce((s,c)=>s+(c.allocated||0),0);
    main.innerHTML = `<div class="bg-atlas"><div class="bg-atlas-hd"><span style="font-size:20px">🤖</span><strong style="font-size:13px;color:var(--text)">ATLAS recommande</strong></div><div class="bg-atlas-item"><span class="bg-atlas-dot"></span>Partagez le rapport mensuel avec la direction chaque 1er du mois. Incluez les écarts majeurs et les actions correctives prévues.</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="bg-card"><div class="bg-card-hd"><h3>📊 Résumé exécutif ${_year}</h3></div><div class="bg-card-body">
        <div style="margin-bottom:10px"><div style="font-size:12px;color:var(--muted);margin-bottom:4px">Budget alloué</div><div style="font-size:20px;font-weight:800;color:var(--text)">${_fmt(alloc)}</div></div>
        <div style="margin-bottom:10px"><div style="font-size:12px;color:var(--muted);margin-bottom:4px">Dépenses réelles</div><div style="font-size:20px;font-weight:800;color:${total>alloc?'#dc2626':'#16a34a'}">${_fmt(total)}</div></div>
        <div><div style="font-size:12px;color:var(--muted);margin-bottom:4px">Taux d'utilisation</div><div style="font-size:20px;font-weight:800;color:var(--primary)">${alloc>0?Math.round(total/alloc*100):0}%</div></div>
      </div></div>
      <div class="bg-card"><div class="bg-card-hd"><h3>⬇ Exporter les rapports</h3></div><div class="bg-card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="bg-btn bg-btn-ghost" onclick="window._bgExpCSV()">📄 Export CSV — Toutes les entrées</button>
        <button class="bg-btn bg-btn-ghost" onclick="window._bgExpPDF()">📑 Rapport PDF exécutif</button>
        <button class="bg-btn bg-btn-ghost">📧 Envoyer par courriel</button>
      </div></div>
    </div>`;
    window._bgExpCSV = () => _exportCSV(entries, _year);
    window._bgExpPDF = () => _exportPDF(summary, entries, _year);
  }

  function _render(summary, entries) {
    const main = container.querySelector('#bg-main');
    if (!main) return;

    if (_tab === 'depenses') { _renderDepenses(entries); return; }
    if (_tab === 'previsions') { _renderPrevisions(summary); return; }
    if (_tab === 'couts-ia') { _renderCoutsIA(entries); return; }
    if (_tab === 'rapports') { _renderRapports(summary, entries); return; }
    const years = [currentYear - 1, currentYear, currentYear + 1];
    main.innerHTML = `
      ${_renderKPIs(summary)}
      <div class="bg-year-sel">
        <label>Année :</label>
        <select id="bg-year-sel">
          ${years.map(y => `<option value="${y}" ${y===_year?'selected':''}>${y}</option>`).join('')}
        </select>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="bg-btn bg-btn-ghost" id="bg-export-csv">⬇ CSV</button>
          <button class="bg-btn bg-btn-ghost" id="bg-export-pdf">⬇ PDF</button>
        </div>
      </div>
      <div class="bg-grid">
        <div class="bg-card">
          <div class="bg-card-hd"><h3>📂 Par catégorie</h3></div>
          <div class="bg-card-body">${_renderCats(summary)}</div>
        </div>
        <div class="bg-card">
          <div class="bg-card-hd"><h3>🏢 Par département</h3></div>
          <div class="bg-card-body">${_renderDepts(summary)}</div>
        </div>
      </div>
      <div class="bg-table-card">
        <div class="bg-table-card-hd"><h3>📋 Détail des entrées</h3>
          <button class="bg-btn bg-btn-primary" id="bg-new-btn">+ Ajouter une entrée</button>
        </div>
        <div>${_renderEntries(entries)}</div>
      </div>`;

    main.querySelector('#bg-year-sel').addEventListener('change', e => { _year = parseInt(e.target.value); _refresh(); });
    main.querySelector('#bg-export-csv')?.addEventListener('click', () => _exportCSV(_lastEntries, _year));
    main.querySelector('#bg-export-pdf')?.addEventListener('click', () => _exportPDF(_lastSummary, _lastEntries, _year));
    main.querySelector('#bg-new-btn')?.addEventListener('click', () => _openModal(_year, _refresh));
    main.querySelectorAll('.bg-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette entrée ?')) return;
        try { await _api(`/api/budget/${btn.dataset.id}`, { method: 'DELETE' }); _refresh(); }
        catch (err) { alert(`Erreur : ${err.message}`); }
      });
    });
  }

  container.innerHTML = `
    <div class="bg">
      <div class="bg-hd">
        <div class="bg-hd-left">
          <div class="bg-logo">💰</div>
          <div><h1 class="bg-title">Budget & Finances</h1><p class="bg-sub">Alloué vs Réel · Catégories · Départements</p></div>
        </div>
      </div>
      <div class="bg-tabs">
        <button class="bg-tab active" data-bg-tab="dashboard">Tableau de bord</button>
        <button class="bg-tab" data-bg-tab="depenses">Dépenses</button>
        <button class="bg-tab" data-bg-tab="previsions">Prévisions</button>
        <button class="bg-tab" data-bg-tab="couts-ia">Coûts IA</button>
        <button class="bg-tab" data-bg-tab="rapports">Rapports</button>
      </div>
      <div id="bg-main"><div class="bg-loader"><div class="bg-spinner"></div><span>Chargement…</span></div></div>
    </div>`;

  container.querySelectorAll('.bg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _tab = tab.dataset.bgTab;
      container.querySelectorAll('.bg-tab').forEach(t => t.classList.toggle('active', t === tab));
      _render(_lastSummary, _lastEntries);
    });
  });

  await _refresh();
}

export default {
  mount(container) { _load(container); },
  unmount(container) { container.innerHTML = ''; },
};

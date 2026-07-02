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
`;
  document.head.appendChild(s);
}

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }

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

  async function _refresh() {
    const [summary, entries] = await Promise.all([
      _api(`/api/budget/summary?year=${_year}`).catch(() => ({ by_category: [], by_department: [] })),
      _api(`/api/budget?year=${_year}`).catch(() => []),
    ]);
    _render(summary, entries);
  }

  function _render(summary, entries) {
    const main = container.querySelector('#bg-main');
    if (!main) return;
    const years = [currentYear - 1, currentYear, currentYear + 1];
    main.innerHTML = `
      ${_renderKPIs(summary)}
      <div class="bg-year-sel">
        <label>Année :</label>
        <select id="bg-year-sel">
          ${years.map(y => `<option value="${y}" ${y===_year?'selected':''}>${y}</option>`).join('')}
        </select>
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
      <div id="bg-main"><div class="bg-loader"><div class="bg-spinner"></div><span>Chargement…</span></div></div>
    </div>`;

  await _refresh();
}

export default {
  mount(container) { _load(container); },
  unmount(container) { container.innerHTML = ''; },
};

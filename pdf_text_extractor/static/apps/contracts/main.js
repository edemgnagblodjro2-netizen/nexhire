/**
 * Gestion des contrats fournisseurs
 * GET  /api/contracts           — liste (filtres: status, renewing)
 * POST /api/contracts           — créer
 * PATCH /api/contracts/{id}     — modifier
 * DELETE /api/contracts/{id}    — archiver (soft delete)
 */

const _CSS_ID = 'ct-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.ct{padding:28px 32px;max-width:1200px;margin:0 auto;font-family:var(--font)}
.ct-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.ct-hd-left{display:flex;align-items:center;gap:14px}
.ct-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#0ea5e9,#0284c7);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.ct-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.ct-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

.ct-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.ct-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.ct-kpi-icon{font-size:20px;margin-bottom:8px}
.ct-kpi-val{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.ct-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.ct-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.ct-kpi-sub.ok{color:#16a34a}.ct-kpi-sub.warn{color:#d97706}.ct-kpi-sub.err{color:#dc2626}

.ct-filters{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap}
.ct-filter-btn{padding:6px 14px;font-size:12px;font-weight:600;border-radius:var(--r-pill);border:1.5px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s}
.ct-filter-btn.active{border-color:var(--primary);background:var(--primary);color:#fff}

.ct-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.ct-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.ct-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}

.ct-table{width:100%;border-collapse:collapse;font-size:12px}
.ct-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 12px 10px;border-bottom:1px solid var(--border)}
.ct-table td{padding:11px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.ct-table tr:last-child td{border-bottom:none}
.ct-table tr:hover td{background:var(--bg-2)}

.ct-vendor{font-weight:700;color:var(--text)}
.ct-desc{font-size:11px;color:var(--muted);margin-top:2px}

.ct-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.ct-badge.ok{background:#dcfce7;color:#16a34a}
.ct-badge.warn{background:#fef9c3;color:#a16207}
.ct-badge.critical{background:#fee2e2;color:#dc2626}
.ct-badge.active{background:#dbeafe;color:#1d4ed8}
.ct-badge.expired{background:#f1f5f9;color:#64748b}
.ct-badge.pending{background:#fef3c7;color:#92400e}
.ct-badge.draft{background:#f1f5f9;color:#64748b}

.ct-actions{display:flex;gap:6px}
.ct-btn{padding:6px 12px;font-size:12px;font-weight:600;border-radius:var(--r);border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.ct-btn-primary{background:var(--primary);color:#fff}.ct-btn-primary:hover{opacity:.85}
.ct-btn-ghost{background:var(--bg-2);color:var(--text);border:1px solid var(--border)}.ct-btn-ghost:hover{background:var(--border)}
.ct-btn-danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}.ct-btn-danger:hover{background:#fecaca}

.ct-empty{text-align:center;padding:48px;color:var(--muted);font-size:13px}

/* Modal */
.ct-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center}
.ct-modal{background:#fff;border-radius:var(--r-lg);padding:28px;width:min(560px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,.18)}
.ct-modal h4{font-size:16px;font-weight:700;color:var(--text);margin:0 0 20px}
.ct-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ct-form-grid .full{grid-column:1/-1}
.ct-field{display:flex;flex-direction:column;gap:4px}
.ct-field label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.ct-field input,.ct-field select,.ct-field textarea{padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
.ct-field input:focus,.ct-field select:focus,.ct-field textarea:focus{border-color:var(--primary)}
.ct-field textarea{resize:vertical;min-height:60px}
.ct-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.ct-loader{display:flex;align-items:center;justify-content:center;gap:10px;padding:60px;color:var(--muted)}
.ct-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:#0284c7;border-radius:50%;animation:ctspin .7s linear infinite}
@keyframes ctspin{to{transform:rotate(360deg)}}

@media(max-width:900px){.ct-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.ct-kpis{grid-template-columns:1fr};.ct-form-grid{grid-template-columns:1fr}}

.ct-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:24px}
.ct-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.ct-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.ct-tab:hover:not(.active){color:var(--text-2)}
.ct-atlas{background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:18px 22px;margin-bottom:20px}
.ct-atlas-hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.ct-atlas-list{display:flex;flex-direction:column;gap:6px}
.ct-atlas-item{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-body);line-height:1.45}
.ct-atlas-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);margin-top:4px;flex-shrink:0}
.ct-vendor-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:10px}
.ct-vendor-icon{width:40px;height:40px;border-radius:var(--r-lg);background:var(--bg-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ct-vendor-name{font-size:14px;font-weight:700;color:var(--text)}
.ct-vendor-meta{font-size:12px;color:var(--muted)}
`;
  document.head.appendChild(s);
}

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }

function _exportCSV(contracts) {
  const header = ['Fournisseur','Catégorie','Statut','Valeur annuelle (CAD)','Économies potentielles (CAD)','Début','Fin','Renouvellement','Avis annulation (j)'];
  const rows = contracts.map(c => [
    c.vendor||'', _catFr(c.category), _statusFr(c.status),
    c.annual_value||0, c.potential_savings||0,
    c.start_date||'', c.end_date||'', c.renewal_date||'',
    c.cancellation_notice_days||60,
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `contrats_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

async function _exportPDF(contracts) {
  const total = contracts.reduce((s,c)=>s+(parseFloat(c.annual_value)||0),0);
  const savings = contracts.reduce((s,c)=>s+(parseFloat(c.potential_savings)||0),0);
  const urgent = contracts.filter(c=>c.urgency==='critical').length;
  const lines = contracts.slice(0,20).map(c =>
    `- **${c.vendor}** (${_catFr(c.category)}) — ${_fmt(c.annual_value, c.currency)}/an — Renouvellement : ${_fmtDate(c.renewal_date)}`
  ).join('\n');
  const question = 'Rapport des contrats fournisseurs';
  const answer = `## Synthèse des contrats\n\nNombre de contrats : ${contracts.length}\nValeur annuelle totale : ${_fmt(total)}\nÉconomies potentielles : ${_fmt(savings)}\nRenouvellements urgents (≤30j) : ${urgent}\n\n### Contrats actifs\n${lines}`;
  const btn = document.querySelector('#ct-export-pdf');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Génération…'; }
  try {
    const r = await fetch('/api/agent/export', { method:'POST', headers:{..._h(),'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ question, answer, format:'pdf', title:'Rapport Contrats Fournisseurs' }) });
    if (!r.ok) throw new Error(r.status);
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `contrats_${new Date().toISOString().slice(0,10)}.pdf`; a.click();
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
function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; }
}
function _catFr(c) {
  return { software: 'Logiciel', hardware: 'Matériel', cloud: 'Infonuagique', saas: 'SaaS', consulting: 'Conseil', maintenance: 'Maintenance', telecom: 'Télécoms', other: 'Autre' }[c] || c || '—';
}
function _statusFr(s) {
  return { active: 'Actif', expired: 'Expiré', pending: 'En attente', draft: 'Brouillon', cancelled: 'Annulé' }[s] || s || '—';
}

function _urgencyBadge(c) {
  if (!c.renewal_date) return '';
  const u = c.urgency || 'ok';
  const days = c.days_to_renewal;
  const label = u === 'critical' ? `⚠️ ${days}j` : u === 'warning' ? `⏰ ${days}j` : `✅ ${days}j`;
  return `<span class="ct-badge ${u}">${label}</span>`;
}

function _renderKPIs(contracts) {
  const total = contracts.length;
  const valeur = contracts.reduce((s, c) => s + (parseFloat(c.annual_value) || 0), 0);
  const economies = contracts.reduce((s, c) => s + (parseFloat(c.potential_savings) || 0), 0);
  const urgents = contracts.filter(c => c.urgency === 'critical').length;
  return `
    <div class="ct-kpis">
      <div class="ct-kpi"><div class="ct-kpi-icon">📄</div><div class="ct-kpi-val">${total}</div><div class="ct-kpi-lbl">Contrats actifs</div><div class="ct-kpi-sub ok">Tous fournisseurs</div></div>
      <div class="ct-kpi"><div class="ct-kpi-icon">💰</div><div class="ct-kpi-val" style="font-size:16px">${_fmt(valeur)}</div><div class="ct-kpi-lbl">Valeur annuelle totale</div><div class="ct-kpi-sub ok">/ an</div></div>
      <div class="ct-kpi"><div class="ct-kpi-icon">📉</div><div class="ct-kpi-val" style="font-size:16px">${_fmt(economies)}</div><div class="ct-kpi-lbl">Économies potentielles</div><div class="ct-kpi-sub ${economies > 0 ? 'ok' : ''}">${economies > 0 ? 'à négocier' : 'non estimées'}</div></div>
      <div class="ct-kpi"><div class="ct-kpi-icon">⚠️</div><div class="ct-kpi-val">${urgents}</div><div class="ct-kpi-lbl">Renouvellements urgents</div><div class="ct-kpi-sub ${urgents > 0 ? 'err' : 'ok'}">${urgents > 0 ? 'dans les 30 jours' : 'aucun urgent'}</div></div>
    </div>`;
}

function _renderTable(contracts) {
  if (!contracts.length) return `<div class="ct-empty">Aucun contrat trouvé.<br>Cliquez sur <strong>Nouveau contrat</strong> pour commencer.</div>`;
  return `
    <table class="ct-table">
      <thead><tr>
        <th>Fournisseur</th><th>Catégorie</th><th>Valeur / an</th>
        <th>Renouvellement</th><th>Urgence</th><th>Statut</th><th></th>
      </tr></thead>
      <tbody>
        ${contracts.map(c => `<tr data-id="${c.id}">
          <td><div class="ct-vendor">${c.vendor || '—'}</div>${c.description ? `<div class="ct-desc">${c.description}</div>` : ''}</td>
          <td>${_catFr(c.category)}</td>
          <td style="font-weight:600">${_fmt(c.annual_value, c.currency)}</td>
          <td>${_fmtDate(c.renewal_date)}</td>
          <td>${_urgencyBadge(c)}</td>
          <td><span class="ct-badge ${c.status || 'active'}">${_statusFr(c.status)}</span></td>
          <td><div class="ct-actions">
            <button class="ct-btn ct-btn-ghost ct-edit-btn" data-id="${c.id}">Modifier</button>
            <button class="ct-btn ct-btn-danger ct-del-btn" data-id="${c.id}">Archiver</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function _openModal(existing = null, onSave) {
  const isEdit = !!existing;
  const v = existing || {};
  const overlay = document.createElement('div');
  overlay.className = 'ct-modal-overlay';
  overlay.innerHTML = `
    <div class="ct-modal" role="dialog">
      <h4>${isEdit ? '✏️ Modifier le contrat' : '📄 Nouveau contrat'}</h4>
      <div class="ct-form-grid">
        <div class="ct-field full"><label>Fournisseur *</label><input id="ct-vendor" value="${v.vendor || ''}" placeholder="Ex: Microsoft, Bell, SAP…" /></div>
        <div class="ct-field full"><label>Description</label><input id="ct-desc" value="${v.description || ''}" placeholder="Objet du contrat" /></div>
        <div class="ct-field"><label>Catégorie</label>
          <select id="ct-cat">
            ${['software','hardware','cloud','saas','consulting','maintenance','telecom','other'].map(k => `<option value="${k}" ${(v.category||'other')===k?'selected':''}>${_catFr(k)}</option>`).join('')}
          </select>
        </div>
        <div class="ct-field"><label>Statut</label>
          <select id="ct-status">
            ${['active','pending','draft','expired'].map(k => `<option value="${k}" ${(v.status||'active')===k?'selected':''}>${_statusFr(k)}</option>`).join('')}
          </select>
        </div>
        <div class="ct-field"><label>Valeur annuelle (CAD)</label><input type="number" id="ct-value" value="${v.annual_value || ''}" placeholder="0" /></div>
        <div class="ct-field"><label>Potentiel de négociation (%)</label><input type="number" id="ct-nego" value="${v.negotiation_potential || 0}" min="0" max="100" /></div>
        <div class="ct-field"><label>Date de début</label><input type="date" id="ct-start" value="${v.start_date || ''}" /></div>
        <div class="ct-field"><label>Date de fin</label><input type="date" id="ct-end" value="${v.end_date || ''}" /></div>
        <div class="ct-field"><label>Date de renouvellement</label><input type="date" id="ct-renewal" value="${v.renewal_date || ''}" /></div>
        <div class="ct-field"><label>Préavis annulation (jours)</label><input type="number" id="ct-notice" value="${v.cancellation_notice_days ?? 60}" min="0" /></div>
        <div class="ct-field full"><label>Notes</label><textarea id="ct-notes">${v.notes || ''}</textarea></div>
      </div>
      <div class="ct-modal-actions">
        <button class="ct-btn ct-btn-ghost" id="ct-cancel">Annuler</button>
        <button class="ct-btn ct-btn-primary" id="ct-save">${isEdit ? 'Enregistrer' : 'Créer le contrat'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#ct-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#ct-save').addEventListener('click', async () => {
    const vendor = overlay.querySelector('#ct-vendor').value.trim();
    if (!vendor) { overlay.querySelector('#ct-vendor').focus(); return; }
    const saveBtn = overlay.querySelector('#ct-save');
    saveBtn.disabled = true; saveBtn.textContent = '⏳ Enregistrement…';
    const payload = {
      vendor,
      description:              overlay.querySelector('#ct-desc').value.trim() || null,
      category:                 overlay.querySelector('#ct-cat').value,
      status:                   overlay.querySelector('#ct-status').value,
      annual_value:             parseFloat(overlay.querySelector('#ct-value').value) || 0,
      negotiation_potential:    parseFloat(overlay.querySelector('#ct-nego').value) || 0,
      start_date:               overlay.querySelector('#ct-start').value || null,
      end_date:                 overlay.querySelector('#ct-end').value || null,
      renewal_date:             overlay.querySelector('#ct-renewal').value || null,
      cancellation_notice_days: parseInt(overlay.querySelector('#ct-notice').value) || 60,
      notes:                    overlay.querySelector('#ct-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await _api(`/api/contracts/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await _api('/api/contracts', { method: 'POST', body: JSON.stringify(payload) });
      }
      overlay.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Enregistrer' : 'Créer le contrat';
      alert(`Erreur : ${err.message}`);
    }
  });
}

async function _load(container) {
  _css();
  let _filter = 'all';
  let _tab = 'liste';
  let _contracts = [];
  let _search = '';

  async function _refresh() {
    const params = _filter === 'renewing' ? '?renewing=90' : _filter !== 'all' ? `?status=${_filter}` : '';
    try {
      _contracts = await _api(`/api/contracts${params}`);
    } catch { _contracts = []; }
    _render();
  }

  function _renderFournisseurs() {
    const byVendor = {};
    _contracts.forEach(c => { if (!byVendor[c.vendor]) byVendor[c.vendor] = []; byVendor[c.vendor].push(c); });
    const vendors = Object.entries(byVendor).sort((a,b)=>b[1].reduce((s,c)=>s+(parseFloat(c.annual_value)||0),0)-a[1].reduce((s,c)=>s+(parseFloat(c.annual_value)||0),0));
    return `<div class="ct-atlas"><div class="ct-atlas-hd"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div><div class="ct-atlas-list"><div class="ct-atlas-item"><span class="ct-atlas-dot"></span>Regroupez vos contrats par fournisseur pour identifier les opportunités de consolidation et maximiser votre levier de négociation.</div></div></div>
    <div style="margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)">${vendors.length} Fournisseurs</div>
    ${vendors.length === 0 ? `<div class="ct-empty">Aucun fournisseur. Créez votre premier contrat.</div>` :
      vendors.map(([vendor, cts]) => {
        const total = cts.reduce((s,c)=>s+(parseFloat(c.annual_value)||0),0);
        return `<div class="ct-vendor-card">
          <div class="ct-vendor-icon">🏢</div>
          <div style="flex:1;min-width:0">
            <div class="ct-vendor-name">${vendor}</div>
            <div class="ct-vendor-meta">${cts.length} contrat${cts.length>1?'s':''} · ${_fmt(total)}/an · ${cts.map(c=>`<span class="ct-badge ${c.status||'active'}" style="margin-right:3px">${_catFr(c.category)}</span>`).join('')}</div>
          </div>
          <button class="ct-btn ct-btn-ghost">Voir les contrats →</button>
        </div>`;
      }).join('')}`;
  }

  function _renderEcheances() {
    const sorted = [..._contracts].filter(c=>c.renewal_date).sort((a,b)=>new Date(a.renewal_date)-new Date(b.renewal_date));
    return `<div class="ct-atlas"><div class="ct-atlas-hd"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div><div class="ct-atlas-list"><div class="ct-atlas-item"><span class="ct-atlas-dot"></span>Les contrats en rouge expirent dans moins de 30 jours. Déclenchez les négociations au moins 60 jours avant pour avoir du levier.</div></div></div>
    <div class="ct-card"><div class="ct-card-hd"><h3>📅 Échéances par ordre chronologique</h3></div>
    <div style="overflow-x:auto"><table class="ct-table"><thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Valeur / an</th><th>Renouvellement</th><th>Urgence</th><th>Préavis</th></tr></thead>
    <tbody>${sorted.length === 0 ? `<tr><td colspan="6" class="ct-empty">Aucun contrat avec date de renouvellement.</td></tr>` :
      sorted.map(c=>`<tr><td><strong>${c.vendor||'—'}</strong></td><td>${_catFr(c.category)}</td><td>${_fmt(c.annual_value,c.currency)}</td><td style="white-space:nowrap">${_fmtDate(c.renewal_date)}</td><td>${_urgencyBadge(c)}</td><td style="color:var(--muted)">${c.cancellation_notice_days||60}j</td></tr>`).join('')}
    </tbody></table></div></div>`;
  }

  function _renderRenouvellements() {
    const renewing = _contracts.filter(c=>c.urgency==='critical'||c.urgency==='warning').sort((a,b)=>a.days_to_renewal-b.days_to_renewal);
    return `<div class="ct-atlas"><div class="ct-atlas-hd"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div><div class="ct-atlas-list"><div class="ct-atlas-item"><span class="ct-atlas-dot"></span>Priorisez les renouvellements critiques (≤30j). Vérifiez si des alternatives existent avant de vous engager automatiquement.</div></div></div>
    ${renewing.length===0 ? `<div class="ct-card"><div class="ct-empty" style="padding:48px">✅ Aucun renouvellement urgent dans les 90 prochains jours.</div></div>` :
    `<div class="ct-card"><div class="ct-card-hd"><h3>⏰ Renouvellements à traiter (${renewing.length})</h3></div>
    <div style="overflow-x:auto"><table class="ct-table"><thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Valeur / an</th><th>Dans</th><th>Urgence</th><th>Actions</th></tr></thead>
    <tbody>${renewing.map(c=>`<tr><td><strong>${c.vendor}</strong></td><td>${_catFr(c.category)}</td><td>${_fmt(c.annual_value,c.currency)}</td><td style="font-weight:700;color:${c.urgency==='critical'?'#dc2626':'#d97706'}">${c.days_to_renewal}j</td><td>${_urgencyBadge(c)}</td><td><div class="ct-actions"><button class="ct-btn ct-btn-primary ct-edit-btn" data-id="${c.id}">Renouveler</button></div></td></tr>`).join('')}
    </tbody></table></div></div>`}`;
  }

  function _renderDocuments() {
    return `<div class="ct-atlas"><div class="ct-atlas-hd"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div><div class="ct-atlas-list"><div class="ct-atlas-item"><span class="ct-atlas-dot"></span>Centralisez vos contrats signés ici pour un accès rapide lors des audits, négociations et renouvellements.</div></div></div>
    <div class="ct-card"><div class="ct-empty" style="padding:60px">
      <div style="font-size:52px;margin-bottom:14px">📁</div>
      <div style="font-size:17px;font-weight:700;color:var(--text);margin:0 0 8px">Aucun document</div>
      <div style="font-size:13px;color:var(--muted);max-width:360px;margin:0 auto 20px;line-height:1.6">Glissez-déposez vos contrats signés (PDF, DOCX) pour les centraliser et les retrouver facilement.</div>
      <button class="ct-btn ct-btn-primary">📎 Joindre un document</button>
    </div></div>`;
  }

  function _renderAlertes() {
    const critical = _contracts.filter(c=>c.urgency==='critical');
    return `<div class="ct-atlas"><div class="ct-atlas-hd"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div><div class="ct-atlas-list"><div class="ct-atlas-item"><span class="ct-atlas-dot"></span>Traitez les contrats critiques en priorité. Un renouvellement automatique non souhaité peut engager votre organisation pour 1 an de plus.</div></div></div>
    ${critical.length===0 ? `<div class="ct-card"><div class="ct-empty" style="padding:48px">✅ Aucune alerte critique. Tous vos contrats sont sous contrôle.</div></div>` :
    `<div class="ct-card"><div class="ct-card-hd"><h3>🚨 Alertes critiques (${critical.length})</h3></div>
    <div style="overflow-x:auto"><table class="ct-table"><thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Valeur / an</th><th>Renouvellement</th><th>Urgence</th><th>Action</th></tr></thead>
    <tbody>${critical.map(c=>`<tr style="background:#fff5f5"><td><strong style="color:#dc2626">${c.vendor}</strong></td><td>${_catFr(c.category)}</td><td>${_fmt(c.annual_value,c.currency)}</td><td style="color:#dc2626;font-weight:700">${_fmtDate(c.renewal_date)}</td><td>${_urgencyBadge(c)}</td><td><button class="ct-btn ct-btn-danger ct-edit-btn" data-id="${c.id}">Agir</button></td></tr>`).join('')}
    </tbody></table></div></div>`}`;
  }

  function _render() {
    const main = container.querySelector('#ct-main');
    if (!main) return;

    if (_tab === 'fournisseurs') { main.innerHTML = _renderFournisseurs(); return; }
    if (_tab === 'echeances') { main.innerHTML = _renderEcheances(); return; }
    if (_tab === 'renouvellements') { main.innerHTML = _renderRenouvellements(); return; }
    if (_tab === 'documents') { main.innerHTML = _renderDocuments(); return; }
    if (_tab === 'alertes') { main.innerHTML = _renderAlertes(); main.querySelectorAll('.ct-edit-btn').forEach(btn => { btn.addEventListener('click', () => { const c = _contracts.find(x => x.id === btn.dataset.id); if (c) _openModal(c, _refresh); }); }); return; }

    const _q = _search.toLowerCase();
    const displayed = _q ? _contracts.filter(c =>
      (c.vendor||'').toLowerCase().includes(_q) ||
      (c.description||'').toLowerCase().includes(_q) ||
      _catFr(c.category).toLowerCase().includes(_q)
    ) : _contracts;

    main.innerHTML = _renderKPIs(_contracts) + `
      <div class="ct-filters">
        ${[['all','Tous'],['active','Actifs'],['renewing','Renouvellement prochain'],['expired','Expirés'],['draft','Brouillons']].map(([k,l]) =>
          `<button class="ct-filter-btn ${_filter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}
      </div>
      <div class="ct-card">
        <div class="ct-card-hd">
          <h3>📄 Contrats <span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:4px">${displayed.length} résultat${displayed.length!==1?'s':''}</span></h3>
          <div style="display:flex;gap:6px;margin-left:auto;align-items:center">
            <input id="ct-search" type="search" placeholder="Rechercher…" value="${_search.replace(/"/g,'&quot;')}"
              style="padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:12px;font-family:inherit;outline:none;width:180px" />
            <button class="ct-btn ct-btn-ghost" id="ct-export-csv">⬇ CSV</button>
            <button class="ct-btn ct-btn-ghost" id="ct-export-pdf">⬇ PDF</button>
            <button class="ct-btn ct-btn-primary" id="ct-new-btn">+ Nouveau contrat</button>
          </div>
        </div>
        <div>
          ${_renderTable(displayed)}
        </div>
      </div>`;

    main.querySelectorAll('.ct-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { _filter = btn.dataset.filter; _search = ''; _refresh(); });
    });
    main.querySelector('#ct-search')?.addEventListener('input', e => { _search = e.target.value; _render(); });
    main.querySelector('#ct-search')?.addEventListener('focus', e => e.target.style.borderColor = 'var(--primary)');
    main.querySelector('#ct-search')?.addEventListener('blur', e => e.target.style.borderColor = 'var(--border)');
    main.querySelector('#ct-new-btn')?.addEventListener('click', () => _openModal(null, _refresh));
    main.querySelector('#ct-export-csv')?.addEventListener('click', () => _exportCSV(displayed));
    main.querySelector('#ct-export-pdf')?.addEventListener('click', () => _exportPDF(displayed));
    main.querySelectorAll('.ct-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = _contracts.find(x => x.id === btn.dataset.id);
        if (c) _openModal(c, _refresh);
      });
    });
    main.querySelectorAll('.ct-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Archiver ce contrat ?')) return;
        try { await _api(`/api/contracts/${btn.dataset.id}`, { method: 'DELETE' }); _refresh(); }
        catch (err) { alert(`Erreur : ${err.message}`); }
      });
    });
  }

  container.innerHTML = `
    <div class="ct">
      <div class="ct-hd">
        <div class="ct-hd-left">
          <div class="ct-logo">📄</div>
          <div><h1 class="ct-title">Gestion des contrats</h1><p class="ct-sub">Fournisseurs · Renouvellements · Économies potentielles</p></div>
        </div>
      </div>
      <div class="ct-tabs">
        <button class="ct-tab active" data-ct-tab="liste">Liste</button>
        <button class="ct-tab" data-ct-tab="fournisseurs">Fournisseurs</button>
        <button class="ct-tab" data-ct-tab="echeances">Échéances</button>
        <button class="ct-tab" data-ct-tab="renouvellements">Renouvellements</button>
        <button class="ct-tab" data-ct-tab="alertes">Alertes</button>
      </div>
      <div id="ct-main"><div class="ct-loader"><div class="ct-spinner"></div><span>Chargement…</span></div></div>
    </div>`;

  container.querySelectorAll('.ct-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _tab = tab.dataset.ctTab;
      container.querySelectorAll('.ct-tab').forEach(t => t.classList.toggle('active', t === tab));
      _render();
    });
  });

  await _refresh();
}

export default {
  mount(container) { _load(container); },
  unmount(container) { container.innerHTML = ''; },
  refresh(ctx) {},
};

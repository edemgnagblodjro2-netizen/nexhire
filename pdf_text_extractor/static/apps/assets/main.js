/**
 * Parc TI — Inventaire des actifs informatiques
 * GET    /api/servers           — liste (filtres: dept_id, status)
 * POST   /api/servers           — créer un actif
 * PATCH  /api/servers/{id}      — modifier
 * PATCH  /api/servers/{id}/ping — enregistrer un ping
 * DELETE /api/servers/{id}      — supprimer
 */

const _CSS_ID = 'as-css';

const DEVICE_TYPES = {
  server:        { icon: '🖥', label: 'Serveur' },
  switch:        { icon: '🔀', label: 'Switch' },
  router:        { icon: '📡', label: 'Routeur' },
  firewall:      { icon: '🛡', label: 'Pare-feu' },
  laptop:        { icon: '💻', label: 'Laptop' },
  desktop:       { icon: '🖥', label: 'Desktop' },
  tablet:        { icon: '📱', label: 'Tablette' },
  phone_mobile:  { icon: '📞', label: 'Tél. mobile' },
  phone_ip:      { icon: '☎', label: 'Tél. IP' },
  docking_station:{ icon: '🔌', label: 'Docking' },
  monitor:       { icon: '🖵', label: 'Écran' },
  printer:       { icon: '🖨', label: 'Imprimante' },
  scanner:       { icon: '🔍', label: 'Scanner' },
  other:         { icon: '📦', label: 'Autre' },
};

const ENVS = { production: 'Production', staging: 'Pré-prod', development: 'Dev', test: 'Test' };
const STATUSES = { active: 'Actif', inactive: 'Inactif', maintenance: 'Maintenance', decommissioned: 'Retraité' };

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.as{padding:28px 32px;max-width:1200px;margin:0 auto;font-family:var(--font)}
.as-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.as-hd-left{display:flex;align-items:center;gap:14px}
.as-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.as-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.as-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

.as-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.as-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.as-kpi-icon{font-size:20px;margin-bottom:8px}
.as-kpi-val{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.as-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.as-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.as-kpi-sub.ok{color:#16a34a}.as-kpi-sub.warn{color:#d97706}.as-kpi-sub.err{color:#dc2626}

.as-filters{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap}
.as-filter-btn{padding:6px 14px;font-size:12px;font-weight:600;border-radius:var(--r-pill);border:1.5px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s}
.as-filter-btn.active{border-color:var(--primary);background:var(--primary);color:#fff}

.as-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.as-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.as-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}

.as-table{width:100%;border-collapse:collapse;font-size:12px}
.as-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 12px 10px;border-bottom:1px solid var(--border)}
.as-table td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.as-table tr:last-child td{border-bottom:none}
.as-table tr:hover td{background:var(--bg-2)}

.as-device-cell{display:flex;align-items:center;gap:8px}
.as-device-icon{font-size:16px;width:28px;text-align:center}
.as-hostname{font-weight:700;color:var(--text)}
.as-ip{font-size:11px;color:var(--muted)}

.as-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.as-badge.active{background:#dcfce7;color:#16a34a}
.as-badge.inactive{background:#f1f5f9;color:#64748b}
.as-badge.maintenance{background:#fef3c7;color:#92400e}
.as-badge.decommissioned{background:#fee2e2;color:#dc2626}
.as-badge.production{background:#dbeafe;color:#1d4ed8}
.as-badge.staging{background:#f3e8ff;color:#7c3aed}
.as-badge.development{background:#fef9c3;color:#a16207}
.as-badge.warn{background:#fef3c7;color:#92400e}
.as-badge.err{background:#fee2e2;color:#dc2626}

.as-actions{display:flex;gap:6px}
.as-btn{padding:6px 12px;font-size:12px;font-weight:600;border-radius:var(--r);border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.as-btn-primary{background:var(--primary);color:#fff}.as-btn-primary:hover{opacity:.85}
.as-btn-ghost{background:var(--bg-2);color:var(--text);border:1px solid var(--border)}.as-btn-ghost:hover{background:var(--border)}
.as-btn-danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}.as-btn-danger:hover{background:#fecaca}

.as-empty{text-align:center;padding:48px;color:var(--muted);font-size:13px}

.as-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center}
.as-modal{background:#fff;border-radius:var(--r-lg);padding:28px;width:min(600px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,.18)}
.as-modal h4{font-size:16px;font-weight:700;color:var(--text);margin:0 0 20px}
.as-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.as-form-grid .full{grid-column:1/-1}
.as-field{display:flex;flex-direction:column;gap:4px}
.as-field label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.as-field input,.as-field select,.as-field textarea{padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
.as-field input:focus,.as-field select:focus{border-color:var(--primary)}
.as-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}

.as-loader{display:flex;align-items:center;justify-content:center;gap:10px;padding:60px;color:var(--muted)}
.as-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:#7c3aed;border-radius:50%;animation:asspin .7s linear infinite}
@keyframes asspin{to{transform:rotate(360deg)}}

@media(max-width:900px){.as-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.as-kpis{grid-template-columns:1fr};.as-form-grid{grid-template-columns:1fr}}
.as-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:24px}
.as-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.as-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.as-tab:hover:not(.active){color:var(--text-2)}
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
  if (!v) return '—';
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}
function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; }
}

function _warrantyBadge(srv) {
  if (!srv.warranty_end_date) return '';
  const days = Math.round((new Date(srv.warranty_end_date) - new Date()) / 86400000);
  if (days < 0) return `<span class="as-badge err">Garantie expirée</span>`;
  if (days < 90) return `<span class="as-badge warn">Garantie ⏰ ${days}j</span>`;
  return '';
}

function _renderKPIs(assets) {
  const total = assets.length;
  const cost = assets.reduce((s, a) => s + (parseFloat(a.monthly_cost) || 0), 0);
  const inactive = assets.filter(a => a.status === 'inactive' || a.status === 'decommissioned').length;
  const warrantyExpired = assets.filter(a => {
    if (!a.warranty_end_date) return false;
    return new Date(a.warranty_end_date) < new Date();
  }).length;
  return `
    <div class="as-kpis">
      <div class="as-kpi"><div class="as-kpi-icon">🖥</div><div class="as-kpi-val">${total}</div><div class="as-kpi-lbl">Actifs enregistrés</div><div class="as-kpi-sub ok">Tous types confondus</div></div>
      <div class="as-kpi"><div class="as-kpi-icon">💰</div><div class="as-kpi-val">${_fmt(cost)}</div><div class="as-kpi-lbl">Coût mensuel total</div><div class="as-kpi-sub ok">/ mois</div></div>
      <div class="as-kpi"><div class="as-kpi-icon">⚠️</div><div class="as-kpi-val">${warrantyExpired}</div><div class="as-kpi-lbl">Garanties expirées</div><div class="as-kpi-sub ${warrantyExpired>0?'err':'ok'}">${warrantyExpired>0?'à remplacer':'Tout à jour'}</div></div>
      <div class="as-kpi"><div class="as-kpi-icon">🔴</div><div class="as-kpi-val">${inactive}</div><div class="as-kpi-lbl">Inactifs / Retraités</div><div class="as-kpi-sub ${inactive>0?'warn':'ok'}">${inactive>0?'à réviser':'Tous actifs'}</div></div>
    </div>`;
}

function _renderTable(assets) {
  if (!assets.length) return `<div class="as-empty">Aucun actif enregistré.<br>Cliquez sur <strong>Ajouter un actif</strong> pour commencer.</div>`;
  return `
    <table class="as-table">
      <thead><tr>
        <th>Actif</th><th>Environnement</th><th>OS / Specs</th><th>Coût/mois</th>
        <th>Garantie</th><th>Statut</th><th></th>
      </tr></thead>
      <tbody>
        ${assets.map(a => {
          const dt = DEVICE_TYPES[a.device_type] || DEVICE_TYPES.other;
          const specs = [a.cpu_cores ? `${a.cpu_cores} vCPU` : null, a.ram_gb ? `${a.ram_gb} GB RAM` : null, a.storage_gb ? `${a.storage_gb} GB` : null].filter(Boolean).join(' · ');
          return `<tr>
            <td>
              <div class="as-device-cell">
                <span class="as-device-icon">${dt.icon}</span>
                <div>
                  <div class="as-hostname">${a.hostname}</div>
                  <div class="as-ip">${a.ip_address || dt.label}${a.location ? ` · ${a.location}` : ''}</div>
                </div>
              </div>
            </td>
            <td><span class="as-badge ${a.environment||'production'}">${ENVS[a.environment]||a.environment||'—'}</span></td>
            <td style="color:var(--muted);font-size:11px">${a.os||'—'}${specs?`<br>${specs}`:''}</td>
            <td style="font-weight:600">${_fmt(a.monthly_cost)}</td>
            <td>${_warrantyBadge(a) || _fmtDate(a.warranty_end_date)}</td>
            <td><span class="as-badge ${a.status||'active'}">${STATUSES[a.status]||a.status||'—'}</span></td>
            <td><div class="as-actions">
              <button class="as-btn as-btn-ghost as-edit-btn" data-id="${a.id}">Modifier</button>
              <button class="as-btn as-btn-danger as-del-btn" data-id="${a.id}">Retirer</button>
            </div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function _openModal(existing = null, onSave) {
  const isEdit = !!existing;
  const v = existing || {};
  const overlay = document.createElement('div');
  overlay.className = 'as-modal-overlay';
  overlay.innerHTML = `
    <div class="as-modal" role="dialog">
      <h4>${isEdit ? '✏️ Modifier l\'actif' : '🖥 Ajouter un actif TI'}</h4>
      <div class="as-form-grid">
        <div class="as-field"><label>Type d'actif *</label>
          <select id="as-type">
            ${Object.entries(DEVICE_TYPES).map(([k,d]) => `<option value="${k}" ${(v.device_type||'server')===k?'selected':''}>${d.icon} ${d.label}</option>`).join('')}
          </select>
        </div>
        <div class="as-field"><label>Nom d'hôte / Identifiant *</label><input id="as-hostname" value="${v.hostname||''}" placeholder="srv-prod-01, PC-RH-03…" /></div>
        <div class="as-field"><label>Adresse IP</label><input id="as-ip" value="${v.ip_address||''}" placeholder="192.168.1.10" /></div>
        <div class="as-field"><label>Emplacement</label><input id="as-loc" value="${v.location||''}" placeholder="Salle serveur A, Bureau 204…" /></div>
        <div class="as-field"><label>Environnement</label>
          <select id="as-env">
            ${Object.entries(ENVS).map(([k,l]) => `<option value="${k}" ${(v.environment||'production')===k?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="as-field"><label>Statut</label>
          <select id="as-status">
            ${Object.entries(STATUSES).map(([k,l]) => `<option value="${k}" ${(v.status||'active')===k?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="as-field full"><label>Système d'exploitation</label><input id="as-os" value="${v.os||''}" placeholder="Windows Server 2022, Ubuntu 22.04…" /></div>
        <div class="as-field"><label>CPU (cœurs)</label><input type="number" id="as-cpu" value="${v.cpu_cores||''}" placeholder="4" /></div>
        <div class="as-field"><label>RAM (GB)</label><input type="number" id="as-ram" value="${v.ram_gb||''}" placeholder="16" /></div>
        <div class="as-field"><label>Stockage (GB)</label><input type="number" id="as-stor" value="${v.storage_gb||''}" placeholder="512" /></div>
        <div class="as-field"><label>Coût mensuel (CAD)</label><input type="number" id="as-cost" value="${v.monthly_cost||''}" placeholder="0" /></div>
        <div class="as-field"><label>Prix d'achat (CAD)</label><input type="number" id="as-price" value="${v.purchase_price||''}" placeholder="0" /></div>
        <div class="as-field"><label>Étiquette d'actif</label><input id="as-tag" value="${v.asset_tag||''}" placeholder="IT-2024-001" /></div>
        <div class="as-field"><label>Date d'acquisition</label><input type="date" id="as-acq" value="${v.acquisition_date||''}" /></div>
        <div class="as-field"><label>Fin de garantie</label><input type="date" id="as-warr" value="${v.warranty_end_date||''}" /></div>
        <div class="as-field"><label>Remplacement prévu</label><input type="date" id="as-repl" value="${v.replacement_date||''}" /></div>
        <div class="as-field full"><label>Notes</label><input id="as-notes" value="${v.notes||''}" placeholder="Informations supplémentaires…" /></div>
      </div>
      <div class="as-modal-actions">
        <button class="as-btn as-btn-ghost" id="as-cancel">Annuler</button>
        <button class="as-btn as-btn-primary" id="as-save">${isEdit ? 'Enregistrer' : 'Ajouter l\'actif'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#as-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#as-save').addEventListener('click', async () => {
    const hostname = overlay.querySelector('#as-hostname').value.trim();
    if (!hostname) { overlay.querySelector('#as-hostname').focus(); return; }
    const saveBtn = overlay.querySelector('#as-save');
    saveBtn.disabled = true; saveBtn.textContent = '⏳ Enregistrement…';
    const payload = {
      device_type:      overlay.querySelector('#as-type').value,
      hostname,
      ip_address:       overlay.querySelector('#as-ip').value.trim() || null,
      location:         overlay.querySelector('#as-loc').value.trim() || null,
      environment:      overlay.querySelector('#as-env').value,
      status:           overlay.querySelector('#as-status').value,
      os:               overlay.querySelector('#as-os').value.trim() || null,
      cpu_cores:        parseInt(overlay.querySelector('#as-cpu').value) || null,
      ram_gb:           parseInt(overlay.querySelector('#as-ram').value) || null,
      storage_gb:       parseInt(overlay.querySelector('#as-stor').value) || null,
      monthly_cost:     parseFloat(overlay.querySelector('#as-cost').value) || 0,
      purchase_price:   parseFloat(overlay.querySelector('#as-price').value) || null,
      asset_tag:        overlay.querySelector('#as-tag').value.trim() || null,
      acquisition_date: overlay.querySelector('#as-acq').value || null,
      warranty_end_date:overlay.querySelector('#as-warr').value || null,
      replacement_date: overlay.querySelector('#as-repl').value || null,
      notes:            overlay.querySelector('#as-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await _api(`/api/servers/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await _api('/api/servers', { method: 'POST', body: JSON.stringify(payload) });
      }
      overlay.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Enregistrer' : "Ajouter l'actif";
      alert(`Erreur : ${err.message}`);
    }
  });
}

async function _load(container) {
  _css();
  let _filter = 'all';
  let _tab = 'inventaire';
  let _assets = [];

  async function _refresh() {
    const params = _filter !== 'all' ? `?status=${_filter}` : '';
    try { _assets = await _api(`/api/servers${params}`); }
    catch { _assets = []; }
    _render();
  }

  function _renderTabFiltered(types, label, icon) {
    const filtered = _assets.filter(a => types.includes(a.device_type));
    const main = container.querySelector('#as-main');
    if (!main) return;
    main.innerHTML = _renderKPIs(filtered) + `
      <div class="as-card">
        <div class="as-card-hd">
          <h3>${icon} ${label} (${filtered.length})</h3>
          <button class="as-btn as-btn-primary" id="as-new-btn">+ Ajouter un actif</button>
        </div>
        <div>${filtered.length ? _renderTable(filtered) : `<div class="as-empty">Aucun actif de ce type enregistré.</div>`}</div>
      </div>`;
    main.querySelector('#as-new-btn')?.addEventListener('click', () => _openModal(null, _refresh));
    main.querySelectorAll('.as-edit-btn').forEach(btn => { btn.addEventListener('click', () => { const a = _assets.find(x => x.id === btn.dataset.id); if (a) _openModal(a, _refresh); }); });
    main.querySelectorAll('.as-del-btn').forEach(btn => { btn.addEventListener('click', async () => { if (!confirm('Retirer cet actif ?')) return; try { await _api(`/api/servers/${btn.dataset.id}`, { method: 'DELETE' }); _refresh(); } catch (err) { alert(err.message); } }); });
  }

  function _renderLicences() {
    const main = container.querySelector('#as-main');
    if (!main) return;
    main.innerHTML = `<div style="background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:18px 22px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:22px">🤖</span><strong style="font-size:14px;color:var(--text)">ATLAS recommande</strong></div>
      <div style="font-size:12px;color:var(--text-body);line-height:1.45">Les licences logicielles sont gérées dans le module <strong>Contrats</strong> (catégorie : Logiciel / SaaS). Utilisez-le pour suivre les renouvellements et coûts par siège.</div>
    </div>
    <div class="as-card"><div class="as-empty" style="padding:60px">
      <div style="font-size:52px;margin-bottom:14px">🔑</div>
      <div style="font-size:17px;font-weight:700;color:var(--text);margin:0 0 8px">Gestion des licences</div>
      <div style="font-size:13px;color:var(--muted);max-width:380px;margin:0 auto 20px;line-height:1.6">Vos licences logicielles (Microsoft 365, Adobe, etc.) sont centralisées dans le module Contrats pour un suivi unifié avec les renouvellements.</div>
      <button class="as-btn as-btn-primary" onclick="window.location.href='/workspace/'+window.__agentCtx?.partnerSlug+'/contrats'">Aller aux Contrats →</button>
    </div></div>`;
  }

  function _render() {
    const main = container.querySelector('#as-main');
    if (!main) return;

    if (_tab === 'ordinateurs') { _renderTabFiltered(['laptop','desktop','tablet','phone_mobile'], 'Ordinateurs & Postes', '💻'); return; }
    if (_tab === 'serveurs') { _renderTabFiltered(['server'], 'Serveurs', '🖥'); return; }
    if (_tab === 'reseau') { _renderTabFiltered(['switch','router','firewall'], 'Équipements réseau', '📡'); return; }
    if (_tab === 'licences') { _renderLicences(); return; }
    if (_tab === 'imprimantes') { _renderTabFiltered(['printer','scanner'], 'Imprimantes & Scanners', '🖨'); return; }

    main.innerHTML = _renderKPIs(_assets) + `
      <div class="as-filters">
        ${[['all','Tous'],['active','Actifs'],['maintenance','En maintenance'],['inactive','Inactifs'],['decommissioned','Retraités']].map(([k,l]) =>
          `<button class="as-filter-btn ${_filter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}
      </div>
      <div class="as-card">
        <div class="as-card-hd">
          <h3>🖥 Inventaire du parc TI</h3>
          <button class="as-btn as-btn-primary" id="as-new-btn">+ Ajouter un actif</button>
        </div>
        <div>${_renderTable(_assets)}</div>
      </div>`;

    main.querySelectorAll('.as-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { _filter = btn.dataset.filter; _refresh(); });
    });
    main.querySelector('#as-new-btn')?.addEventListener('click', () => _openModal(null, _refresh));
    main.querySelectorAll('.as-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = _assets.find(x => x.id === btn.dataset.id);
        if (a) _openModal(a, _refresh);
      });
    });
    main.querySelectorAll('.as-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Retirer cet actif du parc TI ?')) return;
        try { await _api(`/api/servers/${btn.dataset.id}`, { method: 'DELETE' }); _refresh(); }
        catch (err) { alert(`Erreur : ${err.message}`); }
      });
    });
  }

  container.innerHTML = `
    <div class="as">
      <div class="as-hd">
        <div class="as-hd-left">
          <div class="as-logo">🖥</div>
          <div><h1 class="as-title">Parc TI</h1><p class="as-sub">Serveurs · Postes · Équipements réseau · Garanties</p></div>
        </div>
      </div>
      <div class="as-tabs">
        <button class="as-tab active" data-as-tab="inventaire">Inventaire</button>
        <button class="as-tab" data-as-tab="ordinateurs">Ordinateurs</button>
        <button class="as-tab" data-as-tab="serveurs">Serveurs</button>
        <button class="as-tab" data-as-tab="reseau">Réseau</button>
        <button class="as-tab" data-as-tab="licences">Licences</button>
        <button class="as-tab" data-as-tab="imprimantes">Imprimantes</button>
      </div>
      <div id="as-main"><div class="as-loader"><div class="as-spinner"></div><span>Chargement…</span></div></div>
    </div>`;

  container.querySelectorAll('.as-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _tab = tab.dataset.asTab;
      container.querySelectorAll('.as-tab').forEach(t => t.classList.toggle('active', t === tab));
      _render();
    });
  });

  await _refresh();
}

export default {
  mount(container) { _load(container); },
  unmount(container) { container.innerHTML = ''; },
};

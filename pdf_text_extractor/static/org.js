/**
 * AgentHub Platform — Org Workspace Shell
 * Espace personnel de l'organisation (PME) — accessible via lien depuis le rapport
 * URL: /org/{session_id}
 */

const _sessionId = location.pathname.split('/').filter(Boolean)[1] || null;

const NIV_LABEL = { debutant: '🟡 Débutant', intermediaire: '🔵 Intermédiaire', avance: '🟢 Avancé' };
const NIV_COLOR = { debutant: '#fef3c7', intermediaire: '#dbeafe', avance: '#dcfce7' };
const NIV_TEXT  = { debutant: '#92400e', intermediaire: '#1e3a8a', avance: '#14532d' };

const DIM_ICONS = {
  'Stratégie':    '🎯',
  'Personnes':    '👥',
  'Processus':    '⚙️',
  'Technologies': '💻',
  'Gouvernance':  '⚖️',
};

function _scoreColor(s) { return s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'; }

async function boot() {
  if (!_sessionId) { _showError('URL invalide.'); return; }

  try {
    const res = await fetch(`/api/org/session/${_sessionId}`, { credentials: 'include' });
    if (!res.ok) throw new Error((await res.json()).detail || 'Session introuvable.');
    const data = await res.json();
    _applyBranding(data.partner);
    _render(data);
  } catch (err) {
    _showError(err.message);
  }
}

function _applyBranding(p) {
  if (p.primary_color) {
    document.documentElement.style.setProperty('--primary', p.primary_color);
    document.documentElement.style.setProperty('--primary-lt', p.primary_color + '20');
  }
  if (p.logo_url) {
    const img = document.getElementById('org-logo');
    img.src = p.logo_url; img.style.display = 'block';
  }
  document.getElementById('org-partner-name').textContent = p.hero_title || p.name || 'AgentHub';
  document.getElementById('org-powered').textContent      = p.hero_subtitle || 'Votre espace IA personnel';
  const link = document.getElementById('org-workspace-link');
  link.href = `/workspace/${p.slug}`;
  document.title = 'Mon espace IA · AgentHub';
}

function _render(d) {
  const score = Math.round(d.imai_score);
  const color = _scoreColor(score);
  const dims  = d.dimensions || {};
  const recos = d.recommendations || [];

  const niv = d.niveau || 'debutant';

  document.getElementById('org-loading').style.display = 'none';
  const content = document.getElementById('org-content');
  content.style.display = 'block';

  const completedDate = d.completed_at
    ? new Date(d.completed_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  content.innerHTML = `
  <div class="org-hero">
    <div class="org-hero-text">
      <div class="org-hero-tag">Votre espace IA personnel</div>
      <div class="org-hero-name">${_esc(d.company_name)}</div>
      <div class="org-hero-sub">${d.sector || ''}${d.sector && completedDate ? ' · ' : ''}${completedDate ? 'Diagnostic complété le ' + completedDate : ''}</div>
      <span class="org-niveau" style="background:${NIV_COLOR[niv]||'#f1f5f9'};color:${NIV_TEXT[niv]||'#64748b'};margin-top:12px;display:inline-block">
        ${NIV_LABEL[niv] || niv}
      </span>
    </div>
    <div class="org-score-ring">
      <svg viewBox="0 0 36 36" style="width:100px;height:100px;transform:rotate(-90deg)">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" stroke-width="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="3"
          stroke-dasharray="${score} ${100-score}" stroke-dashoffset="25" stroke-linecap="round"/>
      </svg>
      <div class="org-score-val" style="color:${color};margin-top:-72px;position:relative">${score}</div>
      <div class="org-score-lbl" style="margin-top:4px">Score IMAI /100</div>
    </div>
  </div>

  <div class="org-grid">
    <div class="org-card">
      <div class="org-card-title">📊 Maturité par dimension</div>
      <div class="org-dim">
        ${Object.entries(dims).map(([k, v]) => {
          const pct = Math.round(v);
          const c   = _scoreColor(pct);
          return `
        <div class="org-dim-row">
          <span class="org-dim-label">${DIM_ICONS[k] || ''} ${k}</span>
          <div class="org-dim-bar-wrap">
            <div class="org-dim-bar" style="width:${pct}%;background:${c}"></div>
          </div>
          <span class="org-dim-val" style="color:${c}">${pct}</span>
        </div>`;
        }).join('')}
      </div>
    </div>

    <div class="org-card">
      <div class="org-card-title">🎯 Priorités d'action</div>
      ${recos.length ? `
      <div class="org-reco">
        ${recos.slice(0, 4).map((r, i) => `
        <div class="org-reco-item">
          <div class="org-reco-num">${i + 1}</div>
          <div class="org-reco-txt">${_esc(typeof r === 'string' ? r : r.text || r.label || JSON.stringify(r))}</div>
        </div>`).join('')}
      </div>` : `
      <div style="text-align:center;padding:32px;color:#94a3b8;font-size:13px">
        Consultez votre rapport complet pour vos recommandations personnalisées.
      </div>`}
    </div>
  </div>

  <div class="org-actions">
    <a href="${_esc(d.rapport_url)}" target="_blank" class="org-action-card">
      <div class="org-action-icon">📋</div>
      <div class="org-action-title">Rapport complet</div>
      <div class="org-action-desc">Votre diagnostic détaillé : scores par dimension, benchmarks, recommandations personnalisées et plan d'action.</div>
      <div class="org-action-cta">Voir mon rapport →</div>
    </a>
    <a href="#gov" class="org-action-card" id="org-gov-link">
      <div class="org-action-icon">⚖️</div>
      <div class="org-action-title">Gouvernance IA & Loi 25</div>
      <div class="org-action-desc">Évaluez votre conformité Loi 25, générez votre politique IA et constituez votre registre des outils IA.</div>
      <div class="org-action-cta" id="org-gov-score">Commencer →</div>
    </a>
    <a href="${_esc(d.workspace_url)}" class="org-action-card">
      <div class="org-action-icon">💬</div>
      <div class="org-action-title">ATLAS — Votre IA conseillère</div>
      <div class="org-action-desc">Posez vos questions à ATLAS, votre assistante IA qui comprend votre contexte et vos résultats de diagnostic.</div>
      <div class="org-action-cta">Ouvrir ATLAS →</div>
    </a>
    <a href="${_esc(d.workspace_url)}" class="org-action-card">
      <div class="org-action-icon">🚀</div>
      <div class="org-action-title">Programme d'accompagnement</div>
      <div class="org-action-desc">Accédez à votre espace programme, vos modules d'accélération et vos ressources sectorielles.</div>
      <div class="org-action-cta">Accéder au programme →</div>
    </a>
  </div>

  <div id="org-gov-section" style="display:none">
    <div id="org-gov-container"></div>
  </div>

  <div class="org-footer">
    Propulsé par <a href="https://civicainc.ca" target="_blank">CivicAI Inc.</a> · AgentHub Platform ·
    <a href="/legal/privacy" target="_blank">Confidentialité</a> · Données hébergées au Canada
  </div>`;

  _initGov(d);
  _showGovScore();
}

function _initGov(data) {
  const govLink = document.getElementById('org-gov-link');
  if (!govLink) return;

  govLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const section = document.getElementById('org-gov-section');
    const container = document.getElementById('org-gov-container');
    if (section.style.display === 'block') {
      section.style.display = 'none'; return;
    }
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const mod = await import('/static/apps/gouvernance/main.js');
      mod.default.mount(container, {
        partnerSlug: data.partner.slug,
        partner: data.partner,
        appConfig: { org_slug: data.session_id, compliance_framework: 'loi25' },
      });
    } catch (err) {
      container.innerHTML = `<div style="padding:32px;color:#94a3b8;text-align:center">Impossible de charger le module Gouvernance.</div>`;
    }
  });
}

function _showGovScore() {
  try {
    const key = `aghub_gov_${document.getElementById('org-workspace-link')?.href?.split('/').pop() || 'default'}`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    const checklist = saved.checklist || {};
    const total = 15;
    const done = Object.values(checklist).filter(v => v === 'done').length;
    const partial = Object.values(checklist).filter(v => v === 'partial').length;
    const pct = Math.round((done + partial * 0.5) / total * 100);
    if (pct > 0) {
      const el = document.getElementById('org-gov-score');
      if (el) el.textContent = `${pct}% conforme — Continuer →`;
    }
  } catch {}
}

function _showError(msg) {
  document.getElementById('org-loading').innerHTML = `
    <div style="font-size:36px">⚠️</div>
    <div style="font-size:15px;font-weight:600;color:#0f172a">Session introuvable</div>
    <div style="font-size:13px;max-width:320px;line-height:1.6">${_esc(msg)}</div>
    <a href="/" style="font-size:13px;color:#7c3aed;text-decoration:none;margin-top:8px">Retour à l'accueil</a>`;
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

boot();

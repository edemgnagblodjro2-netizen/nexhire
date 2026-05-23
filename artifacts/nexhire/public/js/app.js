'use strict';

const BASE = '/nexhire';
const state = { user: null, lang: 'en', regRole: 'candidate', jobs: [], currentPage: 1, jobSearchTimer: null };

// ── Init ───────────────────────────────────────────────────
(async () => {
  try {
    const d = await api('GET', `${BASE}/api/auth/me`);
    if (d.success && d.user) { state.user = d.user; state.lang = d.user.preferred_lang || 'en'; showUserNav(); }
  } catch (e) {}
  setLangUI(state.lang);
  loadStats();
  loadFeaturedJobs();
  initPostJobForm();
  initCompanyForm();
  if (state.user) loadDashboard();
})();

// ── API helper ─────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  try { return await res.json(); } catch { return { success: false, error: 'Network error' }; }
}

// ── Navigation ─────────────────────────────────────────────
function goto(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`pg-${page}`);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  if (page === 'jobs') { loadJobs(); }
  if (page === 'candidate-dash' && state.user) loadDashboard();
  if (page === 'employer-dash' && state.user) loadEmployerDash();
}

// ── Lang ───────────────────────────────────────────────────
async function setLang(lang) {
  state.lang = lang;
  setLangUI(lang);
  if (state.user) await api('POST', `${BASE}/api/auth/set-lang`, { lang });
}

function setLangUI(lang) {
  document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');
  document.getElementById('btn-fr')?.classList.toggle('active', lang === 'fr');
  document.documentElement.lang = lang;
  const t = lang === 'fr';
  safeSet('h-eyebrow', t ? 'Matching IA — Emplois Mondiaux' : 'AI-Powered Global Job Matching');
  safeSet('h-title', t ? 'Trouvez votre prochaine <em>opportunité</em> partout dans le monde' : 'Find your next <em>opportunity</em> anywhere in the world');
  safeSet('h-sub', t ? 'Des milliers d\'emplois mondiaux. Télétravail, hybride ou présentiel. Matching IA pour trouver votre poste idéal.' : 'Thousands of jobs worldwide. Remote, hybrid, or on-site. AI matching to find your perfect role faster than ever.');
}

function safeSet(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

// ── Stats ──────────────────────────────────────────────────
async function loadStats() {
  const d = await api('GET', `${BASE}/api/jobs/stats`);
  if (d.success) {
    safeSet('stat-jobs', d.stats.totalJobs.toLocaleString());
    safeSet('stat-cos', d.stats.totalCompanies.toLocaleString());
  }
}

// ── Featured jobs ──────────────────────────────────────────
async function loadFeaturedJobs() {
  const d = await api('GET', `${BASE}/api/jobs?featured=true&limit=6`);
  const container = document.getElementById('featured-jobs');
  if (!container) return;
  const jobs = d.jobs || [];
  state.jobs = jobs;
  if (!jobs.length) {
    // Show placeholder cards if no jobs yet
    container.innerHTML = ['Senior Full-Stack Developer','Product Designer','AI/ML Engineer','Marketing Manager'].map(title => jobCardHtml({ id: Math.random(), title_en: title, title_fr: title, company_name: 'Nexhire Demo', work_mode: ['remote','hybrid','onsite'][Math.floor(Math.random()*3)], city: ['Toronto','Paris','London','Remote'][Math.floor(Math.random()*4)], country: 'Global', featured: 1, slug: '#' }, true)).join('');
    return;
  }
  container.innerHTML = jobs.map(j => jobCardHtml(j)).join('');
}

function jobCardHtml(j, demo = false) {
  const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
  const mode = j.work_mode || 'onsite';
  const salary = j.salary_min ? `${fmtSalary(j.salary_min)}${j.salary_max ? '–' + fmtSalary(j.salary_max) : ''} ${j.salary_currency || 'CAD'}` : '';
  const color = companyColor(j.company_name);
  const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
  return `<div class="job-card${j.featured ? ' featured' : ''}" onclick="${demo ? '' : `openJobDetail('${j.id}')`}">
    ${j.featured ? '<div class="job-featured-badge">Featured</div>' : ''}
    <div class="job-company-row">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:36px;height:36px;border-radius:8px;object-fit:contain">` : `<div class="company-logo" style="background:${color}">${initials}</div>`}
      <div class="company-name">${esc(j.company_name || '')}</div>
    </div>
    <div class="job-title">${esc(title)}</div>
    <div class="job-meta">
      <span class="job-tag ${mode}">${mode}</span>
      ${j.city ? `<span class="job-tag"><i class="ti ti-map-pin" style="font-size:12px"></i>${esc(j.city)}</span>` : ''}
      ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
    </div>
    ${salary ? `<div class="job-salary">${salary}</div>` : ''}
  </div>`;
}

// ── Jobs page ──────────────────────────────────────────────
let filterTimer = null;
function debounceFilterSearch() { clearTimeout(filterTimer); filterTimer = setTimeout(filterJobs, 350); }
function debounceSearch() { clearTimeout(state.jobSearchTimer); state.jobSearchTimer = setTimeout(() => { if (document.getElementById('pg-jobs').classList.contains('active')) filterJobs(); }, 350); }

async function searchJobs() {
  goto('jobs');
  setTimeout(filterJobs, 100);
}

function quickSearch(q) { document.getElementById('q').value = q; searchJobs(); }

async function filterJobs(page = 1) {
  state.currentPage = page;
  const q = (document.getElementById('fq') || document.getElementById('q'))?.value || '';
  const work_mode = document.getElementById('fwork')?.value || document.getElementById('mode-filter')?.value || '';
  const job_type = document.getElementById('ftype')?.value || '';
  const params = new URLSearchParams({ page, limit: 15 });
  if (q) params.set('q', q);
  if (work_mode) params.set('work_mode', work_mode);
  if (job_type) params.set('job_type', job_type);

  const d = await api('GET', `${BASE}/api/jobs?${params}`);
  const list = document.getElementById('jobs-list');
  if (!list) return;

  const jobs = d.jobs || [];
  if (!jobs.length) { list.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)"><i class="ti ti-search-off" style="font-size:40px;display:block;margin-bottom:12px"></i>No jobs found. Try different filters.</div>'; return; }

  list.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const color = companyColor(j.company_name);
    const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
    return `<div class="job-list-item" onclick="openJobDetail('${j.id}')" id="jli-${j.id}">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:40px;height:40px;border-radius:8px;flex-shrink:0;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:40px;height:40px;border-radius:8px;flex-shrink:0">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--r);font-weight:600;color:var(--dark);font-size:15px">${esc(title)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(j.company_name || '')}${j.city ? ' · ' + esc(j.city) : ''}</div>
        <div class="job-meta" style="margin-top:8px">
          <span class="job-tag ${j.work_mode}">${j.work_mode || 'onsite'}</span>
          ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
          ${j.salary_min ? `<span class="job-tag" style="color:var(--indigo)">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // Pagination
  const pages = d.pages || 1;
  const pgEl = document.getElementById('jobs-pagination');
  if (pgEl && pages > 1) {
    pgEl.innerHTML = Array.from({ length: pages }, (_, i) => i + 1).map(p =>
      `<button onclick="filterJobs(${p})" class="btn-${p === page ? 'primary' : 'ghost'}" style="margin:0 4px;padding:6px 14px;font-size:13px">${p}</button>`
    ).join('');
  } else if (pgEl) pgEl.innerHTML = '';
}

async function openJobDetail(jobId) {
  const d = await api('GET', `${BASE}/api/jobs/${jobId}`);
  if (!d.success) return;
  const j = d.job;
  const panel = document.getElementById('job-detail-panel');
  if (!panel) return;
  panel.style.display = 'block';

  document.querySelectorAll('.job-list-item').forEach(el => el.classList.remove('selected'));
  document.getElementById(`jli-${jobId}`)?.classList.add('selected');

  const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
  const desc = state.lang === 'fr' ? (j.description_fr || j.description_en) : (j.description_en || j.description_fr);
  const color = companyColor(j.company_name);
  const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:48px;height:48px;border-radius:10px;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:48px;height:48px;border-radius:10px;font-size:16px">${initials}</div>`}
      <div><div style="font-size:13px;color:var(--muted);font-weight:500">${esc(j.company_name || '')}</div>${j.company_website ? `<a href="${esc(j.company_website)}" target="_blank" style="font-size:12px;color:var(--indigo)">${esc(j.company_website)}</a>` : ''}</div>
    </div>
    <h2>${esc(title)}</h2>
    <div class="job-meta" style="margin:12px 0">
      <span class="job-tag ${j.work_mode}">${j.work_mode || 'onsite'}</span>
      ${j.city ? `<span class="job-tag"><i class="ti ti-map-pin" style="font-size:12px"></i>${esc(j.city)}</span>` : ''}
      ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
      ${j.salary_min ? `<span class="job-tag" style="color:var(--indigo);background:var(--indigo3);border-color:var(--indigo4)">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}</span>` : ''}
    </div>
    ${state.user?.role === 'candidate' ? `<button class="btn-primary apply-btn" onclick="applyToJob('${j.id}')"><i class="ti ti-send"></i> Apply Now</button>` : !state.user ? `<button class="btn-primary apply-btn" onclick="showModal('modal-login')"><i class="ti ti-send"></i> Sign in to Apply</button>` : ''}
    <div class="job-desc">${esc(desc || '')}</div>
  `;
}

async function applyToJob(jobId) {
  const d = await api('POST', `${BASE}/api/applications`, { job_id: jobId });
  if (d.success) toast('Application submitted!', 'success');
  else toast(d.error || 'Could not apply', 'error');
}

// ── Auth ───────────────────────────────────────────────────
function showUserNav() {
  document.getElementById('nav-auth-guest').style.display = 'none';
  document.getElementById('nav-auth-user').style.display = 'flex';
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  document.getElementById('nav-avatar').textContent = initials;
}
function showGuestNav() {
  document.getElementById('nav-auth-guest').style.display = 'flex';
  document.getElementById('nav-auth-user').style.display = 'none';
}
function toggleUserMenu() { document.getElementById('user-dropdown').classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.user-menu')) document.getElementById('user-dropdown')?.classList.remove('open'); });

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!email || !pw) { showErr(errEl, 'Please fill all fields'); return; }
  const d = await api('POST', `${BASE}/api/auth/login`, { email, password: pw });
  if (d.success) {
    state.user = d.user;
    state.lang = d.user.preferred_lang || state.lang;
    setLangUI(state.lang);
    hideModal('modal-login');
    showUserNav();
    toast(`Welcome, ${d.user.first_name}!`, 'success');
    if (d.user.role === 'employer') goto('employer-dash');
    else goto('candidate-dash');
  } else showErr(errEl, d.error || 'Invalid credentials');
}

async function register() {
  const errEl = document.getElementById('reg-error');
  errEl.style.display = 'none';
  const body = {
    first_name: document.getElementById('reg-first').value.trim(),
    last_name: document.getElementById('reg-last').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-pw').value,
    role: state.regRole,
    lang: state.lang
  };
  if (state.regRole === 'employer') body.company_name = document.getElementById('reg-company').value.trim();
  if (!body.first_name || !body.last_name || !body.email || !body.password) { showErr(errEl, 'All fields required'); return; }
  const d = await api('POST', `${BASE}/api/auth/register`, body);
  if (d.success) {
    state.user = d.user;
    hideModal('modal-register');
    showUserNav();
    toast(`Welcome to Nexhire, ${d.user.first_name}!`, 'success');
    if (d.user.role === 'employer') goto('employer-dash');
    else goto('candidate-dash');
  } else showErr(errEl, d.error || 'Registration failed');
}

async function logout() {
  await api('POST', `${BASE}/api/auth/logout`);
  state.user = null;
  showGuestNav();
  goto('home');
  toast('Signed out', 'success');
}

function setRegRole(role, btn) {
  state.regRole = role;
  document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('reg-company-field').style.display = role === 'employer' ? 'block' : 'none';
}

function showForgot() {
  const email = prompt('Enter your email address:');
  if (!email) return;
  api('POST', `${BASE}/api/auth/forgot-password`, { email }).then(() => toast('Reset link sent if account exists', 'success'));
}

// ── Dashboard ──────────────────────────────────────────────
async function loadDashboard() {
  if (!state.user) return;
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  const avatarEl = document.getElementById('dash-avatar');
  const nameEl = document.getElementById('dash-name');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = `${u.first_name} ${u.last_name}`;

  loadProfileForm();
  loadMyApplications();
}

async function loadProfileForm() {
  const d = await api('GET', `${BASE}/api/candidates/profile`);
  const container = document.getElementById('profile-form');
  if (!container) return;
  const p = d.profile || {};
  container.innerHTML = `
    <div class="form-row"><div class="form-group"><label>First name</label><input type="text" id="pf-first" value="${esc(state.user?.first_name||'')}"></div><div class="form-group"><label>Last name</label><input type="text" id="pf-last" value="${esc(state.user?.last_name||'')}"></div></div>
    <div class="form-group"><label>Headline (EN)</label><input type="text" id="pf-head-en" value="${esc(p.headline_en||'')}" placeholder="e.g. Senior Full-Stack Developer"></div>
    <div class="form-group"><label>Headline (FR)</label><input type="text" id="pf-head-fr" value="${esc(p.headline_fr||'')}" placeholder="ex: Développeur Full-Stack Senior"></div>
    <div class="form-group"><label>City</label><input type="text" id="pf-city" value="${esc(p.city||'')}"></div>
    <div class="form-group"><label>Skills (comma-separated)</label><input type="text" id="pf-skills" value="${safeJsonArr(p.skills).join(', ')}"></div>
    <div class="form-group"><label>Years of experience</label><input type="number" id="pf-exp" value="${p.experience_years||0}" min="0" max="50"></div>
    <div class="form-group"><label>LinkedIn URL</label><input type="url" id="pf-linkedin" value="${esc(p.linkedin_url||'')}"></div>
    <div class="form-group"><label>Bio (EN)</label><textarea id="pf-bio-en">${esc(p.bio_en||'')}</textarea></div>
    <button class="btn-primary" onclick="saveProfile()" style="margin-top:8px">Save profile</button>
  `;
}

async function saveProfile() {
  const body = {
    first_name: document.getElementById('pf-first')?.value.trim(),
    last_name: document.getElementById('pf-last')?.value.trim(),
    headline_en: document.getElementById('pf-head-en')?.value.trim(),
    headline_fr: document.getElementById('pf-head-fr')?.value.trim(),
    city: document.getElementById('pf-city')?.value.trim(),
    skills: document.getElementById('pf-skills')?.value.split(',').map(s => s.trim()).filter(Boolean),
    experience_years: parseInt(document.getElementById('pf-exp')?.value) || 0,
    linkedin_url: document.getElementById('pf-linkedin')?.value.trim(),
    bio_en: document.getElementById('pf-bio-en')?.value.trim(),
  };
  const d = await api('PUT', `${BASE}/api/candidates/profile`, body);
  if (d.success) toast('Profile saved!', 'success');
  else toast(d.error || 'Failed to save', 'error');
}

async function loadMyApplications() {
  const d = await api('GET', `${BASE}/api/applications/mine`);
  const container = document.getElementById('applications-list');
  if (!container) return;
  const apps = d.applications || [];
  if (!apps.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No applications yet. Browse jobs and apply!</div>'; return; }
  container.innerHTML = apps.map(a => {
    const title = state.lang === 'fr' ? (a.title_fr || a.title_en) : (a.title_en || a.title_fr);
    return `<div class="app-card">
      <div style="flex:1"><div style="font-family:var(--r);font-weight:600;color:var(--dark)">${esc(title)}</div><div style="font-size:13px;color:var(--muted)">${esc(a.company_name||'')}</div></div>
      <span class="app-status ${a.status}">${a.status}</span>
    </div>`;
  }).join('');
}

function showTab(tabId) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  event?.currentTarget?.classList.add('active');
}

// ── AI Chat ────────────────────────────────────────────────
async function sendAiMsg() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const messages = document.getElementById('ai-messages');
  messages.innerHTML += `<div class="ai-msg ai-msg-user">${esc(msg)}</div>`;
  messages.innerHTML += `<div class="ai-msg ai-msg-bot" id="ai-typing"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i></div>`;
  messages.scrollTop = messages.scrollHeight;

  const d = await api('POST', `${BASE}/api/ai/chat`, { message: msg, context: state.user?.role || 'general' });
  document.getElementById('ai-typing')?.remove();
  messages.innerHTML += `<div class="ai-msg ai-msg-bot">${esc(d.reply || 'AI service temporarily unavailable.')}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

// ── Employer Dashboard ─────────────────────────────────────
async function loadEmployerDash() {
  if (!state.user) return;
  const initials = `${(state.user.first_name||'')[0]||''}${(state.user.last_name||'')[0]||''}`.toUpperCase() || 'U';
  safeSet('emp-dash-avatar', initials);
  safeSet('emp-dash-name', `${state.user.first_name} ${state.user.last_name}`);
  loadEmployerJobs();
  loadCompanyForm();
  loadBillingInfo();
}

async function loadEmployerJobs() {
  const d = await api('GET', `${BASE}/api/jobs/company/mine`);
  const container = document.getElementById('employer-jobs-list');
  if (!container) return;
  const jobs = d.jobs || [];
  if (!jobs.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No jobs posted yet. Post your first job!</div>'; return; }
  container.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    return `<div class="emp-job-card">
      <div><div class="emp-job-title">${esc(title)}</div><div class="emp-job-meta">${j.status} · ${j.apps||0} applications · ${j.work_mode||'onsite'}</div></div>
      <div class="emp-job-actions">
        <span class="app-status ${j.status}" style="font-size:12px">${j.status}</span>
      </div>
    </div>`;
  }).join('');
}

function initPostJobForm() {
  const form = document.getElementById('post-job-form');
  if (!form) return;
  form.innerHTML = `
    <div class="form-group"><label>Job Title (EN)</label><input type="text" id="jf-title-en" placeholder="e.g. Senior Full-Stack Developer" required></div>
    <div class="form-group"><label>Job Title (FR)</label><input type="text" id="jf-title-fr" placeholder="ex: Développeur Full-Stack Senior" required></div>
    <div class="form-row">
      <div class="form-group"><label>Work mode</label><select id="jf-mode"><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div>
      <div class="form-group"><label>Job type</label><select id="jf-type"><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>City</label><input type="text" id="jf-city" placeholder="Toronto, Paris..."></div>
      <div class="form-group"><label>Country</label><input type="text" id="jf-country" value="Canada"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Min salary (annual)</label><input type="number" id="jf-sal-min" placeholder="60000"></div>
      <div class="form-group"><label>Max salary</label><input type="number" id="jf-sal-max" placeholder="90000"></div>
    </div>
    <div class="form-group"><label>Skills required (comma-separated)</label><input type="text" id="jf-skills" placeholder="React, Node.js, TypeScript"></div>
    <div class="form-group"><label>Description (EN) *</label><textarea id="jf-desc-en" placeholder="Describe the role, responsibilities..." required></textarea></div>
    <div class="form-group"><label>Description (FR)</label><textarea id="jf-desc-fr" placeholder="Décrivez le poste..."></textarea></div>
    <div class="form-error" id="jf-error"></div>
    <button class="btn-primary" type="submit" style="margin-top:8px">Post job</button>
  `;
}

async function postJob(e) {
  e.preventDefault();
  const errEl = document.getElementById('jf-error');
  errEl.style.display = 'none';
  const body = {
    title_en: document.getElementById('jf-title-en').value.trim(),
    title_fr: document.getElementById('jf-title-fr').value.trim() || document.getElementById('jf-title-en').value.trim(),
    description_en: document.getElementById('jf-desc-en').value.trim(),
    description_fr: document.getElementById('jf-desc-fr').value.trim() || document.getElementById('jf-desc-en').value.trim(),
    work_mode: document.getElementById('jf-mode').value,
    job_type: document.getElementById('jf-type').value,
    city: document.getElementById('jf-city').value.trim(),
    country: document.getElementById('jf-country').value.trim() || 'Canada',
    salary_min: parseInt(document.getElementById('jf-sal-min').value) || null,
    salary_max: parseInt(document.getElementById('jf-sal-max').value) || null,
    skills_required: document.getElementById('jf-skills').value.split(',').map(s => s.trim()).filter(Boolean),
  };
  if (!body.title_en || !body.description_en) { showErr(errEl, 'Title and description required'); return; }
  const d = await api('POST', `${BASE}/api/jobs`, body);
  if (d.success) {
    toast('Job posted!', 'success');
    showEmpTab('etab-jobs');
    loadEmployerJobs();
  } else showErr(errEl, d.error || 'Failed to post job');
}

function initCompanyForm() {
  const form = document.getElementById('company-form');
  if (!form) return;
  form.innerHTML = `
    <div class="form-group"><label>Company name</label><input type="text" id="cf-name"></div>
    <div class="form-group"><label>Industry</label><input type="text" id="cf-industry" placeholder="Technology, Finance..."></div>
    <div class="form-group"><label>Company size</label><select id="cf-size"><option value="">Select...</option><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201-500">201–500</option><option value="500+">500+</option></select></div>
    <div class="form-group"><label>Website</label><input type="url" id="cf-website" placeholder="https://..."></div>
    <div class="form-row"><div class="form-group"><label>City</label><input type="text" id="cf-city"></div><div class="form-group"><label>Country</label><input type="text" id="cf-country" value="Canada"></div></div>
    <div class="form-group"><label>Description (EN)</label><textarea id="cf-desc-en"></textarea></div>
    <div class="form-group"><label>Description (FR)</label><textarea id="cf-desc-fr"></textarea></div>
    <button class="btn-primary" type="submit" style="margin-top:8px">Save company</button>
  `;
}

async function loadCompanyForm() {
  const d = await api('GET', `${BASE}/api/companies/me/profile`);
  if (!d.success) return;
  const c = d.company;
  safeVal('cf-name', c.name); safeVal('cf-industry', c.industry); safeVal('cf-size', c.size);
  safeVal('cf-website', c.website); safeVal('cf-city', c.city); safeVal('cf-country', c.country);
  safeVal('cf-desc-en', c.description_en); safeVal('cf-desc-fr', c.description_fr);
}

async function saveCompany(e) {
  e.preventDefault();
  const body = { name: v('cf-name'), industry: v('cf-industry'), size: v('cf-size'), website: v('cf-website'), city: v('cf-city'), country: v('cf-country'), description_en: v('cf-desc-en'), description_fr: v('cf-desc-fr') };
  const d = await api('PUT', `${BASE}/api/companies/me/profile`, body);
  if (d.success) toast('Company saved!', 'success');
  else toast(d.error || 'Failed to save', 'error');
}

async function loadBillingInfo() {
  const d = await api('GET', `${BASE}/api/payments/status`);
  const container = document.getElementById('billing-info');
  if (!container) return;
  const plan = d.plan || 'starter';
  container.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px;max-width:400px">
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Current plan</div>
      <div style="font-family:var(--r);font-size:24px;font-weight:700;color:var(--dark);text-transform:capitalize;margin-bottom:16px">${plan}</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:8px">Active job slots: <strong>${d.active_job_slots||2}</strong></div>
      ${plan === 'starter' ? `<button class="btn-primary" onclick="startCheckout('pro','month')"><i class="ti ti-arrow-up"></i> Upgrade to Pro — $99/mo</button>` : `<button class="btn-ghost" onclick="openBillingPortal()">Manage billing</button>`}
    </div>
  `;
}

async function startCheckout(plan, interval) {
  if (!state.user) { showModal('modal-register'); return; }
  const d = await api('POST', `${BASE}/api/payments/create-checkout`, { plan, interval });
  if (d.success && d.url) window.location.href = d.url;
  else toast(d.error || 'Payment setup failed', 'error');
}

function showEmpTab(tabId) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  event?.currentTarget?.classList.add('active');
}

// ── Modals ─────────────────────────────────────────────────
function showModal(id) { document.getElementById(id)?.classList.add('open'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('open'); }
function togglePw(id) { const el = document.getElementById(id); if (el) el.type = el.type === 'password' ? 'text' : 'password'; }

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="ti ti-${type === 'success' ? 'circle-check' : 'circle-x'}"></i> ${esc(msg)}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ── Helpers ────────────────────────────────────────────────
function esc(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtSalary(n) { if (!n) return ''; return Number(n).toLocaleString('en-CA'); }
function safeJsonArr(str) { if (Array.isArray(str)) return str; if (!str) return []; try { return JSON.parse(str); } catch { return []; } }
function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function safeVal(id, val) { const el = document.getElementById(id); if (el && val != null) el.value = val; }
function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6'];
function companyColor(name) { if (!name) return COLORS[0]; let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }

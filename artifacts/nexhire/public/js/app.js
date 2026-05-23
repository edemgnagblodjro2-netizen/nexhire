'use strict';

const BASE = '/nexhire';
const state = {
  user: null, lang: 'en', regRole: 'candidate',
  jobs: [], currentPage: 1, jobSearchTimer: null,
  savedJobIds: new Set(), currentJobForApply: null,
  currentKanbanJob: null, filterTimer: null
};

// ── Canadian Geography ─────────────────────────────────────
const CA_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia / Colombie-Britannique' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick / Nouveau-Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador / T.-N.-L.' },
  { code: 'NS', name: 'Nova Scotia / Nouvelle-Écosse' },
  { code: 'NT', name: 'Northwest Territories / T.N.-O.' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island / Î.-P.-É.' },
  { code: 'QC', name: 'Québec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const CA_CITIES = {
  AB: ['Calgary','Edmonton','Red Deer','Lethbridge','St. Albert','Medicine Hat','Grande Prairie','Airdrie','Spruce Grove','Leduc'],
  BC: ['Vancouver','Surrey','Burnaby','Richmond','Kelowna','Abbotsford','Coquitlam','Langley','Victoria','Nanaimo','Kamloops','Prince George','Chilliwack','Delta','North Vancouver'],
  MB: ['Winnipeg','Brandon','Steinbach','Thompson','Portage la Prairie','Winkler','Morden','Selkirk'],
  NB: ['Moncton','Saint John','Fredericton','Dieppe','Riverview','Bathurst','Miramichi','Edmundston'],
  NL: ['St. John\'s','Mount Pearl','Corner Brook','Conception Bay South','Grand Falls-Windsor','Paradise'],
  NS: ['Halifax','Cape Breton / Sydney','Truro','New Glasgow','Dartmouth','Bedford','Lunenburg'],
  NT: ['Yellowknife','Hay River','Inuvik','Fort Smith'],
  NU: ['Iqaluit','Rankin Inlet','Arviat','Baker Lake'],
  ON: ['Toronto','Ottawa','Mississauga','Brampton','Hamilton','London','Markham','Vaughan','Kitchener','Windsor','Richmond Hill','Oakville','Burlington','Oshawa','Barrie','St. Catharines','Cambridge','Kingston','Guelph','Whitby','Sudbury','Peterborough','Thunder Bay','Waterloo'],
  PE: ['Charlottetown','Summerside','Stratford'],
  QC: ['Montréal','Québec City','Laval','Gatineau','Longueuil','Sherbrooke','Saguenay','Lévis','Trois-Rivières','Terrebonne','Saint-Jean-sur-Richelieu','Repentigny','Brossard','Drummondville','Saint-Jérôme','Rimouski','Joliette','Rouyn-Noranda','Val-d\'Or'],
  SK: ['Saskatoon','Regina','Prince Albert','Moose Jaw','Swift Current','Yorkton','North Battleford'],
  YT: ['Whitehorse','Dawson City','Watson Lake'],
};

const INTL_CITIES = {
  'France': ['Paris','Lyon','Marseille','Toulouse','Bordeaux','Lille','Nice','Strasbourg','Nantes','Rennes'],
  'USA': ['New York','San Francisco','Los Angeles','Chicago','Boston','Seattle','Austin','Miami','Denver','Atlanta'],
  'UK': ['London','Manchester','Birmingham','Edinburgh','Bristol','Leeds','Glasgow'],
  'Belgium': ['Brussels','Antwerp','Liège','Ghent'],
  'Switzerland': ['Geneva','Zurich','Lausanne','Basel'],
};

// ── Location formatting (Indeed-style) ────────────────────
function fmtLocation(j) {
  // Card format: "Montréal, QC · Remote" or "Ontario" or "Remote"
  const parts = [];
  if (j.city) parts.push(esc(j.city));
  if (j.province && j.province !== 'REMOTE') {
    parts.push(`<strong>${esc(j.province)}</strong>`);
  }
  const loc = parts.join(', ');
  const mode = j.work_mode === 'remote' ? ' · <span class="loc-remote">Remote</span>' : j.work_mode === 'hybrid' ? ' · <span class="loc-hybrid">Hybrid</span>' : '';
  if (!loc && j.work_mode === 'remote') return `<span class="loc-remote">🌐 Remote</span>`;
  return loc ? `<i class="ti ti-map-pin" style="font-size:11px;color:var(--muted);margin-right:3px"></i>${loc}${mode}` : '';
}

function fmtLocationDetail(j) {
  // Detail panel format: "Montréal, QC · Remote · Full-time" (like Indeed job detail header)
  const parts = [];
  if (j.city) parts.push(`<span style="font-weight:500">${esc(j.city)}</span>`);
  if (j.province && j.province !== 'REMOTE') parts.push(`<strong>${esc(j.province)}</strong>`);
  const loc = parts.join(', ');
  const chips = [];
  if (j.work_mode) chips.push(`<span class="job-tag ${j.work_mode}" style="font-size:12px">${j.work_mode}</span>`);
  if (j.job_type) chips.push(`<span class="job-tag" style="font-size:12px">${j.job_type}</span>`);
  return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
    ${loc ? `<span class="detail-location-text"><i class="ti ti-map-pin" style="font-size:13px;color:var(--muted)"></i> ${loc}</span>` : ''}
    ${chips.join('')}
  </div>`;
}

function provinceSelectHtml(id, selectedCode = '') {
  return `<select id="${id}" onchange="updateCitiesForProvince('${id}')">
    <option value="">— Select province/territory —</option>
    ${CA_PROVINCES.map(p => `<option value="${p.code}"${p.code === selectedCode ? ' selected' : ''}>${p.code} — ${p.name.split(' /')[0]}</option>`).join('')}
    <option value="INTL" disabled>──────────</option>
    <option value="REMOTE" ${selectedCode === 'REMOTE' ? 'selected' : ''}>🌐 Remote / International</option>
  </select>`;
}

function updateCitiesForProvince(provinceSelectId, citySelectId) {
  const prov = document.getElementById(provinceSelectId)?.value;
  const cityId = citySelectId || provinceSelectId.replace('province', 'city').replace('fprov', 'fcity');
  const cityEl = document.getElementById(cityId);
  if (!cityEl) return;
  const cities = CA_CITIES[prov] || [];
  if (!cities.length) {
    cityEl.innerHTML = '<option value="">Enter city manually</option>';
    cityEl.parentElement.style.display = prov ? 'block' : 'none';
    return;
  }
  cityEl.parentElement.style.display = 'block';
  cityEl.innerHTML = `<option value="">— Select city —</option>${cities.map(c => `<option value="${c}">${c}</option>`).join('')}<option value="__other__">Other (type below)</option>`;
}

// ── Init ───────────────────────────────────────────────────
(async () => {
  try {
    const d = await api('GET', `${BASE}/api/auth/me`);
    if (d.success && d.user) { state.user = d.user; state.lang = d.user.preferred_lang || 'en'; showUserNav(); }
  } catch (e) {}
  setLangUI(state.lang);
  loadStats();
  renderRecentSearches();
  loadFeaturedJobs();
  initPostJobForm();
  initCompanyForm();
  if (state.user) {
    loadDashboard();
    if (state.user.role === 'candidate') loadSavedJobIds();
    loadNotifBadge();
  }
})();

// ── API ────────────────────────────────────────────────────
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
  if (page === 'jobs') loadJobs();
  if (page === 'candidate-dash' && state.user) { loadDashboard(); showTab('tab-profile', null); }
  if (page === 'employer-dash' && state.user) loadEmployerDash();
  if (page === 'settings') renderSettings();
  if (page === 'help') renderHelp();
  if (page === 'privacy') renderPrivacy();
}

// ── Lang ───────────────────────────────────────────────────
async function setLang(lang) {
  state.lang = lang; setLangUI(lang);
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

// ── Notifications badge ────────────────────────────────────
async function loadNotifBadge() {
  const d = await api('GET', `${BASE}/api/notifications`);
  if (d.success && d.unread > 0) {
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = d.unread > 9 ? '9+' : d.unread; badge.style.display = 'flex'; }
  }
}

// ── Saved jobs ─────────────────────────────────────────────
async function loadSavedJobIds() {
  const d = await api('GET', `${BASE}/api/saved-jobs/ids`);
  if (d.success) state.savedJobIds = new Set(d.ids);
}

async function toggleSave(jobId, e) {
  e?.stopPropagation();
  if (!state.user) { showModal('modal-login'); return; }
  const wasSaved = state.savedJobIds.has(jobId);
  if (wasSaved) {
    await api('DELETE', `${BASE}/api/saved-jobs/${jobId}`);
    state.savedJobIds.delete(jobId);
    toast(state.lang === 'fr' ? 'Offre retirée des favoris' : 'Removed from saved', 'success');
  } else {
    await api('POST', `${BASE}/api/saved-jobs/${jobId}`);
    state.savedJobIds.add(jobId);
    toast(state.lang === 'fr' ? 'Offre sauvegardée !' : 'Job saved!', 'success');
  }
  // Update heart icons
  document.querySelectorAll(`.save-btn[data-id="${jobId}"]`).forEach(btn => {
    btn.classList.toggle('saved', !wasSaved);
    btn.innerHTML = `<i class="ti ti-heart${!wasSaved ? '-filled' : ''}"></i>`;
  });
}

// ── Featured jobs ──────────────────────────────────────────
async function loadFeaturedJobs() {
  const d = await api('GET', `${BASE}/api/jobs?featured=true&limit=6`);
  const container = document.getElementById('featured-jobs');
  if (!container) return;
  const jobs = d.jobs || [];
  state.jobs = jobs;
  if (!jobs.length) {
    container.innerHTML = ['Senior Full-Stack Developer','Product Designer','AI/ML Engineer','Marketing Manager'].map(title =>
      jobCardHtml({ id: 'demo', title_en: title, title_fr: title, company_name: 'Nexhire Demo', work_mode: ['remote','hybrid','onsite'][Math.floor(Math.random()*3)], city: ['Toronto','Paris','London','Remote'][Math.floor(Math.random()*4)], country: 'Global', featured: true, slug: '#' }, true)
    ).join('');
    return;
  }
  container.innerHTML = jobs.map(j => jobCardHtml(j)).join('');
}

function jobCardHtml(j, demo = false) {
  const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
  const salary = j.salary_min ? `${fmtSalary(j.salary_min)}${j.salary_max ? '–' + fmtSalary(j.salary_max) : ''} ${j.salary_currency || 'CAD'}` : '';
  const color = companyColor(j.company_name);
  const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
  const isSaved = state.savedJobIds.has(j.id);
  return `<div class="job-card${j.featured ? ' featured' : ''}" onclick="${demo ? '' : `openJobDetail('${j.id}')`}">
    ${j.featured ? '<div class="job-featured-badge">⭐ Featured</div>' : ''}
    ${!demo ? `<button class="save-btn${isSaved ? ' saved' : ''}" data-id="${j.id}" onclick="toggleSave('${j.id}',event)" title="Save job"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>` : ''}
    <div class="job-company-row">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:36px;height:36px;border-radius:8px;object-fit:contain">` : `<div class="company-logo" style="background:${color}">${initials}</div>`}
      <div class="company-name">${esc(j.company_name || '')}</div>
    </div>
    <div class="job-title">${esc(title)}</div>
    <div class="job-location-line">${fmtLocation(j)}</div>
    <div class="job-meta">
      <span class="job-tag ${j.work_mode || 'onsite'}">${j.work_mode || 'onsite'}</span>
      ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
    </div>
    ${salary ? `<div class="job-salary">${salary}</div>` : ''}
  </div>`;
}

// ── Jobs page ──────────────────────────────────────────────
function debounceFilterSearch() { clearTimeout(state.filterTimer); state.filterTimer = setTimeout(filterJobs, 350); }
function debounceSearch() { clearTimeout(state.jobSearchTimer); state.jobSearchTimer = setTimeout(() => { if (document.getElementById('pg-jobs')?.classList.contains('active')) filterJobs(); }, 350); }
// ── Recent searches (localStorage) ────────────────────────
const RECENT_KEY = 'nh_recent_searches';
const RECENT_MAX = 6;

function saveRecentSearch(q, province, count) {
  if (!q && !province) return;
  let searches = getRecentSearches();
  const entry = { q: q || '', province: province || '', count: count || 0, ts: Date.now() };
  searches = searches.filter(s => !(s.q === entry.q && s.province === entry.province));
  searches.unshift(entry);
  searches = searches.slice(0, RECENT_MAX);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches)); } catch {}
}

function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function renderRecentSearches() {
  const searches = getRecentSearches();
  const section = document.getElementById('recent-searches-section');
  const list = document.getElementById('recent-searches-list');
  if (!section || !list) return;
  if (!searches.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = searches.map((s, i) => {
    const label = s.q || (s.province ? provinceLabel(s.province) : 'All jobs');
    const sub = s.province && s.q ? provinceLabel(s.province) : '';
    return `<button class="recent-search-chip" onclick="replaySearch(${i})">
      <i class="ti ti-history"></i>
      <div class="rsc-text">
        <span class="rsc-label">${esc(label)}</span>
        ${sub ? `<span class="rsc-sub">${esc(sub)}</span>` : ''}
      </div>
      ${s.count > 0 ? `<span class="rsc-badge">${s.count} jobs</span>` : ''}
    </button>`;
  }).join('');
}

function provinceLabel(code) {
  const map = { QC:'Québec', ON:'Ontario', BC:'Colombie-Britannique', AB:'Alberta', MB:'Manitoba', SK:'Saskatchewan', NS:'Nouvelle-Écosse', NB:'Nouveau-Brunswick', NL:'Terre-Neuve', PE:'Î.-P.-É.', NT:'T.N.-O.', NU:'Nunavut', YT:'Yukon', REMOTE:'Remote' };
  return map[code] || code;
}

function replaySearch(index) {
  const searches = getRecentSearches();
  const s = searches[index];
  if (!s) return;
  if (s.q) document.getElementById('q').value = s.q;
  if (s.province) {
    const heroProv = document.getElementById('hero-province');
    if (heroProv) heroProv.value = s.province;
  }
  searchJobs();
}

function searchJobs() {
  // Sync hero province → jobs page province filter
  const heroProv = document.getElementById('hero-province')?.value;
  const fprov = document.getElementById('fprov');
  if (fprov && heroProv !== undefined) fprov.value = heroProv;

  // Save search before navigating
  const q = document.getElementById('q')?.value?.trim() || '';
  const province = heroProv || '';
  saveRecentSearch(q, province, 0);
  renderRecentSearches();

  goto('jobs');
  setTimeout(filterJobs, 100);
}
function syncHeroProvince() {
  const v = document.getElementById('hero-province')?.value;
  const fprov = document.getElementById('fprov');
  if (fprov && v !== undefined) fprov.value = v;
}
function quickSearch(q) { document.getElementById('q').value = q; searchJobs(); }

async function loadJobs() { await filterJobs(); }

async function filterJobs(page = 1) {
  state.currentPage = page;
  const q = document.getElementById('fq')?.value || document.getElementById('q')?.value || '';
  const work_mode = document.getElementById('fwork')?.value || document.getElementById('mode-filter')?.value || '';
  const job_type = document.getElementById('ftype')?.value || '';
  const sal_min = document.getElementById('fsal')?.value || '';
  const province = document.getElementById('fprov')?.value || '';
  const params = new URLSearchParams({ page, limit: 15 });
  if (q) params.set('q', q);
  if (work_mode) params.set('work_mode', work_mode);
  if (job_type) params.set('job_type', job_type);
  if (sal_min) params.set('salary_min', sal_min);
  if (province && province !== 'REMOTE') params.set('province', province);
  if (province === 'REMOTE') params.set('work_mode', 'remote');

  const list = document.getElementById('jobs-list');
  if (list) list.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;

  const d = await api('GET', `${BASE}/api/jobs?${params}`);
  if (!list) return;
  const jobs = d.jobs || [];
  if (!jobs.length) { list.innerHTML = '<div class="empty-state"><i class="ti ti-search-off"></i><p>No jobs found. Try different filters.</p></div>'; return; }

  list.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const color = companyColor(j.company_name);
    const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
    const isSaved = state.savedJobIds.has(j.id);
    const timeAgo = daysAgo(j.published_at);
    return `<div class="job-list-item" onclick="openJobDetail('${j.id}')" id="jli-${j.id}">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:44px;height:44px;border-radius:10px;flex-shrink:0;font-size:14px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--r);font-weight:600;color:var(--dark);font-size:15px">${esc(title)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(j.company_name || '')}${j.city || j.province ? ' · ' + (j.city ? esc(j.city) + (j.province ? ', <strong>'+esc(j.province)+'</strong>' : '') : esc(j.province||'')) : ''}</div>
        <div class="job-meta" style="margin-top:8px">
          <span class="job-tag ${j.work_mode || 'onsite'}">${j.work_mode || 'onsite'}</span>
          ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
          ${j.salary_min ? `<span class="job-tag salary-tag">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
        <button class="save-btn${isSaved ? ' saved' : ''}" data-id="${j.id}" onclick="toggleSave('${j.id}',event)" title="Save"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>
        <span style="font-size:11px;color:var(--muted)">${timeAgo}</span>
      </div>
    </div>`;
  }).join('');

  const pages = d.pages || 1;
  const pgEl = document.getElementById('jobs-pagination');
  if (pgEl && pages > 1) {
    pgEl.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p =>
      `<button onclick="filterJobs(${p})" class="${p === page ? 'btn-primary' : 'btn-ghost'}" style="margin:0 3px;padding:6px 14px;font-size:13px">${p}</button>`
    ).join('');
  } else if (pgEl) pgEl.innerHTML = '';
}

// ── Job detail panel ───────────────────────────────────────
async function openJobDetail(jobId) {
  const d = await api('GET', `${BASE}/api/jobs/by-id/${jobId}`);
  if (!d.success) return;
  const j = d.job;
  const panel = document.getElementById('job-detail-panel');
  if (!panel) return;
  panel.style.display = 'block';

  document.querySelectorAll('.job-list-item').forEach(el => el.classList.remove('selected'));
  document.getElementById(`jli-${jobId}`)?.classList.add('selected');

  const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
  const desc = state.lang === 'fr' ? (j.description_fr || j.description_en) : (j.description_en || j.description_fr);
  const req = state.lang === 'fr' ? (j.requirements_fr || j.requirements_en) : (j.requirements_en || j.requirements_fr);
  const color = companyColor(j.company_name);
  const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
  const isSaved = state.savedJobIds.has(j.id);
  const skills = safeJsonArr(j.skills_required);

  // Fetch reviews
  const rev = j.company_id ? await api('GET', `${BASE}/api/reviews/company/${j.company_id}`) : { success: false };
  const avgRating = parseFloat(rev.stats?.avg_rating || 0);
  const totalReviews = parseInt(rev.stats?.total || 0);
  const stars = avgRating ? starsHtml(avgRating) : '';

  panel.innerHTML = `
    <div class="job-detail-header">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:56px;height:56px;border-radius:12px;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:56px;height:56px;border-radius:12px;font-size:18px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--muted);font-weight:500">${esc(j.company_name || '')}</div>
        ${j.company_website ? `<a href="${esc(j.company_website)}" target="_blank" style="font-size:12px;color:var(--indigo)">${esc(j.company_website)}</a>` : ''}
        ${stars ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">${stars}<span style="font-size:12px;color:var(--muted)">${avgRating.toFixed(1)} (${totalReviews} review${totalReviews !== 1 ? 's' : ''})</span></div>` : ''}
      </div>
      <button class="save-btn${isSaved ? ' saved' : ''}" data-id="${j.id}" onclick="toggleSave('${j.id}',event)" style="padding:8px 10px;font-size:16px" title="Save job"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>
    </div>
    <h2 style="font-family:var(--r);font-size:20px;font-weight:700;color:var(--dark);margin:12px 0 8px">${esc(title)}</h2>
    <div class="job-location-detail">${fmtLocationDetail(j)}</div>
    <div class="job-meta" style="margin-bottom:16px">
      ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
      ${j.salary_min ? `<span class="job-tag salary-tag">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}/yr</span>` : ''}
      ${j.experience_years ? `<span class="job-tag"><i class="ti ti-briefcase" style="font-size:11px"></i>${j.experience_years} yrs exp</span>` : ''}
    </div>
    ${skills.length ? `<div class="skills-chips" style="margin-bottom:16px">${skills.slice(0,8).map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="detail-apply-row">
      ${state.user?.role === 'candidate' ? `<button class="btn-primary" style="flex:1" onclick="openQuickApply('${j.id}','${esc(title)}')"><i class="ti ti-send"></i> Apply Now</button>` : !state.user ? `<button class="btn-primary" style="flex:1" onclick="showModal('modal-login')"><i class="ti ti-send"></i> Sign in to Apply</button>` : ''}
      <div class="job-stats-mini">
        <span><i class="ti ti-eye"></i>${j.views || 0}</span>
        <span><i class="ti ti-users"></i>${j.applications_count || 0}</span>
      </div>
    </div>
    <div class="job-section"><h4>About the role</h4><div class="job-desc">${esc(desc || '')}</div></div>
    ${req ? `<div class="job-section"><h4>Requirements</h4><div class="job-desc">${esc(req)}</div></div>` : ''}
    ${totalReviews ? `<div class="job-section"><h4><i class="ti ti-star"></i> Company Reviews</h4>${renderReviews(rev.reviews?.slice(0,3) || [])}</div>` : ''}
    ${state.user?.role === 'candidate' && j.company_id ? `<div style="margin-top:8px"><button class="btn-ghost" style="font-size:13px;width:100%" onclick="openReviewModal('${j.company_id}','${esc(j.company_name || '')}')"><i class="ti ti-pencil"></i> Write a review</button></div>` : ''}
  `;
}

function renderReviews(reviews) {
  if (!reviews.length) return '<p style="color:var(--muted);font-size:13px">No reviews yet.</p>';
  return reviews.map(r => `
    <div class="review-card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        ${starsHtml(r.rating)}
        <span style="font-weight:600;font-size:13px">${esc(r.title || '')}</span>
        <span style="font-size:11px;color:var(--muted);margin-left:auto">${r.anonymous ? 'Anonymous' : esc(r.reviewer_name || '')} · ${daysAgo(r.created_at)}</span>
      </div>
      ${r.pros ? `<div style="font-size:13px;color:var(--text)"><strong style="color:var(--green)">+</strong> ${esc(r.pros)}</div>` : ''}
      ${r.cons ? `<div style="font-size:13px;color:var(--text);margin-top:4px"><strong style="color:var(--red)">–</strong> ${esc(r.cons)}</div>` : ''}
      ${r.interview_difficulty ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">Interview: ${r.interview_difficulty}</div>` : ''}
      ${r.recommend !== null ? `<div style="font-size:11px;color:${r.recommend ? 'var(--green)' : 'var(--red)'};margin-top:4px">${r.recommend ? '✓ Would recommend' : '✗ Would not recommend'}</div>` : ''}
    </div>
  `).join('');
}

// ── Quick Apply modal ──────────────────────────────────────
function openQuickApply(jobId, jobTitle) {
  state.currentJobForApply = jobId;
  safeSet('quick-apply-title', jobTitle);
  document.getElementById('qa-cover').value = '';
  document.getElementById('qa-error').style.display = 'none';
  showModal('modal-quick-apply');
}

async function generateAiCoverLetter() {
  const btn = document.getElementById('qa-ai-btn');
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Generating...';
  const d = await api('POST', `${BASE}/api/candidates/ai/cover-letter`, { job_id: state.currentJobForApply, lang: state.lang });
  if (d.success) document.getElementById('qa-cover').value = d.cover_letter;
  else toast(d.error || 'AI unavailable', 'error');
  btn.disabled = false; btn.innerHTML = '<i class="ti ti-robot"></i> AI generate';
}

async function submitQuickApply() {
  const cover_letter = document.getElementById('qa-cover')?.value.trim();
  const errEl = document.getElementById('qa-error');
  errEl.style.display = 'none';
  const d = await api('POST', `${BASE}/api/applications`, { job_id: state.currentJobForApply, cover_letter });
  if (d.success) {
    hideModal('modal-quick-apply');
    toast(state.lang === 'fr' ? 'Candidature envoyée !' : 'Application submitted!', 'success');
    if (state.user?.role === 'candidate') loadMyApplications();
  } else {
    errEl.textContent = d.error || 'Could not apply';
    errEl.style.display = 'block';
  }
}

// ── Review modal ───────────────────────────────────────────
function openReviewModal(companyId, companyName) {
  state.currentReviewCompany = { id: companyId, name: companyName };
  safeSet('review-company-name', companyName);
  document.getElementById('rev-rating').value = '4';
  document.getElementById('rev-title').value = '';
  document.getElementById('rev-pros').value = '';
  document.getElementById('rev-cons').value = '';
  document.getElementById('rev-error').style.display = 'none';
  setRevStars(4);
  showModal('modal-review');
}
function setRevStars(n) {
  document.getElementById('rev-rating').value = n;
  document.querySelectorAll('.rev-star').forEach((s, i) => s.classList.toggle('active', i < n));
}
async function submitReview() {
  const errEl = document.getElementById('rev-error');
  errEl.style.display = 'none';
  const body = {
    rating: parseInt(document.getElementById('rev-rating')?.value),
    title: document.getElementById('rev-title')?.value.trim(),
    pros: document.getElementById('rev-pros')?.value.trim(),
    cons: document.getElementById('rev-cons')?.value.trim(),
    interview_difficulty: document.getElementById('rev-diff')?.value,
    recommend: document.getElementById('rev-recommend')?.checked,
    anonymous: document.getElementById('rev-anon')?.checked !== false,
  };
  const d = await api('POST', `${BASE}/api/reviews/company/${state.currentReviewCompany.id}`, body);
  if (d.success) { hideModal('modal-review'); toast('Review submitted!', 'success'); }
  else { errEl.textContent = d.error || 'Failed to submit review'; errEl.style.display = 'block'; }
}

// ── Auth ───────────────────────────────────────────────────
function showUserNav() {
  document.getElementById('nav-auth-guest').style.display = 'none';
  document.getElementById('nav-auth-user').style.display = 'flex';
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  document.getElementById('nav-avatar').textContent = initials;
  const emailEl = document.getElementById('dropdown-email');
  if (emailEl) emailEl.textContent = state.user.email || '';
  const ddEmp = document.getElementById('dd-employer');
  if (ddEmp) ddEmp.style.display = state.user.company_id ? 'flex' : 'none';
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
    state.user = d.user; state.lang = d.user.preferred_lang || state.lang;
    setLangUI(state.lang); hideModal('modal-login'); showUserNav();
    toast(`Welcome back, ${d.user.first_name}!`, 'success');
    if (d.user.role === 'candidate') { loadSavedJobIds(); goto('candidate-dash'); }
    else goto('employer-dash');
    loadNotifBadge();
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
    role: state.regRole, lang: state.lang
  };
  if (state.regRole === 'employer') body.company_name = document.getElementById('reg-company').value.trim();
  if (!body.first_name || !body.last_name || !body.email || !body.password) { showErr(errEl, 'All fields required'); return; }
  const d = await api('POST', `${BASE}/api/auth/register`, body);
  if (d.success) {
    state.user = d.user; hideModal('modal-register'); showUserNav();
    toast(`Welcome to Nexhire, ${d.user.first_name}!`, 'success');
    if (d.user.role === 'candidate') { loadSavedJobIds(); goto('candidate-dash'); }
    else goto('employer-dash');
  } else showErr(errEl, d.error || 'Registration failed');
}

// ── Settings page ──────────────────────────────────────────
function renderSettings() {
  if (!state.user) { goto('home'); return; }
  showSettingsSection('s-account', document.querySelector('.settings-nav-item.active'));
}

function showSettingsSection(section, el) {
  if (el) {
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
  }
  const u = state.user || {};
  const content = document.getElementById('settings-content');
  if (!content) return;

  if (section === 's-account') {
    content.innerHTML = `
      <h2 class="settings-section-title">Account settings</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">Account type</div><div class="settings-row-value">${u.role === 'employer' ? 'Employer' : 'Job seeker'}</div></div>
          <button class="btn-ghost btn-sm">Change account type</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Email</div><div class="settings-row-value">${esc(u.email||'')}</div></div>
          <button class="btn-ghost btn-sm" onclick="openChangeEmail()">Change email</button>
        </div>
        <div class="settings-row" id="change-email-form" style="display:none">
          <div style="flex:1">
            <div class="form-group"><label>New email</label><input type="email" id="new-email" placeholder="new@example.com"></div>
            <div class="form-group"><label>Current password</label><input type="password" id="change-email-pw" placeholder="••••••••"></div>
            <div class="form-error" id="change-email-error"></div>
            <button class="btn-primary btn-sm" onclick="saveEmailChange()">Save new email</button>
            <button class="btn-ghost btn-sm" onclick="document.getElementById('change-email-form').style.display='none'" style="margin-left:8px">Cancel</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Name</div><div class="settings-row-value">${esc(u.first_name||'')} ${esc(u.last_name||'')}</div></div>
          <button class="btn-ghost btn-sm" onclick="goto('candidate-dash')">Edit profile</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Member since</div><div class="settings-row-value">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'long'}) : '—'}</div></div>
          <span></span>
        </div>
      </div>
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border)">
        <button class="btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="confirmCloseAccount()">
          <i class="ti ti-trash"></i> Close my account
        </button>
        <p style="font-size:12px;color:var(--muted);margin-top:8px">This will permanently delete your account and all associated data.</p>
      </div>
    `;
  } else if (section === 's-security') {
    content.innerHTML = `
      <h2 class="settings-section-title">Security settings</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">Password</div><div class="settings-row-value">Last changed: unknown</div></div>
          <button class="btn-ghost btn-sm" onclick="openChangePassword()">Change password</button>
        </div>
        <div class="settings-row" id="change-pw-form" style="display:none">
          <div style="flex:1">
            <div class="form-group"><label>Current password</label><input type="password" id="cur-pw" placeholder="Current password"></div>
            <div class="form-group"><label>New password</label><input type="password" id="new-pw" placeholder="8+ characters"></div>
            <div class="form-group"><label>Confirm new password</label><input type="password" id="confirm-pw" placeholder="Repeat new password"></div>
            <div class="form-error" id="change-pw-error"></div>
            <button class="btn-primary btn-sm" onclick="savePasswordChange()">Save new password</button>
            <button class="btn-ghost btn-sm" onclick="document.getElementById('change-pw-form').style.display='none'" style="margin-left:8px">Cancel</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Passkey</div><div class="settings-row-value settings-muted">Not configured — passwordless login (coming soon)</div></div>
          <button class="btn-ghost btn-sm" disabled style="opacity:.5">Create passkey</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Active sessions</div><div class="settings-row-value settings-muted">1 active session (this device)</div></div>
          <button class="btn-ghost btn-sm" onclick="logout()">Sign out all</button>
        </div>
      </div>
    `;
  } else if (section === 's-notifications') {
    content.innerHTML = `
      <h2 class="settings-section-title">Communications settings</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">Job alerts</div><div class="settings-row-value settings-muted">Receive emails when new jobs match your profile</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-jobs" checked onchange="saveNotifPref('job_alerts',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Application updates</div><div class="settings-row-value settings-muted">Emails when employers update your application status</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-apps" checked onchange="saveNotifPref('app_updates',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Nexhire news</div><div class="settings-row-value settings-muted">Product updates, new features, tips</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-news" onchange="saveNotifPref('news',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Platform language</div><div class="settings-row-value">Currently: ${state.lang === 'fr' ? 'French / Français' : 'English'}</div></div>
          <div style="display:flex;gap:8px"><button class="btn-ghost btn-sm ${state.lang==='en'?'btn-active':''}" onclick="setLang('en')">EN</button><button class="btn-ghost btn-sm ${state.lang==='fr'?'btn-active':''}" onclick="setLang('fr')">FR</button></div>
        </div>
      </div>
    `;
  } else if (section === 's-privacy') {
    content.innerHTML = `
      <h2 class="settings-section-title">Privacy settings</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">Profile visibility</div><div class="settings-row-value settings-muted">Employers can find your profile when you apply</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Anonymous reviews</div><div class="settings-row-value settings-muted">Your name is never shown on company reviews</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">AI matching</div><div class="settings-row-value settings-muted">Use your profile and activity to suggest relevant jobs</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Your data</div><div class="settings-row-value settings-muted">Request a copy or deletion of your personal data</div></div>
          <div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="toast('Data export coming soon','info')"><i class="ti ti-download"></i> Export</button><button class="btn-ghost btn-sm" style="color:var(--red)" onclick="confirmCloseAccount()"><i class="ti ti-trash"></i> Delete</button></div>
        </div>
      </div>
      <div style="margin-top:24px"><a class="help-link" onclick="goto('privacy')">Read our full Privacy Centre →</a></div>
    `;
  }
}

function openChangeEmail() {
  const form = document.getElementById('change-email-form');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}
function openChangePassword() {
  const form = document.getElementById('change-pw-form');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function saveEmailChange() {
  const email = document.getElementById('new-email')?.value.trim();
  const password = document.getElementById('change-email-pw')?.value;
  const errEl = document.getElementById('change-email-error');
  if (!email || !password) { showErr(errEl, 'Email and current password required'); return; }
  const d = await api('PUT', `${BASE}/api/auth/update-profile`, { email, current_password: password });
  if (d.success) { state.user.email = email; toast('Email updated!', 'success'); document.getElementById('change-email-form').style.display='none'; renderSettings(); }
  else showErr(errEl, d.error || 'Failed to update email');
}

async function savePasswordChange() {
  const cur = document.getElementById('cur-pw')?.value;
  const nw = document.getElementById('new-pw')?.value;
  const conf = document.getElementById('confirm-pw')?.value;
  const errEl = document.getElementById('change-pw-error');
  if (!cur || !nw || !conf) { showErr(errEl, 'All fields required'); return; }
  if (nw !== conf) { showErr(errEl, 'New passwords do not match'); return; }
  if (nw.length < 8) { showErr(errEl, 'Password must be at least 8 characters'); return; }
  const d = await api('PUT', `${BASE}/api/auth/update-profile`, { current_password: cur, new_password: nw });
  if (d.success) { toast('Password updated!', 'success'); document.getElementById('change-pw-form').style.display='none'; }
  else showErr(errEl, d.error || 'Failed to update password');
}

function confirmCloseAccount() {
  if (confirm('This will permanently delete your account and all your data. This cannot be undone. Continue?')) {
    api('DELETE', `${BASE}/api/auth/account`).then(() => { toast('Account deleted', 'info'); logout(); });
  }
}

function saveNotifPref(key, val) {
  toast(`Preference saved: ${key} ${val ? 'on' : 'off'}`, 'success');
}

// ── Help page ──────────────────────────────────────────────
function renderHelp() {
  const candidateFaqs = [
    { q: 'How do I create an account?', a: 'Click "Get started" in the top right corner and select "Candidate". Fill in your details and you\'re done.' },
    { q: 'How does AI job matching work?', a: 'Our AI analyzes your profile skills, experience, and preferences to recommend the most relevant jobs. Complete your profile for better matches.' },
    { q: 'How do I apply for a job?', a: 'Click on any job, then "Apply Now". You can write a custom cover letter or generate one with AI in seconds.' },
    { q: 'Can I save jobs to review later?', a: 'Yes — click the ❤️ heart icon on any job card to save it. Find all saved jobs in your dashboard under "Saved Jobs".' },
    { q: 'How do I delete my account?', a: 'Go to Settings → Account settings → "Close my account". This permanently deletes all your data.' },
  ];
  const employerFaqs = [
    { q: 'How do I post a job?', a: 'Register as an employer, create your company profile, then go to "Post a Job" in your employer dashboard.' },
    { q: 'How many jobs can I post for free?', a: 'The Starter plan (free) includes 2 active job slots. Upgrade to Pro for 10 slots and featured listings.' },
    { q: 'What is the ATS Kanban pipeline?', a: 'It\'s a visual board to manage candidates across stages: New → Reviewed → Shortlisted → Interview → Offer → Rejected.' },
    { q: 'How do I see analytics for my job postings?', a: 'In your employer dashboard, each job card shows views, applications, and conversion rate in real-time.' },
    { q: 'How do I upgrade to Pro?', a: 'Go to your employer dashboard → Billing tab → "Upgrade to Pro".' },
  ];
  const faqHtml = (faqs) => faqs.map(f => `
    <details class="help-faq-item">
      <summary>${esc(f.q)}</summary>
      <p>${esc(f.a)}</p>
    </details>
  `).join('');
  const el1 = document.getElementById('help-faqs-candidate');
  const el2 = document.getElementById('help-faqs-employer');
  if (el1) el1.innerHTML = faqHtml(candidateFaqs);
  if (el2) el2.innerHTML = faqHtml(employerFaqs);
}

// ── Privacy page ───────────────────────────────────────────
function renderPrivacy() {}
function showPrivacyTab(tabId, el) {
  document.querySelectorAll('.privacy-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.privacy-tab').forEach(t => t.classList.remove('active'));
  const section = document.getElementById(tabId);
  if (section) section.style.display = 'block';
  if (el) el.classList.add('active');
}

// ── My Reviews ─────────────────────────────────────────────
async function loadMyReviews() {
  const container = document.getElementById('my-reviews-container');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h2>My contributions</h2>
        <p style="font-size:14px;color:var(--muted);margin-top:4px">Your reviews are not associated with your name, resume, or job applications.</p>
      </div>
    </div>
    <div class="my-reviews-tabs">
      <button class="my-rev-tab active" onclick="showMyRevTab('mrt-reviews',this)">Reviews <span class="rev-count" id="mrt-count">0</span></button>
    </div>
    <div id="mrt-reviews">
      <div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>
    </div>
  `;
  const d = await api('GET', `${BASE}/api/reviews/mine`);
  const countEl = document.getElementById('mrt-count');
  const listEl = document.getElementById('mrt-reviews');
  if (!listEl) return;
  const reviews = d.reviews || [];
  if (countEl) countEl.textContent = reviews.length;
  if (!reviews.length) {
    listEl.innerHTML = `
      <div class="my-reviews-empty">
        <div class="my-reviews-lock"><i class="ti ti-lock"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i></div>
        <h3>Unlock all reviews</h3>
        <p>Access all company reviews by writing yours</p>
        <button class="btn-primary" onclick="goto('jobs')"><i class="ti ti-star"></i> Write a review →</button>
      </div>
    `;
    return;
  }
  listEl.innerHTML = reviews.map(r => `
    <div class="my-review-card">
      <div class="my-review-top">
        <div>
          <div class="my-review-company">${esc(r.company_name || 'Company')}</div>
          <div>${starsHtml(r.rating)}</div>
          ${r.title ? `<div class="my-review-title">"${esc(r.title)}"</div>` : ''}
        </div>
        <span style="font-size:12px;color:var(--muted)">${daysAgo(r.created_at)}</span>
      </div>
      ${r.pros ? `<div style="margin-top:8px"><span style="color:var(--green);font-weight:600;font-size:12px">Pros</span><p style="font-size:13px;margin-top:4px">${esc(r.pros)}</p></div>` : ''}
      ${r.cons ? `<div style="margin-top:8px"><span style="color:var(--red);font-weight:600;font-size:12px">Cons</span><p style="font-size:13px;margin-top:4px">${esc(r.cons)}</p></div>` : ''}
    </div>
  `).join('');
}
function showMyRevTab(tabId, el) {
  document.querySelectorAll('.my-rev-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function logout() {
  await api('POST', `${BASE}/api/auth/logout`);
  state.user = null; state.savedJobIds = new Set();
  showGuestNav(); goto('home'); toast('Signed out', 'success');
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

// ── Candidate Dashboard ────────────────────────────────────
async function loadDashboard() {
  if (!state.user || state.user.role !== 'candidate') return;
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  safeSet('dash-avatar', initials);
  safeSet('dash-name', `${u.first_name} ${u.last_name}`);
  await loadProfileForm();
  loadMyApplications();
  loadSavedJobsTab();
  loadJobsForYou();
}

// ── Profile completeness ───────────────────────────────────
function computeCompleteness(p, user) {
  const fields = [
    { key: 'headline_en', label: 'Add a headline', val: p.headline_en || p.headline_fr },
    { key: 'bio_en', label: 'Write a bio', val: p.bio_en || p.bio_fr },
    { key: 'skills', label: 'Add skills', val: safeJsonArr(p.skills).length > 0 },
    { key: 'city', label: 'Add your city', val: p.city },
    { key: 'linkedin_url', label: 'Link your LinkedIn', val: p.linkedin_url },
    { key: 'experience_years', label: 'Add experience years', val: p.experience_years > 0 },
    { key: 'phone', label: 'Add phone number', val: user?.phone },
  ];
  const done = fields.filter(f => f.val);
  const pct = Math.round((done.length / fields.length) * 100);
  const missing = fields.filter(f => !f.val).slice(0, 3);
  return { pct, missing };
}

async function loadProfileForm() {
  const d = await api('GET', `${BASE}/api/candidates/profile`);
  const container = document.getElementById('profile-form');
  if (!container) return;
  const p = d.profile || {};

  const { pct, missing } = computeCompleteness(p, state.user);
  const pctColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--indigo)';

  container.innerHTML = `
    <div class="completeness-bar-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--dark)">Profile completeness</span>
        <span style="font-size:13px;font-weight:700;color:${pctColor}">${pct}%</span>
      </div>
      <div class="completeness-track"><div class="completeness-fill" style="width:${pct}%;background:${pctColor}"></div></div>
      ${missing.length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">To complete: ${missing.map(m => `<span class="missing-chip">${m.label}</span>`).join('')}</div>` : '<div style="margin-top:8px;font-size:12px;color:var(--green)">✓ Profile complete!</div>'}
    </div>
    <div class="form-row"><div class="form-group"><label>First name</label><input type="text" id="pf-first" value="${esc(state.user?.first_name||'')}"></div><div class="form-group"><label>Last name</label><input type="text" id="pf-last" value="${esc(state.user?.last_name||'')}"></div></div>
    <div class="form-row">
      <div class="form-group"><label>Headline (EN)</label><input type="text" id="pf-head-en" value="${esc(p.headline_en||'')}" placeholder="Senior Full-Stack Developer"></div>
      <div class="form-group"><label>Titre (FR)</label><input type="text" id="pf-head-fr" value="${esc(p.headline_fr||'')}" placeholder="Développeur Full-Stack Senior"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Province / Territory</label>
        <select id="pf-province">
          <option value="">— Select province —</option>
          ${CA_PROVINCES.map(pr => `<option value="${pr.code}"${(p.province||'')=== pr.code?' selected':''}>${pr.code} — ${pr.name.split(' /')[0]}</option>`).join('')}
          <option value="INTL"${p.province==='INTL'?' selected':''}>🌐 Outside Canada</option>
        </select>
      </div>
      <div class="form-group"><label>City</label><input type="text" id="pf-city" value="${esc(p.city||'')}" placeholder="e.g. Montréal, Toronto..."></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Work preference</label><select id="pf-mode"><option value="">Any</option><option value="remote" ${p.work_mode_pref==='remote'?'selected':''}>Remote</option><option value="hybrid" ${p.work_mode_pref==='hybrid'?'selected':''}>Hybrid</option><option value="onsite" ${p.work_mode_pref==='onsite'?'selected':''}>On-site</option></select></div>
      <div class="form-group"><label>Years of experience</label><input type="number" id="pf-exp" value="${p.experience_years||0}" min="0" max="50"></div>
    </div>
    <div class="form-group"><label>Skills <span style="color:var(--muted);font-weight:400">(comma-separated)</span></label><input type="text" id="pf-skills" value="${safeJsonArr(p.skills).join(', ')}" placeholder="React, Node.js, TypeScript, Python"></div>
    <div class="form-row">
      <div class="form-group"><label>LinkedIn URL</label><input type="url" id="pf-linkedin" value="${esc(p.linkedin_url||'')}" placeholder="https://linkedin.com/in/..."></div>
      <div class="form-group"><label>GitHub URL</label><input type="url" id="pf-github" value="${esc(p.github_url||'')}"></div>
    </div>
    <div class="form-group"><label>Availability</label><select id="pf-avail"><option value="immediate" ${p.availability==='immediate'?'selected':''}>Immediate</option><option value="2weeks" ${p.availability==='2weeks'?'selected':''}>2 weeks</option><option value="1month" ${p.availability==='1month'?'selected':''}>1 month</option><option value="3months" ${p.availability==='3months'?'selected':''}>3 months</option></select></div>
    <div class="form-group"><label>Bio (EN)</label><textarea id="pf-bio-en">${esc(p.bio_en||'')}</textarea></div>
    <button class="btn-primary" onclick="saveProfile()"><i class="ti ti-check"></i> Save profile</button>
  `;
}

async function saveProfile() {
  const body = {
    first_name: document.getElementById('pf-first')?.value.trim(),
    last_name: document.getElementById('pf-last')?.value.trim(),
    headline_en: document.getElementById('pf-head-en')?.value.trim(),
    headline_fr: document.getElementById('pf-head-fr')?.value.trim(),
    city: document.getElementById('pf-city')?.value.trim(),
    province: document.getElementById('pf-province')?.value || null,
    country: 'Canada',
    skills: document.getElementById('pf-skills')?.value.split(',').map(s => s.trim()).filter(Boolean),
    experience_years: parseInt(document.getElementById('pf-exp')?.value) || 0,
    linkedin_url: document.getElementById('pf-linkedin')?.value.trim(),
    github_url: document.getElementById('pf-github')?.value.trim(),
    bio_en: document.getElementById('pf-bio-en')?.value.trim(),
    work_mode_pref: document.getElementById('pf-mode')?.value,
    availability: document.getElementById('pf-avail')?.value,
  };
  const d = await api('PUT', `${BASE}/api/candidates/profile`, body);
  if (d.success) { toast('Profile saved!', 'success'); loadProfileForm(); }
  else toast(d.error || 'Failed to save', 'error');
}

// ── Applications (candidate) ───────────────────────────────
async function loadMyApplications() {
  const d = await api('GET', `${BASE}/api/applications/mine`);
  const container = document.getElementById('applications-list');
  if (!container) return;
  const apps = d.applications || [];
  if (!apps.length) { container.innerHTML = '<div class="empty-state"><i class="ti ti-file-off"></i><p>No applications yet.<br>Browse jobs and start applying!</p><button class="btn-primary" onclick="goto(\'jobs\')" style="margin-top:16px">Browse jobs</button></div>'; return; }

  const statuses = ['new','reviewed','shortlisted','interview','offer','rejected'];
  const statusLabel = { new:'Applied', reviewed:'Reviewed', shortlisted:'Shortlisted', interview:'Interview', offer:'Offer', rejected:'Not selected', withdrawn:'Withdrawn' };

  container.innerHTML = apps.map(a => {
    const title = state.lang === 'fr' ? (a.title_fr || a.title_en) : (a.title_en || a.title_fr);
    const logo = a.company_logo;
    const color = companyColor(a.company_name);
    const initials = (a.company_name || 'N').slice(0, 2).toUpperCase();
    const statusIdx = statuses.indexOf(a.status);
    const progressSteps = ['new','reviewed','shortlisted','interview','offer'];
    const pIdx = progressSteps.indexOf(a.status);

    return `<div class="app-card-v2">
      <div class="app-card-top">
        ${logo ? `<img src="${logo}" style="width:40px;height:40px;border-radius:8px;object-fit:contain;flex-shrink:0">` : `<div class="company-logo" style="background:${color};width:40px;height:40px;border-radius:8px;flex-shrink:0;font-size:13px">${initials}</div>`}
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--r);font-weight:600;color:var(--dark);font-size:15px">${esc(title)}</div>
          <div style="font-size:13px;color:var(--muted)">${esc(a.company_name||'')}${a.city || a.province ? ' · ' + (a.city ? esc(a.city) + (a.province ? ', <strong>'+esc(a.province)+'</strong>' : '') : esc(a.province||'')) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="app-status ${a.status}">${statusLabel[a.status] || a.status}</span>
          <span style="font-size:11px;color:var(--muted)">${daysAgo(a.created_at)}</span>
        </div>
      </div>
      ${a.status !== 'rejected' && a.status !== 'withdrawn' ? `
      <div class="app-progress">
        ${progressSteps.map((s, i) => `<div class="prog-step${i <= pIdx ? ' done' : ''}${i === pIdx ? ' current' : ''}"><div class="prog-dot"></div><div class="prog-label">${statusLabel[s]}</div></div>`).join('<div class="prog-line"></div>')}
      </div>` : ''}
      ${a.work_mode ? `<div style="margin-top:8px"><span class="job-tag ${a.work_mode}">${a.work_mode}</span></div>` : ''}
    </div>`;
  }).join('');
}

// ── Saved jobs tab ─────────────────────────────────────────
async function loadSavedJobsTab() {
  const container = document.getElementById('saved-jobs-list');
  if (!container) return;
  container.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:24px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/saved-jobs`);
  const jobs = d.jobs || [];
  if (!jobs.length) { container.innerHTML = '<div class="empty-state"><i class="ti ti-heart"></i><p>No saved jobs yet.<br>Click the <i class="ti ti-heart"></i> on any job to save it.</p></div>'; return; }
  container.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const color = companyColor(j.company_name);
    const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
    return `<div class="job-list-item" style="cursor:pointer" onclick="goto('jobs')">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:40px;height:40px;border-radius:8px;flex-shrink:0;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:40px;height:40px;border-radius:8px;flex-shrink:0;font-size:13px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--r);font-weight:600;color:var(--dark)">${esc(title)}</div>
        <div style="font-size:13px;color:var(--muted)">${esc(j.company_name||'')}${j.city || j.province ? ' · ' + (j.city ? esc(j.city) + (j.province ? ', <strong>'+esc(j.province)+'</strong>' : '') : esc(j.province||'')) : ''}</div>
        <div class="job-meta" style="margin-top:6px"><span class="job-tag ${j.work_mode||'onsite'}">${j.work_mode||'onsite'}</span>${j.salary_min ? `<span class="job-tag salary-tag">${fmtSalary(j.salary_min)} ${j.salary_currency||'CAD'}</span>` : ''}</div>
      </div>
      <button class="save-btn saved" data-id="${j.id}" onclick="toggleSave('${j.id}',event);this.closest('.job-list-item').remove()" title="Remove"><i class="ti ti-heart-filled"></i></button>
    </div>`;
  }).join('');
}

// ── Jobs for You ──────────────────────────────────────────
async function loadJobsForYou() {
  const container = document.getElementById('jobs-for-you');
  if (!container) return;
  const profileD = await api('GET', `${BASE}/api/candidates/profile`);
  const skills = safeJsonArr(profileD.profile?.skills);
  if (!skills.length) { container.innerHTML = '<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>Add skills to your profile to get job recommendations.</p></div>'; return; }

  const q = skills.slice(0, 3).join(' ');
  const d = await api('GET', `${BASE}/api/jobs?q=${encodeURIComponent(q)}&limit=5`);
  const jobs = d.jobs || [];
  if (!jobs.length) { container.innerHTML = '<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>No matches found yet — more jobs coming!</p></div>'; return; }
  container.innerHTML = `<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Based on: ${skills.slice(0,3).map(s=>`<span class="skill-chip">${esc(s)}</span>`).join(' ')}</p>` +
    jobs.map(j => {
      const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
      return `<div class="jfy-card" onclick="goto('jobs')">
        <div class="jfy-title">${esc(title)}</div>
        <div style="font-size:12px;color:var(--muted)">${esc(j.company_name||'')}${j.city || j.province ? ' · ' + (j.city ? esc(j.city) + (j.province ? ', <strong>'+esc(j.province)+'</strong>' : '') : esc(j.province||'')) : ''}</div>
        <div style="display:flex;gap:6px;margin-top:6px"><span class="job-tag ${j.work_mode||'onsite'}" style="font-size:11px">${j.work_mode||'onsite'}</span>${j.salary_min?`<span class="job-tag salary-tag" style="font-size:11px">${fmtSalary(j.salary_min)} ${j.salary_currency||'CAD'}</span>`:''}</div>
      </div>`;
    }).join('');
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
  if (!jobs.length) { container.innerHTML = '<div class="empty-state"><i class="ti ti-briefcase"></i><p>No jobs posted yet.</p><button class="btn-primary" onclick="showEmpTab(\'etab-post\')" style="margin-top:16px"><i class="ti ti-plus"></i> Post your first job</button></div>'; return; }

  container.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const apps = parseInt(j.apps || 0);
    const views = parseInt(j.views || 0);
    const conv = views > 0 ? ((apps / views) * 100).toFixed(1) : 0;
    const exp = j.expires_at ? daysUntil(j.expires_at) : null;
    return `<div class="emp-job-card-v2">
      <div class="emp-job-top">
        <div>
          <div class="emp-job-title">${esc(title)}</div>
          <div class="emp-job-meta">
            <span class="job-tag ${j.work_mode||'onsite'}" style="font-size:11px">${j.work_mode||'onsite'}</span>
            ${j.city || j.province ? `<span style="font-size:11px;color:var(--muted)"><i class="ti ti-map-pin" style="font-size:10px"></i> ${j.city ? esc(j.city)+', ' : ''}<strong>${esc(j.province||'')}</strong></span>` : ''}
            ${exp !== null ? `<span class="job-tag" style="font-size:11px;color:${exp < 5 ? 'var(--red)' : 'var(--muted)'}"><i class="ti ti-clock" style="font-size:10px"></i>${exp > 0 ? `${exp}d left` : 'Expired'}</span>` : ''}
          </div>
        </div>
        <span class="app-status ${j.status}" style="font-size:11px;flex-shrink:0">${j.status}</span>
      </div>
      <div class="emp-job-stats">
        <div class="emp-stat"><i class="ti ti-eye"></i><span>${views}</span><small>Views</small></div>
        <div class="emp-stat"><i class="ti ti-users"></i><span>${apps}</span><small>Applicants</small></div>
        <div class="emp-stat"><i class="ti ti-percentage"></i><span>${conv}%</span><small>Conversion</small></div>
      </div>
      <div class="emp-job-actions">
        <button class="btn-ghost" style="font-size:13px;padding:6px 14px" onclick="openKanban('${j.id}','${esc(title)}')"><i class="ti ti-layout-kanban"></i> Pipeline (${apps})</button>
        <button class="btn-ghost" style="font-size:13px;padding:6px 14px" onclick="closeJob('${j.id}')"><i class="ti ti-x"></i> Close</button>
      </div>
    </div>`;
  }).join('');
}

async function closeJob(jobId) {
  if (!confirm('Close this job listing?')) return;
  await api('PUT', `${BASE}/api/jobs/${jobId}`, { status: 'closed' });
  toast('Job closed', 'success');
  loadEmployerJobs();
}

// ── Kanban ATS ─────────────────────────────────────────────
const COLUMNS = [
  { key: 'new',         label: 'New',        color: '#3B82F6' },
  { key: 'reviewed',    label: 'Reviewed',   color: '#8B5CF6' },
  { key: 'shortlisted', label: 'Shortlisted',color: '#F59E0B' },
  { key: 'interview',   label: 'Interview',  color: '#10B981' },
  { key: 'offer',       label: 'Offer',      color: '#22C55E' },
  { key: 'rejected',    label: 'Rejected',   color: '#EF4444' },
];

async function openKanban(jobId, jobTitle) {
  state.currentKanbanJob = jobId;
  safeSet('kanban-title', jobTitle);
  document.getElementById('kanban-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  await refreshKanban();
}

function closeKanban() {
  document.getElementById('kanban-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

async function refreshKanban() {
  const d = await api('GET', `${BASE}/api/applications/job/${state.currentKanbanJob}`);
  const apps = d.applications || [];
  const board = document.getElementById('kanban-board');
  if (!board) return;

  board.innerHTML = COLUMNS.map(col => {
    const colApps = apps.filter(a => a.status === col.key);
    return `<div class="kanban-col">
      <div class="kanban-col-header" style="border-top:3px solid ${col.color}">
        <span style="font-weight:700;color:var(--dark)">${col.label}</span>
        <span class="kanban-count">${colApps.length}</span>
      </div>
      <div class="kanban-cards" id="kc-${col.key}">
        ${colApps.map(a => kanbanCard(a, col)).join('')}
        ${!colApps.length ? `<div style="text-align:center;padding:24px 8px;color:var(--muted);font-size:12px">No candidates</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function kanbanCard(a, col) {
  const skills = safeJsonArr(a.skills);
  return `<div class="kanban-card">
    <div class="kanban-card-name">${esc(a.first_name||'')} ${esc(a.last_name||'')}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${a.experience_years || 0} yrs exp${a.headline_en ? ' · '+esc(a.headline_en) : ''}</div>
    ${a.ai_score ? `<div class="ai-score-badge" style="background:${a.ai_score>=80?'#D1FAE5':a.ai_score>=60?'#FEF3C7':'#FEE2E2'};color:${a.ai_score>=80?'#065F46':a.ai_score>=60?'#92400E':'#991B1B'}"><i class="ti ti-robot"></i> AI ${a.ai_score}%</div>` : ''}
    ${skills.length ? `<div style="margin:6px 0">${skills.slice(0,3).map(s=>`<span class="skill-chip" style="font-size:10px">${esc(s)}</span>`).join('')}</div>` : ''}
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${daysAgo(a.created_at)}</div>
    <div class="kanban-actions">
      ${COLUMNS.filter(c => c.key !== col.key && c.key !== 'rejected').slice(0,2).map(c =>
        `<button class="btn-ghost" style="font-size:11px;padding:4px 8px" onclick="moveCandidate('${a.id}','${c.key}')">${c.label} →</button>`
      ).join('')}
      <button class="btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:var(--red)" onclick="moveCandidate('${a.id}','rejected')">Reject</button>
    </div>
    ${a.profile_cv || a.cv_url ? `<a href="${a.profile_cv || a.cv_url}" target="_blank" style="font-size:11px;color:var(--indigo);display:block;margin-top:4px"><i class="ti ti-file-cv"></i> View CV</a>` : ''}
  </div>`;
}

async function moveCandidate(appId, status) {
  await api('PUT', `${BASE}/api/applications/${appId}/status`, { status });
  await refreshKanban();
  loadEmployerJobs();
}

// ── Post Job ───────────────────────────────────────────────
function initPostJobForm() {
  const form = document.getElementById('post-job-form');
  if (!form) return;
  const provOptions = CA_PROVINCES.map(p => `<option value="${p.code}">${p.code} — ${p.name.split(' /')[0]}</option>`).join('');
  form.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>Job Title (EN) *</label><input type="text" id="jf-title-en" placeholder="e.g. Senior Full-Stack Developer" required></div>
      <div class="form-group"><label>Titre du poste (FR)</label><input type="text" id="jf-title-fr" placeholder="ex: Développeur Full-Stack Senior"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Work mode</label><select id="jf-mode" onchange="toggleLocationByMode()"><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote (Canada)</option><option value="remote-intl">Remote (International)</option></select></div>
      <div class="form-group"><label>Job type</label><select id="jf-type"><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div>
    </div>

    <div id="jf-location-block">
      <div class="location-geo-label"><i class="ti ti-map-pin" style="color:var(--indigo)"></i> Job location</div>
      <div class="form-row">
        <div class="form-group">
          <label>Province / Territory *</label>
          <select id="jf-province" onchange="updateCitiesForProvince('jf-province','jf-city-select')">
            <option value="">— Select province —</option>
            ${provOptions}
          </select>
        </div>
        <div class="form-group" id="jf-city-group">
          <label>City</label>
          <select id="jf-city-select" onchange="syncCityInput()">
            <option value="">— Select province first —</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="jf-city-manual-group" style="display:none">
        <label>City <span style="color:var(--muted);font-weight:400">(enter manually)</span></label>
        <input type="text" id="jf-city" placeholder="City name...">
      </div>
    </div>

    <div id="jf-remote-block" style="display:none">
      <div class="info-box"><i class="ti ti-world"></i> Fully remote — candidates from all provinces/regions can apply. You can still specify a preferred timezone below.</div>
      <div class="form-group"><label>Preferred timezone <span style="color:var(--muted);font-weight:400">(optional)</span></label><select id="jf-tz"><option value="">Any timezone</option><option>ET (Eastern — Toronto, Montréal, Ottawa)</option><option>CT (Central — Winnipeg)</option><option>MT (Mountain — Calgary, Edmonton)</option><option>PT (Pacific — Vancouver, Victoria)</option><option>AT (Atlantic — Halifax, Moncton)</option><option>NT (Newfoundland — St. John's)</option></select></div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Min salary (annual CAD)</label><input type="number" id="jf-sal-min" placeholder="60000"></div>
      <div class="form-group"><label>Max salary</label><input type="number" id="jf-sal-max" placeholder="90000"></div>
    </div>
    <div class="form-group"><label>Currency</label><select id="jf-currency"><option value="CAD">CAD — Canadian Dollar</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option></select></div>
    <div class="form-group"><label>Required experience</label><select id="jf-exp"><option value="">Not specified</option><option value="0-1">0-1 years (Junior)</option><option value="1-3">1-3 years (Intermediate)</option><option value="3-5">3-5 years (Senior)</option><option value="5+">5+ years (Lead / Expert)</option></select></div>
    <div class="form-group"><label>Skills required <span style="color:var(--muted);font-weight:400">(comma-separated)</span></label><input type="text" id="jf-skills" placeholder="React, Node.js, TypeScript, Python"></div>
    <div class="form-group"><label>Languages required</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <label class="check-label"><input type="checkbox" id="jf-lang-en" value="English" checked> English</label>
        <label class="check-label"><input type="checkbox" id="jf-lang-fr" value="French"> French / Français</label>
        <label class="check-label"><input type="checkbox" id="jf-lang-bi" value="Bilingual"> Bilingual (EN+FR)</label>
        <label class="check-label"><input type="checkbox" id="jf-lang-es" value="Spanish"> Spanish</label>
      </div>
    </div>
    <div class="form-group"><label>Description (EN) *</label><textarea id="jf-desc-en" placeholder="Describe the role, responsibilities, and team..." required></textarea></div>
    <div class="form-group"><label>Description (FR)</label><textarea id="jf-desc-fr" placeholder="Décrivez le poste, les responsabilités et l'équipe..."></textarea></div>
    <div class="form-group"><label>Requirements (EN)</label><textarea id="jf-req-en" placeholder="Must-have qualifications, technical skills..."></textarea></div>
    <div class="form-group"><label>Benefits & Perks (EN)</label><textarea id="jf-ben-en" placeholder="Health insurance, 4 weeks PTO, remote work stipend..."></textarea></div>
    <div class="form-error" id="jf-error"></div>
    <button class="btn-primary" type="submit"><i class="ti ti-briefcase"></i> Post job</button>
  `;
}

function toggleLocationByMode() {
  const mode = document.getElementById('jf-mode')?.value;
  const locBlock = document.getElementById('jf-location-block');
  const remBlock = document.getElementById('jf-remote-block');
  if (!locBlock || !remBlock) return;
  const isRemote = mode === 'remote' || mode === 'remote-intl';
  locBlock.style.display = isRemote ? 'none' : 'block';
  remBlock.style.display = isRemote ? 'block' : 'none';
}

function syncCityInput() {
  const sel = document.getElementById('jf-city-select')?.value;
  const manualGroup = document.getElementById('jf-city-manual-group');
  const cityInput = document.getElementById('jf-city');
  if (sel === '__other__') {
    if (manualGroup) manualGroup.style.display = 'block';
    if (cityInput) cityInput.value = '';
  } else {
    if (manualGroup) manualGroup.style.display = 'none';
    if (cityInput) cityInput.value = sel || '';
  }
}

async function postJob(e) {
  e.preventDefault();
  const errEl = document.getElementById('jf-error');
  errEl.style.display = 'none';

  const mode = document.getElementById('jf-mode')?.value || 'onsite';
  const normalizedMode = (mode === 'remote-intl') ? 'remote' : mode;
  const province = document.getElementById('jf-province')?.value || null;
  // City: manual input wins over select if "other" chosen
  const cityFromSelect = document.getElementById('jf-city-select')?.value;
  const cityFromInput = document.getElementById('jf-city')?.value.trim();
  const city = (cityFromSelect === '__other__' || !cityFromSelect) ? cityFromInput : (cityFromSelect || cityFromInput);

  const langs = [];
  ['en','fr','bi','es'].forEach(l => { const el = document.getElementById(`jf-lang-${l}`); if (el?.checked) langs.push(el.value); });

  const body = {
    title_en: document.getElementById('jf-title-en')?.value.trim(),
    title_fr: document.getElementById('jf-title-fr')?.value.trim() || document.getElementById('jf-title-en')?.value.trim(),
    description_en: document.getElementById('jf-desc-en')?.value.trim(),
    description_fr: document.getElementById('jf-desc-fr')?.value.trim() || document.getElementById('jf-desc-en')?.value.trim(),
    requirements_en: document.getElementById('jf-req-en')?.value.trim(),
    benefits_en: document.getElementById('jf-ben-en')?.value.trim(),
    work_mode: normalizedMode,
    job_type: document.getElementById('jf-type')?.value,
    city: city || null,
    province: (mode === 'remote' || mode === 'remote-intl') ? null : (province || null),
    country: 'Canada',
    salary_min: parseInt(document.getElementById('jf-sal-min')?.value) || null,
    salary_max: parseInt(document.getElementById('jf-sal-max')?.value) || null,
    salary_currency: document.getElementById('jf-currency')?.value || 'CAD',
    experience_years: document.getElementById('jf-exp')?.value || null,
    skills_required: document.getElementById('jf-skills')?.value.split(',').map(s => s.trim()).filter(Boolean),
    languages_required: langs,
  };
  if (!body.title_en || !body.description_en) { showErr(errEl, 'Title (EN) and description required'); return; }
  const d = await api('POST', `${BASE}/api/jobs`, body);
  if (d.success) { toast('Job posted successfully!', 'success'); showEmpTab('etab-jobs'); loadEmployerJobs(); }
  else showErr(errEl, d.error || 'Failed to post job');
}

// ── Company form ───────────────────────────────────────────
function initCompanyForm() {
  const form = document.getElementById('company-form');
  if (!form) return;
  form.innerHTML = `
    <div class="form-group"><label>Company name *</label><input type="text" id="cf-name" required></div>
    <div class="form-row">
      <div class="form-group"><label>Industry</label><select id="cf-industry"><option value="">Select...</option><option>Technology</option><option>Finance</option><option>Healthcare</option><option>Education</option><option>Retail</option><option>Manufacturing</option><option>Government</option><option>Other</option></select></div>
      <div class="form-group"><label>Company size</label><select id="cf-size"><option value="">Select...</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-200">51-200</option><option value="201-500">201-500</option><option value="500+">500+</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>City</label><input type="text" id="cf-city"></div>
      <div class="form-group"><label>Website</label><input type="url" id="cf-web" placeholder="https://"></div>
    </div>
    <div class="form-group"><label>Logo URL</label><input type="url" id="cf-logo" placeholder="https://...company-logo.png"></div>
    <div class="form-group"><label>About the company (EN)</label><textarea id="cf-desc-en" placeholder="Describe your company..."></textarea></div>
    <div class="form-group"><label>À propos (FR)</label><textarea id="cf-desc-fr" placeholder="Décrivez votre entreprise..."></textarea></div>
    <button class="btn-primary" type="submit"><i class="ti ti-check"></i> Save company profile</button>
  `;
}

async function loadCompanyForm() {
  const d = await api('GET', `${BASE}/api/companies/me/profile`);
  if (!d.success) return;
  const c = d.company;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('cf-name', c.name); set('cf-industry', c.industry); set('cf-size', c.size);
  set('cf-city', c.city); set('cf-web', c.website); set('cf-logo', c.logo_url);
  set('cf-desc-en', c.description_en); set('cf-desc-fr', c.description_fr);
}

async function saveCompany(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('cf-name')?.value.trim(),
    industry: document.getElementById('cf-industry')?.value,
    size: document.getElementById('cf-size')?.value,
    city: document.getElementById('cf-city')?.value.trim(),
    website: document.getElementById('cf-web')?.value.trim(),
    logo_url: document.getElementById('cf-logo')?.value.trim(),
    description_en: document.getElementById('cf-desc-en')?.value.trim(),
    description_fr: document.getElementById('cf-desc-fr')?.value.trim(),
  };
  const d = await api('PUT', `${BASE}/api/companies/me/profile`, body);
  if (d.success) toast('Company profile saved!', 'success');
  else toast(d.error || 'Failed to save', 'error');
}

// ── Billing ────────────────────────────────────────────────
async function loadBillingInfo() {
  const d = await api('GET', `${BASE}/api/payments/status`);
  const container = document.getElementById('billing-info');
  if (!container) return;
  const plan = d.plan || 'starter';
  const planColors = { starter: 'var(--muted)', pro: 'var(--indigo)', enterprise: 'var(--green)' };
  container.innerHTML = `
    <div class="billing-card">
      <div class="billing-plan-name" style="color:${planColors[plan] || 'var(--indigo)'}">
        <i class="ti ti-${plan === 'pro' ? 'crown' : plan === 'enterprise' ? 'diamond' : 'leaf'}"></i>
        ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
      </div>
      <div class="billing-slots">
        <div class="billing-slot-item"><i class="ti ti-briefcase"></i><span>Active job slots:</span><strong>${d.active_job_slots || 2}</strong></div>
        <div class="billing-slot-item"><i class="ti ti-star"></i><span>Featured slots:</span><strong>${d.featured_job_slots || 0}</strong></div>
        ${d.plan_expires_at ? `<div class="billing-slot-item"><i class="ti ti-calendar"></i><span>Renews:</span><strong>${new Date(d.plan_expires_at).toLocaleDateString()}</strong></div>` : ''}
      </div>
      ${plan === 'starter' ? `
      <div class="upgrade-cta">
        <div style="font-size:14px;color:var(--text);margin-bottom:12px">Upgrade to <strong>Pro</strong> — 10 job slots, AI ranking, featured listings</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-primary" onclick="startCheckout('pro','month')"><i class="ti ti-crown"></i> Pro — $99/mo</button>
          <button class="btn-ghost" onclick="startCheckout('pro','year')"><i class="ti ti-crown"></i> Pro — $990/yr <span style="background:var(--green);color:#fff;padding:2px 8px;border-radius:100px;font-size:10px;margin-left:4px">-16%</span></button>
        </div>
      </div>` : `<button class="btn-ghost" onclick="openBillingPortal()"><i class="ti ti-credit-card"></i> Manage billing</button>`}
    </div>
  `;
}

async function startCheckout(plan, interval) {
  if (!state.user) { showModal('modal-register'); return; }
  const d = await api('POST', `${BASE}/api/payments/create-checkout`, { plan, interval });
  if (d.url) window.location.href = d.url;
  else toast(d.error || 'Payment setup failed', 'error');
}

// ── AI Chat ────────────────────────────────────────────────
async function sendAiMsg() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const messages = document.getElementById('ai-messages');
  messages.innerHTML += `<div class="ai-msg ai-msg-user">${esc(msg)}</div>`;
  const typingId = 'typing-' + Date.now();
  messages.innerHTML += `<div class="ai-msg ai-msg-bot" id="${typingId}"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i></div>`;
  messages.scrollTop = messages.scrollHeight;
  const d = await api('POST', `${BASE}/api/ai/chat`, { message: msg, context: state.user?.role || 'general' });
  document.getElementById(typingId)?.remove();
  messages.innerHTML += `<div class="ai-msg ai-msg-bot">${esc(d.reply || 'AI service temporarily unavailable.')}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

// ── Tab helpers ────────────────────────────────────────────
function showTab(tabId, el) {
  document.querySelectorAll('#pg-candidate-dash .dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#pg-candidate-dash .dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  if (el) el.classList.add('active');
  if (tabId === 'tab-saved') loadSavedJobsTab();
  if (tabId === 'tab-applications') loadMyApplications();
  if (tabId === 'tab-for-you') loadJobsForYou();
}

function showEmpTab(tabId) {
  document.querySelectorAll('#pg-employer-dash .dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#pg-employer-dash .dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  event?.currentTarget?.classList.add('active');
}

// ── Modal helpers ──────────────────────────────────────────
function showModal(id) { document.getElementById(id)?.classList.add('open'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Utilities ──────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtSalary(n) { return n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`; }
function companyColor(name) { const h = [...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%360; return `hsl(${h},55%,45%)`; }
function safeJsonArr(v) { if (Array.isArray(v)) return v; if (!v) return []; try { return JSON.parse(v); } catch { return []; } }
function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function daysAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.floor(diff/30)}mo ago`;
  return `${Math.floor(diff/365)}y ago`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}
function starsHtml(rating) {
  const full = Math.floor(rating); const half = rating - full >= 0.5;
  let h = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) h += '<i class="ti ti-star-filled" style="color:#F59E0B;font-size:13px"></i>';
    else if (i === full && half) h += '<i class="ti ti-star-half-filled" style="color:#F59E0B;font-size:13px"></i>';
    else h += '<i class="ti ti-star" style="color:#D1D5DB;font-size:13px"></i>';
  }
  return h;
}
function togglePw(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}
function toast(msg, type = 'success') {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="ti ti-${type === 'success' ? 'check' : 'alert-circle'}"></i>${esc(msg)}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

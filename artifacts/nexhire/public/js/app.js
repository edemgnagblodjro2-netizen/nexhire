'use strict';

const BASE = '/nexhire';
const state = {
  user: null, lang: 'en', regRole: 'candidate',
  jobs: [], currentPage: 1, jobSearchTimer: null,
  savedJobIds: new Set(), appliedJobIds: new Set(), currentJobForApply: null,
  currentKanbanJob: null, filterTimer: null,
  candidateProfile: null
};

// ── Geography ──────────────────────────────────────────────
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

// World countries — value format: "c:CountryName" — 194 countries (Canada handled via provinces)
const WORLD_REGIONS = [
  { region: '🌍 Africa', countries: [
    'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde',
    'Central African Republic','Chad','Comoros','Democratic Republic of the Congo','Republic of the Congo',
    'Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana',
    'Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi',
    'Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda',
    'Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan',
    'Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe',
  ]},
  { region: '🌎 North America & Caribbean', countries: [
    'United States','Mexico','Antigua and Barbuda','Bahamas','Barbados','Belize','Costa Rica','Cuba',
    'Dominica','Dominican Republic','El Salvador','Grenada','Guatemala','Haiti','Honduras','Jamaica',
    'Nicaragua','Panama','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
    'Trinidad and Tobago',
  ]},
  { region: '🌎 South America', countries: [
    'Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru',
    'Suriname','Uruguay','Venezuela',
  ]},
  { region: '🌍 Western Europe', countries: [
    'Andorra','Austria','Belgium','Cyprus','Denmark','Finland','France','Germany','Greece','Iceland',
    'Ireland','Italy','Liechtenstein','Luxembourg','Malta','Monaco','Netherlands','Norway','Portugal',
    'San Marino','Spain','Sweden','Switzerland','United Kingdom',
  ]},
  { region: '🌍 Central & Eastern Europe', countries: [
    'Albania','Armenia','Azerbaijan','Belarus','Bosnia and Herzegovina','Bulgaria','Croatia',
    'Czech Republic','Estonia','Georgia','Hungary','Kosovo','Latvia','Lithuania','Moldova',
    'Montenegro','North Macedonia','Poland','Romania','Russia','Serbia','Slovakia','Slovenia',
    'Ukraine',
  ]},
  { region: '🌍 Middle East', countries: [
    'Bahrain','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman','Qatar',
    'Saudi Arabia','Syria','Turkey','United Arab Emirates','Yemen',
  ]},
  { region: '🌏 South Asia', countries: [
    'Afghanistan','Bangladesh','Bhutan','India','Maldives','Nepal','Pakistan','Sri Lanka',
  ]},
  { region: '🌏 East & Southeast Asia', countries: [
    'Brunei','Cambodia','China','Indonesia','Japan','Laos','Malaysia','Mongolia','Myanmar',
    'North Korea','Philippines','Singapore','South Korea','Taiwan','Thailand','Timor-Leste','Vietnam',
  ]},
  { region: '🌏 Central Asia & Caucasus', countries: [
    'Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan',
  ]},
  { region: '🌏 Oceania', countries: [
    'Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand',
    'Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu',
  ]},
];

// Build <option> HTML for world countries — FLAT (value = "c:CountryName")
function buildLocationOptions(selectedVal = '') {
  const caOpts = CA_PROVINCES.map(p => {
    const sel = p.code === selectedVal ? ' selected' : '';
    return `<option value="${p.code}"${sel}>${p.code} — ${p.name.split(' /')[0]}</option>`;
  }).join('');
  const worldOpts = WORLD_REGIONS.map(({ region, countries }) => {
    const opts = countries.map(c => {
      const val = `c:${c}`;
      const sel = val === selectedVal ? ' selected' : '';
      return `<option value="${val}"${sel}>${c}</option>`;
    }).join('');
    return `<optgroup label="${region}">${opts}</optgroup>`;
  }).join('');
  return `
    <option value=""${!selectedVal ? ' selected' : ''}>🌐 All locations</option>
    <optgroup label="🍁 Canada — Provinces &amp; Territories">${caOpts}</optgroup>
    <option value="REMOTE"${'REMOTE' === selectedVal ? ' selected' : ''}>🌐 Remote / International</option>
    ${worldOpts}
  `;
}

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
  const parts = [];
  if (j.city) parts.push(`<span style="font-weight:500">${esc(j.city)}</span>`);
  if (j.province && j.province !== 'REMOTE') parts.push(`<strong>${esc(j.province)}</strong>`);
  const loc = parts.join(', ');
  const chips = [];
  if (j.work_mode) chips.push(`<span class="job-tag ${j.work_mode}" style="font-size:12px">${j.work_mode}</span>`);
  if (j.job_type) chips.push(`<span class="job-tag" style="font-size:12px">${j.job_type}</span>`);
  const addrLine = j.address
    ? `<div style="font-size:12px;color:var(--muted);margin-top:3px;margin-bottom:10px"><i class="ti ti-map-pin-filled" style="font-size:11px"></i> ${esc(j.address)}${loc ? ', ' + loc.replace(/<[^>]*>/g,'') : ''}</div>`
    : '';
  return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:${addrLine ? '0' : '12px'}">
    ${loc ? `<span class="detail-location-text"><i class="ti ti-map-pin" style="font-size:13px;color:var(--muted)"></i> ${loc}</span>` : ''}
    ${chips.join('')}
  </div>${addrLine}`;
}

function fmtPeriod(p) { return {year:'/yr', month:'/mo', hour:'/hr'}[p] || '/yr'; }

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
  // Capture ?ref= from URL and persist across the session
  const _urlRef = new URLSearchParams(window.location.search).get('ref');
  if (_urlRef) {
    sessionStorage.setItem('nh_ref_code', _urlRef.toUpperCase());
    // Clean the URL without reloading
    const clean = window.location.pathname + window.location.hash;
    history.replaceState(null, '', clean);
  }

  try {
    const d = await api('GET', `${BASE}/api/auth/me`);
    if (d.success && d.user) {
      state.user = d.user;
      state.lang = d.user.preferred_lang || 'en';
      showUserNav();
      loadVerifiedSkills();
      // Close login modal if it was opened before auth resolved (race condition)
      hideModal('modal-login');
      hideModal('modal-register');
    }
  } catch (e) {}
  setLangUI(state.lang);
  initLocationSelects();
  loadStats();
  renderRecentSearches();
  loadFeaturedJobs();
  initPostJobForm();
  initCompanyForm();
  if (state.user) {
    loadDashboard();
    if (state.user.role === 'candidate') loadSavedJobIds();
    loadNotifBadge();
    startSSE();
    // Restore hash-based page — but if already authed, skip #login/#register
    const hash = window.location.hash.replace('#', '');
    if (hash === 'login' || hash === 'register') {
      // Clear stale auth-gate hash and go to dashboard
      history.replaceState(null, '', window.location.pathname);
      goto(state.user.role === 'employer' ? 'employer-dash' : 'candidate-dash');
    } else {
      restoreFromHash();
    }
  } else {
    restoreFromHash();
  }
  // Handle team invite acceptance via URL param ?accept-invite=TOKEN
  const inviteToken = new URLSearchParams(window.location.search).get('accept-invite');
  if (inviteToken) {
    window.history.replaceState({}, '', window.location.pathname);
    await handleAcceptInvite(inviteToken);
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
  // terms page is static — no render needed
  // update URL hash for direct linking
  const publicPages = ['home','jobs','employer','pricing','privacy','terms','help'];
  if (publicPages.includes(page)) {
    history.replaceState(null, '', page === 'home' ? window.location.pathname : '#' + page);
  }
}

// restore page from URL hash on load / back-forward
function restoreFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'login') { showModal('modal-login'); return; }
  if (hash === 'register') { showModal('modal-register'); return; }
  // Messages deep-link: #messages or #messages-{appId}
  if (hash === 'messages' || hash.startsWith('messages-')) {
    const appId = hash.startsWith('messages-') ? hash.replace('messages-', '') : null;
    if (state.user) {
      const role = state.user.role;
      if (role === 'employer') {
        goto('employer-dash');
        setTimeout(() => {
          const navEl = document.querySelector('[data-emptab="etab-messages"]');
          showEmpTab('etab-messages', navEl, appId);
        }, 100);
      } else {
        goto('candidate-dash');
        setTimeout(() => {
          const navEl = document.querySelector('[data-tab="tab-messages"]');
          showTab('tab-messages', navEl);
          if (appId) setTimeout(() => openMessagesInTab('tab-messages', appId), 100);
        }, 100);
      }
    } else {
      showModal('modal-login');
    }
    return;
  }
  const valid = ['jobs','employer','pricing','privacy','terms','help'];
  if (hash && valid.includes(hash)) goto(hash);
}
window.addEventListener('hashchange', restoreFromHash);

// ── Lang ───────────────────────────────────────────────────
async function setLang(lang) {
  state.lang = lang; setLangUI(lang);
  // Re-render active Phase 3 tab so content switches language immediately
  const phase3Reload = {
    'tab-score':    () => loadProfileScore(),
    'tab-skills':   () => { if (currentTest) renderSkillTestUI(); else loadSkillTests(); },
    'tab-referrals':() => loadReferrals(),
    'tab-salary':   () => loadSalaryPage(),
    'tab-credits':  () => loadCredits(),
  };
  for (const [id, fn] of Object.entries(phase3Reload)) {
    if (document.getElementById(id)?.classList.contains('active')) { fn(); break; }
  }
  if (state.user) await api('POST', `${BASE}/api/auth/set-lang`, { lang });
}
const T = {
  en: {
    'trust.label':'Trusted by leading companies & organizations',
    'nav.jobs':'Jobs','nav.employers':'For Employers','nav.pricing':'Pricing',
    'nav.signin':'Sign in','nav.getstarted':'Get started',
    'nav.dd.profile':'Profile','nav.dd.reviews':'My reviews','nav.dd.settings':'Settings',
    'nav.dd.help':'Help Centre','nav.dd.privacy':'Privacy Centre',
    'nav.dd.employer':'Employer Dashboard','nav.dd.signout':'Sign out',
    'hero.eyebrow':'AI-Powered Global Job Matching',
    'hero.title':'Find your next <em>opportunity</em> anywhere in the world',
    'hero.sub':'Jobs across Canada and globally — remote, hybrid, on-site. AI matching finds your best fit in seconds, for free.',
    'hero.pill.ai':'AI match score','hero.pill.lang':'FR · EN bilingual','hero.pill.free':'Free to apply','hero.pill.global':'Canada & Global',
    'hiw.eyebrow':'Simple · Fast · Free','hiw.title':'How Nexhire works','hiw.sub':'Three steps between you and your next job.',
    'hiw.s1.title':'Create your profile','hiw.s1.desc':'Add your skills and experience in under 2 minutes. No CV upload required to start.',
    'hiw.s2.title':'AI finds your matches','hiw.s2.desc':'Our AI scans every job posting and scores each one by how well it fits your profile — instantly.',
    'hiw.s3.title':'Apply & get hired','hiw.s3.desc':'Apply in one click. Track every application and get notified when employers respond.',
    'hiw.cta':'Get started — it\'s free','hiw.note':'No credit card · Available in FR & EN',
    'hero.search.ph':'Title, skill, company...','hero.search.btn':'Search',
    'hero.mode.all':'All modes','hero.mode.remote':'Remote','hero.mode.hybrid':'Hybrid','hero.mode.onsite':'On-site',
    'hero.recent':'Your recent searches',
    'hero.stat.jobs':'Active jobs','hero.stat.companies':'Companies','hero.stat.match':'AI match rate','hero.stat.resp':'Avg response',
    'cat.title':'Browse by category','cat.all':'See all jobs',
    'cat.software':'Software Development','cat.software.sub':'Developer · Engineer · Architect',
    'cat.ai':'AI / Data Science','cat.ai.sub':'ML · Data Analyst · LLM',
    'cat.design':'Design & Creative','cat.design.sub':'UX/UI · Graphic · Motion',
    'cat.marketing':'Marketing & Communications','cat.marketing.sub':'SEO · Content · Brand · Growth',
    'cat.finance':'Finance & Accounting','cat.finance.sub':'CPA · Analyst · Controller',
    'cat.product':'Product Management','cat.product.sub':'PM · PO · Strategy · Roadmap',
    'cat.sales':'Sales & Business Dev','cat.sales.sub':'Account Exec · SDR · BDM',
    'cat.health':'Healthcare & Medical','cat.health.sub':'Nurse · Doctor · Therapist',
    'cat.eng':'Engineering','cat.eng.sub':'Civil · Mechanical · Electrical',
    'cat.cs':'Customer Service','cat.cs.sub':'Support · CX · Agent · Rep',
    'cat.hr':'Human Resources','cat.hr.sub':'Recruiter · HRBP · Talent',
    'cat.edu':'Education & Training','cat.edu.sub':'Teacher · Instructor · Coach',
    'cat.legal':'Legal & Compliance','cat.legal.sub':'Lawyer · Paralegal · Notary',
    'cat.ops':'Operations & Logistics','cat.ops.sub':'Supply Chain · Warehouse · Ops',
    'cat.construction':'Construction & Trades','cat.construction.sub':'Carpenter · Electrician · Plumber',
    'cat.remote':'Remote / International','cat.remote.sub':'Work from anywhere',
    'featured.title':'Featured Opportunities','featured.all':'View all',
    'feat.ai.title':'AI Job Matching','feat.ai.desc':"Our AI analyzes your profile and matches you to roles where you're most likely to succeed — faster than traditional search.",
    'feat.ats.title':'ATS Pipeline','feat.ats.desc':'Employers get a full Kanban ATS to manage applications from New to Offer — with AI candidate scoring built in.',
    'feat.cover.title':'AI Cover Letters','feat.cover.desc':'Generate personalized, compelling cover letters in seconds. One click — tailored to each job.',
    'feat.reviews.title':'Company Reviews','feat.reviews.desc':"Transparent ratings from real candidates. Know what it's really like before you apply.",
    'bento.cand.label':'For candidates',
    'bento.cand.title':'Find your next opportunity,<br>anywhere in the world.',
    'bento.cand.desc':'Thousands of jobs in Canada and internationally. Nexhire AI finds your best match in seconds.',
    'bento.cand.btn':'Browse jobs',
    'bento.emp.label':'For employers',
    'bento.emp.title':'Hire the best talent, on a global scale.',
    'bento.emp.desc':'Post jobs, rank candidates with AI, manage your Kanban pipeline. 2-5 free job slots to start.',
    'bento.emp.btn':'Start free',
    'bento.ai.label':'AI-Powered',
    'bento.ai.title':'Cover letters, matching & ATS — one platform.',
    'bento.ai.desc':'Everything you need to land or fill a role, all in one place.',
    'bento.ai.btn':'Explore features',
    'pricing.eyebrow':'Competitive AI-first pricing',
    'pricing.title':'Sponsored Job pricing',
    'pricing.sub':'No long-term contracts. Start and stop sponsoring your job posts at any time with a flexible budget. You only pay when candidates click.',
    'pricing.badge':'Free to post · Pay only per qualified click on sponsored jobs',
    'pricing.how':'<strong>How pricing works:</strong> Nexhire recommends a budget based on your job title, location, and market demand. You set a daily or total budget cap — charged only when a verified candidate clicks your sponsored listing. Standard jobs are always free with organic visibility. <a href="#" data-goto="help" style="color:var(--indigo)">Learn more →</a>',
    'pricing.std.desc':'Hire with organic visibility in search results and get your job in front of active seekers.',
    'pricing.std.incl':'Included',
    'pricing.std.btn':'Post a job',
    'pricing.std.f1':'<i class="ti ti-check"></i> Search results visibility',
    'pricing.std.f2':'<i class="ti ti-check"></i> Automated candidate messages',
    'pricing.std.f3':'<i class="ti ti-check"></i> Kanban ATS pipeline',
    'pricing.std.f4':'<i class="ti ti-check"></i> Unlimited job posts',
    'pricing.std.f5':'<i class="ti ti-check"></i> Direct messaging',
    'pricing.std.f6':'<i class="ti ti-x muted"></i> AI-matched candidates',
    'pricing.std.f7':'<i class="ti ti-x muted"></i> Urgently hiring badge',
    'pricing.std.f8':'<i class="ti ti-x muted"></i> Branded jobs',
    'pricing.std.f9':'<i class="ti ti-x muted"></i> Analytics dashboard',
    'pricing.spo.popular':'⭐ Most popular',
    'pricing.spo.per.click':'per qualified click · flexible budget',
    'pricing.spo.desc':'Reach top talent with priority placement. AI-matched candidates sent directly to you. Pay only per click.',
    'pricing.spo.budget':'<strong>Recommended budget:</strong> ~$5–15/day · min. $3/day<br><span style="font-size:12px;opacity:.8">Avg CPC: $0.50–$2.00 depending on industry</span>',
    'pricing.spo.std.plus':'Everything in Standard, plus',
    'pricing.spo.btn':'Sponsor a job',
    'pricing.spo.nosub':'No subscription · Pay as you go',
    'pricing.spo.f1':'<i class="ti ti-check" style="color:#34D399"></i> AI-matched candidates',
    'pricing.spo.f2':'<i class="ti ti-check" style="color:#34D399"></i> Time-saving AI features',
    'pricing.spo.f3':'<i class="ti ti-check" style="color:#34D399"></i> <span style="color:#FBBF24;font-weight:600">Urgently hiring</span> label',
    'pricing.spo.f4':'<i class="ti ti-check" style="color:#34D399"></i> Branded company jobs',
    'pricing.spo.f5':'<i class="ti ti-check" style="color:#34D399"></i> Priority search placement',
    'pricing.spo.f6':'<i class="ti ti-check" style="color:#34D399"></i> Verified employer badge',
    'pricing.pro.mo':'/ month · 14-day free trial',
    'pricing.pro.desc':'For hiring teams. Unlimited sponsoring, advanced analytics, candidate database access, and bulk hiring tools.',
    'pricing.pro.spo.plus':'Everything in Sponsored, plus',
    'pricing.pro.btn':'Start free trial',
    'pricing.pro.annual':'Annual $1,990/yr — save $398 (17%)',
    'pricing.pro.f1':'<i class="ti ti-check"></i> Unlimited sponsored slots',
    'pricing.pro.f2':'<i class="ti ti-check"></i> Candidate database access',
    'pricing.pro.f3':'<i class="ti ti-check"></i> Advanced analytics dashboard',
    'pricing.pro.f4':'<i class="ti ti-check"></i> Bulk candidate actions',
    'pricing.pro.f5':'<i class="ti ti-check"></i> Priority support',
    'pricing.pro.f6':'<i class="ti ti-check"></i> Team seats (3 users)',
    'pricing.ent.title':'Volume pricing & custom integrations',
    'pricing.ent.sub':'Dedicated account manager · Custom integrations · SLA 99.9% · SSO · Unlimited team seats · White-label options',
    'pricing.ent.btn':'Contact sales →',
    'pricing.why.title':'Why Nexhire?',
    'pricing.why.sub':"AI-powered matching at a fraction of LinkedIn's price",
    'pricing.tbl.platform':'Platform','pricing.tbl.model':'Model','pricing.tbl.cpc':'CPC price','pricing.tbl.sub':'Subscription','pricing.tbl.ai':'AI matching',
    'pricing.faq.title':'Frequently asked questions',
    'pricing.faq1.q':'When do I get charged?',
    'pricing.faq1.a':'Only when a verified candidate clicks your sponsored job. Standard posts are always free. Set a daily cap and never go over budget.',
    'pricing.faq2.q':'Can I pause or cancel anytime?',
    'pricing.faq2.a':'Yes. No long-term contracts. Pause or cancel from your employer dashboard instantly. Your jobs stay visible in Standard mode for free.',
    'pricing.faq3.q':'What is AI candidate matching?',
    'pricing.faq3.a':'Sponsored jobs use GPT-4o to rank applicants by fit score — job description vs. resume & skills. You see the best candidates first, saving hours of manual screening.',
    'pricing.faq4.q':'What is the Urgently Hiring badge?',
    'pricing.faq4.a':'Sponsored jobs get a highlighted Urgently hiring label in search results, boosting click-through for time-sensitive roles by 2–3×.',
    'settings.account.title':'Account settings','settings.type':'Account type','settings.employer':'Employer','settings.jobseeker':'Job seeker',
    'settings.change.type':'Change account type','settings.email':'Email','settings.change.email':'Change email',
    'settings.new.email':'New email','settings.cur.pw':'Current password','settings.save.email':'Save new email','settings.cancel':'Cancel',
    'settings.name':'Name','settings.edit.profile':'Edit profile','settings.member.since':'Member since',
    'settings.close.account':'Close my account','settings.close.desc':'This will permanently delete your account and all associated data.',
    'settings.security.title':'Security settings','settings.password':'Password','settings.last.changed':'Last changed: unknown',
    'settings.change.pw':'Change password','settings.new.pw':'New password','settings.chars':'8+ characters',
    'settings.confirm.pw':'Confirm new password','settings.repeat.pw':'Repeat new password','settings.save.pw':'Save new password',
    'settings.passkey':'Passkey','settings.passkey.val':'Not configured — passwordless login (coming soon)',
    'settings.create.passkey':'Create passkey','settings.sessions':'Active sessions','settings.sessions.val':'1 active session (this device)',
    'settings.signout.all':'Sign out all','settings.notif.title':'Communications settings',
    'settings.job.alerts':'Job alerts','settings.job.alerts.val':'Receive emails when new jobs match your profile',
    'settings.app.updates':'Application updates','settings.app.updates.val':'Emails when employers update your application status',
    'settings.news':'Nexhire news','settings.news.val':'Product updates, new features, tips',
    'settings.lang':'Platform language','settings.lang.val.en':'Currently: English','settings.lang.val.fr':'Currently: French / Français',
    'settings.privacy.title':'Privacy settings','settings.profile.vis':'Profile visibility',
    'settings.profile.vis.val':'Employers can find your profile when you apply',
    'settings.anon.rev':'Anonymous reviews','settings.anon.rev.val':'Your name is never shown on company reviews',
    'settings.ai.match':'AI matching','settings.ai.match.val':'Use your profile and activity to suggest relevant jobs',
    'settings.your.data':'Your data','settings.your.data.val':'Request a copy or deletion of your personal data',
    'settings.privacy.link':'Read our full Privacy Centre →',
    'dash.empty.apps':'No applications yet.<br>Browse jobs and start applying!',
    'dash.empty.browse':'Browse jobs','dash.empty.saved':'No saved jobs yet.<br>Click the ♥ on any job to save it.',
    'dash.empty.skills':'Add skills to your profile to get job recommendations.',
    'dash.empty.nomatch':'No matches found yet — more jobs coming!',
    'dash.empty.jobs':'No jobs posted yet.',
    'jobs.noresult':'No jobs found. Try different filters.','jobs.noresult.short':'0 results',
    'jobs.clear':'Clear filters','jobs.new':'New',
    'status.applied':'Applied','status.reviewed':'Reviewed','status.shortlisted':'Shortlisted',
    'status.interview':'Interview','status.offer':'Offer','status.rejected':'Not selected','status.withdrawn':'Withdrawn',
    'cta.title':'Hire the best talent globally',
    'cta.desc':'Post jobs, review AI-ranked applications, manage your pipeline with Kanban, and message candidates directly. Start with 2-5 free job slots.',
    'cta.btn':'Start hiring free','cta.trial':'Free trial','cta.apps':'Applications','cta.ats':'ATS pipeline',
    'jobs.title':'Job listings','jobs.filter.ph':'Search title, skill, company...',
    'jobs.filter.modes.all':'All modes','jobs.filter.types.all':'All types',
    'jobs.filter.types.ft':'Full time','jobs.filter.types.perm':'Permanent','jobs.filter.types.pt':'Part time',
    'jobs.filter.types.contract':'Contract','jobs.filter.types.temp':'Temporary','jobs.filter.types.casual':'Casual',
    'jobs.filter.pay.all':'All Pay',
    'jobs.filter.dates.all':'All Dates','jobs.filter.dates.unseen':"Jobs you haven't seen",
    'jobs.filter.dates.1d':'Last 24 hours','jobs.filter.dates.3d':'Last 3 days',
    'jobs.filter.dates.7d':'Last 7 days','jobs.filter.dates.14d':'Last 14 days',
    'jobs.search.btn':'Find jobs',
    'jobs.filter.lang':'Job language',
    'emp.eyebrow':'For Employers','emp.title':'Hire globally with <em>AI precision</em>',
    'emp.sub':'Post jobs, get AI-ranked candidates, manage your pipeline with Kanban, and build your global team — all in one platform.',
    'emp.cta':'Start free — 2-5 job slots','emp.pricing':'See pricing',
    'emp.f1.title':'Post in minutes','emp.f1.desc':'Create bilingual job postings with AI-assisted descriptions. Go live in under 5 minutes.',
    'emp.f2.title':'AI candidate ranking','emp.f2.desc':'Every application gets an AI match score so you focus on the best candidates first.',
    'emp.f3.title':'Kanban ATS pipeline','emp.f3.desc':'Visual pipeline: New → Reviewed → Shortlisted → Interview → Offer. Move candidates with one click.',
    'emp.f4.title':'Job analytics','emp.f4.desc':'Track views, applications, and conversion rate per listing. Know which jobs perform best.',
    'emp.cta.short':'Start free',
    'emp.f1.label':'POST FAST','emp.f2.label':'AI RANKING','emp.f3.label':'ATS PIPELINE','emp.f4.label':'ANALYTICS',
    'emp.feat.eyebrow':'Platform features','emp.feat.title':'Everything you need to hire smarter','emp.feat.sub':'One platform. From posting to offer letter.',
    'emp.f1.c1':'AI-generated FR & EN description','emp.f1.c2':'Salary range recommendations','emp.f1.c3':'One-click publish to Nexhire network',
    'emp.f2.c1':'Skills, experience & salary alignment','emp.f2.c2':'Verified skill badges boost ranking','emp.f2.c3':'Sorted by match % automatically',
    'emp.f3.c1':'Drag & drop between stages','emp.f3.c2':'Internal notes & comments per candidate','emp.f3.c3':'Auto-notifications on status change',
    'emp.f4.c1':'Views, clicks & apply-rate per job','emp.f4.c2':'Daily trends over 30 days','emp.f4.c3':'Compare performance across listings',
    'emp.feat.cta.title':'Ready to hire smarter?','emp.feat.cta.sub':'2–5 free job slots. No credit card required.',
    'emp.mock.newjob':'New Job Posting','emp.mock.jobtitle':'Job title','emp.mock.desc':'Description','emp.mock.aigen':'Generate with AI',
    'emp.mock.salary':'Salary','emp.mock.publish':'Publish','emp.mock.applicants':'Applicants — Senior React Dev',
    'emp.mock.pipeline':'Recruitment Pipeline','emp.mock.analytics':'Job Analytics — Last 30 days',
    'emp.mock.views':'Views','emp.mock.apps':'Applications','emp.mock.conv':'Conv. rate','emp.mock.resp':'Avg resp.',
    'emp.k.new':'New','emp.k.reviewed':'Reviewed','emp.k.short':'Shortlisted','emp.k.offer':'Offer',
    'cand.role':'Candidate','cand.nav.profile':'My Profile','cand.nav.foryou':'Jobs for You',
    'cand.nav.saved':'Saved Jobs','cand.nav.apps':'Applications','cand.nav.reviews':'My Reviews','cand.nav.alerts':'Job Alerts','cand.nav.ai':'AI Coach',
    'cand.nav.messages':'Messages',
    'cand.nav.score':'Profile Score','cand.nav.skills':'Skill Tests','cand.nav.referrals':'Referrals','cand.nav.salary':'Salary Data','cand.nav.credits':'AI Credits',
    'cand.tab.profile':'My Profile','cand.tab.foryou':'Jobs for You','cand.tab.saved':'Saved Jobs','cand.tab.apps':'My Applications',
    'cand.ai.title':'AI Career Agent','cand.ai.sub':'Ask anything — resume tips, interview prep, salary negotiation, career advice.',
    'cand.ai.online':'Online · Ready to help',
    'cand.ai.greeting':"Hi! I'm your Nexhire AI Career Agent. How can I help accelerate your career today?",'cand.ai.ph':'Ask me about your career...',
    'agent.qa.jobs':'Find matching jobs','agent.qa.profile':'Optimize profile',
    'agent.qa.interview':'Interview prep','agent.qa.salary':'Salary advice',
    'emp.role':'Employer','emp.nav.jobs':'My Jobs','emp.nav.post':'Post a Job','emp.nav.company':'Company','emp.nav.team':'Work Team','emp.nav.analytics':'Analytics','emp.nav.billing':'Billing','emp.nav.messages':'Messages',
    'emp.tab.jobs':'My Job Listings','emp.tab.post':'Post a New Job','emp.tab.company':'Company Profile','emp.tab.team':'Work Team','emp.tab.billing':'Billing & Plan',
    'team.invite.title':'Invite a team member','team.invite.ph':'colleague@company.com','team.invite.btn':'Send invitation',
    'team.role.recruiter':'Recruiter','team.role.admin':'Administrator',
    'team.status.active':'Active','team.status.pending':'Invitation pending',
    'team.empty':'No team members yet. Invite a colleague to help manage recruitment.',
    'team.remove':'Remove','team.resend':'Resend',
    'settings.title':'Settings',
    'settings.account.label':'Account settings','settings.account.sub':'Your contact information',
    'settings.security.label':'Security settings','settings.security.sub':'Manage your account security',
    'settings.notif.label':'Communications settings','settings.notif.sub':'Manage notifications and messages',
    'settings.privacy.label':'Privacy settings','settings.privacy.sub':'Information about your privacy',
    'help.title':"If you're looking for help, you're in the right place",
    'help.seekers.title':'Help for job seekers',
    'help.seekers.desc':"Got a question or need help using Nexhire? Whether it's setting up your account, using AI matching, or applying — we've got you covered.",
    'help.seekers.link':'Job Seeker Help Centre →',
    'help.employers.title':'Help for employers',
    'help.employers.desc':"Looking to hire? Our Employer Help Centre covers posting jobs, managing the ATS pipeline, billing, and finding the best candidates faster.",
    'help.employers.link':'Employer Help Centre →',
    'help.cta.title':"We're here to help",'help.cta.desc':'Visit our Help Centre for answers to common questions or contact us directly.',
    'help.contact':'Contact support','help.legal':'Legal / Privacy',
    'footer.tagline':'Global AI Employment Platform','footer.platform':'Platform',
    'footer.browse':'Browse jobs','footer.employers':'For employers','footer.pricing':'Pricing','footer.getstarted':'Get started free',
    'footer.company':'Company','footer.help':'Help Centre','footer.privacy':'Privacy Centre','footer.terms':'Terms of Service','footer.contact':'Contact',
    'footer.copy':'© 2026 CivicAI Inc. All rights reserved.',
    'footer.privacy.sm':'Privacy','footer.terms.sm':'Terms','footer.legal.sm':'Legal','footer.made':'🍁 Made in Québec · CivicAI 2026',
    'modal.apply.cover':'Cover letter','modal.apply.cover.opt':'(optional but recommended)',
    'modal.apply.ai.title':'AI content analysis',
    'modal.apply.ai.desc':"Nexhire can detect AI-generated content in your cover letter. Would you like to allow the employer to see this analysis?",
    'modal.apply.yes':'Yes, share analysis','modal.apply.no':'No thanks',
    'modal.apply.submit':'Submit application','modal.apply.note':'Your profile info will be shared with the employer',
    'modal.apply.ph':"Briefly explain why you're a great fit for this role...",
    'modal.login.title':'Sign in to Nexhire','modal.login.email':'Email','modal.login.pw':'Password',
    'modal.login.btn':'Sign in','modal.login.create':'Create an account','modal.login.forgot':'Forgot password?',
    'modal.reg.title':'Create your account','modal.reg.candidate':'Candidate','modal.reg.employer':'Employer',
    'modal.reg.first':'First name','modal.reg.last':'Last name','modal.reg.email':'Email','modal.reg.pw':'Password',
    'modal.reg.company':'Company name','modal.reg.btn':'Create account',
    'modal.reg.terms':'By creating an account you agree to our','modal.reg.terms.link':'Terms of Service',
    'modal.rev.rating':'Overall rating *','modal.rev.title.label':'Review title',
    'modal.rev.pros':'Pros','modal.rev.cons':'Cons','modal.rev.diff':'Interview difficulty',
    'modal.rev.recommend':'Would recommend','modal.rev.anon':'Post anonymously','modal.rev.submit':'Submit review',
    'kanban.close':'Close',
  },
  fr: {
    'trust.label':'Reconnu par les meilleures entreprises & organisations',
    'nav.jobs':'Emplois','nav.employers':'Pour les employeurs','nav.pricing':'Tarifs',
    'nav.signin':'Connexion','nav.getstarted':'Commencer',
    'nav.dd.profile':'Profil','nav.dd.reviews':'Mes avis','nav.dd.settings':'Paramètres',
    'nav.dd.help':"Centre d'aide",'nav.dd.privacy':'Confidentialité',
    'nav.dd.employer':'Tableau de bord employeur','nav.dd.signout':'Déconnexion',
    'hero.eyebrow':'Matching IA — Emplois Mondiaux',
    'hero.title':'Trouvez votre prochaine <em>opportunité</em> partout dans le monde',
    'hero.sub':"Des emplois au Canada et partout dans le monde — télétravail, hybride, présentiel. L'IA Nexhire trouve votre meilleur match en secondes, gratuitement.",
    'hero.pill.ai':'Score IA de compatibilité','hero.pill.lang':'Bilingue FR · EN','hero.pill.free':'Candidature gratuite','hero.pill.global':'Canada & International',
    'hiw.eyebrow':'Simple · Rapide · Gratuit','hiw.title':'Comment fonctionne Nexhire','hiw.sub':'Trois étapes entre vous et votre prochain emploi.',
    'hiw.s1.title':'Créez votre profil','hiw.s1.desc':'Ajoutez vos compétences et votre expérience en moins de 2 minutes. Aucun CV requis pour commencer.',
    'hiw.s2.title':'L\'IA trouve vos matches','hiw.s2.desc':'Notre IA analyse chaque offre et lui attribue un score de compatibilité avec votre profil — instantanément.',
    'hiw.s3.title':'Postulez &amp; décrochez','hiw.s3.desc':'Postulez en un clic. Suivez chaque candidature et recevez une notification dès qu\'un employeur répond.',
    'hiw.cta':'Commencer gratuitement','hiw.note':'Sans carte de crédit · Disponible en FR et EN',
    'hero.search.ph':'Titre, compétence, entreprise...','hero.search.btn':'Rechercher',
    'hero.mode.all':'Tous les modes','hero.mode.remote':'Télétravail','hero.mode.hybrid':'Hybride','hero.mode.onsite':'Présentiel',
    'hero.recent':'Vos recherches récentes',
    'hero.stat.jobs':'Offres actives','hero.stat.companies':'Entreprises','hero.stat.match':'Taux matching IA','hero.stat.resp':'Délai réponse moyen',
    'cat.title':'Parcourir par catégorie','cat.all':'Voir toutes les offres',
    'cat.software':'Développement logiciel','cat.software.sub':'Développeur · Ingénieur · Architecte',
    'cat.ai':'IA / Science des données','cat.ai.sub':'ML · Analyste données · LLM',
    'cat.design':'Design & Créatif','cat.design.sub':'UX/UI · Graphiste · Motion',
    'cat.marketing':'Marketing & Communications','cat.marketing.sub':'SEO · Contenu · Marque · Croissance',
    'cat.finance':'Finance & Comptabilité','cat.finance.sub':'CPA · Analyste · Contrôleur',
    'cat.product':'Gestion de produit','cat.product.sub':'PM · PO · Stratégie · Roadmap',
    'cat.sales':'Ventes & Développement des affaires','cat.sales.sub':'Directeur de compte · SDR · BDM',
    'cat.health':'Santé & Médecine','cat.health.sub':'Infirmier · Médecin · Thérapeute',
    'cat.eng':'Génie','cat.eng.sub':'Civil · Mécanique · Électrique',
    'cat.cs':'Service à la clientèle','cat.cs.sub':'Support · CX · Agent · Représentant',
    'cat.hr':'Ressources humaines','cat.hr.sub':'Recruteur · RHBP · Talents',
    'cat.edu':'Éducation & Formation','cat.edu.sub':'Enseignant · Instructeur · Formateur',
    'cat.legal':'Juridique & Conformité','cat.legal.sub':'Avocat · Parajuriste · Notaire',
    'cat.ops':'Opérations & Logistique','cat.ops.sub':"Chaîne d'approvisionnement · Entrepôt · Ops",
    'cat.construction':'Construction & Métiers','cat.construction.sub':'Charpentier · Électricien · Plombier',
    'cat.remote':'Télétravail / International','cat.remote.sub':"Travailler de n'importe où",
    'featured.title':'Opportunités en vedette','featured.all':'Voir tout',
    'feat.ai.title':'Matching IA','feat.ai.desc':"Notre IA analyse votre profil et vous associe aux postes où vous avez le plus de chances de réussir — plus vite que la recherche traditionnelle.",
    'feat.ats.title':'Pipeline ATS','feat.ats.desc':"Les employeurs disposent d'un ATS Kanban complet pour gérer les candidatures de Nouveau à Offre — avec scoring IA intégré.",
    'feat.cover.title':'Lettres de motivation IA','feat.cover.desc':'Générez des lettres de motivation personnalisées en quelques secondes. Un clic — adaptées à chaque poste.',
    'feat.reviews.title':"Avis d'entreprises",'feat.reviews.desc':"Évaluations transparentes de vrais candidats. Sachez vraiment à quoi vous attendre avant de postuler.",
    'bento.cand.label':'Pour les candidats',
    'bento.cand.title':'Trouvez votre prochaine opportunité,<br>partout dans le monde.',
    'bento.cand.desc':"Des milliers d'offres au Canada et à l'international. L'IA Nexhire trouve votre meilleur match en quelques secondes.",
    'bento.cand.btn':'Parcourir les offres',
    'bento.emp.label':'Pour les employeurs',
    'bento.emp.title':"Recrutez les meilleurs talents, à l'échelle mondiale.",
    'bento.emp.desc':'Publiez des offres, classez les candidats par IA, gérez votre pipeline Kanban. 2 à 5 postes gratuits pour démarrer.',
    'bento.emp.btn':'Commencer gratuitement',
    'bento.ai.label':"Propulsé par l'IA",
    'bento.ai.title':'Lettres de motivation, matching & ATS — une seule plateforme.',
    'bento.ai.desc':'Tout ce dont vous avez besoin pour décrocher ou combler un poste, réuni en un seul endroit.',
    'bento.ai.btn':'Explorer les fonctions',
    'pricing.eyebrow':'Tarification compétitive axée sur l\'IA',
    'pricing.title':'Tarification des offres sponsorisées',
    'pricing.sub':'Sans engagement à long terme. Démarrez et arrêtez la sponsorisation de vos offres à tout moment avec un budget flexible. Vous ne payez que lorsque des candidats cliquent.',
    'pricing.badge':'Gratuit pour publier · Payez uniquement par clic qualifié sur les offres sponsorisées',
    'pricing.how':'<strong>Comment fonctionne la tarification :</strong> Nexhire recommande un budget selon le titre du poste, la localisation et la demande du marché. Vous fixez un plafond quotidien ou total — facturé uniquement lorsqu\'un candidat vérifié clique sur votre offre sponsorisée. Les offres Standard sont toujours gratuites. <a href="#" data-goto="help" style="color:var(--indigo)">En savoir plus →</a>',
    'pricing.std.desc':'Recrutez avec une visibilité organique dans les résultats et exposez votre offre aux candidats actifs.',
    'pricing.std.incl':'Inclus',
    'pricing.std.btn':'Publier une offre',
    'pricing.std.f1':'<i class="ti ti-check"></i> Visibilité dans les résultats',
    'pricing.std.f2':'<i class="ti ti-check"></i> Messages automatisés aux candidats',
    'pricing.std.f3':'<i class="ti ti-check"></i> Pipeline ATS Kanban',
    'pricing.std.f4':'<i class="ti ti-check"></i> Offres illimitées',
    'pricing.std.f5':'<i class="ti ti-check"></i> Messagerie directe',
    'pricing.std.f6':'<i class="ti ti-x muted"></i> Candidats matchés par IA',
    'pricing.std.f7':'<i class="ti ti-x muted"></i> Badge embauche urgente',
    'pricing.std.f8':'<i class="ti ti-x muted"></i> Offres brandées',
    'pricing.std.f9':'<i class="ti ti-x muted"></i> Tableau de bord analytique',
    'pricing.spo.popular':'⭐ Le plus populaire',
    'pricing.spo.per.click':'par clic qualifié · budget flexible',
    'pricing.spo.desc':'Atteignez les meilleurs talents avec un placement prioritaire. Candidats matchés par IA envoyés directement. Payez uniquement par clic.',
    'pricing.spo.budget':'<strong>Budget recommandé :</strong> ~5–15 $/jour · min. 3 $/jour<br><span style="font-size:12px;opacity:.8">CPC moyen : 0,50–2,00 $ selon le secteur</span>',
    'pricing.spo.std.plus':'Tout ce qui est dans Standard, plus',
    'pricing.spo.btn':'Sponsoriser une offre',
    'pricing.spo.nosub':'Sans abonnement · Paiement à l\'utilisation',
    'pricing.spo.f1':'<i class="ti ti-check" style="color:#34D399"></i> Candidats matchés par IA',
    'pricing.spo.f2':'<i class="ti ti-check" style="color:#34D399"></i> Fonctions IA gain de temps',
    'pricing.spo.f3':'<i class="ti ti-check" style="color:#34D399"></i> Label <span style="color:#FBBF24;font-weight:600">Embauche urgente</span>',
    'pricing.spo.f4':'<i class="ti ti-check" style="color:#34D399"></i> Offres d\'entreprise brandées',
    'pricing.spo.f5':'<i class="ti ti-check" style="color:#34D399"></i> Placement prioritaire',
    'pricing.spo.f6':'<i class="ti ti-check" style="color:#34D399"></i> Badge employeur vérifié',
    'pricing.pro.mo':'/ mois · 14 jours d\'essai gratuit',
    'pricing.pro.desc':'Pour les équipes de recrutement. Sponsorisation illimitée, analytique avancée, accès à la base de candidats et outils d\'embauche en masse.',
    'pricing.pro.spo.plus':'Tout ce qui est dans Sponsorisé, plus',
    'pricing.pro.btn':'Démarrer l\'essai gratuit',
    'pricing.pro.annual':'Annuel 1 990 $/an — économisez 398 $ (17 %)',
    'pricing.pro.f1':'<i class="ti ti-check"></i> Slots sponsorisés illimités',
    'pricing.pro.f2':'<i class="ti ti-check"></i> Accès à la base de candidats',
    'pricing.pro.f3':'<i class="ti ti-check"></i> Tableau de bord analytique avancé',
    'pricing.pro.f4':'<i class="ti ti-check"></i> Actions en masse sur candidats',
    'pricing.pro.f5':'<i class="ti ti-check"></i> Support prioritaire',
    'pricing.pro.f6':'<i class="ti ti-check"></i> Sièges d\'équipe (3 utilisateurs)',
    'pricing.ent.title':'Tarification sur volume & intégrations personnalisées',
    'pricing.ent.sub':'Gestionnaire de compte dédié · Intégrations personnalisées · SLA 99,9 % · SSO · Équipe illimitée · Options marque blanche',
    'pricing.ent.btn':'Contacter les ventes →',
    'pricing.why.title':'Pourquoi Nexhire ?',
    'pricing.why.sub':'Matching propulsé par l\'IA à une fraction du prix de LinkedIn',
    'pricing.tbl.platform':'Plateforme','pricing.tbl.model':'Modèle','pricing.tbl.cpc':'Prix CPC','pricing.tbl.sub':'Abonnement','pricing.tbl.ai':'IA matching',
    'pricing.faq.title':'Questions fréquentes',
    'pricing.faq1.q':'Quand suis-je facturé(e) ?',
    'pricing.faq1.a':'Uniquement lorsqu\'un candidat vérifié clique sur votre offre sponsorisée. Les offres Standard sont toujours gratuites. Fixez un plafond quotidien et ne dépassez jamais votre budget.',
    'pricing.faq2.q':'Puis-je mettre en pause ou annuler à tout moment ?',
    'pricing.faq2.a':'Oui. Sans engagement à long terme. Mettez en pause ou annulez depuis votre tableau de bord employeur instantanément. Vos offres restent visibles en mode Standard gratuitement.',
    'pricing.faq3.q':'Qu\'est-ce que le matching IA des candidats ?',
    'pricing.faq3.a':'Les offres sponsorisées utilisent GPT-4o pour classer les candidats par score de correspondance — description du poste vs. CV & compétences. Vous voyez les meilleurs candidats en premier.',
    'pricing.faq4.q':'Qu\'est-ce que le badge « Embauche urgente » ?',
    'pricing.faq4.a':'Les offres sponsorisées obtiennent un label « Embauche urgente » mis en évidence dans les résultats, augmentant le taux de clics pour les postes urgents de 2 à 3×.',
    'settings.account.title':'Paramètres du compte','settings.type':'Type de compte','settings.employer':'Employeur','settings.jobseeker':'Chercheur d\'emploi',
    'settings.change.type':'Changer de type de compte','settings.email':'Courriel','settings.change.email':'Changer de courriel',
    'settings.new.email':'Nouveau courriel','settings.cur.pw':'Mot de passe actuel','settings.save.email':'Enregistrer le nouveau courriel','settings.cancel':'Annuler',
    'settings.name':'Nom','settings.edit.profile':'Modifier le profil','settings.member.since':'Membre depuis',
    'settings.close.account':'Fermer mon compte','settings.close.desc':'Cela supprimera définitivement votre compte et toutes les données associées.',
    'settings.security.title':'Paramètres de sécurité','settings.password':'Mot de passe','settings.last.changed':'Dernier changement : inconnu',
    'settings.change.pw':'Changer le mot de passe','settings.new.pw':'Nouveau mot de passe','settings.chars':'8+ caractères',
    'settings.confirm.pw':'Confirmer le nouveau mot de passe','settings.repeat.pw':'Répéter le nouveau mot de passe','settings.save.pw':'Enregistrer le nouveau mot de passe',
    'settings.passkey':'Clé d\'accès','settings.passkey.val':'Non configuré — connexion sans mot de passe (bientôt disponible)',
    'settings.create.passkey':'Créer une clé d\'accès','settings.sessions':'Sessions actives','settings.sessions.val':'1 session active (cet appareil)',
    'settings.signout.all':'Déconnecter tout','settings.notif.title':'Paramètres de communication',
    'settings.job.alerts':'Alertes emploi','settings.job.alerts.val':'Recevoir des courriels lorsque de nouvelles offres correspondent à votre profil',
    'settings.app.updates':'Mises à jour des candidatures','settings.app.updates.val':'Courriels lorsque les employeurs mettent à jour le statut de votre candidature',
    'settings.news':'Actualités Nexhire','settings.news.val':'Mises à jour du produit, nouvelles fonctions, conseils',
    'settings.lang':'Langue de la plateforme','settings.lang.val.en':'Actuellement : English','settings.lang.val.fr':'Actuellement : Français',
    'settings.privacy.title':'Paramètres de confidentialité','settings.profile.vis':'Visibilité du profil',
    'settings.profile.vis.val':'Les employeurs peuvent trouver votre profil lorsque vous postulez',
    'settings.anon.rev':'Avis anonymes','settings.anon.rev.val':'Votre nom n\'apparaît jamais sur les avis d\'entreprise',
    'settings.ai.match':'Matching IA','settings.ai.match.val':'Utiliser votre profil et activité pour suggérer des offres pertinentes',
    'settings.your.data':'Vos données','settings.your.data.val':'Demander une copie ou la suppression de vos données personnelles',
    'settings.privacy.link':'Lire notre Centre de confidentialité complet →',
    'dash.empty.apps':'Aucune candidature pour l\'instant.<br>Parcourez les offres et commencez à postuler !',
    'dash.empty.browse':'Parcourir les offres','dash.empty.saved':'Aucune offre sauvegardée.<br>Cliquez sur le ♥ pour en sauvegarder une.',
    'dash.empty.skills':'Ajoutez des compétences à votre profil pour obtenir des recommandations.',
    'dash.empty.nomatch':'Aucune correspondance pour l\'instant — plus d\'offres arrivent !',
    'dash.empty.jobs':'Aucune offre publiée pour l\'instant.',
    'jobs.noresult':'Aucune offre trouvée. Essayez d\'autres filtres.','jobs.noresult.short':'0 résultat',
    'jobs.clear':'Effacer les filtres','jobs.new':'Nouveau',
    'status.applied':'Candidaté','status.reviewed':'Examiné','status.shortlisted':'Présélectionné',
    'status.interview':'Entretien','status.offer':'Offre','status.rejected':'Non retenu','status.withdrawn':'Retiré',
    'cta.title':"Recrutez les meilleurs talents à l'échelle mondiale",
    'cta.desc':'Publiez des offres, examinez les candidatures classées par IA, gérez votre pipeline Kanban et contactez directement les candidats. Commencez avec 2 à 5 postes gratuits.',
    'cta.btn':'Commencer gratuitement','cta.trial':'Essai gratuit','cta.apps':'Candidatures','cta.ats':'Pipeline ATS',
    'jobs.title':"Offres d'emploi",'jobs.filter.ph':'Titre, compétence, entreprise...',
    'jobs.filter.modes.all':'Tous les modes','jobs.filter.types.all':'Tous les types',
    'jobs.filter.types.ft':'Temps plein','jobs.filter.types.perm':'Permanent','jobs.filter.types.pt':'Temps partiel',
    'jobs.filter.types.contract':'Contrat','jobs.filter.types.temp':'Temporaire','jobs.filter.types.casual':'Occasionnel',
    'jobs.filter.pay.all':'Tous les salaires',
    'jobs.filter.dates.all':'Toutes les dates','jobs.filter.dates.unseen':'Offres non consultées',
    'jobs.filter.dates.1d':'Dernières 24 h','jobs.filter.dates.3d':'Derniers 3 jours',
    'jobs.filter.dates.7d':'Derniers 7 jours','jobs.filter.dates.14d':'Derniers 14 jours',
    'jobs.search.btn':'Rechercher',
    'jobs.filter.lang':"Langue de l'offre",
    'emp.eyebrow':'Pour les employeurs','emp.title':'Recrutez mondialement avec <em>précision IA</em>',
    'emp.sub':'Publiez des offres, recevez des candidats classés par IA, gérez votre pipeline Kanban et construisez votre équipe mondiale — tout en un.',
    'emp.cta':'Commencer gratuitement — 2-5 postes','emp.pricing':'Voir les tarifs',
    'emp.f1.title':'Publiez en quelques minutes','emp.f1.desc':"Créez des offres bilingues avec des descriptions assistées par IA. Mise en ligne en moins de 5 minutes.",
    'emp.f2.title':'Classement IA des candidats','emp.f2.desc':'Chaque candidature reçoit un score de correspondance IA pour que vous vous concentriez sur les meilleurs candidats en premier.',
    'emp.f3.title':'Pipeline ATS Kanban','emp.f3.desc':'Pipeline visuel : Nouveau → Examiné → Présélectionné → Entretien → Offre. Déplacez les candidats en un clic.',
    'emp.f4.title':'Analytique des offres','emp.f4.desc':'Suivez les vues, candidatures et taux de conversion par offre. Identifiez vos meilleures annonces.',
    'emp.cta.short':'Commencer',
    'emp.f1.label':'PUBLIEZ VITE','emp.f2.label':'CLASSEMENT IA','emp.f3.label':'PIPELINE ATS','emp.f4.label':'ANALYTIQUE',
    'emp.feat.eyebrow':'Fonctionnalités','emp.feat.title':'Tout ce qu\'il vous faut pour recruter intelligemment','emp.feat.sub':'Une seule plateforme. De la publication à la lettre d\'offre.',
    'emp.f1.c1':'Description générée par IA en FR & EN','emp.f1.c2':'Recommandations de fourchettes salariales','emp.f1.c3':'Publication en un clic sur le réseau Nexhire',
    'emp.f2.c1':'Compétences, expérience & alignement salarial','emp.f2.c2':'Badges de compétences vérifiés améliorent le classement','emp.f2.c3':'Triés automatiquement par % de correspondance',
    'emp.f3.c1':'Glisser-déposer entre les étapes','emp.f3.c2':'Notes internes & commentaires par candidat','emp.f3.c3':'Notifications automatiques lors d\'un changement de statut',
    'emp.f4.c1':'Vues, clics et taux de candidature par offre','emp.f4.c2':'Tendances quotidiennes sur 30 jours','emp.f4.c3':'Comparez les performances entre les annonces',
    'emp.feat.cta.title':'Prêt à recruter plus intelligemment ?','emp.feat.cta.sub':'2 à 5 postes gratuits. Aucune carte de crédit requise.',
    'emp.mock.newjob':'Nouvelle offre d\'emploi','emp.mock.jobtitle':'Titre du poste','emp.mock.desc':'Description','emp.mock.aigen':'Générer avec l\'IA',
    'emp.mock.salary':'Salaire','emp.mock.publish':'Publier','emp.mock.applicants':'Candidats — Dev React Senior',
    'emp.mock.pipeline':'Pipeline de recrutement','emp.mock.analytics':'Analytique — 30 derniers jours',
    'emp.mock.views':'Vues','emp.mock.apps':'Candidatures','emp.mock.conv':'Taux conv.','emp.mock.resp':'Rép. moy.',
    'emp.k.new':'Nouveau','emp.k.reviewed':'Examiné','emp.k.short':'Présélectionné','emp.k.offer':'Offre',
    'cand.role':'Candidat','cand.nav.profile':'Mon profil','cand.nav.foryou':'Emplois pour vous',
    'cand.nav.saved':'Offres sauvegardées','cand.nav.apps':'Candidatures','cand.nav.reviews':'Mes avis','cand.nav.alerts':'Alertes emploi','cand.nav.ai':'Coach IA',
    'cand.nav.messages':'Messages',
    'cand.nav.score':'Score profil','cand.nav.skills':'Tests de compétences','cand.nav.referrals':'Référencement','cand.nav.salary':'Données salariales','cand.nav.credits':'Crédits IA',
    'cand.tab.profile':'Mon profil','cand.tab.foryou':'Emplois pour vous','cand.tab.saved':'Offres sauvegardées','cand.tab.apps':'Mes candidatures',
    'cand.ai.title':'Agent Carrière IA','cand.ai.sub':"Posez n'importe quelle question — conseils CV, préparation entretien, négociation salariale, orientation carrière.",
    'cand.ai.online':'En ligne · Prêt à vous aider',
    'cand.ai.greeting':"Bonjour ! Je suis votre Agent Carrière IA Nexhire. Comment puis-je accélérer votre carrière aujourd'hui ?",'cand.ai.ph':"Posez-moi une question...",
    'agent.qa.jobs':'Emplois correspondants','agent.qa.profile':'Optimiser le profil',
    'agent.qa.interview':'Préparation entrevue','agent.qa.salary':'Conseils salaire',
    'emp.role':'Employeur','emp.nav.jobs':'Mes offres','emp.nav.post':'Publier une offre','emp.nav.company':'Entreprise','emp.nav.team':"Équipe",'emp.nav.analytics':'Analytique','emp.nav.billing':'Facturation','emp.nav.messages':'Messages',
    'emp.tab.jobs':"Mes offres d'emploi",'emp.tab.post':'Publier une nouvelle offre','emp.tab.company':"Profil d'entreprise",'emp.tab.team':"Mon équipe",'emp.tab.billing':'Facturation & Plan',
    'team.invite.title':'Inviter un membre','team.invite.ph':'collègue@entreprise.com','team.invite.btn':'Envoyer l\'invitation',
    'team.role.recruiter':'Recruteur','team.role.admin':'Administrateur',
    'team.status.active':'Actif','team.status.pending':'Invitation en attente',
    'team.empty':"Aucun membre pour l'instant. Invitez un collègue pour gérer le recrutement ensemble.",
    'team.remove':'Retirer','team.resend':'Renvoyer',
    'settings.title':'Paramètres',
    'settings.account.label':'Paramètres du compte','settings.account.sub':'Vos coordonnées',
    'settings.security.label':'Paramètres de sécurité','settings.security.sub':'Gérez la sécurité de votre compte',
    'settings.notif.label':'Communications','settings.notif.sub':'Gérez vos notifications et messages',
    'settings.privacy.label':'Confidentialité','settings.privacy.sub':'Informations sur votre vie privée',
    'help.title':"Si vous cherchez de l'aide, vous êtes au bon endroit",
    'help.seekers.title':'Aide pour les chercheurs d\'emploi',
    'help.seekers.desc':"Une question ou besoin d'aide avec Nexhire ? Que ce soit pour créer votre compte, utiliser le matching IA ou postuler — nous sommes là.",
    'help.seekers.link':"Centre d'aide candidats →",
    'help.employers.title':'Aide pour les employeurs',
    'help.employers.desc':"Vous cherchez à embaucher ? Notre centre d'aide employeurs couvre la publication d'offres, la gestion du pipeline ATS, la facturation et la recherche des meilleurs candidats.",
    'help.employers.link':"Centre d'aide employeurs →",
    'help.cta.title':'Nous sommes là pour vous aider','help.cta.desc':"Consultez notre centre d'aide ou contactez-nous directement.",
    'help.contact':'Contacter le support','help.legal':'Juridique / Confidentialité',
    'footer.tagline':"Plateforme d'emploi IA mondiale",'footer.platform':'Plateforme',
    'footer.browse':'Parcourir les offres','footer.employers':'Pour les employeurs','footer.pricing':'Tarifs','footer.getstarted':'Commencer gratuitement',
    'footer.company':'Entreprise','footer.help':"Centre d'aide",'footer.privacy':'Confidentialité','footer.terms':"Conditions d'utilisation",'footer.contact':'Contact',
    'footer.copy':'© 2026 CivicAI Inc. Tous droits réservés.',
    'footer.privacy.sm':'Confidentialité','footer.terms.sm':'Conditions','footer.legal.sm':'Juridique','footer.made':'🍁 Fait au Québec · CivicAI 2026',
    'modal.apply.cover':'Lettre de motivation','modal.apply.cover.opt':'(optionnel mais recommandé)',
    'modal.apply.ai.title':'Analyse de contenu IA',
    'modal.apply.ai.desc':"Nexhire peut détecter le contenu généré par IA dans votre lettre de motivation. Souhaitez-vous permettre à l'employeur de voir cette analyse ?",
    'modal.apply.yes':"Oui, partager l'analyse",'modal.apply.no':'Non merci',
    'modal.apply.submit':'Soumettre ma candidature','modal.apply.note':"Votre profil sera partagé avec l'employeur",
    'modal.apply.ph':"Expliquez brièvement pourquoi vous êtes le candidat idéal pour ce poste...",
    'modal.login.title':'Connexion à Nexhire','modal.login.email':'Courriel','modal.login.pw':'Mot de passe',
    'modal.login.btn':'Connexion','modal.login.create':'Créer un compte','modal.login.forgot':'Mot de passe oublié ?',
    'modal.reg.title':'Créer votre compte','modal.reg.candidate':'Candidat','modal.reg.employer':'Employeur',
    'modal.reg.first':'Prénom','modal.reg.last':'Nom de famille','modal.reg.email':'Courriel','modal.reg.pw':'Mot de passe',
    'modal.reg.company':"Nom de l'entreprise",'modal.reg.btn':'Créer le compte',
    'modal.reg.terms':'En créant un compte vous acceptez nos','modal.reg.terms.link':"Conditions d'utilisation",
    'modal.rev.rating':'Note globale *','modal.rev.title.label':'Titre de l\'avis',
    'modal.rev.pros':'Points positifs','modal.rev.cons':'Points à améliorer','modal.rev.diff':"Difficulté de l'entretien",
    'modal.rev.recommend':'Recommanderait','modal.rev.anon':'Publier anonymement','modal.rev.submit':"Soumettre l'avis",
    'kanban.close':'Fermer',
  }
};
function setLangUI(lang) {
  document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');
  document.getElementById('btn-fr')?.classList.toggle('active', lang === 'fr');
  document.documentElement.lang = lang;
  const t = T[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t[el.dataset.i18n]; if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t[el.dataset.i18nHtml]; if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t[el.dataset.i18nPh]; if (v !== undefined) el.placeholder = v;
  });
  safeRebuildSelect('mode-filter', [
    ['', t['hero.mode.all']], ['remote', t['hero.mode.remote']],
    ['hybrid', t['hero.mode.hybrid']], ['onsite', t['hero.mode.onsite']]
  ]);
  safeRebuildSelect('fwork', [
    ['', t['jobs.filter.modes.all']], ['remote', t['hero.mode.remote']],
    ['hybrid', t['hero.mode.hybrid']], ['onsite', t['hero.mode.onsite']]
  ]);
  safeRebuildSelect('ftype', [
    ['', t['jobs.filter.types.all']], ['full-time', t['jobs.filter.types.ft']],
    ['permanent', t['jobs.filter.types.perm']], ['part-time', t['jobs.filter.types.pt']],
    ['contract', t['jobs.filter.types.contract']], ['temporary', t['jobs.filter.types.temp']],
    ['casual', t['jobs.filter.types.casual']]
  ]);
  safeRebuildSelect('fsal', [
    ['', t['jobs.filter.pay.all']], ['40000', '$40,000+'], ['60000', '$60,000+'],
    ['80000', '$80,000+'], ['100000', '$100,000+'], ['120000', '$120,000+']
  ]);
  safeRebuildSelect('fdate', [
    ['', t['jobs.filter.dates.all']], ['unseen', t['jobs.filter.dates.unseen']],
    ['1', t['jobs.filter.dates.1d']], ['3', t['jobs.filter.dates.3d']],
    ['7', t['jobs.filter.dates.7d']], ['14', t['jobs.filter.dates.14d']]
  ]);
  safeRebuildSelect('flang', [
    ['', t['jobs.filter.lang']], ['en', 'English'], ['fr', 'Français']
  ]);
}
function safeRebuildSelect(id, options) {
  const el = document.getElementById(id); if (!el) return;
  const cur = el.value;
  el.innerHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  el.value = cur;
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
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (d.success && d.unread > 0) {
    badge.textContent = d.unread > 9 ? '9+' : d.unread;
    badge.style.display = 'flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
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
async function loadFeaturedJobs(province = '') {
  const qs = province ? `featured=true&limit=6&province=${encodeURIComponent(province)}` : 'featured=true&limit=6';
  const d = await api('GET', `${BASE}/api/jobs?${qs}`);
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
  return `<div class="job-card${j.featured ? ' featured' : ''}${demo ? '' : ' js-job-card'}" ${demo ? '' : `data-job-id="${j.id}"`} style="cursor:${demo ? 'default' : 'pointer'}">
    ${j.featured ? '<div class="job-featured-badge">⭐ Featured</div>' : ''}
    ${!demo ? `<button class="save-btn${isSaved ? ' saved' : ''} js-save-btn" data-save-id="${j.id}" title="Save job"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>` : ''}
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
}
function syncHeroProvince() {
  const v = document.getElementById('hero-province')?.value;
  const fprov = document.getElementById('fprov');
  if (fprov && v !== undefined) fprov.value = v;
  loadFeaturedJobs(v || '');
}

function initLocationSelects() {
  const heroSel = document.getElementById('hero-province');
  const fprov = document.getElementById('fprov');
  const opts = buildLocationOptions();
  if (heroSel) heroSel.innerHTML = opts;
  if (fprov) fprov.innerHTML = opts;
}
function quickSearch(q) {
  const heroInput = document.getElementById('q');
  const jobsInput = document.getElementById('fq');
  if (heroInput) heroInput.value = q;
  if (jobsInput) jobsInput.value = q;
  searchJobs();
}

async function loadJobs() {
  // Pre-fill salary filter from candidate profile (only if filter not already set by user)
  const fsalEl = document.getElementById('fsal');
  if (fsalEl && !fsalEl.value && state.user?.role === 'candidate' && state.candidateProfile?.desired_salary_min) {
    const min = state.candidateProfile.desired_salary_min;
    const options = [120000, 100000, 80000, 60000, 40000];
    const match = options.find(o => min >= o);
    if (match) fsalEl.value = String(match);
  }
  await filterJobs();
}

// ── Viewed jobs tracking ───────────────────────────────────
const VIEWED_KEY = 'nh_viewed_jobs';
function markJobViewed(id) {
  try {
    const s = new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]'));
    s.add(id);
    // Keep only last 500 to avoid bloat
    const arr = [...s].slice(-500);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(arr));
  } catch {}
}
function getViewedJobIds() {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]')); } catch { return new Set(); }
}

async function filterJobs(page = 1) {
  state.currentPage = page;
  const q = document.getElementById('fq')?.value || document.getElementById('q')?.value || '';
  const work_mode = document.getElementById('fwork')?.value || document.getElementById('mode-filter')?.value || '';
  const job_type = document.getElementById('ftype')?.value || '';
  const sal_min = document.getElementById('fsal')?.value || '';
  const locVal = document.getElementById('fprov')?.value || '';
  const fdate = document.getElementById('fdate')?.value || '';
  const flang = document.getElementById('flang')?.value || '';
  const fsort = document.getElementById('fsort')?.value || '';
  const isUnseenFilter = fdate === 'unseen';

  const params = new URLSearchParams({ page, limit: isUnseenFilter ? 50 : 15 });
  if (q) params.set('q', q);
  if (work_mode) params.set('work_mode', work_mode);
  if (job_type) params.set('job_type', job_type);
  if (sal_min) params.set('salary_min', sal_min);
  // Location: province code, "REMOTE", or "c:CountryName"
  if (locVal === 'REMOTE') { params.set('work_mode', 'remote'); }
  else if (locVal.startsWith('c:')) { params.set('country', locVal.slice(2)); }
  else if (locVal) { params.set('province', locVal); }
  if (fdate && !isUnseenFilter) params.set('days_ago', fdate);
  if (flang) params.set('lang_filter', flang);
  if (fsort) params.set('sort', fsort);

  const list = document.getElementById('jobs-list');
  if (list) list.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;

  const d = await api('GET', `${BASE}/api/jobs?${params}`);
  if (!list) return;
  let jobs = d.jobs || [];

  // Client-side filter: "Jobs you haven't seen"
  if (isUnseenFilter) {
    const viewed = getViewedJobIds();
    jobs = jobs.filter(j => !viewed.has(j.id));
  }

  // ── Results bar ────────────────────────────────────────────
  const resultsBar = document.getElementById('jobs-results-bar');
  const countLabel = document.getElementById('jobs-count-label');
  const clearBtn = document.getElementById('jobs-clear-btn');
  const hasActiveFilters = !!(q || work_mode || job_type || sal_min || locVal || fdate || flang || (fsort && fsort !== ''));
  if (resultsBar) resultsBar.style.display = 'flex';
  if (clearBtn) clearBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';

  if (!jobs.length) {
    const t = T[state.lang];
    if (countLabel) countLabel.textContent = t['jobs.noresult.short'] || '0 résultats';
    list.innerHTML = `<div class="empty-state"><i class="ti ti-search-off"></i><p>${t['jobs.noresult']}</p>${hasActiveFilters ? `<button class="btn-ghost" onclick="clearFilters()" style="margin-top:12px;font-size:13px"><i class="ti ti-x"></i> ${t['jobs.clear']}</button>` : ''}</div>`;
    return;
  }

  const total = d.total || jobs.length;
  if (countLabel) {
    const t = T[state.lang];
    countLabel.textContent = state.lang === 'fr'
      ? `${total.toLocaleString('fr-CA')} offre${total > 1 ? 's' : ''} trouvée${total > 1 ? 's' : ''}`
      : `${total.toLocaleString('en-CA')} job${total !== 1 ? 's' : ''} found`;
  }

  list.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const color = companyColor(j.company_name);
    const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
    const isSaved = state.savedJobIds.has(j.id);
    const timeAgo = daysAgo(j.published_at);
    const isNew = j.published_at && (Date.now() - new Date(j.published_at).getTime()) < 48 * 3600 * 1000;
    const newBadge = isNew ? `<span class="job-new-badge">${state.lang === 'fr' ? 'Nouveau' : 'New'}</span>` : '';
    return `<div class="job-list-item js-job-card" data-job-id="${j.id}" id="jli-${j.id}" style="cursor:pointer">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:44px;height:44px;border-radius:10px;flex-shrink:0;font-size:14px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <span style="font-family:var(--r);font-weight:600;color:var(--dark);font-size:15px">${esc(title)}</span>
          ${newBadge}
        </div>
        <div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(j.company_name || '')}${j.city || j.province ? ' · ' + (j.city ? esc(j.city) + (j.province ? ', <strong>'+esc(j.province)+'</strong>' : '') : esc(j.province||'')) : ''}</div>
        <div class="job-meta" style="margin-top:8px">
          <span class="job-tag ${j.work_mode || 'onsite'}">${j.work_mode || 'onsite'}</span>
          ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
          ${j.salary_min ? `<span class="job-tag salary-tag">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}</span>` : ''}
        </div>
        ${matchScoreBadge(j)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
        <button class="save-btn${isSaved ? ' saved' : ''} js-save-btn" data-save-id="${j.id}" title="Save"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>
        <span style="font-size:11px;color:var(--muted)">${timeAgo}</span>
      </div>
    </div>`;
  }).join('');

  const pages = d.pages || 1;
  const pgEl = document.getElementById('jobs-pagination');
  if (pgEl && pages > 1) {
    const t = T[state.lang];
    const pageInfo = `<span style="font-size:13px;color:var(--muted);margin:0 10px">${state.lang==='fr'?`Page ${page} sur ${pages}`:`Page ${page} of ${pages}`}</span>`;
    pgEl.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p =>
      `<button data-page="${p}" class="${p === page ? 'btn-primary' : 'btn-ghost'}" style="margin:0 3px;padding:6px 14px;font-size:13px">${p}</button>`
    ).join('') + (pages > 1 ? pageInfo : '');
  } else if (pgEl) pgEl.innerHTML = '';

  // Load Job Bank Canada section in parallel (only on first page)
  if (page === 1) triggerJobBankSection();
}

function clearFilters() {
  const ids = ['fq','fwork','ftype','fsal','fdate','flang','fsort'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const fprov = document.getElementById('fprov');
  if (fprov) fprov.value = '';
  filterJobs();
}

// ── Job Bank Canada section ─────────────────────────────────
let _jbTimer = null;
function triggerJobBankSection() {
  clearTimeout(_jbTimer);
  _jbTimer = setTimeout(() => {
    const q    = document.getElementById('fq')?.value || '';
    const prov = document.getElementById('fprov')?.value || '';
    loadJobBankSection(q, prov);
  }, 600);
}

async function loadJobBankSection(q = '', prov = '') {
  const section = document.getElementById('jobbank-section');
  const listEl  = document.getElementById('jobbank-list');
  const countEl = document.getElementById('jobbank-count');
  const titleEl = document.getElementById('jobbank-title');
  const discEl  = document.getElementById('jobbank-disclaimer');
  if (!section || !listEl) return;

  const isFr = state.lang === 'fr';

  // Don't show for remote/international filters — Job Bank is Canada-only
  const locVal = document.getElementById('fprov')?.value || '';
  if (locVal === 'REMOTE' || locVal.startsWith('c:')) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (titleEl) titleEl.textContent = isFr ? 'Offres supplémentaires via Adzuna 🌐' : 'More jobs via Adzuna 🌐';
  if (countEl) countEl.textContent = '';
  listEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;padding:16px 0"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> ${isFr ? 'Chargement depuis Adzuna...' : 'Loading from Adzuna...'}</div>`;

  const params = new URLSearchParams({ lang: state.lang });
  if (q) params.set('q', q);
  if (prov && prov !== 'REMOTE' && !prov.startsWith('c:')) params.set('prov', prov);

  const d = await api('GET', `${BASE}/api/jobbank/search?${params}`);
  const jobs = d.jobs || [];

  if (!jobs.length) {
    section.style.display = 'none';
    return;
  }

  if (countEl) countEl.textContent = isFr ? `${jobs.length} offre${jobs.length > 1 ? 's' : ''}` : `${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`;

  listEl.innerHTML = jobs.slice(0, 20).map(j => `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="width:44px;height:44px;border-radius:10px;flex-shrink:0;background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#555">
        ${(j.company || 'J').slice(0,2).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:15px;color:var(--dark)">${esc(j.title)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(j.company)}${j.location ? ' · ' + esc(j.location) : ''}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
          ${j.salary ? `<span class="job-tag salary-tag" style="font-size:11px">${esc(j.salary)}</span>` : ''}
          ${j.date ? `<span style="font-size:11px;color:var(--muted)">${esc(j.date)}</span>` : ''}
          <span style="font-size:10px;background:#e8f4fd;color:#1a5276;border-radius:4px;padding:2px 6px;font-weight:600">🌐 Adzuna</span>
        </div>
      </div>
      <a href="${j.url}" target="_blank" rel="noopener noreferrer"
         style="flex-shrink:0;background:var(--indigo);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px">
        <i class="ti ti-external-link" style="font-size:14px"></i> ${isFr ? 'Postuler' : 'Apply'}
      </a>
    </div>`).join('');

  if (discEl) discEl.innerHTML = isFr
    ? `Ces offres supplémentaires proviennent d'<a href="https://www.adzuna.ca" target="_blank" rel="noopener" style="color:var(--indigo)">Adzuna</a>, un agrégateur d'emploi canadien. Vous serez redirigé vers le site de l'employeur pour postuler.`
    : `These additional postings are sourced from <a href="https://www.adzuna.ca" target="_blank" rel="noopener" style="color:var(--indigo)">Adzuna</a>, a Canadian job aggregator. You'll be redirected to the employer's site to apply.`;
}

// ── Job detail panel ───────────────────────────────────────
async function openJobDetail(jobId) {
  // Navigate to jobs page first if not already there
  const jobsPage = document.getElementById('pg-jobs');
  if (!jobsPage?.classList.contains('active')) {
    goto('jobs');
    await new Promise(r => setTimeout(r, 200));
  }

  markJobViewed(jobId);
  const d = await api('GET', `${BASE}/api/jobs/by-id/${jobId}`);
  if (!d.success) return;
  const j = d.job;
  const panel = document.getElementById('job-detail-panel');
  if (!panel) return;

  // On narrow viewports: hide list, show panel full-width with back button
  const jobsList = document.getElementById('jobs-list');
  const isNarrow = window.innerWidth <= 900;
  if (isNarrow && jobsList) {
    jobsList.style.display = 'none';
    panel.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    panel.style.display = 'block';
  }

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
    ${isNarrow ? `<button data-action="close-job-detail" style="display:flex;margin-bottom:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;font-family:var(--b);padding:0;align-items:center;gap:6px"><i class="ti ti-arrow-left"></i> Back to jobs</button>` : ''}
    <div class="job-detail-header">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:56px;height:56px;border-radius:12px;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:56px;height:56px;border-radius:12px;font-size:18px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--muted);font-weight:500">${esc(j.company_name || '')}</div>
        ${j.company_website ? `<a href="${esc(j.company_website)}" target="_blank" style="font-size:12px;color:var(--indigo)">${esc(j.company_website)}</a>` : ''}
        ${stars ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">${stars}<span style="font-size:12px;color:var(--muted)">${avgRating.toFixed(1)} (${totalReviews} review${totalReviews !== 1 ? 's' : ''})</span></div>` : ''}
      </div>
      <button class="save-btn${isSaved ? ' saved' : ''} js-save-btn" data-save-id="${j.id}" style="padding:8px 10px;font-size:16px" title="Save job"><i class="ti ti-heart${isSaved ? '-filled' : ''}"></i></button>
    </div>
    <h2 style="font-family:var(--r);font-size:20px;font-weight:700;color:var(--dark);margin:12px 0 6px">${esc(title)}</h2>
    ${state.candidateProfile ? `<div style="margin-bottom:8px">${matchScoreBadge(j)}</div>` : ''}
    <div class="job-location-detail">${fmtLocationDetail(j)}</div>
    <div class="job-meta" style="margin-bottom:16px">
      ${j.job_type ? `<span class="job-tag">${j.job_type}</span>` : ''}
      ${j.salary_min ? `<span class="job-tag salary-tag">${fmtSalary(j.salary_min)}${j.salary_max ? '–'+fmtSalary(j.salary_max) : ''} ${j.salary_currency||'CAD'}${fmtPeriod(j.salary_period)}</span>` : ''}
      ${j.experience_years ? `<span class="job-tag"><i class="ti ti-briefcase" style="font-size:11px"></i>${j.experience_years} exp</span>` : ''}
    </div>
    ${skills.length ? `<div class="skills-chips" style="margin-bottom:16px">${skills.slice(0,10).map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="detail-apply-row">
      ${state.user?.role === 'candidate'
        ? state.appliedJobIds.has(j.id)
          ? `<button class="btn-primary" style="flex:1;opacity:.7;cursor:default;background:var(--green)" disabled><i class="ti ti-circle-check"></i> ${state.lang==='fr'?'Candidature envoyée':'Already Applied'}</button>`
          : `<button class="btn-primary" style="flex:1" data-apply-id="${j.id}" data-apply-title="${esc(title)}"><i class="ti ti-send"></i> Apply Now</button>`
        : !state.user ? `<button class="btn-primary" style="flex:1" data-modal="modal-login"><i class="ti ti-send"></i> Sign in to Apply</button>` : ''}
      <div class="job-stats-mini">
        <span><i class="ti ti-eye"></i>${j.views || 0}</span>
        <span><i class="ti ti-users"></i>${j.applications_count || 0}</span>
      </div>
    </div>
    <div class="job-section"><h4>About the role</h4><div class="job-desc">${esc(desc || '')}</div></div>
    ${req ? `<div class="job-section"><h4>Requirements</h4><div class="job-desc">${esc(req)}</div></div>` : ''}
    ${(j.benefits_en || j.benefits_fr) ? `<div class="job-section"><h4><i class="ti ti-gift" style="color:var(--green)"></i> Benefits & Perks</h4><div class="job-desc">${esc(state.lang==='fr'?(j.benefits_fr||j.benefits_en):(j.benefits_en||j.benefits_fr))}</div></div>` : ''}
    ${(j.company_desc_en || j.company_desc_fr) ? `<div class="job-section job-section-company"><h4><i class="ti ti-building"></i> About ${esc(j.company_name||'the company')}</h4><div class="job-desc">${esc(state.lang==='fr'?(j.company_desc_fr||j.company_desc_en):(j.company_desc_en||j.company_desc_fr))}</div>${j.company_website?`<a href="${esc(j.company_website)}" target="_blank" rel="noopener" class="btn-ghost" style="font-size:12px;margin-top:10px;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-external-link"></i>${esc(j.company_website)}</a>`:''}</div>` : ''}
    ${totalReviews ? `<div class="job-section"><h4><i class="ti ti-star"></i> Company Reviews</h4>${renderReviews(rev.reviews?.slice(0,3) || [])}</div>` : ''}
    ${state.user?.role === 'candidate' && j.company_id ? `<div style="margin-top:8px"><button class="btn-ghost" style="font-size:13px;width:100%" data-review-company-id="${j.company_id}" data-review-company-name="${esc(j.company_name || '')}"><i class="ti ti-pencil"></i> Write a review</button></div>` : ''}
  `;
}

function closeJobDetail() {
  const panel = document.getElementById('job-detail-panel');
  const jobsList = document.getElementById('jobs-list');
  if (panel) panel.style.display = 'none';
  if (jobsList) jobsList.style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  state.aiCvConsent = null;
  safeSet('quick-apply-title', jobTitle);
  document.getElementById('qa-cover').value = '';
  document.getElementById('qa-error').style.display = 'none';
  // Reset consent buttons
  ['qa-consent-yes','qa-consent-no'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.style.background = 'white'; btn.style.borderColor = '#c7d4f5'; btn.style.color = '#374151'; }
  });
  const note = document.getElementById('qa-consent-note');
  if (note) note.style.display = 'none';
  showModal('modal-quick-apply');
}

function setAiConsent(value) {
  state.aiCvConsent = value;
  const yesBtn = document.getElementById('qa-consent-yes');
  const noBtn = document.getElementById('qa-consent-no');
  const note = document.getElementById('qa-consent-note');
  if (value) {
    if (yesBtn) { yesBtn.style.background = '#ede9fe'; yesBtn.style.borderColor = '#6d28d9'; yesBtn.style.color = '#5b21b6'; }
    if (noBtn)  { noBtn.style.background = 'white'; noBtn.style.borderColor = '#c7d4f5'; noBtn.style.color = '#374151'; }
    if (note)   { note.textContent = '✓ The employer will see an AI probability score for your cover letter.'; note.style.display = 'block'; }
  } else {
    if (noBtn)  { noBtn.style.background = '#f3f4f6'; noBtn.style.borderColor = '#9ca3af'; noBtn.style.color = '#374151'; }
    if (yesBtn) { yesBtn.style.background = 'white'; yesBtn.style.borderColor = '#c7d4f5'; yesBtn.style.color = '#374151'; }
    if (note)   { note.textContent = '✓ No AI analysis will be shared with the employer.'; note.style.display = 'block'; }
  }
}

async function generateAiCoverLetter() {
  const isFr = state.lang === 'fr';
  const btn = document.getElementById('qa-ai-btn');
  btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> ${isFr ? 'Génération...' : 'Generating...'}`;
  const d = await api('POST', `${BASE}/api/candidates/ai/cover-letter`, { job_id: state.currentJobForApply, lang: state.lang });
  if (d.success) {
    document.getElementById('qa-cover').value = d.cover_letter;
    toast(isFr ? '✅ Lettre générée — 1 crédit IA utilisé' : '✅ Letter generated — 1 AI credit used', 'success');
  } else if (d.error === 'no_credits') {
    showNoCreditsBanner();
  } else {
    toast(d.error || (isFr ? 'IA indisponible' : 'AI unavailable'), 'error');
  }
  btn.disabled = false; btn.innerHTML = `<i class="ti ti-robot"></i> ${isFr ? 'Générer avec IA' : 'AI generate'}`;
}

function showNoCreditsBanner() {
  const isFr = state.lang === 'fr';
  const existing = document.getElementById('no-credits-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'no-credits-banner';
  banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6366F1,#8b5cf6);color:#fff;border-radius:16px;padding:20px 28px;display:flex;align-items:center;gap:16px;z-index:9999;box-shadow:0 8px 32px rgba(99,102,241,.4);max-width:480px;width:calc(100% - 48px)';
  banner.innerHTML = `
    <i class="ti ti-coin" style="font-size:28px;flex-shrink:0"></i>
    <div style="flex:1">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px">${isFr ? 'Plus de crédits IA' : 'No AI credits left'}</div>
      <div style="font-size:13px;opacity:.85">${isFr ? 'Achetez des crédits pour continuer à utiliser les fonctionnalités IA.' : 'Buy credits to keep using AI-powered features.'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
      <button onclick="document.getElementById('no-credits-banner').remove();showCandTab('tab-credits',null)" style="background:#fff;color:#6366F1;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">${isFr ? 'Acheter des crédits' : 'Buy Credits'}</button>
      <button onclick="document.getElementById('no-credits-banner').remove()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:12px;cursor:pointer">${isFr ? 'Plus tard' : 'Later'}</button>
    </div>`;
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 8000);
}

async function submitQuickApply() {
  const cover_letter = document.getElementById('qa-cover')?.value.trim();
  const errEl = document.getElementById('qa-error');
  errEl.style.display = 'none';

  const payload = {
    job_id: state.currentJobForApply,
    cover_letter,
    ai_cv_consent: state.aiCvConsent === true,
  };

  const submitBtn = document.querySelector('#modal-quick-apply .btn-primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Submitting...'; }

  const d = await api('POST', `${BASE}/api/applications`, payload);

  if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ti ti-send"></i> Submit application'; }

  if (d.success) {
    hideModal('modal-quick-apply');
    toast(state.lang === 'fr' ? 'Candidature envoyée !' : 'Application submitted!', 'success');
    // Mark as applied immediately — button updates on next render
    state.appliedJobIds.add(state.currentJobForApply);
    // Swap the Apply button live in the detail panel
    const applyBtn = document.querySelector(`[data-apply-id="${state.currentJobForApply}"]`);
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.style.opacity = '0.7';
      applyBtn.style.cursor = 'default';
      applyBtn.style.background = 'var(--green)';
      applyBtn.innerHTML = `<i class="ti ti-circle-check"></i> ${state.lang === 'fr' ? 'Candidature envoyée' : 'Already Applied'}`;
      applyBtn.removeAttribute('data-apply-id');
    }
    if (state.user?.role === 'candidate') loadMyApplications();
  } else {
    errEl.textContent = d.error === 'Already applied to this job'
      ? (state.lang === 'fr' ? 'Vous avez déjà postulé à cette offre.' : 'You already applied to this job.')
      : (d.error || 'Could not apply');
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
  const navAv = document.getElementById('nav-avatar');
  if (navAv) {
    if (u.avatar_url) {
      navAv.innerHTML = `<img src="${esc(u.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
      navAv.style.padding = '0';
    } else {
      navAv.textContent = initials;
      navAv.style.padding = '';
    }
  }
  const emailEl = document.getElementById('dropdown-email');
  if (emailEl) emailEl.textContent = state.user.email || '';
  const ddEmp = document.getElementById('dd-employer');
  if (ddEmp) ddEmp.style.display = state.user.company_id ? 'flex' : 'none';
  // Always hide admin-only tabs for non-admin users
  const isAdmin = u.role === 'admin';
  const adminNav = document.getElementById('nav-admin-tests');
  if (adminNav) adminNav.style.display = isAdmin ? '' : 'none';
  const modNav = document.getElementById('nav-admin-moderation');
  if (modNav) modNav.style.display = isAdmin ? '' : 'none';
}
function showGuestNav() {
  document.getElementById('nav-auth-guest').style.display = 'flex';
  document.getElementById('nav-auth-user').style.display = 'none';
}
function toggleUserMenu() { document.getElementById('user-dropdown').classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.user-menu')) document.getElementById('user-dropdown')?.classList.remove('open'); });

// ── Scroll Reveal ────────────────────────────────────────────
(function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  function observeAll() {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
      if (!el.classList.contains('visible')) observer.observe(el);
    });
  }

  observeAll();
  // Re-run after page navigation (SPA goto)
  const _origGoto = window.goto;
  window.goto = function(page) {
    _origGoto && _origGoto(page);
    requestAnimationFrame(() => requestAnimationFrame(observeAll));
  };
})();

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!email || !pw) { showErr(errEl, 'Please fill all fields'); return; }
  const d = await api('POST', `${BASE}/api/auth/login`, { email, password: pw });
  if (d.success) {
    state.user = d.user; state.lang = d.user.preferred_lang || state.lang;
    setLangUI(state.lang); hideModal('modal-login'); showUserNav(); startSSE();
    toast(`Welcome back, ${d.user.first_name}!`, 'success');
    loadVerifiedSkills();
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
    state.user = d.user; hideModal('modal-register'); showUserNav(); startSSE();
    toast(`Welcome to Nexhire, ${d.user.first_name}!`, 'success');
    loadVerifiedSkills();
    // Apply referral code if present
    const refCode = sessionStorage.getItem('nh_ref_code');
    if (refCode) {
      sessionStorage.removeItem('nh_ref_code');
      api('POST', `${BASE}/api/referrals/register`, { referee_id: d.user.id, ref_code: refCode }).catch(() => {});
    }
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

  const t = T[state.lang];
  if (section === 's-account') {
    content.innerHTML = `
      <h2 class="settings-section-title">${t['settings.account.title']}</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.type']}</div><div class="settings-row-value">${u.role === 'employer' ? t['settings.employer'] : t['settings.jobseeker']}</div></div>
          <button class="btn-ghost btn-sm">${t['settings.change.type']}</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.email']}</div><div class="settings-row-value">${esc(u.email||'')}</div></div>
          <button class="btn-ghost btn-sm" onclick="openChangeEmail()">${t['settings.change.email']}</button>
        </div>
        <div class="settings-row" id="change-email-form" style="display:none">
          <div style="flex:1">
            <div class="form-group"><label>${t['settings.new.email']}</label><input type="email" id="new-email" placeholder="new@example.com"></div>
            <div class="form-group"><label>${t['settings.cur.pw']}</label><input type="password" id="change-email-pw" placeholder="••••••••"></div>
            <div class="form-error" id="change-email-error"></div>
            <button class="btn-primary btn-sm" onclick="saveEmailChange()">${t['settings.save.email']}</button>
            <button class="btn-ghost btn-sm" onclick="document.getElementById('change-email-form').style.display='none'" style="margin-left:8px">${t['settings.cancel']}</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.name']}</div><div class="settings-row-value">${esc(u.first_name||'')} ${esc(u.last_name||'')}</div></div>
          <button class="btn-ghost btn-sm" onclick="goto('candidate-dash')">${t['settings.edit.profile']}</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.member.since']}</div><div class="settings-row-value">${u.created_at ? new Date(u.created_at).toLocaleDateString(state.lang === 'fr' ? 'fr-CA' : 'en-CA',{year:'numeric',month:'long'}) : '—'}</div></div>
          <span></span>
        </div>
      </div>
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border)">
        <button class="btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="confirmCloseAccount()">
          <i class="ti ti-trash"></i> ${t['settings.close.account']}
        </button>
        <p style="font-size:12px;color:var(--muted);margin-top:8px">${t['settings.close.desc']}</p>
      </div>
    `;
  } else if (section === 's-security') {
    content.innerHTML = `
      <h2 class="settings-section-title">${t['settings.security.title']}</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.password']}</div><div class="settings-row-value">${t['settings.last.changed']}</div></div>
          <button class="btn-ghost btn-sm" onclick="openChangePassword()">${t['settings.change.pw']}</button>
        </div>
        <div class="settings-row" id="change-pw-form" style="display:none">
          <div style="flex:1">
            <div class="form-group"><label>${t['settings.cur.pw']}</label><input type="password" id="cur-pw" placeholder="${t['settings.cur.pw']}"></div>
            <div class="form-group"><label>${t['settings.new.pw']}</label><input type="password" id="new-pw" placeholder="${t['settings.chars']}"></div>
            <div class="form-group"><label>${t['settings.confirm.pw']}</label><input type="password" id="confirm-pw" placeholder="${t['settings.repeat.pw']}"></div>
            <div class="form-error" id="change-pw-error"></div>
            <button class="btn-primary btn-sm" onclick="savePasswordChange()">${t['settings.save.pw']}</button>
            <button class="btn-ghost btn-sm" onclick="document.getElementById('change-pw-form').style.display='none'" style="margin-left:8px">${t['settings.cancel']}</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.passkey']}</div><div class="settings-row-value settings-muted">${t['settings.passkey.val']}</div></div>
          <button class="btn-ghost btn-sm" disabled style="opacity:.5">${t['settings.create.passkey']}</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.sessions']}</div><div class="settings-row-value settings-muted">${t['settings.sessions.val']}</div></div>
          <button class="btn-ghost btn-sm" onclick="logout()">${t['settings.signout.all']}</button>
        </div>
      </div>
    `;
  } else if (section === 's-notifications') {
    content.innerHTML = `
      <h2 class="settings-section-title">${t['settings.notif.title']}</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.job.alerts']}</div><div class="settings-row-value settings-muted">${t['settings.job.alerts.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-jobs" checked onchange="saveNotifPref('job_alerts',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.app.updates']}</div><div class="settings-row-value settings-muted">${t['settings.app.updates.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-apps" checked onchange="saveNotifPref('app_updates',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.news']}</div><div class="settings-row-value settings-muted">${t['settings.news.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" id="notif-news" onchange="saveNotifPref('news',this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.lang']}</div><div class="settings-row-value">${state.lang === 'fr' ? t['settings.lang.val.fr'] : t['settings.lang.val.en']}</div></div>
          <div style="display:flex;gap:8px"><button class="btn-ghost btn-sm ${state.lang==='en'?'btn-active':''}" onclick="setLang('en')">EN</button><button class="btn-ghost btn-sm ${state.lang==='fr'?'btn-active':''}" onclick="setLang('fr')">FR</button></div>
        </div>
      </div>
    `;
  } else if (section === 's-privacy') {
    content.innerHTML = `
      <h2 class="settings-section-title">${t['settings.privacy.title']}</h2>
      <div class="settings-rows">
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.profile.vis']}</div><div class="settings-row-value settings-muted">${t['settings.profile.vis.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.anon.rev']}</div><div class="settings-row-value settings-muted">${t['settings.anon.rev.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.ai.match']}</div><div class="settings-row-value settings-muted">${t['settings.ai.match.val']}</div></div>
          <label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">${t['settings.your.data']}</div><div class="settings-row-value settings-muted">${t['settings.your.data.val']}</div></div>
          <div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="toast('${state.lang==='fr'?'Export de données bientôt disponible':'Data export coming soon'}','info')"><i class="ti ti-download"></i> Export</button><button class="btn-ghost btn-sm" style="color:var(--red)" onclick="confirmCloseAccount()"><i class="ti ti-trash"></i> Delete</button></div>
        </div>
      </div>
      <div style="margin-top:24px"><a class="help-link" onclick="goto('privacy')">${t['settings.privacy.link']}</a></div>
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
  const candidateFaqsEn = [
    { q: 'How do I create an account?', a: 'Click "Get started" in the top right corner and select "Candidate". Fill in your details and you\'re done.' },
    { q: 'How does AI job matching work?', a: 'Our AI analyzes your profile skills, experience, and preferences to recommend the most relevant jobs. Complete your profile for better matches.' },
    { q: 'How do I apply for a job?', a: 'Click on any job, then "Apply Now". You can write a custom cover letter or generate one with AI in seconds.' },
    { q: 'Can I save jobs to review later?', a: 'Yes — click the ❤️ heart icon on any job card to save it. Find all saved jobs in your dashboard under "Saved Jobs".' },
    { q: 'How do I delete my account?', a: 'Go to Settings → Account settings → "Close my account". This permanently deletes all your data.' },
  ];
  const candidateFaqsFr = [
    { q: 'Comment créer un compte ?', a: 'Cliquez sur « Commencer » en haut à droite et sélectionnez « Candidat ». Remplissez vos informations et c\'est fait.' },
    { q: 'Comment fonctionne le matching IA ?', a: 'Notre IA analyse vos compétences, expériences et préférences pour vous recommander les offres les plus pertinentes. Complétez votre profil pour de meilleurs résultats.' },
    { q: 'Comment postuler à une offre ?', a: 'Cliquez sur une offre, puis sur « Postuler ». Vous pouvez rédiger une lettre de motivation personnalisée ou en générer une par IA en quelques secondes.' },
    { q: 'Puis-je sauvegarder des offres pour plus tard ?', a: 'Oui — cliquez sur le ❤️ sur n\'importe quelle offre. Retrouvez toutes vos offres sauvegardées dans votre tableau de bord.' },
    { q: 'Comment supprimer mon compte ?', a: 'Allez dans Paramètres → Paramètres du compte → « Fermer mon compte ». Cela supprime définitivement toutes vos données.' },
  ];
  const employerFaqsEn = [
    { q: 'How do I post a job?', a: 'Register as an employer, create your company profile, then go to "Post a Job" in your employer dashboard.' },
    { q: 'How many jobs can I post for free?', a: 'The Starter plan (free) includes 2 to 5 active job slots. Upgrade to Pro for 10 slots and featured listings.' },
    { q: 'What is the ATS Kanban pipeline?', a: 'It\'s a visual board to manage candidates across stages: New → Reviewed → Shortlisted → Interview → Offer → Rejected.' },
    { q: 'How do I see analytics for my job postings?', a: 'In your employer dashboard, each job card shows views, applications, and conversion rate in real-time.' },
    { q: 'How do I upgrade to Pro?', a: 'Go to your employer dashboard → Billing tab → "Upgrade to Pro".' },
  ];
  const employerFaqsFr = [
    { q: 'Comment publier une offre ?', a: 'Inscrivez-vous en tant qu\'employeur, créez votre profil d\'entreprise, puis allez dans « Publier une offre » de votre tableau de bord.' },
    { q: 'Combien d\'offres puis-je publier gratuitement ?', a: 'Le plan Starter (gratuit) inclut 2 à 5 postes actifs. Passez au Pro pour 10 slots et des annonces mises en avant.' },
    { q: 'Qu\'est-ce que le pipeline ATS Kanban ?', a: 'C\'est un tableau visuel pour gérer les candidats : Nouveau → Examiné → Présélectionné → Entretien → Offre → Refusé.' },
    { q: 'Comment voir les analytiques de mes offres ?', a: 'Dans votre tableau de bord employeur, chaque offre affiche les vues, candidatures et taux de conversion en temps réel.' },
    { q: 'Comment passer au plan Pro ?', a: 'Allez dans votre tableau de bord employeur → onglet Facturation → « Passer au Pro ».' },
  ];
  const candidateFaqs = state.lang === 'fr' ? candidateFaqsFr : candidateFaqsEn;
  const employerFaqs = state.lang === 'fr' ? employerFaqsFr : employerFaqsEn;
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
  stopSSE(); showGuestNav(); goto('home'); toast('Signed out', 'success');
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
  if (!state.user || !['candidate','admin'].includes(state.user.role)) return;
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  safeSet('dash-avatar', initials);
  safeSet('dash-name', `${u.first_name} ${u.last_name}`);
  // Show admin nav item for admin users
  const adminNav = document.getElementById('nav-admin-tests');
  if (adminNav) adminNav.style.display = u.role === 'admin' ? '' : 'none';
  const modNav = document.getElementById('nav-admin-moderation');
  if (modNav) modNav.style.display = u.role === 'admin' ? '' : 'none';
  if (u.role === 'admin') refreshModerationBadge();
  loadMsgUnreadBadge();
  const _otwEl = document.getElementById('sidebar-otw');
  if (_otwEl) {
    const _otwSet = getAvailBadges(u.id);
    _otwEl.style.display = _otwSet.has('immediate') ? 'flex' : 'none';
  }
  const greetEl = document.getElementById('ai-greeting-msg');
  if (greetEl && u.first_name) {
    const lang = state.lang || 'en';
    greetEl.textContent = lang === 'fr'
      ? `Bonjour ${u.first_name} ! Je suis votre Agent Carrière IA Nexhire. Comment puis-je accélérer votre carrière aujourd'hui ?`
      : `Hi ${u.first_name}! I'm your Nexhire AI Career Agent. How can I help accelerate your career today?`;
  }
  await loadProfileForm();
  loadMyApplications();
  loadSavedJobsTab();
  loadJobsForYou();
}

// ── Profile completeness ───────────────────────────────────
function computeCompleteness(p, user) {
  const isFr = state.lang === 'fr';
  const fields = [
    { key: 'headline_en', label: isFr ? 'Ajouter un titre' : 'Add a headline', val: p.headline_en || p.headline_fr },
    { key: 'bio_en', label: isFr ? 'Rédiger une bio' : 'Write a bio', val: p.bio_en || p.bio_fr },
    { key: 'skills', label: isFr ? 'Ajouter des compétences' : 'Add skills', val: safeJsonArr(p.skills).length > 0 },
    { key: 'city', label: isFr ? 'Ajouter votre ville' : 'Add your city', val: p.city },
    { key: 'linkedin_url', label: isFr ? 'Lier votre LinkedIn' : 'Link your LinkedIn', val: p.linkedin_url },
    { key: 'experience_years', label: isFr ? 'Années d\'expérience' : 'Add experience years', val: p.experience_years > 0 },
    { key: 'phone', label: isFr ? 'Numéro de téléphone' : 'Add phone number', val: p.phone || user?.phone },
  ];
  const done = fields.filter(f => f.val);
  const pct = Math.round((done.length / fields.length) * 100);
  const missing = fields.filter(f => !f.val).slice(0, 3);
  return { pct, missing };
}

// ── Availability Badges ─────────────────────────────────────
const AVAIL_BADGES = [
  { id:'worldwide',    en:'Open Worldwide',            fr:'Ouvert(e) au monde entier',     color:'#0ea5e9', bg:'#f0f9ff', icon:'ti-world' },
  { id:'intl-opps',   en:'International Opportunities',fr:'Opportunités internationales',  color:'#6366f1', bg:'#eef2ff', icon:'ti-planet' },
  { id:'relocation',  en:'Open to Relocation',         fr:'Mobilité géographique',         color:'#d97706', bg:'#fffbeb', icon:'ti-plane-departure' },
  { id:'global-mob',  en:'Global Mobility',            fr:'Mobilité globale',              color:'#0d9488', bg:'#f0fdfa', icon:'ti-arrows-transfer-up' },
  { id:'visa-sponsor',en:'Visa Sponsorship',           fr:'Parrainage de visa',            color:'#7c3aed', bg:'#f5f3ff', icon:'ti-id-badge' },
  { id:'avail-intl',  en:'Available Internationally',  fr:'Disponible à l\'international', color:'#16a34a', bg:'#f0fdf4', icon:'ti-map-pin-filled' },
];
function getAvailBadges(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(`nxab_${uid}`) || '[]')); } catch { return new Set(); }
}
function saveAvailBadges(uid, set) {
  localStorage.setItem(`nxab_${uid}`, JSON.stringify([...set]));
}
function toggleAvailBadge(id) {
  const uid = state.user?.id;
  if (!uid) return;
  const set = getAvailBadges(uid);
  if (set.has(id)) set.delete(id); else set.add(id);
  saveAvailBadges(uid, set);
  document.querySelectorAll('.avail-chip').forEach(el => {
    const badge = AVAIL_BADGES.find(b => b.id === el.dataset.bid);
    if (!badge) return;
    const active = set.has(badge.id);
    el.style.background = active ? badge.color : badge.bg;
    el.style.color      = active ? '#fff'       : badge.color;
    el.style.borderColor = active ? badge.color : badge.color + '40';
    el.style.fontWeight  = active ? '700' : '500';
  });
  updatePassportBadgesRow(set);
  updateSidebarOpenToWork(set);
}
function updatePassportBadgesRow(set) {
  const el = document.getElementById('passport-badges-row');
  if (!el) return;
  const lang = state.lang || 'en';
  const active = AVAIL_BADGES.filter(b => set.has(b.id));
  if (!active.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = active.map(b => `<span class="passport-badge-chip" style="background:${b.color}20;color:${b.color};border:1px solid ${b.color}40"><i class="ti ${b.icon}"></i> ${lang==='fr'?b.fr:b.en}</span>`).join('');
}
function updateSidebarOpenToWork(set) {
  const el = document.getElementById('sidebar-otw');
  if (!el) return;
  el.style.display = set.size > 0 ? 'flex' : 'none';
}
function renderAvailSection(uid) {
  const set = getAvailBadges(uid);
  const lang = state.lang || 'en';
  const chips = AVAIL_BADGES.map(b => {
    const on = set.has(b.id);
    return `<span class="avail-chip" data-bid="${b.id}" onclick="toggleAvailBadge('${b.id}')"
      style="background:${on?b.color:b.bg};color:${on?'#fff':b.color};border:1.5px solid ${on?b.color:b.color+'40'};font-weight:${on?700:500}">
      <i class="ti ${b.icon}"></i> ${lang==='fr'?b.fr:b.en}
    </span>`;
  }).join('');
  return `<div class="avail-section">
    <div class="avail-label"><i class="ti ti-antenna-bars-5" style="color:#16a34a"></i> Open to opportunities — select all that apply</div>
    <div class="avail-chips">${chips}</div>
  </div>`;
}

// ── AI Match Score ──────────────────────────────────────────
function computeMatchScore(job) {
  const p = state.candidateProfile;
  if (!p || !state.user || state.user.role !== 'candidate') return null;
  const candidateSkills = safeJsonArr(p.skills).map(s => s.toLowerCase());
  if (!candidateSkills.length) return null;
  const jobText = [job.title_en, job.title_fr, job.description_en, job.description_fr]
    .filter(Boolean).join(' ').toLowerCase();
  const jobSkills = safeJsonArr(job.skills_required).map(s => s.toLowerCase());
  let hits = 0;
  for (const sk of candidateSkills) {
    if (jobSkills.some(js => js.includes(sk) || sk.includes(js)) || jobText.includes(sk)) hits++;
  }
  const maxSk = Math.min(candidateSkills.length, 10);
  let score = maxSk > 0 ? Math.round((hits / maxSk) * 70) : 20;
  if (p.work_mode_pref && job.work_mode && p.work_mode_pref === job.work_mode) score += 12;
  score += Math.min(parseInt(p.experience_years) || 0, 6) * 2;
  if (p.province && job.province && p.province === job.province) score += 6;
  const jitter = job.id ? (job.id.charCodeAt(job.id.length - 1) % 9) - 4 : 0;
  return Math.min(97, Math.max(0, score + jitter));
}
function matchScoreBadge(job) {
  const s = computeMatchScore(job);
  if (!s || s < 50) return '';
  const [bg, color] = s >= 85 ? ['#eef2ff','#6366f1'] : s >= 70 ? ['#f0fdfa','#0d9488'] : ['#fffbeb','#d97706'];
  return `<span class="match-badge" style="background:${bg};color:${color}">✦ ${s}% match</span>`;
}

// ── AI Career Score ─────────────────────────────────────────
function computeCareerScore(p, user, pct) {
  const skills = safeJsonArr(p.skills).length;
  const exp = parseInt(p.experience_years) || 0;
  let score = Math.round(pct * 5.5);
  score += Math.min(skills * 18, 200);
  score += Math.min(exp * 12, 120);
  if (p.linkedin_url) score += 40;
  if (p.github_url)   score += 30;
  return Math.max(100, Math.min(score, 950));
}

function renderTalentPassport(p, user, pct) {
  const isFr = state.lang === 'fr';
  const score = computeCareerScore(p, user, pct);
  const scoreColor = score >= 700 ? '#4ade80' : score >= 450 ? '#facc15' : '#f97316';
  const circumference = 213.6;
  const filled = Math.round((score / 950) * circumference);
  const skills = safeJsonArr(p.skills);
  const exp = parseInt(p.experience_years) || 0;
  const headline = p.headline_en || p.headline_fr || '';
  const loc = [p.city, p.province].filter(Boolean).join(', ') || '';
  const availMap = { immediate: '🟢 Available now', '2weeks': '🟡 2 weeks notice', '1month': '🟠 1 month', '3months': '⚪ 3 months' };
  const availLabel = availMap[p.availability] || '⚪ Status unknown';
  const name = `${user?.first_name||''} ${user?.last_name||''}`.trim();
  const initials = name.split(' ').map(w => w[0]||'').join('').toUpperCase() || 'U';
  const avatarUrl = p.avatar_url || user?.avatar_url || '';
  const avatarInner = avatarUrl
    ? `<img src="${esc(avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`
    : initials;
  return `<div class="talent-passport">
    <div class="passport-header">
      <div class="passport-avatar-lg passport-avatar-upload" onclick="document.getElementById('pf-avatar-file').click()" title="${isFr?'Changer la photo':'Change photo'}" style="cursor:pointer;position:relative;overflow:hidden">
        ${avatarInner}
        <div class="passport-avatar-cam"><i class="ti ti-camera" style="font-size:16px"></i></div>
        <input type="file" id="pf-avatar-file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)">
      </div>
      <div class="passport-info">
        <div class="passport-name">${esc(name)}</div>
        ${headline ? `<div class="passport-headline">${esc(headline)}</div>` : ''}
        <div class="passport-meta">
          ${loc ? `<span><i class="ti ti-map-pin"></i>${esc(loc)}</span>` : ''}
          <span>${availLabel}</span>
        </div>
      </div>
      <div class="passport-score-wrap">
        <svg class="score-ring-svg" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/>
          <circle cx="40" cy="40" r="34" fill="none" stroke="${scoreColor}" stroke-width="7"
                  stroke-dasharray="${filled} ${circumference}" stroke-linecap="round" transform="rotate(-90 40 40)"/>
        </svg>
        <div class="score-overlay">
          <div class="score-num">${score}</div>
          <div class="score-lbl">AI Score</div>
        </div>
      </div>
    </div>
    <div class="passport-stats">
      <div class="passport-stat"><i class="ti ti-code"></i><strong>${skills.length}</strong><span>${isFr ? 'Compét.' : 'Skills'}</span></div>
      <div class="passport-stat"><i class="ti ti-calendar"></i><strong>${exp}${isFr ? 'a' : 'y'}</strong><span>${isFr ? 'Exp' : 'Exp'}</span></div>
      <div class="passport-stat"><i class="ti ti-world-check"></i><strong>Global</strong><span>${isFr ? 'Prêt' : 'Ready'}</span></div>
      <div class="passport-stat"><i class="ti ti-chart-pie"></i><strong>${pct}%</strong><span>${isFr ? 'Profil' : 'Profile'}</span></div>
    </div>
    <div id="passport-badges-row" class="passport-badges-row" style="display:none"></div>
  </div>`;
}

// ── Skill Picker ────────────────────────────────────────────
const SKILL_GROUPS = [
  // ── TECH ─────────────────────────────────────────────────
  { label: 'Frontend', icon: 'ti-layout', skills: [
    { name: 'HTML5',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
    { name: 'CSS3',         logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
    { name: 'JavaScript',   logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
    { name: 'TypeScript',   logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
    { name: 'React',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
    { name: 'Next.js',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg' },
    { name: 'Vue.js',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg' },
    { name: 'Tailwind CSS', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg' },
    { name: 'Redux',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redux/redux-original.svg' },
    { name: 'Sass/SCSS',    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg' },
  ]},
  { label: 'Backend', icon: 'ti-server', skills: [
    { name: 'Node.js',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
    { name: 'Python',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
    { name: 'Express.js',   logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg' },
    { name: 'GraphQL',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/graphql/graphql-plain.svg' },
    { name: 'PostgreSQL',   logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
    { name: 'MongoDB',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
    { name: 'Redis',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg' },
    { name: 'Prisma',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg' },
    { name: 'Docker',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
    { name: 'AWS',          logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg' },
  ]},
  { label: 'Auth & Security', icon: 'ti-lock', skills: [
    { name: 'Clerk',        badge: { bg: '#6C47FF', color: '#fff', text: 'CL' } },
    { name: 'Auth0',        badge: { bg: '#EB5424', color: '#fff', text: 'A0' } },
    { name: 'JWT / OAuth',  badge: { bg: '#1F2937', color: '#fff', text: 'JWT' } },
    { name: 'Supabase',     logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg' },
    { name: 'Firebase',     logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-original.svg' },
  ]},
  { label: 'Mobile', icon: 'ti-device-mobile', skills: [
    { name: 'React Native', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
    { name: 'Expo',         badge: { bg: '#000', color: '#fff', text: 'EX' } },
    { name: 'Flutter',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg' },
    { name: 'Swift',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg' },
    { name: 'Kotlin',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg' },
  ]},
  { label: 'DevOps / Cloud', icon: 'ti-cloud', skills: [
    { name: 'GitHub Actions', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg', invert: true },
    { name: 'Jenkins',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg' },
    { name: 'Kubernetes',     logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-original.svg' },
    { name: 'Docker',         logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
    { name: 'Terraform',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg' },
    { name: 'AWS',            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg' },
    { name: 'GCP',            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg' },
    { name: 'Azure',          logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg' },
    { name: 'CI/CD',          badge: { bg: '#374151', color: '#fff', text: 'CI' } },
    { name: 'Linux',          logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg' },
    { name: 'Ansible',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ansible/ansible-original.svg' },
    { name: 'SRE',            badge: { bg: '#dc2626', color: '#fff', text: 'SRE'} },
    { name: 'Monitoring',     badge: { bg: '#0d9488', color: '#fff', text: 'MON'} },
    { name: 'Framer Motion',  badge: { bg: '#0055FF', color: '#fff', text: 'FM' } },
    { name: 'Three.js',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/threejs/threejs-original.svg', invert: true },
  ]},
  // ── IT SUPPORT & INFRA ────────────────────────────────────
  { label: 'IT Support & Infrastructure', icon: 'ti-tool', skills: [
    { name: 'Windows Server',  badge: { bg: '#0078D4', color: '#fff', text: 'WIN'} },
    { name: 'Active Directory',badge: { bg: '#0052CC', color: '#fff', text: 'AD' } },
    { name: 'Microsoft 365',   badge: { bg: '#D83B01', color: '#fff', text: 'M365'} },
    { name: 'ServiceNow',      badge: { bg: '#81B5A1', color: '#fff', text: 'SN' } },
    { name: 'Help Desk',       badge: { bg: '#374151', color: '#fff', text: 'HD' } },
    { name: 'ITIL',            badge: { bg: '#7c3aed', color: '#fff', text: 'ITIL'} },
    { name: 'VMware',          badge: { bg: '#607078', color: '#fff', text: 'VM' } },
    { name: 'PowerShell',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/powershell/powershell-original.svg' },
    { name: 'Ticketing System',badge: { bg: '#f59e0b', color: '#fff', text: 'TKT'} },
    { name: 'Remote Support',  badge: { bg: '#16a34a', color: '#fff', text: 'RDP'} },
    { name: 'Hyper-V',         badge: { bg: '#0078D4', color: '#fff', text: 'HV' } },
    { name: 'SCCM / Intune',   badge: { bg: '#0052CC', color: '#fff', text: 'SCM'} },
    { name: 'Office 365 Admin',badge: { bg: '#D83B01', color: '#fff', text: 'O365'} },
  ]},
  // ── NETWORKING ────────────────────────────────────────────
  { label: 'Networking', icon: 'ti-network', skills: [
    { name: 'Cisco',           badge: { bg: '#1BA0D7', color: '#fff', text: 'CSC'} },
    { name: 'TCP/IP',          badge: { bg: '#374151', color: '#fff', text: 'TCP'} },
    { name: 'VPN',             badge: { bg: '#16a34a', color: '#fff', text: 'VPN'} },
    { name: 'Firewall',        badge: { bg: '#dc2626', color: '#fff', text: 'FW' } },
    { name: 'Routing & Switching',badge:{bg:'#1BA0D7', color: '#fff', text: 'R&S'} },
    { name: 'LAN / WAN',       badge: { bg: '#0d9488', color: '#fff', text: 'LAN'} },
    { name: 'DNS / DHCP',      badge: { bg: '#6366f1', color: '#fff', text: 'DNS'} },
    { name: 'Wireshark',       badge: { bg: '#1868ab', color: '#fff', text: 'WS' } },
    { name: 'SD-WAN',          badge: { bg: '#7c3aed', color: '#fff', text: 'SDW'} },
    { name: 'CCNA / CCNP',     badge: { bg: '#1BA0D7', color: '#fff', text: 'CCN'} },
    { name: 'FortiGate',       badge: { bg: '#EE3124', color: '#fff', text: 'FGT'} },
    { name: 'Palo Alto',       badge: { bg: '#FA582D', color: '#fff', text: 'PA' } },
  ]},
  // ── CYBERSECURITY ─────────────────────────────────────────
  { label: 'Cybersecurity', icon: 'ti-shield-lock', skills: [
    { name: 'SIEM',            badge: { bg: '#1e3a5f', color: '#fff', text: 'SIEM'} },
    { name: 'SOC',             badge: { bg: '#374151', color: '#fff', text: 'SOC'} },
    { name: 'Splunk',          badge: { bg: '#000000', color: '#fff', text: 'SPL'} },
    { name: 'Microsoft Sentinel',badge:{bg:'#0078D4', color: '#fff', text: 'SEN'} },
    { name: 'Pen Testing',     badge: { bg: '#dc2626', color: '#fff', text: 'PEN'} },
    { name: 'Incident Response',badge:{ bg: '#f59e0b', color: '#fff', text: 'IR' } },
    { name: 'ISO 27001',       badge: { bg: '#6366f1', color: '#fff', text: 'ISO'} },
    { name: 'NIST Framework',  badge: { bg: '#0d9488', color: '#fff', text: 'NST'} },
    { name: 'Zero Trust',      badge: { bg: '#7c3aed', color: '#fff', text: 'ZT' } },
    { name: 'Vulnerability Mgmt',badge:{bg: '#92400e', color: '#fff', text: 'VM' } },
    { name: 'OSINT',           badge: { bg: '#16a34a', color: '#fff', text: 'OSI'} },
    { name: 'Compliance (SecOps)',badge:{bg:'#2563eb', color: '#fff', text: 'COM'} },
    { name: 'CrowdStrike',     badge: { bg: '#e2231a', color: '#fff', text: 'CS' } },
    { name: 'Ethical Hacking', badge: { bg: '#000000', color: '#fff', text: 'EH' } },
  ]},
  // ── QA & TESTING ─────────────────────────────────────────
  { label: 'QA & Testing', icon: 'ti-bug', skills: [
    { name: 'Manual Testing',  badge: { bg: '#374151', color: '#fff', text: 'MAN'} },
    { name: 'Automation Testing',badge:{bg:'#16a34a', color: '#fff', text: 'AUT'} },
    { name: 'Selenium',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg' },
    { name: 'Cypress',         badge: { bg: '#17202C', color: '#fff', text: 'CYP'} },
    { name: 'Jest',            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg' },
    { name: 'Playwright',      badge: { bg: '#45ba4b', color: '#fff', text: 'PW' } },
    { name: 'Postman',         badge: { bg: '#FF6C37', color: '#fff', text: 'PM' } },
    { name: 'JMeter',          badge: { bg: '#D22128', color: '#fff', text: 'JM' } },
    { name: 'TestRail',        badge: { bg: '#65C179', color: '#fff', text: 'TR' } },
    { name: 'BDD / TDD',       badge: { bg: '#6366f1', color: '#fff', text: 'BDD'} },
    { name: 'API Testing',     badge: { bg: '#0d9488', color: '#fff', text: 'API'} },
    { name: 'Load Testing',    badge: { bg: '#f59e0b', color: '#fff', text: 'LT' } },
    { name: 'QA Documentation',badge:{ bg: '#7c3aed', color: '#fff', text: 'DOC'} },
  ]},
  // ── DATABASE / DBA ────────────────────────────────────────
  { label: 'Database / DBA', icon: 'ti-database', skills: [
    { name: 'Oracle DB',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg' },
    { name: 'SQL Server (MSSQL)',badge:{bg:'#CC2927', color: '#fff', text: 'SQL'} },
    { name: 'MySQL',           logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
    { name: 'PostgreSQL',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
    { name: 'MongoDB',         logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
    { name: 'Redis',           logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg' },
    { name: 'Cassandra',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cassandra/cassandra-original.svg' },
    { name: 'Elasticsearch',   badge: { bg: '#005571', color: '#fff', text: 'ES' } },
    { name: 'Performance Tuning',badge:{bg:'#f59e0b', color: '#fff', text: 'PT' } },
    { name: 'Backup & Recovery',badge:{bg:'#16a34a', color: '#fff', text: 'B&R'} },
    { name: 'Data Migration',  badge: { bg: '#7c3aed', color: '#fff', text: 'DM' } },
    { name: 'ETL',             badge: { bg: '#0d9488', color: '#fff', text: 'ETL'} },
  ]},
  // ── ERP / CRM ─────────────────────────────────────────────
  { label: 'ERP & CRM Solutions', icon: 'ti-building-cog', skills: [
    { name: 'SAP',             badge: { bg: '#009EDB', color: '#fff', text: 'SAP'} },
    { name: 'SAP S/4HANA',     badge: { bg: '#0070C0', color: '#fff', text: 'S4H'} },
    { name: 'Oracle ERP',      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg' },
    { name: 'Microsoft Dynamics 365',badge:{bg:'#0078D4', color: '#fff', text: 'D365'} },
    { name: 'Salesforce',      badge: { bg: '#00A1E0', color: '#fff', text: 'SF' } },
    { name: 'Salesforce Dev',  badge: { bg: '#1589EE', color: '#fff', text: 'SFD'} },
    { name: 'ServiceNow',      badge: { bg: '#81B5A1', color: '#fff', text: 'SN' } },
    { name: 'Odoo',            badge: { bg: '#875A7B', color: '#fff', text: 'OD' } },
    { name: 'NetSuite',        badge: { bg: '#2E86C1', color: '#fff', text: 'NS' } },
    { name: 'Workday HCM',     badge: { bg: '#0052CC', color: '#fff', text: 'WD' } },
    { name: 'Epicor',          badge: { bg: '#007dc1', color: '#fff', text: 'EPC'} },
    { name: 'Power Platform',  badge: { bg: '#742774', color: '#fff', text: 'PP' } },
  ]},
  // ── SOLUTIONS ARCH. & IT LEADERSHIP ──────────────────────
  { label: 'IT Leadership & Architecture', icon: 'ti-topology-star', skills: [
    { name: 'Solutions Architecture',badge:{bg:'#1d4ed8', color: '#fff', text: 'SA' } },
    { name: 'Enterprise Architecture',badge:{bg:'#374151', color: '#fff', text: 'EA' } },
    { name: 'Scrum Master',    badge: { bg: '#6366f1', color: '#fff', text: 'SM' } },
    { name: 'IT Project Mgmt', badge: { bg: '#0d9488', color: '#fff', text: 'ITM'} },
    { name: 'IT Consulting',   badge: { bg: '#7c3aed', color: '#fff', text: 'ITC'} },
    { name: 'IT Governance',   badge: { bg: '#92400e', color: '#fff', text: 'GOV'} },
    { name: 'TOGAF',           badge: { bg: '#1e3a5f', color: '#fff', text: 'TOG'} },
    { name: 'COBIT',           badge: { bg: '#15803d', color: '#fff', text: 'COB'} },
    { name: 'Digital Transformation',badge:{bg:'#ec4899', color: '#fff', text: 'DT' } },
    { name: 'IT Strategy',     badge: { bg: '#f59e0b', color: '#fff', text: 'ITS'} },
    { name: 'Vendor Management',badge:{ bg: '#64748b', color: '#fff', text: 'VDR'} },
  ]},
  // ── AI / DATA ─────────────────────────────────────────────
  { label: 'AI / ML & Data', icon: 'ti-brain', skills: [
    { name: 'Machine Learning', badge: { bg: '#f59e0b', color: '#fff', text: 'ML' } },
    { name: 'Deep Learning',    badge: { bg: '#ef4444', color: '#fff', text: 'DL' } },
    { name: 'NLP',              badge: { bg: '#8b5cf6', color: '#fff', text: 'NLP'} },
    { name: 'Computer Vision',  badge: { bg: '#06b6d4', color: '#fff', text: 'CV' } },
    { name: 'TensorFlow',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg' },
    { name: 'PyTorch',          logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg' },
    { name: 'Pandas',           logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg' },
    { name: 'SQL',              badge: { bg: '#2563eb', color: '#fff', text: 'SQL'} },
    { name: 'Power BI',         badge: { bg: '#f2c811', color: '#1a1a1a', text: 'PBI'} },
    { name: 'Tableau',          badge: { bg: '#1f77b4', color: '#fff', text: 'TAB'} },
    { name: 'Prompt Engineering',badge: { bg: '#10b981', color: '#fff', text: 'PE' } },
    { name: 'LangChain',        badge: { bg: '#1c1c1e', color: '#fff', text: 'LC' } },
    { name: 'OpenAI API',       badge: { bg: '#10a37f', color: '#fff', text: 'AI' } },
  ]},
  // ── DESIGN ────────────────────────────────────────────────
  { label: 'Design & Creative', icon: 'ti-palette', skills: [
    { name: 'Figma',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg' },
    { name: 'Adobe XD',     badge: { bg: '#FF61F6', color: '#fff', text: 'XD' } },
    { name: 'Photoshop',    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-original.svg' },
    { name: 'Illustrator',  logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg' },
    { name: 'After Effects',badge: { bg: '#9999FF', color: '#fff', text: 'AE' } },
    { name: 'Premiere Pro', badge: { bg: '#9999FF', color: '#fff', text: 'PR' } },
    { name: 'InDesign',     badge: { bg: '#FE3365', color: '#fff', text: 'ID' } },
    { name: 'Canva',        badge: { bg: '#00C4CC', color: '#fff', text: 'CV' } },
    { name: 'Sketch',       badge: { bg: '#F7B500', color: '#fff', text: 'SK' } },
    { name: 'UX Research',  badge: { bg: '#6366f1', color: '#fff', text: 'UX' } },
    { name: 'UI Design',    badge: { bg: '#8b5cf6', color: '#fff', text: 'UI' } },
    { name: 'Motion Design',badge: { bg: '#ec4899', color: '#fff', text: 'MO' } },
    { name: 'Wireframing',  badge: { bg: '#64748b', color: '#fff', text: 'WF' } },
    { name: 'Branding',     badge: { bg: '#f97316', color: '#fff', text: 'BR' } },
  ]},
  // ── MARKETING ─────────────────────────────────────────────
  { label: 'Marketing & Growth', icon: 'ti-speakerphone', skills: [
    { name: 'SEO',               badge: { bg: '#16a34a', color: '#fff', text: 'SEO'} },
    { name: 'SEM / Google Ads',  badge: { bg: '#4285F4', color: '#fff', text: 'SEM'} },
    { name: 'Meta Ads',          badge: { bg: '#1877F2', color: '#fff', text: 'FB' } },
    { name: 'Content Marketing', badge: { bg: '#f97316', color: '#fff', text: 'CM' } },
    { name: 'Email Marketing',   badge: { bg: '#0ea5e9', color: '#fff', text: 'EM' } },
    { name: 'Copywriting',       badge: { bg: '#7c3aed', color: '#fff', text: 'CW' } },
    { name: 'Social Media',      badge: { bg: '#ec4899', color: '#fff', text: 'SM' } },
    { name: 'Growth Hacking',    badge: { bg: '#10b981', color: '#fff', text: 'GH' } },
    { name: 'Analytics (GA4)',   badge: { bg: '#e37400', color: '#fff', text: 'GA' } },
    { name: 'HubSpot',           badge: { bg: '#FF7A59', color: '#fff', text: 'HS' } },
    { name: 'Mailchimp',         badge: { bg: '#FFE01B', color: '#1a1a1a', text: 'MC'} },
    { name: 'A/B Testing',       badge: { bg: '#64748b', color: '#fff', text: 'AB' } },
    { name: 'Brand Strategy',    badge: { bg: '#dc2626', color: '#fff', text: 'BS' } },
    { name: 'Influencer Mktg',   badge: { bg: '#d946ef', color: '#fff', text: 'IM' } },
  ]},
  // ── FINANCE ───────────────────────────────────────────────
  { label: 'Finance & Accounting', icon: 'ti-receipt', skills: [
    { name: 'Financial Analysis', badge: { bg: '#1d4ed8', color: '#fff', text: 'FA' } },
    { name: 'Budgeting',          badge: { bg: '#15803d', color: '#fff', text: 'BU' } },
    { name: 'Forecasting',        badge: { bg: '#0891b2', color: '#fff', text: 'FC' } },
    { name: 'Accounting (GAAP)',  badge: { bg: '#374151', color: '#fff', text: 'ACC'} },
    { name: 'IFRS',               badge: { bg: '#1e3a5f', color: '#fff', text: 'IFR'} },
    { name: 'Excel / Sheets',     badge: { bg: '#217346', color: '#fff', text: 'XLS'} },
    { name: 'SAP',                badge: { bg: '#009EDB', color: '#fff', text: 'SAP'} },
    { name: 'QuickBooks',         badge: { bg: '#2CA01C', color: '#fff', text: 'QB' } },
    { name: 'Sage',               badge: { bg: '#00DC82', color: '#fff', text: 'SG' } },
    { name: 'Tax Compliance',     badge: { bg: '#7c3aed', color: '#fff', text: 'TAX'} },
    { name: 'Audit',              badge: { bg: '#92400e', color: '#fff', text: 'AUD'} },
    { name: 'Risk Management',    badge: { bg: '#dc2626', color: '#fff', text: 'RM' } },
    { name: 'Financial Modeling', badge: { bg: '#4f46e5', color: '#fff', text: 'FM' } },
    { name: 'M&A',                badge: { bg: '#0d9488', color: '#fff', text: 'M&A'} },
  ]},
  // ── SALES ─────────────────────────────────────────────────
  { label: 'Sales & Business Dev', icon: 'ti-chart-bar', skills: [
    { name: 'B2B Sales',        badge: { bg: '#2563eb', color: '#fff', text: 'B2B'} },
    { name: 'B2C Sales',        badge: { bg: '#16a34a', color: '#fff', text: 'B2C'} },
    { name: 'Account Management',badge:{ bg: '#0d9488', color: '#fff', text: 'AM' } },
    { name: 'Prospecting',      badge: { bg: '#f59e0b', color: '#fff', text: 'PRO'} },
    { name: 'CRM (Salesforce)', badge: { bg: '#00A1E0', color: '#fff', text: 'SF' } },
    { name: 'CRM (HubSpot)',    badge: { bg: '#FF7A59', color: '#fff', text: 'HS' } },
    { name: 'Pipeline Mgmt',   badge: { bg: '#7c3aed', color: '#fff', text: 'PPL'} },
    { name: 'Negotiation',     badge: { bg: '#dc2626', color: '#fff', text: 'NEG'} },
    { name: 'Cold Calling',    badge: { bg: '#374151', color: '#fff', text: 'CC' } },
    { name: 'SaaS Sales',      badge: { bg: '#6366f1', color: '#fff', text: 'SaaS'} },
    { name: 'Partnerships',    badge: { bg: '#ec4899', color: '#fff', text: 'PTN'} },
    { name: 'Tender / RFP',   badge: { bg: '#92400e', color: '#fff', text: 'RFP'} },
  ]},
  // ── PRODUCT ───────────────────────────────────────────────
  { label: 'Product Management', icon: 'ti-box', skills: [
    { name: 'Product Strategy', badge: { bg: '#4f46e5', color: '#fff', text: 'PS' } },
    { name: 'Roadmapping',     badge: { bg: '#0d9488', color: '#fff', text: 'RM' } },
    { name: 'Agile / Scrum',   badge: { bg: '#f59e0b', color: '#fff', text: 'AG' } },
    { name: 'Kanban',          badge: { bg: '#16a34a', color: '#fff', text: 'KN' } },
    { name: 'User Stories',    badge: { bg: '#8b5cf6', color: '#fff', text: 'US' } },
    { name: 'Jira',            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg' },
    { name: 'Notion',          badge: { bg: '#1a1a1a', color: '#fff', text: 'NO' } },
    { name: 'A/B Testing',     badge: { bg: '#64748b', color: '#fff', text: 'AB' } },
    { name: 'OKRs / KPIs',     badge: { bg: '#dc2626', color: '#fff', text: 'OKR'} },
    { name: 'Market Research', badge: { bg: '#0ea5e9', color: '#fff', text: 'MR' } },
    { name: 'Stakeholder Mgmt',badge: { bg: '#7c3aed', color: '#fff', text: 'STK'} },
    { name: 'Wireframing',     badge: { bg: '#374151', color: '#fff', text: 'WF' } },
  ]},
  // ── HR & TALENT ───────────────────────────────────────────
  { label: 'HR & Talent', icon: 'ti-users', skills: [
    { name: 'Recruitment',      badge: { bg: '#6366f1', color: '#fff', text: 'REC'} },
    { name: 'Talent Acquisition',badge:{ bg: '#8b5cf6', color: '#fff', text: 'TA' } },
    { name: 'Onboarding',       badge: { bg: '#16a34a', color: '#fff', text: 'ON' } },
    { name: 'HRIS',             badge: { bg: '#0ea5e9', color: '#fff', text: 'HRIS'} },
    { name: 'Payroll',          badge: { bg: '#15803d', color: '#fff', text: 'PAY'} },
    { name: 'Labour Law',       badge: { bg: '#dc2626', color: '#fff', text: 'LAW'} },
    { name: 'L&D',              badge: { bg: '#f59e0b', color: '#fff', text: 'L&D'} },
    { name: 'Performance Mgmt', badge: { bg: '#7c3aed', color: '#fff', text: 'PM' } },
    { name: 'Compensation',     badge: { bg: '#0d9488', color: '#fff', text: 'CMP'} },
    { name: 'Employer Branding',badge: { bg: '#ec4899', color: '#fff', text: 'EB' } },
    { name: 'Workday',          badge: { bg: '#0052CC', color: '#fff', text: 'WD' } },
    { name: 'BambooHR',         badge: { bg: '#74BA43', color: '#fff', text: 'BHR'} },
  ]},
  // ── PROJECT / OPS ─────────────────────────────────────────
  { label: 'Project & Operations', icon: 'ti-clipboard-list', skills: [
    { name: 'Project Management',badge:{ bg: '#4f46e5', color: '#fff', text: 'PM' } },
    { name: 'PMP / PMI',         badge:{ bg: '#1d4ed8', color: '#fff', text: 'PMP'} },
    { name: 'PRINCE2',           badge:{ bg: '#374151', color: '#fff', text: 'P2' } },
    { name: 'Lean / Six Sigma',  badge:{ bg: '#15803d', color: '#fff', text: 'LSS'} },
    { name: 'Supply Chain',      badge:{ bg: '#0d9488', color: '#fff', text: 'SCM'} },
    { name: 'Logistics',         badge:{ bg: '#f59e0b', color: '#fff', text: 'LOG'} },
    { name: 'ERP (SAP)',         badge:{ bg: '#009EDB', color: '#fff', text: 'SAP'} },
    { name: 'ERP (Oracle)',      badge:{ bg: '#F80000', color: '#fff', text: 'ORC'} },
    { name: 'Procurement',       badge:{ bg: '#92400e', color: '#fff', text: 'PRC'} },
    { name: 'Quality Assurance', badge:{ bg: '#7c3aed', color: '#fff', text: 'QA' } },
    { name: 'Process Improvement',badge:{bg: '#ec4899', color: '#fff', text: 'PI' } },
  ]},
  // ── HEALTHCARE ────────────────────────────────────────────
  { label: 'Healthcare', icon: 'ti-heart-rate-monitor', skills: [
    { name: 'Patient Care',      badge: { bg: '#dc2626', color: '#fff', text: 'PC' } },
    { name: 'Clinical Research', badge: { bg: '#7c3aed', color: '#fff', text: 'CR' } },
    { name: 'EMR / EHR',         badge: { bg: '#0d9488', color: '#fff', text: 'EMR'} },
    { name: 'Medical Coding',    badge: { bg: '#1d4ed8', color: '#fff', text: 'MC' } },
    { name: 'Pharmacology',      badge: { bg: '#16a34a', color: '#fff', text: 'PHR'} },
    { name: 'Health & Safety',   badge: { bg: '#f59e0b', color: '#fff', text: 'H&S'} },
    { name: 'Nursing',           badge: { bg: '#ec4899', color: '#fff', text: 'RN' } },
    { name: 'Telemedicine',      badge: { bg: '#0ea5e9', color: '#fff', text: 'TM' } },
    { name: 'Mental Health',     badge: { bg: '#8b5cf6', color: '#fff', text: 'MH' } },
    { name: 'Lab / Diagnostics', badge: { bg: '#374151', color: '#fff', text: 'LAB'} },
  ]},
  // ── LEGAL ─────────────────────────────────────────────────
  { label: 'Legal & Compliance', icon: 'ti-scale', skills: [
    { name: 'Corporate Law',      badge: { bg: '#1e3a5f', color: '#fff', text: 'CL' } },
    { name: 'Contract Law',       badge: { bg: '#374151', color: '#fff', text: 'CT' } },
    { name: 'Compliance',         badge: { bg: '#dc2626', color: '#fff', text: 'COM'} },
    { name: 'GDPR / Privacy',     badge: { bg: '#4f46e5', color: '#fff', text: 'GDR'} },
    { name: 'Intellectual Property',badge:{bg: '#7c3aed', color: '#fff', text: 'IP' } },
    { name: 'Litigation',         badge: { bg: '#92400e', color: '#fff', text: 'LIT'} },
    { name: 'Regulatory Affairs', badge: { bg: '#0d9488', color: '#fff', text: 'REG'} },
    { name: 'Anti-Money Laundering',badge:{bg:'#f59e0b', color: '#fff', text: 'AML'} },
    { name: 'Immigration Law',    badge: { bg: '#16a34a', color: '#fff', text: 'IMM'} },
    { name: 'Labour Law',         badge: { bg: '#ec4899', color: '#fff', text: 'LBR'} },
  ]},
  // ── EDUCATION ─────────────────────────────────────────────
  { label: 'Education & Training', icon: 'ti-school', skills: [
    { name: 'Curriculum Design',  badge: { bg: '#6366f1', color: '#fff', text: 'CD' } },
    { name: 'E-learning (LMS)',   badge: { bg: '#0ea5e9', color: '#fff', text: 'LMS'} },
    { name: 'Instructional Design',badge:{bg: '#f59e0b', color: '#fff', text: 'ID' } },
    { name: 'Corporate Training', badge: { bg: '#16a34a', color: '#fff', text: 'CT' } },
    { name: 'Coaching',           badge: { bg: '#ec4899', color: '#fff', text: 'CO' } },
    { name: 'Moodle',             badge: { bg: '#f98012', color: '#fff', text: 'MDL'} },
    { name: 'TESOL / TEFL',       badge: { bg: '#8b5cf6', color: '#fff', text: 'ESL'} },
    { name: 'Assessment Design',  badge: { bg: '#374151', color: '#fff', text: 'AD' } },
  ]},
  // ── SOFT SKILLS ───────────────────────────────────────────
  { label: 'Soft Skills', icon: 'ti-star', skills: [
    { name: 'Leadership',        badge: { bg: '#f59e0b', color: '#fff', text: '★' } },
    { name: 'Communication',     badge: { bg: '#6366f1', color: '#fff', text: '★' } },
    { name: 'Problem Solving',   badge: { bg: '#16a34a', color: '#fff', text: '★' } },
    { name: 'Team Collaboration',badge: { bg: '#0d9488', color: '#fff', text: '★' } },
    { name: 'Project Leadership',badge: { bg: '#dc2626', color: '#fff', text: '★' } },
    { name: 'Adaptability',      badge: { bg: '#8b5cf6', color: '#fff', text: '★' } },
    { name: 'Critical Thinking', badge: { bg: '#ec4899', color: '#fff', text: '★' } },
    { name: 'Time Management',   badge: { bg: '#f97316', color: '#fff', text: '★' } },
    { name: 'Bilingual FR/EN',   badge: { bg: '#023448', color: '#fff', text: 'FR' } },
    { name: 'Trilingual',        badge: { bg: '#1b485a', color: '#fff', text: '3L' } },
  ]},
];

// Maps each skill group label to its filterable sector ID
const SECTOR_MAP = {
  'Frontend':                    'tech-dev',
  'Backend':                     'tech-dev',
  'Auth & Security':             'tech-dev',
  'Mobile':                      'tech-dev',
  'DevOps / Cloud':              'tech-devops',
  'IT Support & Infrastructure': 'tech-infra',
  'Networking':                  'tech-infra',
  'Cybersecurity':               'tech-cyber',
  'QA & Testing':                'tech-qa',
  'Database / DBA':              'tech-data',
  'AI / ML & Data':              'tech-data',
  'ERP & CRM Solutions':         'tech-erp',
  'IT Leadership & Architecture':'tech-arch',
  'Design & Creative':           'design',
  'Marketing & Growth':          'marketing',
  'Finance & Accounting':        'finance',
  'Sales & Business Dev':        'sales',
  'Product Management':          'product',
  'HR & Talent':                 'hr',
  'Project & Operations':        'ops',
  'Healthcare':                  'health',
  'Legal & Compliance':          'legal',
  'Education & Training':        'edu',
  'Soft Skills':                 'soft',
};

const SKILL_SECTORS = [
  { id: 'all',       label: 'All fields',   icon: 'ti-grid-dots' },
  { id: 'tech',      label: 'Technology',   icon: 'ti-cpu' },
  { id: 'design',    label: 'Design',       icon: 'ti-palette' },
  { id: 'marketing', label: 'Marketing',    icon: 'ti-speakerphone' },
  { id: 'finance',   label: 'Finance',      icon: 'ti-receipt' },
  { id: 'sales',     label: 'Sales',        icon: 'ti-chart-bar' },
  { id: 'product',   label: 'Product',      icon: 'ti-box' },
  { id: 'hr',        label: 'HR & Talent',  icon: 'ti-users' },
  { id: 'ops',       label: 'Operations',   icon: 'ti-clipboard-list' },
  { id: 'health',    label: 'Healthcare',   icon: 'ti-heart-rate-monitor' },
  { id: 'legal',     label: 'Legal',        icon: 'ti-scale' },
  { id: 'edu',       label: 'Education',    icon: 'ti-school' },
];

const TECH_SUBS = [
  { id: 'tech',       label: 'All Tech',       icon: 'ti-cpu' },
  { id: 'tech-dev',   label: 'Development',    icon: 'ti-code' },
  { id: 'tech-devops',label: 'DevOps / Cloud', icon: 'ti-cloud' },
  { id: 'tech-infra', label: 'IT Support',     icon: 'ti-tool' },
  { id: 'tech-cyber', label: 'Cybersecurity',  icon: 'ti-shield-lock' },
  { id: 'tech-data',  label: 'Data & AI',      icon: 'ti-brain' },
  { id: 'tech-qa',    label: 'QA & Testing',   icon: 'ti-bug' },
  { id: 'tech-erp',   label: 'ERP & CRM',      icon: 'ti-building-cog' },
  { id: 'tech-arch',  label: 'IT Architecture',icon: 'ti-topology-star' },
];

let _activeSector = 'all';

function renderSkillPicker(selected = [], idPrefix = 'sp') {
  const sel = new Set(selected.map(s => s.toLowerCase()));

  const mainBar = `<div class="sp-sector-bar" id="${idPrefix}-sector-bar">
    ${SKILL_SECTORS.map(s => `<button type="button" class="sp-sector-btn${s.id==='all'?' active':''}" data-sid="${s.id}" onclick="selectSkillSector('${s.id}','${idPrefix}')"><i class="ti ${s.icon}"></i>${s.label}</button>`).join('')}
  </div>`;

  const subBar = `<div class="sp-sector-bar sp-subsector-bar" id="${idPrefix}-subsector-bar" style="display:none">
    ${TECH_SUBS.map(s => `<button type="button" class="sp-sector-btn${s.id==='tech'?' active':''}" data-sid="${s.id}" onclick="selectSkillSector('${s.id}','${idPrefix}')"><i class="ti ${s.icon}"></i>${s.label}</button>`).join('')}
  </div>`;

  const groups = SKILL_GROUPS.map(g => {
    const sec = SECTOR_MAP[g.label] || 'all';
    const chips = g.skills.map(sk => {
      const active = sel.has(sk.name.toLowerCase()) ? ' active' : '';
      const img = sk.logo
        ? `<img src="${sk.logo}" class="sp-logo"${sk.invert ? ' style="filter:invert(1)"' : ''}>`
        : `<span class="sp-badge" style="background:${sk.badge.bg};color:${sk.badge.color}">${sk.badge.text}</span>`;
      const isVerified = state.verifiedSkillNames?.has(sk.name);
      return `<span class="sp-chip${active}" data-skill="${esc(sk.name)}" onclick="toggleSkill(this)">${img}${esc(sk.name)}${isVerified ? '<span style="color:#4ade80;font-size:10px;font-weight:800;margin-left:3px" title="Verified by skill test">✓</span>' : ''}</span>`;
    }).join('');
    return `<div class="sp-group" data-sector="${sec}">
      <div class="sp-group-label"><i class="ti ${g.icon}"></i>${g.label}</div>
      <div class="sp-chips">${chips}</div>
    </div>`;
  }).join('');

  return `<div class="skill-picker" id="${idPrefix}-picker">
    ${mainBar}${subBar}
    <div id="${idPrefix}-groups">${groups}</div>
    <div class="sp-custom-wrap">
      <i class="ti ti-plus sp-custom-icon"></i>
      <input type="text" id="${idPrefix}-custom" class="sp-custom-input" placeholder="Add a custom skill (press Enter)…" onkeydown="addCustomSkill(event,'${idPrefix}')">
    </div>
    <div id="${idPrefix}-custom-chips" class="sp-chips" style="margin-top:6px"></div>
  </div>`;
}

function selectSkillSector(sectorId, idPrefix = 'sp') {
  _activeSector = sectorId;
  const isTechSub = sectorId.startsWith('tech-');
  const isMainTech = sectorId === 'tech';
  const isTechContext = isMainTech || isTechSub;

  document.querySelectorAll(`#${idPrefix}-sector-bar .sp-sector-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sid === (isTechContext ? 'tech' : sectorId));
  });

  const subBar = document.getElementById(`${idPrefix}-subsector-bar`);
  if (subBar) {
    subBar.style.display = isTechContext ? 'flex' : 'none';
    subBar.querySelectorAll('.sp-sector-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sid === sectorId || (isMainTech && btn.dataset.sid === 'tech'));
    });
  }

  document.querySelectorAll(`#${idPrefix}-groups .sp-group`).forEach(g => {
    const gs = g.dataset.sector;
    let visible;
    if (sectorId === 'all') {
      visible = true;
    } else if (isTechSub) {
      visible = gs === sectorId || gs === 'soft';
    } else if (isMainTech) {
      visible = gs.startsWith('tech-') || gs === 'soft';
    } else {
      visible = gs === sectorId || gs === 'soft';
    }
    g.style.display = visible ? '' : 'none';
  });
}

function toggleSkill(el) {
  el.classList.toggle('active');
}

function addCustomSkill(e, idPrefix = 'sp') {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const inp = document.getElementById(`${idPrefix}-custom`);
  const val = inp?.value.trim();
  if (!val) return;
  const container = document.getElementById(`${idPrefix}-custom-chips`);
  const picker = document.getElementById(`${idPrefix}-picker`);
  const exists = picker && [...picker.querySelectorAll('.sp-chip[data-skill]')].some(c => c.dataset.skill.toLowerCase() === val.toLowerCase());
  if (!exists && container) {
    const chip = document.createElement('span');
    chip.className = 'sp-chip active sp-custom-chip';
    chip.dataset.skill = val;
    chip.innerHTML = `${esc(val)} <span onclick="this.parentElement.remove()" style="margin-left:4px;opacity:.6;cursor:pointer">✕</span>`;
    container.appendChild(chip);
  }
  if (inp) inp.value = '';
}

function getPickedSkills(idPrefix = 'sp') {
  const picker = document.getElementById(`${idPrefix}-picker`);
  if (!picker) return [];
  return [...picker.querySelectorAll('.sp-chip.active[data-skill]')].map(c => c.dataset.skill);
}

/* ── Profile skill editor (compact — replaces full picker in profile) ── */
let _pfSkillList = null;
function _getPfSkillList() {
  if (_pfSkillList) return _pfSkillList;
  _pfSkillList = SKILL_GROUPS.flatMap(g => g.skills.map(s => s.name));
  return _pfSkillList;
}

function renderProfileSkillEditor(selected = []) {
  const isFr = state.lang === 'fr';
  const chips = selected.map(s =>
    `<span class="pf-skill-tag" data-skill="${esc(s)}">${esc(s)}<button type="button" class="pf-skill-rm" onclick="removePfSkill(this)" aria-label="Remove">&times;</button></span>`
  ).join('');
  const ph = isFr ? 'Tapez une compétence + Entrée…' : 'Type a skill + Enter…';
  const empty = isFr ? 'Aucune compétence — ajoutez-en ci-dessous' : 'No skills yet — add some below';
  return `<div id="pf-skill-editor">
    <div id="pf-skill-tags" class="pf-skill-tags-row">${chips || `<span class="pf-skill-empty">${empty}</span>`}</div>
    <div class="pf-skill-input-wrap">
      <input type="text" id="pf-skill-input" class="pf-skill-input" placeholder="${ph}"
        autocomplete="off"
        oninput="updatePfSkillSug(this.value)"
        onkeydown="handlePfSkillKey(event)"
        onblur="setTimeout(hidePfSkillSug,160)">
      <div id="pf-skill-sug" class="pf-skill-sug-box" style="display:none"></div>
    </div>
  </div>`;
}

function removePfSkill(btn) {
  btn.closest('.pf-skill-tag').remove();
  const row = document.getElementById('pf-skill-tags');
  if (row && !row.querySelector('.pf-skill-tag')) {
    const isFr = state.lang === 'fr';
    row.innerHTML = `<span class="pf-skill-empty">${isFr ? 'Aucune compétence' : 'No skills yet'}</span>`;
  }
}

function addPfSkill(name) {
  const clean = (name || '').trim();
  if (!clean) return;
  const row = document.getElementById('pf-skill-tags');
  if (!row) return;
  const existing = [...row.querySelectorAll('.pf-skill-tag')].map(t => t.dataset.skill?.toLowerCase());
  if (existing.includes(clean.toLowerCase())) { hidePfSkillSug(); return; }
  row.querySelector('.pf-skill-empty')?.remove();
  const tag = document.createElement('span');
  tag.className = 'pf-skill-tag';
  tag.dataset.skill = clean;
  tag.innerHTML = `${esc(clean)}<button type="button" class="pf-skill-rm" onclick="removePfSkill(this)" aria-label="Remove">&times;</button>`;
  row.appendChild(tag);
  const inp = document.getElementById('pf-skill-input');
  if (inp) inp.value = '';
  hidePfSkillSug();
}

function handlePfSkillKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); addPfSkill(e.target.value); }
  else if (e.key === 'Escape') hidePfSkillSug();
}

function updatePfSkillSug(val) {
  const box = document.getElementById('pf-skill-sug');
  if (!box) return;
  if (!val) { box.style.display = 'none'; return; }
  const q = val.toLowerCase();
  const row = document.getElementById('pf-skill-tags');
  const picked = new Set([...(row?.querySelectorAll('.pf-skill-tag') || [])].map(t => t.dataset.skill?.toLowerCase()));
  const hits = _getPfSkillList().filter(s => s.toLowerCase().includes(q) && !picked.has(s.toLowerCase())).slice(0, 7);
  if (!hits.length) { box.style.display = 'none'; return; }
  box.innerHTML = hits.map(h => `<div class="pf-skill-sug-item" onmousedown="addPfSkill('${esc(h)}')">${esc(h)}</div>`).join('');
  box.style.display = 'block';
}

function hidePfSkillSug() {
  const box = document.getElementById('pf-skill-sug');
  if (box) box.style.display = 'none';
}

function getProfileSkills() {
  const row = document.getElementById('pf-skill-tags');
  if (!row) return [];
  return [...row.querySelectorAll('.pf-skill-tag[data-skill]')].map(t => t.dataset.skill);
}

const JOB_SKILL_QUICK = [
  'Python','JavaScript','TypeScript','Java','SQL','React','Node.js','AWS','Excel','Git',
  'Agile / Scrum','Project Management','Communication','Leadership','French (bilingual)',
  'Customer Service','Sales','Financial Analysis','Marketing','AutoCAD','SAP','Salesforce','Figma'
];

function renderJobSkillInput(skills = []) {
  const initialChips = skills.map(s =>
    `<span class="sp-chip active sp-custom-chip" data-skill="${esc(s)}">${esc(s)} <span onclick="this.parentElement.remove()" style="margin-left:4px;opacity:.6;cursor:pointer">✕</span></span>`
  ).join('');
  const suggestions = JOB_SKILL_QUICK.map(s =>
    `<span class="sp-chip" style="cursor:pointer" onclick="addJobSkillTag('${esc(s)}')">${esc(s)}</span>`
  ).join('');
  return `<div id="jf-skill-wrap">
    <div id="jf-skill-chips" class="sp-chips" style="min-height:32px;margin-bottom:8px">${initialChips}</div>
    <input type="text" id="jf-skill-text" class="sp-custom-input" style="width:100%;box-sizing:border-box"
      placeholder="Type a skill and press Enter…"
      onkeydown="addJobSkill(event)">
    <div style="margin-top:12px;font-size:12px;color:var(--muted);margin-bottom:6px">Common skills — click to add:</div>
    <div class="sp-chips">${suggestions}</div>
  </div>`;
}

function addJobSkill(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const inp = document.getElementById('jf-skill-text');
  const val = inp?.value.trim();
  if (!val) return;
  addJobSkillTag(val);
  if (inp) inp.value = '';
}

function addJobSkillTag(tag) {
  const container = document.getElementById('jf-skill-chips');
  if (!container) return;
  const already = [...container.querySelectorAll('[data-skill]')]
    .some(c => c.dataset.skill.toLowerCase() === tag.toLowerCase());
  if (already) return;
  const chip = document.createElement('span');
  chip.className = 'sp-chip active sp-custom-chip';
  chip.dataset.skill = tag;
  chip.innerHTML = `${esc(tag)} <span onclick="this.parentElement.remove()" style="margin-left:4px;opacity:.6;cursor:pointer">✕</span>`;
  container.appendChild(chip);
}

function getJobSkills() {
  const container = document.getElementById('jf-skill-chips');
  if (!container) return [];
  return [...container.querySelectorAll('[data-skill]')].map(c => c.dataset.skill);
}

async function loadProfileForm() {
  const d = await api('GET', `${BASE}/api/candidates/profile`);
  const container = document.getElementById('profile-form');
  if (!container) return;
  const p = d.profile || {};

  state.candidateProfile = p;
  const { pct, missing } = computeCompleteness(p, state.user);
  const pctColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--indigo)';
  const score = computeCareerScore(p, state.user, pct);
  const scoreEl = document.getElementById('dash-score');
  if (scoreEl) {
    const sc = score >= 700 ? '#4ade80' : score >= 450 ? '#facc15' : '#f97316';
    scoreEl.innerHTML = `<div class="dash-score-pill" style="background:${sc}20;color:${sc};border:1px solid ${sc}40"><i class="ti ti-star-filled" style="font-size:10px"></i> ${score} AI Score</div>`;
  }
  const _uid = state.user?.id;
  const isFr = state.lang === 'fr';
  const L = {
    completeness: isFr ? 'Complétude du profil' : 'Profile completeness',
    toComplete:   isFr ? 'À compléter :' : 'To complete:',
    complete:     isFr ? '✓ Profil complet !' : '✓ Profile complete!',
    firstName:    isFr ? 'Prénom' : 'First name',
    lastName:     isFr ? 'Nom de famille' : 'Last name',
    headlineEn:   'Headline (EN)',
    headlineFr:   'Titre (FR)',
    province:     isFr ? 'Province / Territoire' : 'Province / Territory',
    city:         isFr ? 'Ville' : 'City',
    cityPh:       isFr ? 'ex. Montréal, Toronto…' : 'e.g. Montréal, Toronto…',
    workPref:     isFr ? 'Préférence de travail' : 'Work preference',
    workAny:      isFr ? 'Peu importe' : 'Any',
    workRemote:   'Remote', workHybrid: 'Hybrid', workOnsite: 'On-site',
    expYears:     isFr ? 'Années d\'expérience' : 'Years of experience',
    skills:       isFr ? 'Compétences' : 'Skills',
    skillsSub:    isFr ? '— sélectionnez tout ce qui s\'applique' : '— select all that apply',
    avail:        isFr ? 'Disponibilité' : 'Availability',
    availImm:     isFr ? 'Immédiate' : 'Immediate',
    avail2w:      isFr ? '2 semaines' : '2 weeks',
    avail1m:      isFr ? '1 mois' : '1 month',
    avail3m:      isFr ? '3 mois' : '3 months',
    bioEn:        'Bio (EN)',
    save:         isFr ? 'Sauvegarder' : 'Save profile',
    cvTitle:      isFr ? 'CV / Curriculum vitae' : 'CV / Resume',
    cvView:       isFr ? 'Voir mon CV actuel' : 'View current CV',
    cvUpload:     isFr ? (p.cv_url ? 'Remplacer le CV' : 'Téléverser un CV') : (p.cv_url ? 'Replace CV' : 'Upload CV'),
    cvHint:       'PDF, DOC, DOCX — max 5 MB',
  };

  container.innerHTML =
    renderTalentPassport(p, state.user, pct) +
    renderAvailSection(_uid) +
    `<div class="completeness-bar-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--dark)">${L.completeness}</span>
        <span style="font-size:13px;font-weight:700;color:${pctColor}">${pct}%</span>
      </div>
      <div class="completeness-track"><div class="completeness-fill" style="width:${pct}%;background:${pctColor}"></div></div>
      ${missing.length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">${L.toComplete} ${missing.map(m => `<span class="missing-chip">${m.label}</span>`).join('')}</div>` : `<div style="margin-top:8px;font-size:12px;color:var(--green)">${L.complete}</div>`}
    </div>
    <span id="pf-avatar-status" style="display:none"></span>
    <div class="form-row"><div class="form-group"><label>${L.firstName}</label><input type="text" id="pf-first" value="${esc(state.user?.first_name||'')}"></div><div class="form-group"><label>${L.lastName}</label><input type="text" id="pf-last" value="${esc(state.user?.last_name||'')}"></div></div>
    <div class="form-row">
      <div class="form-group"><label>${L.headlineEn}</label><input type="text" id="pf-head-en" value="${esc(p.headline_en||'')}" placeholder="Senior Full-Stack Developer"></div>
      <div class="form-group"><label>${L.headlineFr}</label><input type="text" id="pf-head-fr" value="${esc(p.headline_fr||'')}" placeholder="Développeur Full-Stack Senior"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>${L.province}</label>
        <select id="pf-province">${buildLocationOptions(p.province||'')}</select>
      </div>
      <div class="form-group"><label>${L.city}</label><input type="text" id="pf-city" value="${esc(p.city||'')}" placeholder="${L.cityPh}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>${isFr ? 'Téléphone' : 'Phone'}</label><input type="tel" id="pf-phone" value="${esc(p.phone||'')}" placeholder="+1 514 000-0000"></div>
      <div class="form-group"><label>${L.expYears}</label><input type="number" id="pf-exp" value="${p.experience_years||0}" min="0" max="50"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>${isFr ? 'Salaire min. souhaité (CAD/an)' : 'Desired min. salary (CAD/yr)'}</label>
        <input type="number" id="pf-sal-min" value="${p.desired_salary_min||''}" min="0" max="500000" step="5000" placeholder="60000">
      </div>
      <div class="form-group">
        <label>${isFr ? 'Salaire max. souhaité (CAD/an)' : 'Desired max. salary (CAD/yr)'}</label>
        <input type="number" id="pf-sal-max" value="${p.desired_salary_max||''}" min="0" max="500000" step="5000" placeholder="90000">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>${L.workPref}</label><select id="pf-mode"><option value="">${L.workAny}</option><option value="remote" ${p.work_mode_pref==='remote'?'selected':''}>${L.workRemote}</option><option value="hybrid" ${p.work_mode_pref==='hybrid'?'selected':''}>${L.workHybrid}</option><option value="onsite" ${p.work_mode_pref==='onsite'?'selected':''}>${L.workOnsite}</option></select></div>
    </div>
    <div class="form-group">
      <label>${L.skills}</label>
      ${renderProfileSkillEditor(safeJsonArr(p.skills))}
    </div>
    <div class="form-row">
      <div class="form-group"><label>LinkedIn URL</label><input type="url" id="pf-linkedin" value="${esc(p.linkedin_url||'')}" placeholder="https://linkedin.com/in/..."></div>
      <div class="form-group"><label>GitHub URL</label><input type="url" id="pf-github" value="${esc(p.github_url||'')}"></div>
    </div>
    <div class="form-group"><label>${L.avail}</label><select id="pf-avail"><option value="immediate" ${p.availability==='immediate'?'selected':''}>${L.availImm}</option><option value="2weeks" ${p.availability==='2weeks'?'selected':''}>${L.avail2w}</option><option value="1month" ${p.availability==='1month'?'selected':''}>${L.avail1m}</option><option value="3months" ${p.availability==='3months'?'selected':''}>${L.avail3m}</option></select></div>
    <div class="form-group"><label>${L.bioEn}</label><textarea id="pf-bio-en">${esc(p.bio_en||'')}</textarea></div>
    <button class="btn-primary" onclick="saveProfile()"><i class="ti ti-check"></i> ${L.save}</button>
    <div style="margin-top:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-weight:600;font-size:15px;margin-bottom:12px"><i class="ti ti-file-cv" style="color:var(--indigo)"></i> ${L.cvTitle}</div>
      ${p.cv_url ? `<div style="margin-bottom:12px"><a href="${esc(p.cv_url)}" target="_blank" class="btn-ghost" style="font-size:13px"><i class="ti ti-download"></i> ${L.cvView}</a></div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <input type="file" id="cv-file" accept=".pdf,.doc,.docx" style="display:none" onchange="uploadAndParseCV()">
        <button type="button" class="btn-primary" onclick="document.getElementById('cv-file').click()" style="font-size:13px;padding:9px 16px"><i class="ti ti-sparkles"></i> ${isFr ? 'Importer & analyser CV (IA)' : 'Import & parse CV (AI)'}</button>
        <span style="font-size:12px;color:var(--muted)">${L.cvHint}</span>
      </div>
      <div id="cv-upload-status" style="display:none;font-size:13px;margin-top:8px;color:var(--muted)"></div>
    </div>` +
    `<div id="profile-skills-container"></div>` +
    `<div id="highlights-container"></div>` +
    `<div id="recommendations-container"></div>` +
    `<div id="my-endorsements-container" class="endorsements-section-placeholder"></div>`;
  updatePassportBadgesRow(getAvailBadges(_uid));
  updateSidebarOpenToWork(getAvailBadges(_uid));
  loadProfileSkillsSection();
  loadHighlightsIntoContainer();
  loadRecommendationsSection();
  loadEndorsements(state.user.id).then(data => {
    const el = document.getElementById('my-endorsements-container');
    if (el) el.outerHTML = renderEndorsementSection(data, state.user.id, true);
  });
}

async function uploadCV() {
  const file = document.getElementById('cv-file')?.files?.[0];
  if (!file) return;
  const status = document.getElementById('cv-upload-status');
  if (status) { status.style.display = 'block'; status.textContent = state.lang === 'fr' ? '⏳ Téléversement…' : '⏳ Uploading…'; }
  const fd = new FormData();
  fd.append('cv', file);
  try {
    const res = await fetch(`${BASE}/api/candidates/profile/cv`, { method: 'POST', credentials: 'include', body: fd });
    const d = await res.json();
    if (d.success) {
      toast(state.lang === 'fr' ? 'CV téléversé !' : 'CV uploaded!', 'success');
      if (status) status.style.display = 'none';
      loadProfileForm();
    } else {
      if (status) status.textContent = '❌ ' + (d.error || 'Upload failed');
    }
  } catch {
    if (status) status.textContent = '❌ ' + (state.lang === 'fr' ? 'Erreur réseau' : 'Network error');
  }
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
    phone: document.getElementById('pf-phone')?.value.trim(),
    desired_salary_min: parseInt(document.getElementById('pf-sal-min')?.value) || null,
    desired_salary_max: parseInt(document.getElementById('pf-sal-max')?.value) || null,
    skills: getProfileSkills(),
    experience_years: parseInt(document.getElementById('pf-exp')?.value) || 0,
    linkedin_url: document.getElementById('pf-linkedin')?.value.trim(),
    github_url: document.getElementById('pf-github')?.value.trim(),
    bio_en: document.getElementById('pf-bio-en')?.value.trim(),
    work_mode_pref: document.getElementById('pf-mode')?.value,
    availability: document.getElementById('pf-avail')?.value,
  };
  const d = await api('PUT', `${BASE}/api/candidates/profile`, body);
  if (d.success) {
    if (body.phone) state.user.phone = body.phone;
    if (body.first_name) state.user.first_name = body.first_name;
    if (body.last_name)  state.user.last_name  = body.last_name;
    toast('Profile saved!', 'success');
    loadProfileForm();
  } else toast(d.error || 'Failed to save', 'error');
}

// ── Applications (candidate) ───────────────────────────────
async function loadMyApplications() {
  const d = await api('GET', `${BASE}/api/applications/mine`);
  const container = document.getElementById('applications-list');
  const apps = d.applications || [];
  // Keep appliedJobIds in sync so Apply buttons reflect reality
  state.appliedJobIds = new Set(apps.map(a => a.job_id));
  if (!container) return;
  const t = T[state.lang];
  if (!apps.length) { container.innerHTML = `<div class="empty-state"><i class="ti ti-file-off"></i><p>${t['dash.empty.apps']}</p><button class="btn-primary" onclick="goto('jobs')" style="margin-top:16px">${t['dash.empty.browse']}</button></div>`; return; }

  const statuses = ['new','reviewed','shortlisted','interview','offer','rejected'];
  const statusLabel = state.lang === 'fr'
    ? { new:t['status.applied'], reviewed:t['status.reviewed'], shortlisted:t['status.shortlisted'], interview:t['status.interview'], offer:t['status.offer'], rejected:t['status.rejected'], withdrawn:t['status.withdrawn'] }
    : { new:'Applied', reviewed:'Reviewed', shortlisted:'Shortlisted', interview:'Interview', offer:'Offer', rejected:'Not selected', withdrawn:'Withdrawn' };

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
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="app-status ${a.status}">${statusLabel[a.status] || a.status}</span>
          <span style="font-size:11px;color:var(--muted)">${daysAgo(a.created_at)}</span>
          ${a.status !== 'withdrawn' ? `<button onclick="event.stopPropagation();openMessagesPage('${a.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #c7d2fe;background:#eef2ff;cursor:pointer;color:#6366f1;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap"><i class="ti ti-message-circle-2" style="font-size:12px"></i> ${state.lang==='fr'?'Contacter':'Message'}</button>` : ''}
        </div>
      </div>
      ${a.status !== 'rejected' && a.status !== 'withdrawn' ? `
      <div class="app-progress">
        ${progressSteps.map((s, i) => `<div class="prog-step${i <= pIdx ? ' done' : ''}${i === pIdx ? ' current' : ''}"><div class="prog-dot"></div><div class="prog-label">${statusLabel[s]}</div></div>`).join('<div class="prog-line"></div>')}
      </div>` : ''}
      ${a.status === 'rejected' && a.rejection_reason ? `
      <div style="margin-top:10px;border-left:3px solid #fca5a5;padding:10px 14px;background:#fff5f5;border-radius:0 8px 8px 0">
        <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px"><i class="ti ti-message"></i> ${state.lang==='fr'?'Motif communiqué par l\'employeur':'Reason provided by employer'}</div>
        <div style="font-size:13px;color:#374151">${esc(a.rejection_reason)}</div>
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
  if (!jobs.length) { const te=T[state.lang]; container.innerHTML = `<div class="empty-state"><i class="ti ti-heart"></i><p>${te['dash.empty.saved']}</p></div>`; return; }
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

// ── Job Alerts ────────────────────────────────────────────
async function loadAlerts() {
  const container = document.getElementById('tab-alerts');
  if (!container) return;
  const isFr = state.lang === 'fr';
  container.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:24px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/candidates/alerts`);
  const alerts = d.alerts || [];
  const workModes = [
    { value: '', label: isFr ? 'Tous modes' : 'All modes' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'onsite', label: 'On-site' },
  ];
  const provincesOpts = [{ code: '', name: isFr ? 'Toutes provinces' : 'All provinces' }, ...CA_PROVINCES]
    .map(p => `<option value="${p.code}">${p.name || p.code}</option>`).join('');

  const alertCards = alerts.length
    ? alerts.map(a => {
        const chips = [
          a.keywords && `<span class="job-tag">${esc(a.keywords)}</span>`,
          a.province && `<span class="job-tag">${esc(a.province)}</span>`,
          a.city && `<span class="job-tag">${esc(a.city)}</span>`,
          a.work_mode && `<span class="job-tag ${a.work_mode}">${a.work_mode}</span>`,
          a.job_type && `<span class="job-tag">${esc(a.job_type)}</span>`,
        ].filter(Boolean).join('');
        return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;background:var(--surface)">
          <i class="ti ti-bell" style="color:var(--indigo);font-size:20px;flex-shrink:0"></i>
          <div style="flex:1;min-width:0">
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${chips || `<span style="color:var(--muted);font-size:13px">${isFr ? 'Toutes offres' : 'All jobs'}</span>`}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${isFr ? 'Créée le' : 'Created'} ${new Date(a.created_at).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric' })}</div>
          </div>
          <button class="btn-ghost" style="color:var(--danger);border-color:var(--danger);font-size:12px;padding:6px 12px" onclick="deleteAlert('${a.id}')"><i class="ti ti-trash"></i></button>
        </div>`;
      }).join('')
    : `<div class="empty-state" style="padding:40px 0"><i class="ti ti-bell-off"></i><p>${isFr ? 'Aucune alerte configurée.' : 'No alerts configured yet.'}</p></div>`;

  container.innerHTML = `
    <div style="max-width:680px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div>
          <h3 style="margin:0;color:var(--dark)">${isFr ? 'Alertes emploi' : 'Job Alerts'}</h3>
          <p style="margin:4px 0 0;font-size:13px;color:var(--muted)">${isFr ? 'Recevez un email quand de nouvelles offres correspondent à vos critères.' : 'Get an email when new jobs match your criteria.'} (${alerts.length}/5)</p>
        </div>
      </div>

      ${alertCards}

      ${alerts.length < 5 ? `
      <div style="border:2px dashed var(--border);border-radius:12px;padding:24px;margin-top:16px">
        <h4 style="margin:0 0 16px;color:var(--dark);font-size:14px"><i class="ti ti-plus" style="color:var(--indigo)"></i> ${isFr ? 'Créer une alerte' : 'Create an alert'}</h4>
        <div class="form-row" style="gap:10px">
          <div class="form-group" style="flex:2">
            <label style="font-size:12px">${isFr ? 'Mots-clés (titre, compétence…)' : 'Keywords (title, skill…)'}</label>
            <input type="text" id="al-keywords" placeholder="${isFr ? 'ex. développeur React' : 'e.g. React developer'}" style="font-size:13px">
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">${isFr ? 'Mode de travail' : 'Work mode'}</label>
            <select id="al-mode" style="font-size:13px">${workModes.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row" style="gap:10px">
          <div class="form-group">
            <label style="font-size:12px">Province</label>
            <select id="al-province" style="font-size:13px">${provincesOpts}</select>
          </div>
          <div class="form-group">
            <label style="font-size:12px">${isFr ? 'Ville' : 'City'}</label>
            <input type="text" id="al-city" placeholder="${isFr ? 'ex. Montréal' : 'e.g. Toronto'}" style="font-size:13px">
          </div>
        </div>
        <button class="btn-primary" style="font-size:13px;padding:9px 20px" onclick="createAlert()"><i class="ti ti-bell-plus"></i> ${isFr ? 'Créer l\'alerte' : 'Create alert'}</button>
      </div>` : `<p style="font-size:13px;color:var(--muted);text-align:center;margin-top:12px">${isFr ? 'Maximum 5 alertes atteint.' : 'Maximum of 5 alerts reached.'}</p>`}
    </div>`;
}

async function createAlert() {
  const keywords = document.getElementById('al-keywords')?.value.trim();
  const work_mode = document.getElementById('al-mode')?.value;
  const province  = document.getElementById('al-province')?.value;
  const city      = document.getElementById('al-city')?.value.trim();
  const isFr = state.lang === 'fr';
  if (!keywords && !work_mode && !province && !city) {
    toast(isFr ? 'Précisez au moins un critère.' : 'Please set at least one criterion.', 'error');
    return;
  }
  const d = await api('POST', `${BASE}/api/candidates/alerts`, { keywords, work_mode, province, city });
  if (d.success) {
    toast(isFr ? 'Alerte créée !' : 'Alert created!', 'success');
    loadAlerts();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

async function deleteAlert(id) {
  const d = await api('DELETE', `${BASE}/api/candidates/alerts/${id}`);
  if (d.success) {
    toast(state.lang === 'fr' ? 'Alerte supprimée.' : 'Alert deleted.', 'success');
    loadAlerts();
  }
}

// ── Jobs for You ──────────────────────────────────────────
async function loadJobsForYou() {
  const container = document.getElementById('jobs-for-you');
  if (!container) return;
  const isFr = state.lang === 'fr';

  const profileD = await api('GET', `${BASE}/api/candidates/profile`);
  const p = profileD.profile || {};
  const skills = safeJsonArr(p.skills);

  if (!skills.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>${T[state.lang]['dash.empty.skills']}</p></div>`;
    return;
  }

  // Build extra filters from profile
  const modeParam = p.work_mode_pref ? `&work_mode=${p.work_mode_pref}` : '';
  const provParam = p.province      ? `&province=${encodeURIComponent(p.province)}` : '';

  // Try progressively broader searches until we get results
  let jobs = [];
  let usedSkills = [];

  // Round 1 — top 3 skills combined + profile filters
  const r1 = await api('GET', `${BASE}/api/jobs?q=${encodeURIComponent(skills.slice(0,3).join(' '))}&limit=6${modeParam}${provParam}`);
  jobs = r1.jobs || [];
  usedSkills = skills.slice(0, 3);

  // Round 2 — each skill individually, merge unique results
  if (!jobs.length) {
    const searches = await Promise.all(
      skills.slice(0, 5).map(s => api('GET', `${BASE}/api/jobs?q=${encodeURIComponent(s)}&limit=4${modeParam}${provParam}`))
    );
    const seen = new Set();
    for (const r of searches) {
      for (const j of (r.jobs || [])) {
        if (!seen.has(j.id)) { seen.add(j.id); jobs.push(j); }
      }
    }
    jobs = jobs.slice(0, 6);
  }

  // Round 3 — broadest: headline keyword, no mode/province filter
  if (!jobs.length && (p.headline_en || p.headline_fr)) {
    const keyword = (p.headline_en || p.headline_fr || '').split(/\s+/).slice(0, 2).join(' ');
    const r3 = await api('GET', `${BASE}/api/jobs?q=${encodeURIComponent(keyword)}&limit=6`);
    jobs = r3.jobs || [];
  }

  if (!jobs.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>${isFr ? 'Aucun emploi correspondant pour l\'instant — ajoutez plus de compétences à votre profil.' : 'No matches yet — add more skills to your profile to improve matching.'}</p></div>`;
    return;
  }

  container.innerHTML =
    `<p style="font-size:12px;color:var(--muted);margin-bottom:12px">${isFr ? 'Basé sur' : 'Based on'}: ${usedSkills.slice(0,3).map(s=>`<span class="skill-chip">${esc(s)}</span>`).join(' ')}</p>` +
    jobs.map(j => {
      const title = isFr ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
      return `<div class="jfy-card" onclick="goto('jobs')">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div class="jfy-title">${esc(title)}</div>
          ${matchScoreBadge(j)}
        </div>
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
  loadTeam();
  loadMsgUnreadBadge();
}

// ── Work Team ──────────────────────────────────────────────
function _tt(k) { return (T[state.lang] && T[state.lang][k]) || k; }

async function loadTeam() {
  const container = document.getElementById('team-container');
  if (!container) return;
  container.innerHTML = `
    <div class="team-invite-card" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="font-weight:600;font-size:15px;margin-bottom:12px"><i class="ti ti-user-plus" style="color:var(--indigo)"></i> ${_tt('team.invite.title')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="email" id="team-invite-email" style="flex:1;min-width:200px" placeholder="${_tt('team.invite.ph')}">
        <select id="team-invite-role" style="width:160px">
          <option value="recruiter">${_tt('team.role.recruiter')}</option>
          <option value="admin">${_tt('team.role.admin')}</option>
        </select>
        <button class="btn-primary" type="button" onclick="inviteTeamMember()" style="white-space:nowrap">
          <i class="ti ti-send"></i> ${_tt('team.invite.btn')}
        </button>
      </div>
      <div id="team-invite-err" class="form-error" style="display:none"></div>
    </div>
    <div id="team-members-list"><div class="spinner-wrap"><div class="spinner"></div></div></div>
  `;
  await refreshTeamList();
}

async function refreshTeamList() {
  const list = document.getElementById('team-members-list');
  if (!list) return;
  const d = await api('GET', `${BASE}/api/team`);
  const members = d.members || [];
  if (!members.length) {
    list.innerHTML = `<div class="empty-state" style="padding:32px 16px"><i class="ti ti-users" style="font-size:36px;color:var(--muted)"></i><p style="color:var(--muted)">${_tt('team.empty')}</p></div>`;
    return;
  }
  const isFr = state.lang === 'fr';
  list.innerHTML = members.map(m => {
    const name = (m.first_name || m.last_name) ? `${m.first_name||''} ${m.last_name||''}`.trim() : m.email;
    const initials = name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() || '?';
    const statusLabel = m.status === 'active' ? _tt('team.status.active') : _tt('team.status.pending');
    const statusColor = m.status === 'active' ? 'var(--green,#22c55e)' : 'var(--gold,#f59e0b)';
    const inviterName = m.inviter_first ? `${m.inviter_first} ${m.inviter_last||''}`.trim() : '';
    const invitedDate = m.invited_at ? new Date(m.invited_at).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', {month:'short',day:'numeric',year:'numeric'}) : '';
    return `<div class="team-member-row" style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--indigo);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${esc(initials)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(name)}</div>
        <div style="font-size:12px;color:var(--muted)">${esc(m.email)}</div>
        ${inviterName ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${isFr?'Invité par':'Invited by'} ${esc(inviterName)} · ${esc(invitedDate)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
        <select onchange="changeTeamRole('${m.id}',this.value)" style="font-size:12px;padding:2px 6px;border-radius:6px">
          <option value="recruiter"${m.role==='recruiter'?' selected':''}>${_tt('team.role.recruiter')}</option>
          <option value="admin"${m.role==='admin'?' selected':''}>${_tt('team.role.admin')}</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-left:4px">
        ${m.status==='pending' ? `<button type="button" class="btn-ghost" style="font-size:12px;padding:4px 8px" onclick="resendTeamInvite('${m.id}')">${_tt('team.resend')}</button>` : ''}
        <button type="button" class="btn-ghost" style="font-size:12px;padding:4px 8px;color:var(--danger,#ef4444)" onclick="removeTeamMember('${m.id}','${esc(name)}')">${_tt('team.remove')}</button>
      </div>
    </div>`;
  }).join('');
}

async function inviteTeamMember() {
  const email = document.getElementById('team-invite-email')?.value.trim();
  const role = document.getElementById('team-invite-role')?.value || 'recruiter';
  const errEl = document.getElementById('team-invite-err');
  errEl.style.display = 'none';
  if (!email) { showErr(errEl, 'Email required'); return; }
  const d = await api('POST', `${BASE}/api/team/invite`, { email, role });
  if (d.success) {
    toast(_tt('team.status.pending') + ' ✓', 'success');
    document.getElementById('team-invite-email').value = '';
    await refreshTeamList();
  } else {
    showErr(errEl, d.error || 'Failed to send invitation');
  }
}

async function changeTeamRole(memberId, role) {
  const d = await api('PUT', `${BASE}/api/team/${memberId}/role`, { role });
  if (!d.success) toast(d.error || 'Error', 'error');
}

async function removeTeamMember(memberId, name) {
  if (!confirm(`${_tt('team.remove')} ${name} ?`)) return;
  const d = await api('DELETE', `${BASE}/api/team/${memberId}`);
  if (d.success) { toast('✓', 'success'); await refreshTeamList(); }
  else toast(d.error || 'Error', 'error');
}

async function resendTeamInvite(memberId) {
  const d = await api('POST', `${BASE}/api/team/resend/${memberId}`);
  if (d.success) toast(_tt('team.resend') + ' ✓', 'success');
  else toast(d.error || 'Error', 'error');
}

async function handleAcceptInvite(token) {
  const d = await api('GET', `${BASE}/api/team/accept/${token}`);
  if (d.success) {
    toast(`Bienvenue dans l'équipe ${esc(d.company||'')} !`, 'success');
    if (state.user) { state.user.company_id = d.company; goto('employer-dash'); }
    else goto('login');
  } else if (d.needsRegister) {
    toast("Créez un compte avec l'adresse " + d.email + " pour rejoindre l'équipe.", 'info');
    goto('register');
  } else {
    toast(d.error || "Invitation invalide ou expirée", 'error');
  }
}

async function loadEmployerJobs() {
  const d = await api('GET', `${BASE}/api/jobs/company/mine`);
  const container = document.getElementById('employer-jobs-list');
  if (!container) return;
  const jobs = d.jobs || [];
  if (!jobs.length) { container.innerHTML = '<div class="empty-state"><i class="ti ti-briefcase"></i><p>No jobs posted yet.</p><button class="btn-primary" onclick="showEmpTab(\'etab-post\')" style="margin-top:16px"><i class="ti ti-plus"></i> Post your first job</button></div>'; return; }

  container.innerHTML = jobs.map(j => {
    const isFr = state.lang === 'fr';
    const title = isFr ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const apps = parseInt(j.apps || 0);
    const views = parseInt(j.views || 0);
    const conv = views > 0 ? ((apps / views) * 100).toFixed(1) : 0;
    const exp = j.expires_at ? daysUntil(j.expires_at) : null;
    return `<div class="emp-job-card-v2" id="job-card-${j.id}">
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
        <div class="emp-stat"><i class="ti ti-eye"></i><span>${views}</span><small>${isFr?'Vues':'Views'}</small></div>
        <div class="emp-stat"><i class="ti ti-users"></i><span>${apps}</span><small>${isFr?'Candidats':'Applicants'}</small></div>
        <div class="emp-stat"><i class="ti ti-percentage"></i><span>${conv}%</span><small>${isFr?'Conversion':'Conversion'}</small></div>
      </div>
      <div class="emp-job-actions">
        ${j.status !== 'rejected' ? `<button class="btn-ghost" style="font-size:13px;padding:6px 14px" onclick="openKanban('${j.id}','${esc(title)}')"><i class="ti ti-layout-kanban"></i> Kanban</button>` : ''}
        ${j.status === 'rejected'
          ? `<button class="btn-ghost" style="font-size:13px;padding:6px 14px;color:#dc2626;border-color:#fca5a5" onclick="deleteRejectedJob('${j.id}')"><i class="ti ti-trash"></i> ${isFr?'Supprimer':'Delete'}</button>`
          : `<button class="btn-ghost" style="font-size:13px;padding:6px 14px" onclick="closeJob('${j.id}')"><i class="ti ti-x"></i> ${isFr?'Fermer':'Close'}</button>`}
      </div>
      ${apps > 0 ? `
      <div class="inline-candidates" id="icands-${j.id}">
        <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;padding-top:12px;border-top:1px solid var(--border)">
          <i class="ti ti-users"></i> ${isFr?'Candidatures reçues':'Applications received'} (${apps})
        </div>
        <div id="icands-list-${j.id}" style="display:flex;flex-direction:column;gap:8px">
          <div style="color:var(--muted);font-size:13px"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> ${isFr?'Chargement...':'Loading...'}</div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');

  // Load candidates inline for each job that has applications
  for (const j of jobs) {
    if (parseInt(j.apps || 0) > 0) loadInlineCandidates(j.id);
  }
}

async function loadInlineCandidates(jobId) {
  const container = document.getElementById(`icands-list-${jobId}`);
  if (!container) return;
  const isFr = state.lang === 'fr';
  const d = await api('GET', `${BASE}/api/applications/job/${jobId}`);
  const apps = d.applications || [];
  if (!apps.length) { container.innerHTML = `<div style="color:var(--muted);font-size:13px">${isFr?'Aucun candidat':'No applicants'}</div>`; return; }

  const statusColors = { new:'#6366F1', reviewed:'#8B5CF6', shortlisted:'#F59E0B', interview:'#10B981', offer:'#22C55E', rejected:'#EF4444', withdrawn:'#9CA3AF' };
  const statusLabels = isFr
    ? { new:'Nouveau', reviewed:'En examen', shortlisted:'Présélectionné', interview:'Entretien', offer:'Offre', rejected:'Refusé', withdrawn:'Retiré' }
    : { new:'New', reviewed:'Reviewing', shortlisted:'Shortlisted', interview:'Interview', offer:'Offer', rejected:'Rejected', withdrawn:'Withdrawn' };
  const progressSteps = isFr
    ? [{ key:'reviewed', label:'En examen' }, { key:'shortlisted', label:'Présélectionner' }, { key:'interview', label:'Inviter entretien' }, { key:'offer', label:'Faire une offre' }]
    : [{ key:'reviewed', label:'Review' }, { key:'shortlisted', label:'Shortlist' }, { key:'interview', label:'Invite interview' }, { key:'offer', label:'Make offer' }];

  container.innerHTML = apps.map(a => {
    const name = `${a.first_name||''} ${a.last_name||''}`.trim() || (isFr?'Candidat':'Candidate');
    const cvLink = a.profile_cv || a.cv_url;
    const status = a.status || 'new';
    const color = statusColors[status] || '#6366F1';
    const label = statusLabels[status] || status;
    const isActive = status !== 'rejected' && status !== 'withdrawn';
    const availableProgress = progressSteps.filter(s => s.key !== status);
    const rejectLabel = isFr ? 'Rejeter' : 'Reject';
    return `<div style="background:var(--surface,#f8f9fa);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px;min-width:200px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--indigo);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${(a.first_name||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:600;font-size:14px;color:var(--text)">${esc(name)}</div>
          <div style="font-size:12px;color:var(--muted)">${a.experience_years||0} ${isFr?'ans exp':'yrs exp'}${a.headline_fr||a.headline_en ? ' · '+esc(isFr?a.headline_fr||a.headline_en:a.headline_en||a.headline_fr) : ''}</div>
          ${cvLink ? `<a href="${esc(cvLink)}" target="_blank" style="font-size:11px;color:var(--indigo);text-decoration:none;font-weight:600"><i class="ti ti-file-cv"></i> ${isFr?'Voir CV':'View CV'}</a>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="background:${color}22;color:${color};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">${label}</span>
        ${isActive ? availableProgress.map(s =>
          `<button onclick="updateCandidateStatus('${a.id}','${s.key}','${jobId}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:#fff;cursor:pointer;color:var(--text);white-space:nowrap">${s.label}</button>`
        ).join('') : ''}
        <button onclick="openMessagesPage('${a.id}')" title="${isFr?'Ouvrir le chat':'Open chat'}" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #c7d2fe;background:#eef2ff;cursor:pointer;color:#6366f1;white-space:nowrap"><i class="ti ti-message-circle-2" style="font-size:12px"></i> ${isFr?'Chat':'Chat'}</button>
        ${isActive ? `<button onclick="openRejectModal('${a.id}','${jobId}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fff5f5;cursor:pointer;color:#dc2626;white-space:nowrap"><i class="ti ti-x" style="font-size:10px"></i> ${rejectLabel}</button>` : ''}
        ${status === 'rejected' ? `<button onclick="deleteRejectedApplication('${a.id}','${jobId}')" title="${isFr?'Supprimer':'Delete'}" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#9ca3af;white-space:nowrap"><i class="ti ti-trash" style="font-size:12px"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function updateCandidateStatus(appId, newStatus, jobId, rejectionReason = null) {
  const isFr = state.lang === 'fr';
  const body = { status: newStatus };
  if (rejectionReason) body.rejection_reason = rejectionReason;
  const d = await api('PUT', `${BASE}/api/applications/${appId}/status`, body);
  if (d.success) {
    const labels = { reviewed: isFr?'En examen':'Reviewing', shortlisted: isFr?'Présélectionné':'Shortlisted', interview: isFr?'Entretien':'Interview', offer: isFr?'Offre':'Offer', rejected: isFr?'Refusé':'Rejected' };
    toast(`✓ ${labels[newStatus] || newStatus}${isFr?' — email envoyé au candidat':' — candidate notified by email'}`, 'success');
    loadInlineCandidates(jobId);
  } else {
    toast(d.error || 'Error', 'error');
  }
}

function openRejectModal(appId, jobId) {
  const isFr = state.lang === 'fr';
  const existing = document.getElementById('reject-reason-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'reject-reason-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:36px;height:36px;background:#fef2f2;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-x" style="color:#dc2626;font-size:18px"></i></div>
        <h3 style="margin:0;font-size:17px;font-weight:700;color:#111">${isFr ? 'Rejeter la candidature' : 'Reject application'}</h3>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">${isFr ? 'Le candidat sera notifié par email. Le motif est optionnel mais recommandé.' : 'The candidate will be notified by email. Reason is optional but recommended.'}</p>
      <textarea id="reject-reason-text" placeholder="${isFr ? 'Motif de rejet (optionnel) — ex: profil ne correspond pas aux exigences du poste, manque d\'expérience en...' : 'Reason (optional) — e.g. profile does not match requirements, insufficient experience in...'}"
        style="width:100%;min-height:100px;border:1px solid #e5e7eb;border-radius:10px;padding:12px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none" maxlength="500"></textarea>
      <div style="font-size:11px;color:#9ca3af;margin:4px 0 18px;text-align:right"><span id="reject-char-count">0</span>/500</div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('reject-reason-modal').remove()" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;color:#374151">${isFr ? 'Annuler' : 'Cancel'}</button>
        <button onclick="confirmReject('${appId}','${jobId}')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:600">${isFr ? 'Confirmer le rejet' : 'Confirm reject'}</button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  const ta = modal.querySelector('textarea');
  ta.addEventListener('input', () => { modal.querySelector('#reject-char-count').textContent = ta.value.length; });
  document.body.appendChild(modal);
  setTimeout(() => ta.focus(), 50);
}

async function confirmReject(appId, jobId) {
  const reason = document.getElementById('reject-reason-text')?.value?.trim() || null;
  document.getElementById('reject-reason-modal')?.remove();
  await updateCandidateStatus(appId, 'rejected', jobId, reason);
}

async function deleteRejectedApplication(appId, jobId) {
  const isFr = state.lang === 'fr';
  if (!confirm(isFr ? 'Supprimer définitivement cette candidature refusée ?' : 'Permanently delete this rejected application?')) return;
  const d = await api('DELETE', `${BASE}/api/applications/${appId}`);
  if (d.success) {
    toast(isFr ? 'Candidature supprimée' : 'Application deleted', 'success');
    loadInlineCandidates(jobId);
  } else {
    toast(d.error || 'Error', 'error');
  }
}

async function deleteRejectedJob(jobId) {
  const isFr = state.lang === 'fr';
  if (!confirm(isFr ? 'Supprimer définitivement cette offre refusée ?' : 'Permanently delete this rejected job listing?')) return;
  const d = await api('DELETE', `${BASE}/api/jobs/${jobId}`);
  if (d.success) {
    toast(isFr ? 'Offre supprimée' : 'Job deleted', 'success');
    document.getElementById(`job-card-${jobId}`)?.remove();
  } else {
    toast(d.error || 'Error', 'error');
  }
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

  loadKanbanEndorsementBadges(apps);
  loadNotesBadges(apps);
}

function aiCvBadge(a) {
  if (!a.ai_cv_consent || a.ai_cv_score === null || a.ai_cv_score === undefined) return '';
  const score = parseInt(a.ai_cv_score);
  const isNaN_ = isNaN(score);
  if (isNaN_) return '';
  const label = score <= 35 ? 'Likely Human' : score <= 65 ? 'Uncertain' : 'Likely AI';
  const bg    = score <= 35 ? '#D1FAE5' : score <= 65 ? '#FEF3C7' : '#FEE2E2';
  const color = score <= 35 ? '#065F46' : score <= 65 ? '#92400E' : '#991B1B';
  const icon  = score <= 35 ? 'ti-user-check' : score <= 65 ? 'ti-help-circle' : 'ti-robot';
  return `<div title="AI CV detection: ${score}% probability AI-generated" style="display:inline-flex;align-items:center;gap:4px;background:${bg};color:${color};border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;margin-bottom:4px"><i class="ti ${icon}"></i> ${label} (${score}%)</div>`;
}

function kanbanCard(a, col) {
  const skills = safeJsonArr(a.skills);
  const cuid = a.user_id || '';
  const cname = `${a.first_name||''} ${a.last_name||''}`.trim();
  return `<div class="kanban-card" data-cuid="${cuid}">
    <div class="kanban-card-name">${esc(a.first_name||'')} ${esc(a.last_name||'')}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${a.experience_years || 0} yrs exp${a.headline_en ? ' · '+esc(a.headline_en) : ''}</div>
    ${aiCvBadge(a)}
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
    ${cuid ? `<div class="kanban-endorse-row">
      <span id="ke-${cuid}" class="kanban-endorse-pill" style="display:none"></span>
      <button class="btn-ghost kanban-endorse-btn" onclick="openEndorseModal('${cuid}','${esc(cname)}')"><i class="ti ti-thumb-up"></i> Endorse</button>
    </div>` : ''}
    <div class="kanban-notes-row">
      <button class="btn-ghost kanban-notes-btn" onclick="openNotesModal('${a.id}','${esc(cname)}')">
        <i class="ti ti-message-circle-2"></i> Suivi RH<span id="kn-${a.id}" class="kanban-notes-badge" style="display:none"></span>
      </button>
    </div>
  </div>`;
}

async function loadKanbanEndorsementBadges(apps) {
  const seen = new Set();
  for (const a of apps) {
    if (!a.user_id || seen.has(a.user_id)) continue;
    seen.add(a.user_id);
    loadEndorsements(a.user_id).then(data => {
      const el = document.getElementById(`ke-${a.user_id}`);
      if (!el) return;
      if (data.total > 0) {
        el.innerHTML = `<i class="ti ti-thumb-up"></i> ${data.total}`;
        el.style.display = 'inline-flex';
      }
    });
  }
}

// ── TEAM NOTES ───────────────────────────────────────────

function fmtNoteDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

async function loadNotesBadges(apps) {
  for (const a of apps) {
    if (!a.id) continue;
    api('GET', `${BASE}/api/notes/${a.id}`).then(data => {
      const el = document.getElementById(`kn-${a.id}`);
      if (!el) return;
      const count = (data.notes || []).length;
      if (count > 0) {
        el.textContent = count;
        el.style.display = 'inline-flex';
      }
    }).catch(() => {});
  }
}

async function openNotesModal(appId, candidateName) {
  if (!state.user) { showModal('modal-login'); return; }
  const modal = document.getElementById('modal-notes');
  if (!modal) return;
  document.getElementById('notes-modal-name').textContent = candidateName;
  const thread = document.getElementById('notes-thread');
  thread.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted)"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:22px"></i></div>`;
  document.getElementById('note-input').value = '';
  modal.dataset.appId = appId;
  modal.style.display = 'flex';
  await refreshNotes(appId);
}

async function refreshNotes(appId) {
  const data = await api('GET', `${BASE}/api/notes/${appId}`);
  const thread = document.getElementById('notes-thread');
  if (!thread) return;
  const notes = data.notes || [];
  if (!notes.length) {
    thread.innerHTML = `<div class="notes-empty"><i class="ti ti-pencil-plus" style="font-size:28px;margin-bottom:8px;opacity:.4"></i><p>Aucune note pour l'instant.<br>Ajoutez la première note de suivi ci-dessous.</p></div>`;
  } else {
    thread.innerHTML = notes.map(n => `
      <div class="note-item" id="note-${n.id}">
        <div class="note-header">
          <span class="note-author"><i class="ti ti-user-circle"></i> ${esc(n.author_name || 'RH')}</span>
          <span class="note-date">${fmtNoteDate(n.created_at)}</span>
          ${n.author_id === state.user?.id ? `<button class="note-del-btn" title="Supprimer" onclick="deleteNote('${n.id}','${appId}')"><i class="ti ti-trash"></i></button>` : ''}
        </div>
        <div class="note-body">${esc(n.content)}</div>
      </div>
    `).join('');
    thread.scrollTop = thread.scrollHeight;
  }
  // Update badge
  const badge = document.getElementById(`kn-${appId}`);
  if (badge) {
    if (notes.length > 0) { badge.textContent = notes.length; badge.style.display = 'inline-flex'; }
    else { badge.style.display = 'none'; }
  }
}

async function submitNote() {
  const modal = document.getElementById('modal-notes');
  const appId = modal?.dataset.appId;
  const input = document.getElementById('note-input');
  const content = input?.value.trim();
  if (!content || !appId) return;
  const btn = modal.querySelector('.notes-compose .btn-primary');
  if (btn) btn.disabled = true;
  input.disabled = true;
  try {
    await api('POST', `${BASE}/api/notes`, { appId, content });
    input.value = '';
    await refreshNotes(appId);
  } finally {
    input.disabled = false;
    if (btn) btn.disabled = false;
    input.focus();
  }
}

async function deleteNote(noteId, appId) {
  if (!confirm('Supprimer cette note ?')) return;
  await api('DELETE', `${BASE}/api/notes/${noteId}`);
  await refreshNotes(appId);
}

// ─────────────────────────────────────────────────────────
async function openEndorseModal(userId, name) {
  if (!state.user) { showModal('modal-login'); return; }
  const modal = document.getElementById('modal-endorse');
  const nameEl = document.getElementById('endorse-modal-name');
  const body = document.getElementById('endorse-modal-body');
  if (!modal || !body) return;
  nameEl.textContent = name;
  body.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted)"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:22px"></i></div>`;
  modal.style.display = 'flex';
  const data = await loadEndorsements(userId);
  body.innerHTML = renderEndorsementSection(data, userId, false);
  modal.dataset.candidateId = userId;
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
  form.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>Job Title (EN) *</label><input type="text" id="jf-title-en" placeholder="e.g. Senior Full-Stack Developer" required></div>
      <div class="form-group"><label>Titre du poste (FR)</label><input type="text" id="jf-title-fr" placeholder="ex: Développeur Full-Stack Senior"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Work mode</label><select id="jf-mode" onchange="toggleLocationByMode()"><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="remote-intl">Fully Remote (International)</option></select></div>
      <div class="form-group"><label>Job type</label><select id="jf-type"><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="temporary">Temporary</option><option value="permanent">Permanent</option></select></div>
    </div>

    <div id="jf-location-block">
      <div class="location-geo-label"><i class="ti ti-map-pin" style="color:var(--indigo)"></i> Job location</div>
      <div class="form-row">
        <div class="form-group">
          <label>Location (Province or Country) *</label>
          <select id="jf-province">
            ${buildLocationOptions('')}
          </select>
        </div>
        <div class="form-group" id="jf-city-group">
          <label>City</label>
          <input type="text" id="jf-city" placeholder="e.g. Montréal, Paris, Dubai...">
        </div>
      </div>
      <div class="form-group">
        <label>Street address <span style="color:var(--muted);font-weight:400">(optional)</span></label>
        <input type="text" id="jf-address" placeholder="e.g. 1600 Cyrille-Duquet Rue">
      </div>
    </div>

    <div id="jf-remote-block" style="display:none">
      <div class="info-box"><i class="ti ti-world"></i> Fully remote — open to candidates worldwide. You can specify a preferred timezone below.</div>
      <div class="form-group"><label>Preferred timezone <span style="color:var(--muted);font-weight:400">(optional)</span></label><select id="jf-tz"><option value="">Any timezone</option><option>UTC-12 to UTC-10 (Pacific Islands)</option><option>UTC-8 / PT (Vancouver, Los Angeles, Seattle)</option><option>UTC-7 / MT (Calgary, Denver, Phoenix)</option><option>UTC-6 / CT (Winnipeg, Chicago, Mexico City)</option><option>UTC-5 / ET (Toronto, Montréal, New York, Miami)</option><option>UTC-4 / AT (Halifax, Moncton, Caracas)</option><option>UTC-3 / NT + BRT (St. John's, São Paulo, Buenos Aires)</option><option>UTC+0 / GMT (London, Lisbon, Accra)</option><option>UTC+1 / CET (Paris, Berlin, Rome, Madrid)</option><option>UTC+2 / EET (Helsinki, Athens, Cairo, Johannesburg)</option><option>UTC+3 / MSK + EAT (Moscow, Nairobi, Riyadh)</option><option>UTC+4 / GST (Dubai, Abu Dhabi, Tbilisi)</option><option>UTC+5:30 / IST (India)</option><option>UTC+7 / ICT (Bangkok, Jakarta, Hanoi)</option><option>UTC+8 / CST + SGT (Singapore, Hong Kong, Beijing)</option><option>UTC+9 / JST + KST (Tokyo, Seoul)</option><option>UTC+10 / AEST (Sydney, Melbourne, Brisbane)</option><option>UTC+12 / NZST (Auckland, Wellington)</option></select></div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Min salary</label><input type="number" id="jf-sal-min" placeholder="60000"></div>
      <div class="form-group"><label>Max salary</label><input type="number" id="jf-sal-max" placeholder="90000"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Currency</label><select id="jf-currency"><option value="CAD">CAD — Canadian Dollar</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option></select></div>
      <div class="form-group"><label>Pay period</label><select id="jf-sal-period"><option value="year">Per year (annual)</option><option value="month">Per month</option><option value="hour">Per hour</option></select></div>
    </div>
    <div class="form-group"><label>Required experience</label><select id="jf-exp"><option value="">Not specified</option><option value="0-1">0-1 years (Junior)</option><option value="1-3">1-3 years (Intermediate)</option><option value="3-5">3-5 years (Senior)</option><option value="5+">5+ years (Lead / Expert)</option></select></div>
    <div class="form-group"><label>Skills required</label>${renderJobSkillInput()}</div>
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


async function postJob(e) {
  e.preventDefault();
  const errEl = document.getElementById('jf-error');
  errEl.style.display = 'none';

  const mode = document.getElementById('jf-mode')?.value || 'onsite';
  const normalizedMode = (mode === 'remote-intl') ? 'remote' : mode;
  const locVal = document.getElementById('jf-province')?.value || '';
  const city = document.getElementById('jf-city')?.value.trim() || null;

  // Parse location: "c:CountryName" = international, province code = Canada
  let province = null;
  let jobCountry = 'Canada';
  if (mode === 'remote-intl') {
    jobCountry = 'International';
  } else if (locVal.startsWith('c:')) {
    jobCountry = locVal.slice(2);
    province = null;
  } else if (locVal && locVal !== 'REMOTE') {
    province = locVal;
    jobCountry = 'Canada';
  }

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
    address: document.getElementById('jf-address')?.value.trim() || null,
    province: (mode === 'remote' || mode === 'remote-intl') ? null : province,
    country: jobCountry,
    salary_min: parseInt(document.getElementById('jf-sal-min')?.value) || null,
    salary_max: parseInt(document.getElementById('jf-sal-max')?.value) || null,
    salary_currency: document.getElementById('jf-currency')?.value || 'CAD',
    salary_period: document.getElementById('jf-sal-period')?.value || 'year',
    experience_years: document.getElementById('jf-exp')?.value || null,
    skills_required: getJobSkills(),
    languages_required: langs,
  };
  if (!body.title_en || !body.description_en) { showErr(errEl, 'Title (EN) and description required'); return; }

  const submitBtn = document.querySelector('#post-job-form [type=submit]') || document.querySelector('#post-job-form button[class*=primary]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .7s linear infinite"></i> Analyse IA en cours…'; }

  const d = await api('POST', `${BASE}/api/jobs`, body);

  if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ti ti-send"></i> Publish Job'; }

  if (d.success) {
    const mod = d.moderation;
    if (mod?.verdict === 'pending_review') {
      showModerationFeedback('pending', '🕐 Offre soumise — en cours de vérification', mod.message || 'Votre offre sera examinée sous 24–48 h.');
    } else {
      toast('✅ Offre publiée immédiatement !', 'success');
    }
    showEmpTab('etab-jobs', document.querySelector('[data-emptab=etab-jobs]'));
    loadEmployerJobs();
  } else if (d.moderated) {
    // Auto-rejected by AI
    const flagLabels = { spam:'Spam', scam:'Arnaque', illegal:'Contenu illégal', adult_content:'Contenu adulte', gibberish:'Contenu incompréhensible', salary_unrealistic:'Salaire irréaliste', too_short:'Trop court', contact_info_in_description:'Contact dans la description' };
    const flagsHtml = (d.flags||[]).map(f => `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;font-size:12px">${flagLabels[f]||f}</span>`).join(' ');
    showErr(errEl, `<div style="line-height:1.7">
      <strong>⚠️ Offre refusée par le filtre IA</strong><br>
      ${d.reason || 'Votre offre ne respecte pas les critères de publication.'}<br>
      ${flagsHtml ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${flagsHtml}</div>` : ''}
    </div>`);
  } else {
    showErr(errEl, d.error || 'Failed to post job');
  }
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
          <button class="btn-primary" onclick="startCheckout('pro','year')" style="background:var(--green);border-color:var(--green)"><i class="ti ti-crown"></i> Pro — $990/yr <span style="background:rgba(255,255,255,0.25);color:#fff;padding:2px 8px;border-radius:100px;font-size:10px;margin-left:4px">-16%</span></button>
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

// ── Endorsements ("Recommandé par") ────────────────────────
const ENDORSE_QUALITIES = [
  { id:'skills',        en:'Skills',         fr:'Compétences',   icon:'ti-code',         color:'#6366f1', bg:'#eef2ff' },
  { id:'serious',       en:'Seriousness',    fr:'Sérieux',        icon:'ti-shield-check', color:'#0d9488', bg:'#f0fdfa' },
  { id:'punctual',      en:'Punctuality',    fr:'Ponctualité',    icon:'ti-clock',        color:'#2563eb', bg:'#eff6ff' },
  { id:'expertise',     en:'Expertise',      fr:'Expertise',      icon:'ti-award',        color:'#7c3aed', bg:'#f5f3ff' },
  { id:'communication', en:'Communication',  fr:'Communication',  icon:'ti-message',      color:'#d97706', bg:'#fffbeb' },
  { id:'leadership',    en:'Leadership',     fr:'Leadership',     icon:'ti-crown',        color:'#dc2626', bg:'#fef2f2' },
];

async function loadEndorsements(candidateId) {
  const d = await api('GET', `${BASE}/api/endorsements/${candidateId}`);
  return d;
}

async function endorseUser(candidateId, quality) {
  const d = await api('POST', `${BASE}/api/endorsements`, { candidateId, quality });
  if (d.error) { toast(d.error, 'error'); return null; }
  toast(T[state.lang]?.endorseThank || 'Endorsement sent! 🙌', 'success');
  return d;
}

async function removeEndorsement(candidateId, quality) {
  return await api('DELETE', `${BASE}/api/endorsements/${candidateId}/${quality}`);
}

function renderEndorsementSection(data, candidateId, isOwn) {
  const lang = state.lang || 'en';
  const { total = 0, byQuality = {}, endorsersByQuality = {}, myEndorsements = [] } = data || {};

  const totalStr = total === 0
    ? (lang === 'fr' ? 'Aucune recommandation encore' : 'No endorsements yet')
    : total === 1
      ? (lang === 'fr' ? 'Recommandé par 1 professionnel' : 'Endorsed by 1 professional')
      : (lang === 'fr' ? `Recommandé par ${total} professionnels` : `Endorsed by ${total} professionals`);

  const cards = ENDORSE_QUALITIES.map(q => {
    const count = byQuality[q.id] || 0;
    const endorsers = endorsersByQuality[q.id] || [];
    const iMine = myEndorsements.includes(q.id);
    const label = lang === 'fr' ? q.fr : q.en;
    const endorserNames = endorsers.slice(0, 3).map(e => e.name).join(', ');
    const moreCount = (byQuality[q.id] || 0) - 3;

    return `<div class="endorse-card ${count > 0 ? 'has-endorsements' : ''}">
      <div class="endorse-icon" style="background:${q.bg};color:${q.color}"><i class="ti ${q.icon}"></i></div>
      <div class="endorse-body">
        <div class="endorse-label">${label}</div>
        ${count > 0 ? `<div class="endorse-names">${endorserNames}${moreCount > 0 ? ` +${moreCount}` : ''}</div>` : ''}
      </div>
      <div class="endorse-count-wrap">
        ${count > 0 ? `<span class="endorse-count" style="color:${q.color}">${count}</span>` : ''}
        ${!isOwn ? `<button class="endorse-btn ${iMine ? 'endorsed' : ''}"
          style="--ec:${q.color}"
          data-endorse-candidate="${candidateId}" data-endorse-q="${q.id}"
          onclick="handleEndorseClick(this,'${candidateId}','${q.id}')">
          <i class="ti ${iMine ? 'ti-check' : 'ti-thumb-up'}"></i>
        </button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="endorsements-section">
    <div class="endorse-header">
      <div>
        <h3 class="endorse-title"><i class="ti ti-thumb-up"></i> ${lang === 'fr' ? 'Recommandations' : 'Endorsements'}</h3>
        <p class="endorse-sub ${total > 0 ? 'has-total' : ''}">${totalStr}</p>
      </div>
    </div>
    <div class="endorse-grid">${cards}</div>
  </div>`;
}

async function handleEndorseClick(btn, candidateId, quality) {
  if (!state.user) { showModal('modal-login'); return; }
  const isMine = btn.classList.contains('endorsed');
  btn.disabled = true;
  if (isMine) {
    await removeEndorsement(candidateId, quality);
    btn.classList.remove('endorsed');
    btn.innerHTML = '<i class="ti ti-thumb-up"></i>';
  } else {
    const r = await endorseUser(candidateId, quality);
    if (r) {
      btn.classList.add('endorsed');
      btn.innerHTML = '<i class="ti ti-check"></i>';
    }
  }
  btn.disabled = false;
  const section = btn.closest('.endorsements-section');
  if (section) {
    const data = await loadEndorsements(candidateId);
    const isOwn = candidateId === state.user?.id;
    section.outerHTML = renderEndorsementSection(data, candidateId, isOwn);
  }
}

/* ── Highlights — DB-backed ─────────────────────────────── */
let _hlSelectedIcon = '⭐';
const HL_ICONS = ['🏆','🚀','📜','⭐','🎯','💡','🔬','🌍','🎓','🛠️','💼','🤝','🏅','🔑','✅'];

async function loadHighlightsIntoContainer() {
  const el = document.getElementById('highlights-container');
  if (!el) return;
  el.innerHTML = `<div style="padding:24px 0;text-align:center"><div class="spinner"></div></div>`;
  const d = await api('GET', `${BASE}/api/highlights`);
  const highlights = d.highlights || [];
  el.innerHTML = renderHighlightsSection(highlights);
}

function renderHighlightsSection(highlights = []) {
  const isFr = state.lang === 'fr';
  const title  = isFr ? 'Points forts' : 'Highlights';
  const sub    = isFr ? 'Certifications, réalisations et projets qui vous démarquent.' : 'Certifications, achievements and projects that make you stand out.';
  const addLbl = isFr ? '+ Ajouter un point fort' : '+ Add a highlight';
  const cards = highlights.map(h => `
    <div class="hl-grid-card">
      <button class="hl-grid-remove" data-action="remove-highlight" data-id="${esc(h.id)}" title="${isFr ? 'Supprimer' : 'Remove'}">✕</button>
      <div class="hl-grid-icon">${h.icon || '⭐'}</div>
      <div class="hl-grid-title">${esc(h.title)}</div>
      ${h.description ? `<div class="hl-grid-desc">${esc(h.description)}</div>` : ''}
      ${h.url ? `<a href="${esc(h.url)}" target="_blank" class="hl-grid-link">${isFr ? 'Voir →' : 'View →'}</a>` : ''}
    </div>`).join('');
  const iconPicker = HL_ICONS.map(ic =>
    `<span class="hl-icon-opt${ic === _hlSelectedIcon ? ' selected' : ''}" data-action="select-hl-icon" data-icon="${ic}">${ic}</span>`
  ).join('');
  return `
    <div class="highlights-section">
      <div class="highlights-header">
        <div>
          <h3 class="highlights-title"><i class="ti ti-sparkles"></i> ${title}</h3>
          <p class="highlights-sub">${sub}</p>
        </div>
      </div>
      <div class="hl-grid" id="highlights-cards">${cards}</div>
      <div class="hl-modal-backdrop hidden" id="hl-modal-backdrop" data-action="close-hl-modal">
        <div class="hl-modal-box" onclick="event.stopPropagation()">
          <h4 style="margin:0 0 14px;font-size:15px;font-weight:700">${isFr ? 'Nouveau point fort' : 'New highlight'}</h4>
          <div class="hl-icon-picker" id="hl-icon-picker">${iconPicker}</div>
          <input type="text" id="hl-title" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:8px" maxlength="50" placeholder="${isFr ? 'Titre (ex : Certifié PMP)' : 'Title (e.g. PMP Certified)'}">
          <input type="text" id="hl-desc" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:8px" maxlength="100" placeholder="${isFr ? 'Description courte' : 'Short description'}">
          <input type="url" id="hl-link" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:14px" placeholder="Link / URL (${isFr ? 'optionnel' : 'optional'})">
          <div style="display:flex;gap:8px">
            <button class="btn-primary" style="flex:1" data-action="save-highlight"><i class="ti ti-plus"></i> ${isFr ? 'Ajouter' : 'Add'}</button>
            <button class="btn-ghost" data-action="close-hl-modal">${isFr ? 'Annuler' : 'Cancel'}</button>
          </div>
        </div>
      </div>
      <button class="btn-ghost" style="width:100%;margin-top:10px" data-action="open-hl-modal">
        <i class="ti ti-plus"></i> ${addLbl}
      </button>
    </div>`;
}

async function saveNewHighlight() {
  const title = document.getElementById('hl-title')?.value.trim();
  if (!title) { toast(state.lang === 'fr' ? 'Le titre est requis' : 'Title is required', 'error'); return; }
  const d = await api('POST', `${BASE}/api/highlights`, {
    icon:        _hlSelectedIcon,
    title,
    description: document.getElementById('hl-desc')?.value.trim() || '',
    url:         document.getElementById('hl-link')?.value.trim() || '',
  });
  if (d.success) {
    document.getElementById('hl-modal-backdrop')?.classList.add('hidden');
    toast(state.lang === 'fr' ? 'Point fort ajouté !' : 'Highlight added!', 'success');
    loadHighlightsIntoContainer();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

async function removeHighlight(id) {
  const d = await api('DELETE', `${BASE}/api/highlights/${id}`);
  if (d.success) {
    document.querySelector(`.hl-grid-card [data-id="${id}"]`)?.closest('.hl-grid-card')?.remove();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

/* ── Profile Skills — hard bars + soft tags ──────────────── */
let _skillModalType = 'hard';

async function loadProfileSkillsSection() {
  const el = document.getElementById('profile-skills-container');
  if (!el) return;
  el.innerHTML = `<div style="padding:24px 0;text-align:center"><div class="spinner"></div></div>`;
  const d = await api('GET', `${BASE}/api/profile-skills`);
  const skills = d.skills || [];
  el.innerHTML = renderProfileSkillsSection(skills);
}

function renderProfileSkillsSection(skills = []) {
  const isFr = state.lang === 'fr';
  const hard = skills.filter(s => s.type === 'hard');
  const soft = skills.filter(s => s.type === 'soft');

  const levelLabel = (lv) => {
    if (lv >= 85) return isFr ? 'Expert' : 'Expert';
    if (lv >= 65) return isFr ? 'Avancé' : 'Advanced';
    if (lv >= 40) return isFr ? 'Intermédiaire' : 'Intermediate';
    return isFr ? 'Débutant' : 'Beginner';
  };

  const hardBars = hard.map(s => `
    <div class="ps-bar-wrap">
      <div class="ps-bar-header">
        <span class="ps-bar-name">${esc(s.name)}</span>
        <span class="ps-level-label">${levelLabel(s.level)} · ${s.level}%</span>
      </div>
      <div class="ps-bar-track">
        <div class="ps-bar-fill" style="width:${s.level}%"></div>
      </div>
      <button class="ps-remove" data-action="remove-profile-skill" data-id="${esc(s.id)}" title="${isFr ? 'Supprimer' : 'Remove'}">✕</button>
    </div>`).join('');

  const softTags = soft.map(s => `
    <div class="ps-tag">
      ${esc(s.name)}
      <span class="ps-tag-rm" data-action="remove-profile-skill" data-id="${esc(s.id)}">✕</span>
    </div>`).join('');

  const skillModalHard = isFr ? 'Compétence technique' : 'Technical skill';
  const skillModalSoft = isFr ? 'Soft skill' : 'Soft skill';
  const levelLbl = isFr ? 'Niveau' : 'Level';

  return `
    <div class="ps-section">
      <div class="ps-section-header">
        <h3 class="highlights-title"><i class="ti ti-bolt"></i> ${isFr ? 'Compétences' : 'Skills'}</h3>
      </div>

      <div class="ps-category">
        <h4 class="ps-cat-title">Hard Skills</h4>
        <div id="ps-hard-list">${hardBars || `<p class="ps-empty">${isFr ? 'Aucune compétence technique' : 'No technical skills yet'}</p>`}</div>
        <button class="btn-ghost ps-add-btn" data-action="open-skill-modal" data-skill-type="hard">
          <i class="ti ti-plus"></i> ${isFr ? '+ Compétence technique' : '+ Technical skill'}
        </button>
      </div>

      <div class="ps-category">
        <h4 class="ps-cat-title">Soft Skills</h4>
        <div class="ps-soft-wrap" id="ps-soft-list">${softTags || `<p class="ps-empty">${isFr ? 'Aucun soft skill' : 'No soft skills yet'}</p>`}</div>
        <button class="btn-ghost ps-add-btn" data-action="open-skill-modal" data-skill-type="soft">
          <i class="ti ti-plus"></i> ${isFr ? '+ Soft skill' : '+ Soft skill'}
        </button>
      </div>

      <div class="ps-modal-backdrop hidden" id="ps-modal-backdrop" data-action="close-skill-modal">
        <div class="hl-modal-box" onclick="event.stopPropagation()">
          <h4 id="ps-modal-title" style="margin:0 0 14px;font-size:15px;font-weight:700">${skillModalHard}</h4>
          <input type="text" id="ps-skill-name" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:10px" maxlength="80" placeholder="${isFr ? 'Nom de la compétence' : 'Skill name'}">
          <div id="ps-level-wrap">
            <label style="font-size:13px;color:var(--muted)">${levelLbl} : <strong id="ps-level-val">75</strong>%</label>
            <input type="range" id="ps-skill-level" min="0" max="100" value="75" style="width:100%;margin:6px 0 14px" oninput="document.getElementById('ps-level-val').textContent=this.value">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-primary" style="flex:1" data-action="save-profile-skill"><i class="ti ti-plus"></i> ${isFr ? 'Ajouter' : 'Add'}</button>
            <button class="btn-ghost" data-action="close-skill-modal">${isFr ? 'Annuler' : 'Cancel'}</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function saveNewProfileSkill() {
  const name = document.getElementById('ps-skill-name')?.value.trim();
  if (!name) { toast(state.lang === 'fr' ? 'Nom requis' : 'Name required', 'error'); return; }
  const level = parseInt(document.getElementById('ps-skill-level')?.value) || 75;
  const d = await api('POST', `${BASE}/api/profile-skills`, { name, level, type: _skillModalType });
  if (d.success) {
    document.getElementById('ps-modal-backdrop')?.classList.add('hidden');
    toast(state.lang === 'fr' ? 'Compétence ajoutée !' : 'Skill added!', 'success');
    loadProfileSkillsSection();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

async function removeProfileSkill(id) {
  const d = await api('DELETE', `${BASE}/api/profile-skills/${id}`);
  if (d.success) {
    document.querySelector(`[data-action="remove-profile-skill"][data-id="${id}"]`)?.closest('.ps-bar-wrap, .ps-tag')?.remove();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

// ── Recommendations ────────────────────────────────────────
async function loadRecommendationsSection() {
  const el = document.getElementById('recommendations-container');
  if (!el) return;
  el.innerHTML = `<div style="padding:24px 0;text-align:center"><div class="spinner"></div></div>`;
  const d = await api('GET', `${BASE}/api/recommendations`);
  const recs = d.recommendations || [];
  el.innerHTML = renderRecommendationsSection(recs);
}

function renderRecommendationsSection(recs = []) {
  const isFr = state.lang === 'fr';
  const title = isFr ? 'Recommandations' : 'Recommendations';
  const sub   = isFr ? 'Témoignages de collègues, managers ou clients.' : 'Testimonials from colleagues, managers or clients.';

  function stars(n) {
    return Array.from({length:5}, (_,i) => `<span style="color:${i<n?'#f59e0b':'#cbd5e1'};font-size:14px">★</span>`).join('');
  }
  function initials(name) {
    return (name||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
  }
  function colorFor(name) {
    const cols = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6','#f97316'];
    let h = 0; for (const c of name||'') h = (h*31 + c.charCodeAt(0)) & 0xffffffff;
    return cols[Math.abs(h) % cols.length];
  }

  const cards = recs.map(r => `
    <div class="rec-card">
      <button class="rec-remove" data-action="remove-rec" data-id="${esc(r.id)}" title="${isFr?'Supprimer':'Remove'}">✕</button>
      <div class="rec-quote"><i class="ti ti-quote" style="color:var(--indigo);opacity:.35;font-size:22px;margin-bottom:6px;display:block"></i>
        ${esc(r.body)}
      </div>
      <div class="rec-author">
        <div class="rec-avatar" style="background:${colorFor(r.recommender_name)}">
          ${r.recommender_photo ? `<img src="${esc(r.recommender_photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : initials(r.recommender_name)}
        </div>
        <div class="rec-author-info">
          <div class="rec-author-name">${esc(r.recommender_name)}</div>
          ${r.recommender_title||r.recommender_company ? `<div class="rec-author-meta">${[r.recommender_title,r.recommender_company].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
          <div class="rec-stars">${stars(r.rating||5)}</div>
        </div>
      </div>
    </div>`).join('');

  const emptyBlock = recs.length === 0
    ? `<p class="ps-empty" style="margin-bottom:12px">${isFr ? 'Aucune recommandation encore.' : 'No recommendations yet.'}</p>`
    : '';

  const addExtLbl  = isFr ? '+ Recommandation externe' : '+ External recommendation';
  const addInvLbl  = isFr ? '+ Inviter quelqu\'un' : '+ Invite someone';

  return `
    <div class="rec-section">
      <div class="highlights-header">
        <h3 class="highlights-title"><i class="ti ti-message-star"></i> ${title}</h3>
        <p class="highlights-sub">${sub}</p>
      </div>
      <div class="rec-grid" id="rec-cards">${emptyBlock}${cards}</div>

      <!-- Backdrop external -->
      <div class="hl-modal-backdrop hidden" id="rec-ext-modal" data-action="close-rec-ext">
        <div class="hl-modal-box" onclick="event.stopPropagation()" style="max-width:440px">
          <h4 style="margin:0 0 4px;font-size:15px;font-weight:700">${isFr ? 'Recommandation externe' : 'External recommendation'}</h4>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">${isFr ? 'Copiez-collez un témoignage reçu par email ou LinkedIn.' : 'Copy-paste a testimonial received by email or LinkedIn.'}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--muted)">${isFr ? 'Nom *' : 'Name *'}</label>
              <input type="text" id="rec-ext-name" class="filter-input" style="width:100%;box-sizing:border-box;margin-top:3px" maxlength="100" placeholder="Marie Dupont">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--muted)">${isFr ? 'Poste' : 'Title'}</label>
              <input type="text" id="rec-ext-title" class="filter-input" style="width:100%;box-sizing:border-box;margin-top:3px" maxlength="100" placeholder="Directrice Tech">
            </div>
          </div>
          <input type="text" id="rec-ext-company" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:8px" maxlength="100" placeholder="${isFr ? 'Entreprise (optionnel)' : 'Company (optional)'}">
          <textarea id="rec-ext-body" class="filter-input" style="width:100%;box-sizing:border-box;min-height:100px;resize:vertical;margin-bottom:10px" maxlength="2000" placeholder="${isFr ? 'Texte de la recommandation…' : 'Recommendation text…'}"></textarea>
          <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">${isFr ? 'Note' : 'Rating'}</label>
          <div class="rec-star-picker" id="rec-ext-stars" data-rating="5">
            ${[1,2,3,4,5].map(n=>`<span class="rec-star-opt active" data-action="set-rec-star" data-v="${n}">★</span>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn-primary" style="flex:1" data-action="save-rec-ext"><i class="ti ti-plus"></i> ${isFr ? 'Ajouter' : 'Add'}</button>
            <button class="btn-ghost" data-action="close-rec-ext">${isFr ? 'Annuler' : 'Cancel'}</button>
          </div>
        </div>
      </div>

      <!-- Backdrop invite -->
      <div class="hl-modal-backdrop hidden" id="rec-inv-modal" data-action="close-rec-inv">
        <div class="hl-modal-box" onclick="event.stopPropagation()" style="max-width:400px">
          <h4 style="margin:0 0 4px;font-size:15px;font-weight:700">${isFr ? 'Inviter quelqu\'un à vous recommander' : 'Invite someone to recommend you'}</h4>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">${isFr ? 'Un lien unique sera généré — envoyez-le à votre contact.' : 'A unique link will be generated — send it to your contact.'}</p>
          <div id="rec-inv-form">
            <input type="text" id="rec-inv-name" class="filter-input" style="width:100%;box-sizing:border-box;margin-bottom:8px" maxlength="100" placeholder="${isFr ? 'Nom du contact *' : 'Contact name *'}">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
              <input type="text" id="rec-inv-title" class="filter-input" style="width:100%;box-sizing:border-box" maxlength="100" placeholder="${isFr ? 'Poste' : 'Title'}">
              <input type="text" id="rec-inv-company" class="filter-input" style="width:100%;box-sizing:border-box" maxlength="100" placeholder="${isFr ? 'Entreprise' : 'Company'}">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-primary" style="flex:1" data-action="gen-rec-inv"><i class="ti ti-link"></i> ${isFr ? 'Générer le lien' : 'Generate link'}</button>
              <button class="btn-ghost" data-action="close-rec-inv">${isFr ? 'Annuler' : 'Cancel'}</button>
            </div>
          </div>
          <div id="rec-inv-result" style="display:none">
            <p style="font-size:13px;color:var(--muted);margin-bottom:8px">${isFr ? 'Copiez ce lien et envoyez-le à votre contact :' : 'Copy this link and send it to your contact:'}</p>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="rec-inv-link" class="filter-input" style="flex:1;font-size:12px;box-sizing:border-box" readonly>
              <button class="btn-ghost" style="white-space:nowrap" data-action="copy-rec-link"><i class="ti ti-copy"></i></button>
            </div>
            <button class="btn-ghost" style="width:100%;margin-top:12px" data-action="close-rec-inv">${isFr ? 'Fermer' : 'Close'}</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn-ghost ps-add-btn" data-action="open-rec-ext"><i class="ti ti-plus"></i> ${addExtLbl}</button>
        <button class="btn-ghost ps-add-btn" data-action="open-rec-inv"><i class="ti ti-send"></i> ${addInvLbl}</button>
      </div>
    </div>`;
}

async function saveExternalRec() {
  const name = document.getElementById('rec-ext-name')?.value.trim();
  const body = document.getElementById('rec-ext-body')?.value.trim();
  if (!name) { toast(state.lang==='fr'?'Nom requis':'Name required','error'); return; }
  if (!body||body.length<10) { toast(state.lang==='fr'?'Texte trop court':'Text too short','error'); return; }
  const rating = parseInt(document.getElementById('rec-ext-stars')?.dataset.rating||'5');
  const d = await api('POST', `${BASE}/api/recommendations`, {
    recommender_name:    name,
    recommender_title:   document.getElementById('rec-ext-title')?.value.trim()||'',
    recommender_company: document.getElementById('rec-ext-company')?.value.trim()||'',
    body, rating,
  });
  if (d.success) {
    document.getElementById('rec-ext-modal')?.classList.add('hidden');
    toast(state.lang==='fr'?'Recommandation ajoutée !':'Recommendation added!','success');
    loadRecommendationsSection();
  } else {
    toast(d.error||'Error','error');
  }
}

async function generateRecInvite() {
  const name = document.getElementById('rec-inv-name')?.value.trim();
  if (!name) { toast(state.lang==='fr'?'Nom requis':'Name required','error'); return; }
  const d = await api('POST', `${BASE}/api/recommendations/invite`, {
    recommender_name:    name,
    recommender_title:   document.getElementById('rec-inv-title')?.value.trim()||'',
    recommender_company: document.getElementById('rec-inv-company')?.value.trim()||'',
  });
  if (d.success) {
    const link = `${window.location.origin}${BASE}/recommend/${d.token}`;
    document.getElementById('rec-inv-form').style.display = 'none';
    document.getElementById('rec-inv-result').style.display = '';
    const inp = document.getElementById('rec-inv-link');
    if (inp) inp.value = link;
  } else {
    toast(d.error||'Error','error');
  }
}

async function removeRecommendation(id) {
  const d = await api('DELETE', `${BASE}/api/recommendations/${id}`);
  if (d.success) {
    document.querySelector(`[data-action="remove-rec"][data-id="${id}"]`)?.closest('.rec-card')?.remove();
  } else {
    toast(d.error||'Error','error');
  }
}

// ── Profile photo upload ────────────────────────────────────
async function uploadProfilePhoto(input) {
  if (!input?.files?.length) return;
  const isFr = state.lang === 'fr';
  const statusEl = document.getElementById('pf-avatar-status');
  if (statusEl) { statusEl.style.display = 'inline'; statusEl.textContent = isFr ? '⏳ Envoi…' : '⏳ Uploading…'; }
  const fd = new FormData();
  fd.append('avatar', input.files[0]);
  try {
    const resp = await fetch(`${BASE}/api/candidates/profile/avatar`, { method: 'POST', body: fd, credentials: 'include' });
    const d = await resp.json();
    if (!d.success) throw new Error(d.error);
    state.user.avatar_url = d.avatar_url;
    // Update preview circle
    const preview = document.getElementById('pf-avatar-preview');
    if (preview) preview.innerHTML = `<img src="${esc(d.avatar_url)}" style="width:100%;height:100%;object-fit:cover" alt="">`;
    // Update navbar avatar
    const navAv = document.getElementById('nav-avatar');
    if (navAv) {
      navAv.innerHTML = `<img src="${esc(d.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
      navAv.style.padding = '0';
    }
    // Update dashboard avatar
    const dashAv = document.getElementById('dash-avatar');
    if (dashAv) {
      dashAv.innerHTML = `<img src="${esc(d.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
      dashAv.style.padding = '0';
    }
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ ${isFr?'Photo mise à jour !':'Photo updated!'}</span>`;
    toast(isFr ? 'Photo de profil mise à jour !' : 'Profile photo updated!', 'success');
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${e.message}</span>`;
  }
}

// ── AI Career Agent quick actions ──────────────────────────
function agentQuickAction(key) {
  const lang = state.lang || 'en';
  const msgs = {
    'find-jobs': {
      en: 'Find me jobs that match my profile skills and experience. Be specific.',
      fr: 'Trouve-moi des emplois qui correspondent à mes compétences et expérience. Sois précis.'
    },
    'optimize-profile': {
      en: 'How can I improve my profile to get more interview invitations? Give me actionable steps.',
      fr: "Comment améliorer mon profil pour obtenir plus d'invitations aux entrevues ? Donne-moi des étapes concrètes."
    },
    'interview-prep': {
      en: 'Help me prepare for a technical job interview. What questions should I expect and how do I answer them well?',
      fr: 'Aide-moi à préparer une entrevue d\'emploi technique. Quelles questions devrais-je attendre et comment y répondre ?'
    },
    'salary-advice': {
      en: 'What salary should I negotiate based on my skills and experience in the current job market?',
      fr: 'Quel salaire devrais-je négocier en fonction de mes compétences et expérience sur le marché actuel ?'
    }
  };
  const msg = (msgs[key]||{})[lang] || (msgs[key]||{}).en || key;
  const input = document.getElementById('ai-input');
  if (input) { input.value = msg; sendAiMsg(); }
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
  if (tabId === 'tab-alerts') loadAlerts();
  if (tabId === 'tab-score') loadProfileScore();
  if (tabId === 'tab-skills') loadSkillTests();
  if (tabId === 'tab-referrals') loadReferrals();
  if (tabId === 'tab-salary') loadSalaryPage();
  if (tabId === 'tab-credits') loadCredits();
  if (tabId === 'tab-admin-tests')      loadAdminSkillTests();
  if (tabId === 'tab-admin-moderation') loadAdminModeration();
  if (tabId === 'tab-messages')         openMessagesInTab('tab-messages');
}

function showEmpTab(tabId, navEl, preselectedAppId) {
  document.querySelectorAll('#pg-employer-dash .dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#pg-employer-dash .dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (tabId === 'etab-team') loadTeam();
  if (tabId === 'etab-analytics') loadEmployerAnalytics();
  if (tabId === 'etab-interviews') loadVideoInterviews();
  if (tabId === 'etab-messages') openMessagesInTab('etab-messages', preselectedAppId || null);
}

// ── Employer Analytics ────────────────────────────────────
async function loadEmployerAnalytics() {
  const container = document.getElementById('employer-analytics-container');
  if (!container) return;
  const isFr = state.lang === 'fr';
  container.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:24px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/analytics/employer`);
  if (!d.success) { container.innerHTML = `<div class="empty-state"><i class="ti ti-chart-off"></i><p>${d.error}</p></div>`; return; }
  const { totals, jobStats, appTrend, stageFunnel } = d;
  const stageMap = { new: isFr ? 'Nouveau' : 'New', reviewed: isFr ? 'Examiné' : 'Reviewed', shortlisted: isFr ? 'Présélectionné' : 'Shortlisted', interview: isFr ? 'Entretien' : 'Interview', offer: isFr ? 'Offre' : 'Offer', rejected: isFr ? 'Rejeté' : 'Rejected' };
  const stageColors = { new: '#6366F1', reviewed: '#8b5cf6', shortlisted: '#3b82f6', interview: '#f59e0b', offer: '#22c55e', rejected: '#ef4444' };
  const totalApps = (stageFunnel||[]).reduce((s,r) => s + parseInt(r.n||0), 0) || 1;
  const funnelBars = (stageFunnel||[]).map(r => {
    const pct = Math.round(parseInt(r.n||0) / totalApps * 100);
    const color = stageColors[r.status] || '#6366F1';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span style="color:var(--dark);font-weight:500">${stageMap[r.status]||r.status}</span>
        <span style="color:var(--muted)">${r.n} (${pct}%)</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:8px"><div style="background:${color};width:${pct}%;height:8px;border-radius:4px;transition:width .5s"></div></div>
    </div>`;
  }).join('');

  const jobRows = (jobStats||[]).slice(0,10).map(j => {
    const title = isFr ? (j.title_fr||j.title_en) : (j.title_en||j.title_fr);
    const conv = j.applications > 0 ? Math.round(parseInt(j.shortlisted||0) / parseInt(j.applications) * 100) : 0;
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 8px;font-size:13px;font-weight:500;color:var(--dark)">${esc(title)}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center"><span class="job-tag ${j.status}">${j.status}</span></td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;font-weight:600;color:var(--indigo)">${j.applications||0}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center">${j.shortlisted||0}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center">${j.interviews||0}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;color:${conv>=20?'var(--green)':conv>=10?'var(--warning)':'var(--danger)'}">${conv}%</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:24px">
      <h2 style="margin:0 0 4px;color:var(--dark)">${isFr ? 'Analytique Recrutement' : 'Recruitment Analytics'}</h2>
      <p style="margin:0;font-size:13px;color:var(--muted)">${isFr ? 'Performance de vos offres et pipeline candidats' : 'Job performance and candidate pipeline'}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:28px">
      ${[
        { icon:'ti-briefcase', label: isFr?'Offres publiées':'Active jobs', val: totals.total_jobs, color:'#6366F1' },
        { icon:'ti-file-text', label: isFr?'Candidatures':'Applications', val: totals.total_apps, color:'#3b82f6' },
        { icon:'ti-users', label: isFr?'Présélectionnés':'Shortlisted', val: totals.total_shortlisted, color:'#f59e0b' },
        { icon:'ti-star', label: isFr?'Offres faites':'Offers made', val: totals.total_offers, color:'#22c55e' },
        { icon:'ti-clock', label: isFr?'Jours moy. décision':'Avg days to decide', val: totals.avg_days || '—', color:'#8b5cf6' },
      ].map(m => `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="color:${m.color};font-size:22px;margin-bottom:6px"><i class="ti ${m.icon}"></i></div>
        <div style="font-size:26px;font-weight:800;color:var(--dark)">${m.val}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${m.label}</div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
        <h4 style="margin:0 0 16px;color:var(--dark);font-size:14px">${isFr ? 'Entonnoir candidatures' : 'Application funnel'}</h4>
        ${funnelBars || `<p style="color:var(--muted);font-size:13px">${isFr?'Aucune donnée':'No data yet'}</p>`}
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
        <h4 style="margin:0 0 16px;color:var(--dark);font-size:14px">${isFr ? 'Candidatures sur 30 jours' : 'Applications last 30 days'}</h4>
        ${(appTrend||[]).length ? renderSparkline(appTrend.map(r => parseInt(r.n)), appTrend.map(r => r.day)) : `<p style="color:var(--muted);font-size:13px">${isFr?'Aucune candidature ce mois':'No applications this month'}</p>`}
      </div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <h4 style="margin:0;color:var(--dark);font-size:14px">${isFr ? 'Performance par offre' : 'Performance by job'}</h4>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--background)">
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:left">${isFr?'Titre':'Title'}</th>
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:center">Status</th>
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:center">${isFr?'Candidatures':'Apps'}</th>
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:center">${isFr?'Présélect.':'Shortlisted'}</th>
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:center">${isFr?'Entretiens':'Interviews'}</th>
            <th style="padding:10px 8px;font-size:12px;color:var(--muted);text-align:center">${isFr?'Taux conv.':'Conv. rate'}</th>
          </tr></thead>
          <tbody>${jobRows || `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--muted);font-size:13px">${isFr?'Aucune offre publiée':'No jobs posted yet'}</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function renderSparkline(vals, labels) {
  if (!vals.length) return '';
  const max = Math.max(...vals, 1);
  const W = 280, H = 80, pad = 4;
  const pts = vals.map((v, i) => {
    const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0"/>
    </linearGradient></defs>
    <polyline points="${pts.join(' ')}" fill="none" stroke="#6366F1" stroke-width="2" stroke-linejoin="round"/>
    ${vals.map((v,i) => {
      const [x,y] = pts[i].split(',');
      return `<circle cx="${x}" cy="${y}" r="3" fill="#6366F1"/>`;
    }).join('')}
    <text x="${pad}" y="${H-2}" font-size="10" fill="var(--muted)">${labels[0]||''}</text>
    <text x="${W-pad}" y="${H-2}" font-size="10" fill="var(--muted)" text-anchor="end">${labels[labels.length-1]||''}</text>
  </svg>`;
}

// ── Messagerie ────────────────────────────────────────────
let _currentThreadApp = null;
let _currentMsgContainer = null;
let _msgPollInterval = null;

function startMsgPolling(appId) {
  stopMsgPolling();
  _msgPollInterval = setInterval(async () => {
    if (_currentThreadApp !== appId) { stopMsgPolling(); return; }
    try {
      const d = await api('GET', `${BASE}/api/messages/${appId}`);
      if (d.messages) _renderBubbles(d.messages, state.lang === 'fr');
    } catch {}
  }, 5000);
}

function stopMsgPolling() {
  if (_msgPollInterval) { clearInterval(_msgPollInterval); _msgPollInterval = null; }
}

// Format timestamp for thread list: Today = "14:30", Yesterday = "Hier/Yesterday", else "12 jan."
function _fmtThreadTime(dateStr, isFr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(isFr?'fr-CA':'en-CA', {hour:'2-digit',minute:'2-digit'});
  if (diffDays === 1) return isFr ? 'Hier' : 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(isFr?'fr-CA':'en-CA', {weekday:'short'});
  return d.toLocaleDateString(isFr?'fr-CA':'en-CA', {day:'numeric',month:'short'});
}

// Build a thread list item HTML
function _buildThreadItem(t, containerId, isFr) {
  const title = isFr ? (t.title_fr||t.title_en) : (t.title_en||t.title_fr);
  const candName = ((t.cand_first||'')+' '+(t.cand_last||'')).trim();
  const initials = (t.cand_first||'?')[0].toUpperCase() + (t.cand_last||'')[0]?.toUpperCase();
  const avatar = t.cand_avatar
    ? `<img src="${esc(t.cand_avatar)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0">`
    : `<div style="width:42px;height:42px;border-radius:50%;background:#6366f1;color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>`;
  const unread = parseInt(t.unread||0);
  const timeStr = _fmtThreadTime(t.last_at, isFr);
  const preview = t.last_message ? esc(t.last_message).slice(0, 55) + (t.last_message.length > 55 ? '…' : '') : `<em style="color:var(--muted)">${isFr?'Commencer la conv.':'Start the conversation'}</em>`;
  return `<div class="msg-thread-item" data-appid="${t.application_id}" data-title="${esc(title)}" data-cand="${esc(candName)}" data-cand-first="${esc(t.cand_first||'')}" data-cand-avatar="${esc(t.cand_avatar||'')}" data-cand-init="${initials}"
    style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s"
    onmouseenter="if(!this.classList.contains('active'))this.style.background='#f5f6fa'" onmouseleave="if(!this.classList.contains('active'))this.style.background=''"
    onclick="openThreadInContainer('${containerId}','${t.application_id}',this)">
    <div style="position:relative">${avatar}${unread ? `<span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid #fff"></span>` : ''}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:2px">
        <span style="font-weight:${unread?'700':'600'};font-size:13px;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(candName)||esc(t.company_name||'')}</span>
        ${timeStr ? `<span style="font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0">${timeStr}</span>` : ''}
      </div>
      <div style="font-size:11px;color:#6366f1;font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</div>
      <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${unread?'600':'400'}">${preview}</div>
    </div>
    ${unread ? `<span style="background:#6366f1;color:#fff;border-radius:99px;font-size:10px;font-weight:700;padding:2px 7px;min-width:18px;text-align:center;flex-shrink:0;align-self:center">${unread > 9 ? '9+' : unread}</span>` : ''}
  </div>`;
}

async function loadMsgUnreadBadge() {
  try {
    const d = await api('GET', `${BASE}/api/messages/threads`);
    const threads = d.threads || [];
    const total = threads.reduce((s, t) => s + parseInt(t.unread||0), 0);
    ['msg-unread-cand', 'msg-unread-emp'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = total > 9 ? '9+' : total > 0 ? String(total) : '';
      el.style.display = total > 0 ? 'inline' : 'none';
    });
  } catch {}
}

// In-tab two-pane view (candidate Messages tab / employer Messages tab)
async function openMessagesInTab(containerId, preselectedAppId) {
  const isFr = state.lang === 'fr';
  const container = document.getElementById(containerId);
  if (!container) return;
  _currentMsgContainer = containerId;

  const isEmp = state.user?.role === 'employer';
  const newConvAction = isEmp
    ? `showEmpTab('etab-jobs',document.querySelector('[data-emptab=\\'etab-jobs\\']'))`
    : `showTab('tab-applications',document.querySelector('[data-tab=\\'tab-applications\\']'))`;
  const newConvLabel = isEmp
    ? (isFr ? 'Voir les candidats' : 'View candidates')
    : (isFr ? 'Mes candidatures' : 'My applications');

  container.innerHTML = `
    <div style="display:flex;border:1px solid var(--border);border-radius:12px;overflow:hidden;height:calc(100vh - 210px);min-height:480px;box-shadow:0 1px 6px rgba(0,0,0,.06)">
      <div id="${containerId}-threads" style="width:300px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:#fafbfc">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;font-size:14px;color:var(--dark)">${isFr?'Conversations':'Conversations'}</span>
          <button onclick="${newConvAction}" title="${newConvLabel}" style="font-size:11px;padding:4px 10px;border-radius:6px;background:#6366f1;color:#fff;border:none;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-plus" style="font-size:12px"></i> ${newConvLabel}</button>
        </div>
        <div style="padding:32px;text-align:center"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:22px;color:#6366f1"></i></div>
      </div>
      <div id="${containerId}-thread" style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted)">
          <div style="width:64px;height:64px;border-radius:50%;background:#f0f0ff;display:flex;align-items:center;justify-content:center"><i class="ti ti-message-circle-2" style="font-size:28px;color:#6366f1;opacity:.6"></i></div>
          <p style="font-size:14px;margin:0;font-weight:500">${isFr?'Sélectionnez une conversation':'Select a conversation'}</p>
          <p style="font-size:12px;margin:0;color:var(--muted)">${isFr?'Vos échanges apparaîtront ici':'Your messages will appear here'}</p>
        </div>
      </div>
    </div>`;

  await _loadThreadList(containerId, preselectedAppId, isFr);
}

async function _loadThreadList(containerId, preselectedAppId, isFr) {
  let threads = [];
  try {
    const d = await api('GET', `${BASE}/api/messages/threads`);
    threads = d.threads || [];
  } catch(e) { threads = []; }

  const listEl = document.getElementById(`${containerId}-threads`);
  if (!listEl) return;

  // Robustly remove spinner + any stale content — keep only the header (first child)
  while (listEl.children.length > 1) listEl.removeChild(listEl.lastChild);

  if (!threads.length) {
    const isEmp = state.user?.role === 'employer';
    const ctaLabel = isEmp
      ? (isFr ? 'Voir les candidats' : 'View candidates')
      : (isFr ? 'Parcourir les offres' : 'Browse jobs');
    const ctaAction = isEmp
      ? `showEmpTab('etab-jobs',document.querySelector('[data-emptab=\\'etab-jobs\\']'))`
      : `goto('jobs')`;
    const hint = isEmp
      ? (isFr ? 'Cliquez "Chat" sur un candidat pour démarrer' : 'Click "Chat" on a candidate to start')
      : (isFr ? 'Postulez à une offre, puis contactez l\'employeur' : 'Apply to a job, then message the employer');
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:40px 16px;text-align:center;color:var(--muted);font-size:13px';
    empty.innerHTML = `
      <i class="ti ti-message-off" style="font-size:36px;display:block;margin-bottom:12px;opacity:.3;color:#6366f1"></i>
      <div style="font-weight:600;font-size:14px;color:var(--dark);margin-bottom:6px">${isFr?'Aucune conversation':'No conversations yet'}</div>
      <div style="font-size:12px;margin-bottom:16px;line-height:1.5">${hint}</div>
      <button onclick="${ctaAction}" style="font-size:12px;padding:7px 16px;border-radius:8px;background:#6366f1;color:#fff;border:none;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-arrow-right" style="font-size:13px"></i> ${ctaLabel}</button>`;
    listEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.innerHTML = threads.map(t => _buildThreadItem(t, containerId, isFr)).join('');
  listEl.appendChild(list);

  // Auto-open: preselected → first unread → first overall
  const autoAppId = preselectedAppId
    || threads.find(t => parseInt(t.unread||0) > 0)?.application_id
    || threads[0].application_id;
  const navEl = listEl.querySelector(`[data-appid="${autoAppId}"]`);
  openThreadInContainer(containerId, autoAppId, navEl);
}

async function openThreadInContainer(containerId, appId, navEl) {
  _currentThreadApp = appId;
  _currentMsgContainer = containerId;
  const isFr = state.lang === 'fr';

  // Highlight selected thread
  const threadsEl = document.getElementById(`${containerId}-threads`);
  if (threadsEl) {
    threadsEl.querySelectorAll('.msg-thread-item').forEach(el => {
      el.classList.remove('active');
      el.style.background = '';
    });
  }
  if (navEl) { navEl.classList.add('active'); navEl.style.background = '#eef2ff'; }

  // Get contact info from data attributes
  const candName  = navEl?.dataset.cand || '';
  const candInit  = navEl?.dataset.candInit || '?';
  const candAvt   = navEl?.dataset.candAvatar || '';
  const jobTitle  = navEl?.dataset.title || '';
  const headerAvatar = candAvt
    ? `<img src="${esc(candAvt)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover">`
    : `<div style="width:38px;height:38px;border-radius:50%;background:#6366f1;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${esc(candInit)}</div>`;

  const threadEl = document.getElementById(`${containerId}-thread`);
  if (!threadEl) return;
  threadEl.innerHTML = `
    ${candName ? `<div style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--border);background:#fff;flex-shrink:0">
      ${headerAvatar}
      <div>
        <div style="font-weight:600;font-size:14px;color:var(--dark)">${esc(candName)}</div>
        ${jobTitle ? `<div style="font-size:12px;color:#6366f1;font-weight:500">${esc(jobTitle)}</div>` : ''}
      </div>
    </div>` : ''}
    <div id="thread-bubbles" style="flex:1;overflow-y:auto;padding:20px 24px;background:#f9fafb">
      <div style="text-align:center"><i class="ti ti-loader" style="animation:spin 1s linear infinite;color:#6366f1;font-size:22px"></i></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid var(--border);background:#fff;flex-shrink:0">
      <input type="text" id="msg-input" placeholder="${isFr?'Écrivez un message…':'Write a message…'}" autocomplete="off"
        style="flex:1;font-size:14px;border-radius:24px;border:1.5px solid #e0e2f0;padding:10px 18px;outline:none;background:#f8f9ff;transition:border .15s"
        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e0e2f0'"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}">
      <button onclick="sendMessage()" title="${isFr?'Envoyer':'Send'}"
        style="width:42px;height:42px;border-radius:50%;background:#6366f1;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:background .15s"
        onmouseenter="this.style.background='#4f46e5'" onmouseleave="this.style.background='#6366f1'">
        <i class="ti ti-send"></i>
      </button>
    </div>`;

  // Load messages
  const d = await api('GET', `${BASE}/api/messages/${appId}`);
  const msgs = d.messages || [];
  _renderBubbles(msgs, isFr);

  // Template message: pre-fill input when employer opens a fresh conversation
  if (!msgs.length && state.user?.role === 'employer') {
    const firstName = navEl?.dataset.candFirst || (candName ? candName.split(' ')[0] : '');
    const jt = jobTitle || '';
    const template = isFr
      ? `Bonjour ${firstName},\n\nNous avons examiné votre candidature pour le poste de ${jt} et nous aimerions en savoir plus sur votre parcours.\n\nSeriez-vous disponible pour un échange ?`
      : `Hello ${firstName},\n\nWe reviewed your application for ${jt} and would love to learn more about your background.\n\nWould you be available for a quick chat?`;
    setTimeout(() => {
      const inp = document.getElementById('msg-input');
      if (inp && !inp.value) inp.value = template;
    }, 80);
  }

  // Clear unread indicators
  if (navEl) { const dot = navEl.querySelector('[style*="background:#ef4444"]'); if (dot) dot.remove(); }
  const unreadBadge = navEl?.querySelector('[style*="background:#6366f1"]');
  if (unreadBadge) unreadBadge.remove();

  // Start 5-second polling for new messages
  startMsgPolling(appId);
}

function _renderBubbles(msgs, isFr) {
  const bubblesEl = document.getElementById('thread-bubbles');
  if (!bubblesEl) return;
  if (!msgs.length) {
    bubblesEl.innerHTML = `<div style="text-align:center;padding:48px 0"><div style="width:64px;height:64px;border-radius:50%;background:#f0f0ff;display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><i class="ti ti-message-circle-2" style="font-size:28px;color:#6366f1;opacity:.5"></i></div><p style="font-size:14px;color:var(--muted);margin:0;font-weight:500">${isFr?'Commencez la conversation':'Start the conversation'}</p><p style="font-size:12px;color:var(--muted);margin:6px 0 0">${isFr?'Envoyez le premier message':'Send the first message'}</p></div>`;
    return;
  }

  let lastDate = '';
  bubblesEl.innerHTML = msgs.map(m => {
    const mine = m.sender_id === state.user?.id;
    const name = `${m.first_name||''} ${m.last_name||''}`.trim();
    const dt = new Date(m.created_at);
    const dateStr = dt.toLocaleDateString(isFr?'fr-CA':'en-CA', {weekday:'long',day:'numeric',month:'long'});
    const timeStr = dt.toLocaleTimeString(isFr?'fr-CA':'en-CA', {hour:'2-digit',minute:'2-digit'});
    const showDate = dateStr !== lastDate;
    lastDate = dateStr;
    return `${showDate ? `<div style="text-align:center;margin:16px 0 12px"><span style="background:#e8eaf6;color:#5c6bc0;font-size:11px;font-weight:600;padding:4px 12px;border-radius:99px">${dateStr}</span></div>` : ''}
    <div style="display:flex;flex-direction:${mine?'row-reverse':'row'};gap:8px;margin-bottom:8px;align-items:flex-end">
      ${!mine ? `<div style="width:28px;height:28px;border-radius:50%;background:#e0e2f0;color:#5c6bc0;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(m.first_name||'?')[0].toUpperCase()}</div>` : ''}
      <div style="max-width:70%">
        ${!mine ? `<div style="font-size:11px;color:var(--muted);margin-bottom:4px;padding-left:2px">${esc(name)}</div>` : ''}
        <div style="background:${mine?'#6366f1':'#fff'};color:${mine?'#fff':'var(--dark)'};padding:10px 14px;border-radius:${mine?'18px 18px 4px 18px':'18px 18px 18px 4px'};font-size:13.5px;line-height:1.55;word-break:break-word;box-shadow:${mine?'none':'0 1px 3px rgba(0,0,0,.08)'};border:${mine?'none':'1px solid #eaecf0'}">${esc(m.body)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${mine?'right':'left'};padding-${mine?'right':'left'}:2px">${timeStr}</div>
      </div>
    </div>`;
  }).join('');
  bubblesEl.scrollTop = bubblesEl.scrollHeight;
}

// Overlay modal version — used from Kanban / job-view buttons
async function openMessagesPage(appId) {
  const isFr = state.lang === 'fr';
  document.getElementById('messages-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'messages-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,15,35,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:900px;height:82vh;max-height:700px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.22)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #eaecf0;background:#fff;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:#eef2ff;display:flex;align-items:center;justify-content:center"><i class="ti ti-message-circle-2" style="color:#6366f1;font-size:18px"></i></div>
          <div>
            <div style="font-weight:700;font-size:15px;color:#111">${isFr?'Messagerie':'Messaging'}</div>
            <div style="font-size:11px;color:var(--muted)">${state.user?.role==='employer' ? (isFr?'Vos conversations avec les candidats':'Your conversations with candidates') : (isFr?'Vos échanges avec les employeurs':'Your exchanges with employers')}</div>
          </div>
        </div>
        <button style="width:32px;height:32px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#6b7280;display:flex;align-items:center;justify-content:center;font-size:16px" onclick="document.getElementById('messages-overlay')?.remove()"><i class="ti ti-x"></i></button>
      </div>
      <div style="display:flex;flex:1;overflow:hidden;min-height:0">
        <div id="overlay-threads" style="width:300px;flex-shrink:0;border-right:1px solid #eaecf0;overflow-y:auto;background:#fafbfc">
          <div style="padding:12px 16px;border-bottom:1px solid #eaecf0;background:#fff">
            <span style="font-weight:600;font-size:13px;color:#374151">${isFr?'Conversations':'Conversations'}</span>
          </div>
          <div style="padding:24px;text-align:center"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:22px;color:#6366f1"></i></div>
        </div>
        <div id="overlay-thread" style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted)">
            <div style="width:64px;height:64px;border-radius:50%;background:#f0f0ff;display:flex;align-items:center;justify-content:center"><i class="ti ti-message-circle-2" style="font-size:28px;color:#6366f1;opacity:.6"></i></div>
            <p style="font-size:14px;margin:0;font-weight:500;color:#374151">${isFr?'Sélectionnez une conversation':'Select a conversation'}</p>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _currentMsgContainer = 'overlay';

  let threads = [];
  try {
    const d = await api('GET', `${BASE}/api/messages/threads`);
    threads = d.threads || [];
  } catch(e) { threads = []; }

  const listEl = document.getElementById('overlay-threads');
  if (!listEl) return;

  // Robustly remove spinner + stale content
  while (listEl.children.length > 1) listEl.removeChild(listEl.lastChild);

  if (!threads.length) {
    const isEmp = state.user?.role === 'employer';
    const ctaLabel = isEmp
      ? (isFr ? 'Voir les candidats' : 'View candidates')
      : (isFr ? 'Parcourir les offres' : 'Browse jobs');
    const ctaAction = isEmp
      ? `document.getElementById('messages-overlay')?.remove();showEmpTab('etab-jobs',document.querySelector('[data-emptab=\\'etab-jobs\\']'))`
      : `document.getElementById('messages-overlay')?.remove();goto('jobs')`;
    const hint = isEmp
      ? (isFr ? 'Cliquez "Chat" sur un candidat pour démarrer' : 'Click "Chat" on a candidate to start')
      : (isFr ? 'Postulez à une offre, puis contactez l\'employeur' : 'Apply to a job, then message the employer');
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:40px 16px;text-align:center;color:var(--muted);font-size:13px';
    empty.innerHTML = `
      <i class="ti ti-message-off" style="font-size:36px;display:block;margin-bottom:12px;opacity:.25;color:#6366f1"></i>
      <div style="font-weight:600;font-size:14px;color:#374151;margin-bottom:6px">${isFr?'Aucune conversation':'No conversations yet'}</div>
      <div style="font-size:12px;margin-bottom:16px;line-height:1.5">${hint}</div>
      <button onclick="${ctaAction}" style="font-size:12px;padding:7px 16px;border-radius:8px;background:#6366f1;color:#fff;border:none;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-arrow-right" style="font-size:13px"></i> ${ctaLabel}</button>`;
    listEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.innerHTML = threads.map(t => _buildThreadItem(t, 'overlay', isFr)).join('');
  listEl.appendChild(list);

  // Auto-open: preselected → first unread → first overall
  const autoAppId = appId
    || threads.find(t => parseInt(t.unread||0) > 0)?.application_id
    || threads[0].application_id;
  const navEl = listEl.querySelector(`[data-appid="${autoAppId}"]`);
  openThreadInContainer('overlay', autoAppId, navEl);
}

async function sendMessage() {
  const isFr = state.lang === 'fr';
  const input = document.getElementById('msg-input');
  const body = input?.value.trim();
  if (!body || !_currentThreadApp) return;
  input.value = '';
  input.focus();
  const d = await api('POST', `${BASE}/api/messages/${_currentThreadApp}`, { body });
  if (d.success) {
    // Immediately re-render bubbles from server
    const rd = await api('GET', `${BASE}/api/messages/${_currentThreadApp}`);
    _renderBubbles(rd.messages || [], isFr);
    // Update preview in thread list
    const cId = _currentMsgContainer || 'overlay';
    const threadsEl = document.getElementById(`${cId}-threads`);
    const item = threadsEl?.querySelector(`[data-appid="${_currentThreadApp}"]`);
    if (item) {
      const previewEl = item.querySelector('div:last-child > div:last-child');
      if (previewEl) { previewEl.style.fontWeight = '400'; previewEl.innerHTML = esc(body).slice(0, 55); }
    }
  } else {
    toast(d.error || 'Error', 'error');
  }
}

// ── Pages entreprise publiques ────────────────────────────
async function loadCompanyPage(slug) {
  const isFr = state.lang === 'fr';
  let overlay = document.getElementById('company-page-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'company-page-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:var(--background);z-index:8000;overflow-y:auto;padding:0';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="max-width:900px;margin:0 auto;padding:24px 16px"><div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:32px;color:var(--indigo)"></i></div></div>`;

  const d = await api('GET', `${BASE}/api/companies/${slug}`);
  if (!d.success) { overlay.remove(); toast('Company not found', 'error'); return; }
  const { company: c, jobs, reviews, ratingDist } = d;
  const title = isFr ? (c.description_fr||c.description_en) : (c.description_en||c.description_fr);
  const stars = n => '★'.repeat(Math.round(n||0)) + '☆'.repeat(5-Math.round(n||0));
  const ratingBar = n => {
    const total = (ratingDist||[]).reduce((s,r)=>s+parseInt(r.n),0)||1;
    return (ratingDist||[]).map(r => {
      const pct = Math.round(parseInt(r.n)/total*100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px">
        <span style="color:var(--muted);width:16px;text-align:right">${r.rating}</span>
        <div style="flex:1;background:var(--border);height:6px;border-radius:3px"><div style="background:#f59e0b;width:${pct}%;height:6px;border-radius:3px"></div></div>
        <span style="color:var(--muted);width:24px">${r.n}</span>
      </div>`;
    }).join('');
  };
  const jobCards = (jobs||[]).map(j => {
    const jTitle = isFr ? (j.title_fr||j.title_en) : (j.title_en||j.title_fr);
    return `<div style="padding:14px;border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
      <div>
        <div style="font-weight:600;color:var(--dark);font-size:14px">${esc(jTitle)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">${[j.city, j.province].filter(Boolean).join(', ')||''} · <span class="job-tag ${j.work_mode||''}" style="font-size:11px;padding:2px 6px">${j.work_mode||'onsite'}</span></div>
      </div>
      <button class="btn-ghost" style="font-size:12px;flex-shrink:0" onclick="document.getElementById('company-page-overlay')?.remove();goto('jobs')"><i class="ti ti-arrow-right"></i> ${isFr?'Voir':'Apply'}</button>
    </div>`;
  }).join('');
  const reviewCards = (reviews||[]).map(r => `
    <div style="padding:16px;border:1px solid var(--border);border-radius:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="color:#f59e0b;font-size:14px">${stars(r.rating)}</div>
        <div style="font-size:11px;color:var(--muted)">${new Date(r.created_at).toLocaleDateString(isFr?'fr-CA':'en-CA',{year:'numeric',month:'short'})}</div>
      </div>
      ${r.title?`<div style="font-weight:600;color:var(--dark);font-size:13px;margin-bottom:6px">${esc(r.title)}</div>`:''}
      ${r.pros?`<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--green);font-weight:600">✓</span> ${esc(r.pros)}</div>`:''}
      ${r.cons?`<div style="font-size:12px"><span style="color:var(--danger);font-weight:600">✗</span> ${esc(r.cons)}</div>`:''}
    </div>`).join('');

  overlay.innerHTML = `
    <div style="background:var(--dark);padding:24px 0;margin-bottom:0">
      <div style="max-width:900px;margin:0 auto;padding:0 16px;display:flex;align-items:center;justify-content:space-between">
        <button class="btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.3);font-size:13px" onclick="document.getElementById('company-page-overlay')?.remove()"><i class="ti ti-arrow-left"></i> ${isFr?'Retour':'Back'}</button>
        <div style="font-size:13px;color:rgba(255,255,255,.5)">nexhire.ca</div>
      </div>
    </div>
    <div style="max-width:900px;margin:0 auto;padding:32px 16px">
      <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:28px;flex-wrap:wrap">
        ${c.logo_url ? `<img src="${esc(c.logo_url)}" style="width:80px;height:80px;border-radius:16px;object-fit:contain;border:1px solid var(--border)">` : `<div class="company-logo" style="background:${companyColor(c.name||'')};width:80px;height:80px;border-radius:16px;font-size:26px">${(c.name||'?').slice(0,2).toUpperCase()}</div>`}
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h1 style="margin:0;font-size:26px;color:var(--dark)">${esc(c.name)}</h1>
            ${c.verified?`<span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px">✓ ${isFr?'Vérifié':'Verified'}</span>`:''}
          </div>
          <div style="font-size:14px;color:var(--muted);margin-top:6px">${[c.industry, c.size, c.city, c.country].filter(Boolean).join(' · ')}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${c.avg_rating ? `<span style="color:#f59e0b;font-size:14px">${stars(c.avg_rating)} <strong style="color:var(--dark)">${parseFloat(c.avg_rating).toFixed(1)}</strong> <span style="color:var(--muted);font-size:12px">(${c.review_count} ${isFr?'avis':'reviews'})</span></span>` : ''}
            ${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener" style="font-size:13px;color:var(--indigo);text-decoration:none"><i class="ti ti-external-link"></i> ${esc(c.website.replace(/^https?:\/\//,''))}</a>` : ''}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;align-items:start">
        <div>
          ${title?`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:var(--dark);font-size:15px">${isFr?'À propos':'About'}</h3>
            <p style="margin:0;color:var(--text);line-height:1.6;font-size:14px">${esc(title)}</p>
          </div>`:''}
          <h3 style="color:var(--dark);font-size:15px;margin:0 0 12px">${isFr?'Offres actives':'Active jobs'} (${(jobs||[]).length})</h3>
          ${jobCards||`<p style="color:var(--muted);font-size:13px">${isFr?'Aucune offre active.':'No active jobs.'}</p>`}
          <h3 style="color:var(--dark);font-size:15px;margin:24px 0 12px">${isFr?'Avis salariés':'Employee reviews'} (${(reviews||[]).length})</h3>
          ${reviewCards||`<p style="color:var(--muted);font-size:13px">${isFr?'Aucun avis.':'No reviews yet.'}</p>`}
          <div style="border:2px dashed var(--border);border-radius:12px;padding:20px;margin-top:16px">
            <h4 style="margin:0 0 12px;color:var(--dark);font-size:14px">${isFr?'Laisser un avis':'Leave a review'}</h4>
            <div style="display:flex;gap:4px;margin-bottom:12px">${[1,2,3,4,5].map(n=>`<button onclick="setReviewRating(${n},this)" data-rating="${n}" style="font-size:22px;background:none;border:none;cursor:pointer;color:#d1d5db">★</button>`).join('')}</div>
            <input type="hidden" id="review-rating" value="">
            <input type="text" id="review-title" placeholder="${isFr?'Titre de l\'avis':'Review title'}" style="width:100%;margin-bottom:8px;font-size:13px">
            <div class="form-row" style="gap:8px">
              <div class="form-group"><label style="font-size:12px">✓ ${isFr?'Points positifs':'Pros'}</label><textarea id="review-pros" style="font-size:12px;min-height:60px"></textarea></div>
              <div class="form-group"><label style="font-size:12px">✗ ${isFr?'Points négatifs':'Cons'}</label><textarea id="review-cons" style="font-size:12px;min-height:60px"></textarea></div>
            </div>
            <button class="btn-primary" style="font-size:13px;padding:8px 18px;margin-top:4px" onclick="submitReview('${esc(c.slug)}')"><i class="ti ti-send"></i> ${isFr?'Publier':'Submit'}</button>
          </div>
        </div>
        <div>
          ${c.avg_rating ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
            <div style="font-size:40px;font-weight:900;color:var(--dark);text-align:center">${parseFloat(c.avg_rating).toFixed(1)}</div>
            <div style="color:#f59e0b;font-size:20px;text-align:center;margin-bottom:8px">${stars(c.avg_rating)}</div>
            ${ratingBar()}
          </div>` : ''}
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px">
            <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${isFr?'Informations':'Company info'}</div>
            ${[
              c.industry && ['<i class="ti ti-building-factory-2"></i>', c.industry],
              c.size && ['<i class="ti ti-users"></i>', c.size],
              c.city && ['<i class="ti ti-map-pin"></i>', [c.city,c.country].filter(Boolean).join(', ')],
            ].filter(Boolean).map(([icon,val])=>`<div style="display:flex;gap:8px;font-size:13px;color:var(--dark);padding:6px 0;border-bottom:1px solid var(--border)">${icon} ${esc(val)}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function setReviewRating(n, btn) {
  document.getElementById('review-rating').value = n;
  btn.closest('div').querySelectorAll('button').forEach((b,i) => {
    b.style.color = i < n ? '#f59e0b' : '#d1d5db';
  });
}

async function submitReview(slug) {
  const rating = document.getElementById('review-rating')?.value;
  const title  = document.getElementById('review-title')?.value.trim();
  const pros   = document.getElementById('review-pros')?.value.trim();
  const cons   = document.getElementById('review-cons')?.value.trim();
  const isFr   = state.lang === 'fr';
  if (!rating) { toast(isFr?'Choisissez une note':'Please select a rating', 'error'); return; }
  const d = await api('POST', `${BASE}/api/companies/${slug}/reviews`, { rating, title, pros, cons });
  if (d.success) { toast(isFr?'Merci pour votre avis !':'Review submitted!', 'success'); loadCompanyPage(slug); }
  else toast(d.error || 'Error', 'error');
}

// ── CV parsing IA ─────────────────────────────────────────
async function uploadAndParseCV() {
  const input = document.getElementById('cv-file-parse') || document.getElementById('cv-file');
  if (!input?.files?.length) return;
  const isFr = state.lang === 'fr';
  const statusEl = document.getElementById('cv-upload-status');
  const file = input.files[0];
  const formData = new FormData();
  formData.append('cv', file);
  if (statusEl) { statusEl.style.display = 'block'; statusEl.innerHTML = `<i class="ti ti-loader" style="animation:spin .8s linear infinite"></i> ${isFr?'Analyse IA en cours…':'Parsing with AI…'}`; }
  try {
    const resp = await fetch(`${BASE}/api/candidates/profile/cv/parse`, {
      method: 'POST', body: formData, credentials: 'include',
    });
    const d = await resp.json();
    if (!d.success) throw new Error(d.error);
    if (d.parsed) {
      const p = d.parsed;
      const apply = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      apply('pf-head-en', p.headline_en);
      apply('pf-head-fr', p.headline_fr);
      apply('pf-bio-en', p.bio_en);
      apply('pf-exp', p.experience_years);
      apply('pf-city', p.city);
      if (p.province) { const sel = document.getElementById('pf-province'); if (sel) sel.value = p.province; }
      // legacy skill chips
      const legacySkills = p.skills || [...(p.hard_skills||[]), ...(p.soft_skills||[])];
      if (legacySkills.length) {
        legacySkills.forEach(s => {
          const chip = document.querySelector(`.skill-chip[data-skill="${CSS.escape(s)}"]`);
          if (chip) chip.classList.add('selected');
        });
      }
      const hardCount = (p.hard_skills||[]).length;
      const softCount = (p.soft_skills||[]).length;
      const hlCount   = (p.highlights||[]).length;
      const parts = [];
      if (hardCount) parts.push(isFr ? `${hardCount} compétences techniques` : `${hardCount} hard skills`);
      if (softCount) parts.push(isFr ? `${softCount} soft skills` : `${softCount} soft skills`);
      if (hlCount)   parts.push(isFr ? `${hlCount} points forts` : `${hlCount} highlights`);
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ ${isFr?'Profil pré-rempli depuis le CV':'Profile pre-filled from CV'}${parts.length ? ` — ${parts.join(', ')}` : ''}</span>`;
      // reload sections so new data appears immediately
      if (hardCount || softCount) loadProfileSkillsSection();
      if (hlCount) loadHighlightsIntoContainer();
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ ${isFr?'CV sauvegardé.':'CV saved.'} ${d.message||''}</span>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${e.message}</span>`;
  }
}

// ── SSE Notifications temps réel ─────────────────────────
let _sseSource = null;

function startSSE() {
  if (_sseSource) return;
  if (!state.user) return;
  _sseSource = new EventSource(`${BASE}/api/notifications/stream`, { withCredentials: true });
  _sseSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.type === 'notification') {
        showInAppNotification(payload);
        updateNotifBadge(1);
      }
    } catch {}
  };
  _sseSource.onerror = () => {
    _sseSource?.close();
    _sseSource = null;
    setTimeout(() => { if (state.user) startSSE(); }, 10000);
  };
}

function stopSSE() {
  _sseSource?.close();
  _sseSource = null;
}

function showInAppNotification(n) {
  const isFr = state.lang === 'fr';
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:var(--dark);color:#fff;border-radius:12px;padding:14px 18px;font-size:13px;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:9999;display:flex;align-items:flex-start;gap:10px;cursor:pointer;animation:slideIn .3s ease';
  toast.innerHTML = `<i class="ti ti-bell" style="color:var(--indigo-light,#818cf8);font-size:18px;flex-shrink:0;margin-top:1px"></i>
    <div><div style="font-weight:600;margin-bottom:2px">${esc(n.title||isFr?'Notification':'Notification')}</div><div style="color:rgba(255,255,255,.7);font-size:12px">${esc(n.message||n.body||'')}</div></div>`;
  if (n.link_url) toast.onclick = () => { toast.remove(); location.hash = n.link_url; };
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function updateNotifBadge(delta) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const cur = parseInt(badge.textContent) || 0;
  const next = Math.max(0, cur + delta);
  badge.textContent = next > 9 ? '9+' : next > 0 ? String(next) : '';
  badge.style.display = next > 0 ? 'flex' : 'none';
}

// ── PWA Install prompt ────────────────────────────────────
let _pwaPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  const banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'flex';
});

function installPWA() {
  if (!_pwaPrompt) return;
  _pwaPrompt.prompt();
  _pwaPrompt.userChoice.then(r => {
    _pwaPrompt = null;
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.style.display = 'none';
  });
}

// ── Modal helpers ──────────────────────────────────────────
function showModal(id) {
  document.getElementById(id)?.classList.add('open');
  if (id === 'modal-register') {
    const refCode = sessionStorage.getItem('nh_ref_code');
    const banner = document.getElementById('reg-referral-banner');
    if (banner) {
      if (refCode) {
        const isFr = state.lang === 'fr';
        banner.innerHTML = `<div style="background:#6366F115;border:1px solid #6366F140;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--indigo);display:flex;align-items:center;gap:8px"><i class="ti ti-gift"></i> ${isFr ? `Vous avez été invité(e) — code <strong>${refCode}</strong>` : `You were referred — code <strong>${refCode}</strong>`}</div>`;
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }
  }
}
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

// ═══════════════════════════════════════════════════════════
// GLOBAL CLICK DISPATCHER — single listener handles every
// data-* attribute. Inline onclick are unreliable in iframes.
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', e => {
  // ── Save button — must run BEFORE job-card check ─────────
  const saveBtn = e.target.closest('[data-save-id]');
  if (saveBtn) {
    e.stopPropagation();
    toggleSave(saveBtn.dataset.saveId, e);
    return;
  }

  // ── Job card / list-item click → open detail ─────────────
  const jobCard = e.target.closest('[data-job-id]');
  if (jobCard) {
    openJobDetail(jobCard.dataset.jobId);
    return;
  }

  // ── Pagination ───────────────────────────────────────────
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) {
    filterJobs(parseInt(pageBtn.dataset.page, 10));
    return;
  }

  // ── Apply button in detail panel ─────────────────────────
  const applyBtn = e.target.closest('[data-apply-id]');
  if (applyBtn) {
    openQuickApply(applyBtn.dataset.applyId, applyBtn.dataset.applyTitle || '');
    return;
  }

  // ── Write review button in detail panel ──────────────────
  const revBtn = e.target.closest('[data-review-company-id]');
  if (revBtn) {
    openReviewModal(revBtn.dataset.reviewCompanyId, revBtn.dataset.reviewCompanyName || '');
    return;
  }

  const el = e.target.closest(
    '[data-goto],[data-modal],[data-hide-modal],[data-search],' +
    '[data-action],[data-lang],[data-checkout],[data-tab],' +
    '[data-setting],[data-privacy-tab],[data-stars],[data-consent],' +
    '[data-role],[data-self-close]'
  );
  if (!el) return;

  // ── Backdrop self-close ──────────────────────────────────
  if (el.dataset.selfClose && el === e.target) {
    hideModal(el.dataset.selfClose);
    return;
  }

  // ── Navigation ───────────────────────────────────────────
  if (el.dataset.goto) {
    e.preventDefault();
    goto(el.dataset.goto);
    return;
  }

  // ── Open modal ───────────────────────────────────────────
  if (el.dataset.modal) {
    showModal(el.dataset.modal);
    return;
  }

  // ── Close modal ──────────────────────────────────────────
  if (el.dataset.hideModal) {
    hideModal(el.dataset.hideModal);
    return;
  }

  // ── Quick-search (tags / cat-cards) ──────────────────────
  if (el.dataset.search !== undefined) {
    quickSearch(el.dataset.search);
    return;
  }

  // ── Language toggle ──────────────────────────────────────
  if (el.dataset.lang) {
    setLang(el.dataset.lang);
    return;
  }

  // ── Stripe checkout ──────────────────────────────────────
  if (el.dataset.checkout) {
    e.preventDefault();
    const [plan, period] = el.dataset.checkout.split(',');
    startCheckout(plan, period);
    return;
  }

  // ── Candidate dashboard tabs ─────────────────────────────
  if (el.dataset.tab && el.closest('#cand-dash-nav')) {
    showTab(el.dataset.tab, el);
    if (el.dataset.tabExtra === 'loadMyReviews') loadMyReviews();
    return;
  }

  // ── Settings nav ─────────────────────────────────────────
  if (el.dataset.setting) {
    showSettingsSection(el.dataset.setting, el);
    return;
  }

  // ── Privacy tabs ─────────────────────────────────────────
  if (el.dataset.privacyTab) {
    showPrivacyTab(el.dataset.privacyTab, el);
    return;
  }

  // ── Review star picker ───────────────────────────────────
  if (el.dataset.stars) {
    setRevStars(parseInt(el.dataset.stars, 10));
    return;
  }

  // ── AI consent buttons ───────────────────────────────────
  if (el.dataset.consent !== undefined) {
    setAiConsent(el.dataset.consent === 'true');
    return;
  }

  // ── Register role tabs ───────────────────────────────────
  if (el.dataset.role) {
    setRegRole(el.dataset.role, el);
    return;
  }

  // ── Named actions ────────────────────────────────────────
  if (el.dataset.action) {
    switch (el.dataset.action) {
      case 'search-jobs':       searchJobs();                             break;
      case 'send-ai-msg':       sendAiMsg();                              break;
      case 'ai-cover-letter':   generateAiCoverLetter();                  break;
      case 'submit-apply':      submitQuickApply();                       break;
      case 'submit-review':     submitReview();                           break;
      case 'close-kanban':      closeKanban();                            break;
      case 'close-job-detail':  closeJobDetail();                         break;
      case 'show-forgot':       e.preventDefault(); showForgot();         break;
      case 'switch-to-register':
        hideModal('modal-login'); showModal('modal-register');             break;
      case 'terms-from-register':
        e.preventDefault(); hideModal('modal-register'); goto('terms');   break;
      // ── Highlights ──────────────────────────────────────
      case 'open-hl-modal':
        _hlSelectedIcon = '⭐';
        document.getElementById('hl-modal-backdrop')?.classList.remove('hidden');
        break;
      case 'close-hl-modal':
        document.getElementById('hl-modal-backdrop')?.classList.add('hidden');
        break;
      case 'select-hl-icon':
        _hlSelectedIcon = el.dataset.icon || '⭐';
        document.querySelectorAll('.hl-icon-opt').forEach(o => o.classList.toggle('selected', o.dataset.icon === _hlSelectedIcon));
        break;
      case 'save-highlight':    saveNewHighlight();                       break;
      case 'remove-highlight':  removeHighlight(el.dataset.id);           break;
      // ── Profile skills ──────────────────────────────────
      case 'open-skill-modal': {
        _skillModalType = el.dataset.skillType || 'hard';
        const isFr2 = state.lang === 'fr';
        const titleEl = document.getElementById('ps-modal-title');
        const levelWrap = document.getElementById('ps-level-wrap');
        if (titleEl) titleEl.textContent = _skillModalType === 'hard' ? (isFr2 ? 'Compétence technique' : 'Technical skill') : 'Soft skill';
        if (levelWrap) levelWrap.style.display = _skillModalType === 'hard' ? '' : 'none';
        const nameEl = document.getElementById('ps-skill-name');
        if (nameEl) { nameEl.value = ''; nameEl.focus(); }
        if (document.getElementById('ps-skill-level')) document.getElementById('ps-skill-level').value = 75;
        if (document.getElementById('ps-level-val')) document.getElementById('ps-level-val').textContent = '75';
        document.getElementById('ps-modal-backdrop')?.classList.remove('hidden');
        break;
      }
      case 'close-skill-modal':
        document.getElementById('ps-modal-backdrop')?.classList.add('hidden');
        break;
      case 'save-profile-skill':  saveNewProfileSkill();                  break;
      case 'remove-profile-skill': removeProfileSkill(el.dataset.id);     break;
      case 'go-skill-tests':
        showTab('tab-skills', document.querySelector('[data-tab="tab-skills"]'));
        break;
      // ── Recommendations ─────────────────────────────────
      case 'open-rec-ext':
        document.getElementById('rec-ext-modal')?.classList.remove('hidden');
        break;
      case 'close-rec-ext':
        document.getElementById('rec-ext-modal')?.classList.add('hidden');
        break;
      case 'open-rec-inv':
        document.getElementById('rec-inv-form').style.display = '';
        document.getElementById('rec-inv-result').style.display = 'none';
        document.getElementById('rec-inv-modal')?.classList.remove('hidden');
        break;
      case 'close-rec-inv':
        document.getElementById('rec-inv-modal')?.classList.add('hidden');
        break;
      case 'save-rec-ext':    saveExternalRec();                          break;
      case 'gen-rec-inv':     generateRecInvite();                        break;
      case 'remove-rec':      removeRecommendation(el.dataset.id);        break;
      case 'copy-rec-link': {
        const inp = document.getElementById('rec-inv-link');
        if (inp) { inp.select(); navigator.clipboard?.writeText(inp.value).catch(()=>{}); toast(state.lang==='fr'?'Lien copié !':'Link copied!','success'); }
        break;
      }
      case 'set-rec-star': {
        const v = parseInt(el.dataset.v||'5');
        const picker = el.closest('[id="rec-ext-stars"]');
        if (picker) {
          picker.dataset.rating = v;
          picker.querySelectorAll('.rec-star-opt').forEach(s => s.classList.toggle('active', parseInt(s.dataset.v) <= v));
        }
        break;
      }
    }
    return;
  }
});

// ── AI input — Enter key ─────────────────────────────────────
document.getElementById('ai-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendAiMsg();
});
document.getElementById('btn-ai-send')?.addEventListener('click', sendAiMsg);

// ── Auth modals ──────────────────────────────────────────────
document.getElementById('btn-login-submit')?.addEventListener('click', login);
document.getElementById('btn-register-submit')?.addEventListener('click', register);
document.getElementById('login-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
document.getElementById('reg-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') register(); });
document.getElementById('btn-toggle-login-pw')?.addEventListener('click', () => togglePw('login-pw'));
document.getElementById('btn-toggle-reg-pw')?.addEventListener('click', () => togglePw('reg-pw'));

// ── Navbar — user menu toggle ────────────────────────────────
document.getElementById('nav-user-menu')?.addEventListener('click', e => {
  e.stopPropagation();
  toggleUserMenu();
});

// ── Navbar — notif bell ──────────────────────────────────────
document.getElementById('nav-notif-bell')?.addEventListener('click', () => {
  if (state.user?.role === 'employer') goto('employer-dash');
  else goto('candidate-dash');
});

// ── Navbar — dropdown items ──────────────────────────────────
document.getElementById('user-dropdown')?.addEventListener('click', e => {
  const item = e.target.closest('[data-goto]');
  if (item) {
    toggleUserMenu();
    let dest = item.dataset.goto;
    // "Profil" link routes to the correct dashboard based on role
    if (dest === 'candidate-dash' && state.user?.role === 'employer') dest = 'employer-dash';
    goto(dest);
    return;
  }
  const logout_btn = e.target.closest('#dd-logout');
  if (logout_btn) { toggleUserMenu(); logout(); return; }
  const reviews_btn = e.target.closest('#dd-my-reviews');
  if (reviews_btn) {
    toggleUserMenu();
    if (state.user?.role === 'employer') { goto('employer-dash'); return; }
    goto('candidate-dash');
    showTab('tab-my-reviews', document.querySelector('[data-tab="tab-my-reviews"]'));
  }
});

// ── Employer dashboard sidebar nav ───────────────────────────
document.getElementById('emp-dash-nav')?.addEventListener('click', e => {
  const item = e.target.closest('[data-emptab]');
  if (item) showEmpTab(item.dataset.emptab, item);
});

// ── Employer dashboard "Post job" header button ──────────────
document.getElementById('btn-post-job-header')?.addEventListener('click', () => showEmpTab('etab-post'));

// restoreFromHash() is now called inside the async init IIFE (after auth/me resolves)

// ═══════════════════════════════════════════════════════════
// PHASE 3 — PROFILE SCORE
// ═══════════════════════════════════════════════════════════
async function loadProfileScore() {
  const el = document.getElementById('tab-score');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/profile-score`);
  if (!d.success) { el.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><p>${d.error}</p></div>`; return; }
  const { score, checks, suggestions, peer_avg, badges, applications } = d;
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const suggs = isFr ? suggestions.fr : suggestions.en;
  el.innerHTML = `
    <h2><i class="ti ti-chart-line" style="color:var(--indigo)"></i> ${isFr ? 'Score de profil' : 'Profile Score'}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center">
        <svg viewBox="0 0 120 120" width="140" height="140" style="display:block;margin:0 auto 12px">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="10"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="${color}" stroke-width="10"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1s ease"/>
          <text x="60" y="64" text-anchor="middle" font-size="28" font-weight="700" fill="${color}">${score}</text>
          <text x="60" y="80" text-anchor="middle" font-size="11" fill="var(--muted)">/ 100</text>
        </svg>
        <div style="font-size:22px;font-weight:700;color:${color}">${score >= 80 ? (isFr ? 'Excellent' : 'Excellent') : score >= 60 ? (isFr ? 'Bon' : 'Good') : score >= 40 ? (isFr ? 'Moyen' : 'Fair') : (isFr ? 'Faible' : 'Weak')}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px">${isFr ? `Moyenne candidats : ${peer_avg}` : `Peer average: ${peer_avg}`}</div>
        <div style="display:flex;gap:16px;justify-content:center;margin-top:16px">
          <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--indigo)">${badges}</div><div style="font-size:11px;color:var(--muted)">${isFr ? 'Badges' : 'Badges'}</div></div>
          <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--indigo)">${applications}</div><div style="font-size:11px;color:var(--muted)">${isFr ? 'Candidatures' : 'Applications'}</div></div>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px">
        <div style="font-weight:700;font-size:15px;margin-bottom:16px">${isFr ? '✅ Ce qui compte' : '✅ What counts'}</div>
        ${checks.map(c => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <i class="ti ti-${c.done ? 'circle-check' : 'circle-x'}" style="color:${c.done ? '#4ade80' : '#f87171'};font-size:18px;flex-shrink:0"></i>
            <span style="font-size:13px;color:${c.done ? 'var(--text)' : 'var(--muted)'}">${c.label}</span>
            <span style="margin-left:auto;font-size:11px;font-weight:600;color:var(--indigo)">+${c.points}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ${suggs.length ? `
    <div style="background:linear-gradient(135deg,#6366F1 0%,#8b5cf6 100%);border-radius:16px;padding:24px;color:#fff">
      <div style="font-weight:700;font-size:16px;margin-bottom:16px">💡 ${isFr ? 'Suggestions pour augmenter votre score' : 'Suggestions to boost your score'}</div>
      ${suggs.map(s => `
        <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.1);border-radius:10px;padding:12px 16px;margin-bottom:8px">
          <i class="ti ti-arrow-up" style="font-size:18px;flex-shrink:0"></i>
          <span style="font-size:14px">${s.text}</span>
          <span style="margin-left:auto;font-size:12px;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:12px">+${s.points} pts</span>
        </div>
      `).join('')}
      <button class="btn-white" style="margin-top:12px;font-size:13px" data-action="go-skill-tests">
        <i class="ti ti-certificate"></i> ${isFr ? 'Passer des tests de compétences' : 'Take skill tests'}
      </button>
    </div>
    ` : `<div style="background:#4ade8022;border:1px solid #4ade80;border-radius:12px;padding:20px;text-align:center;color:#4ade80;font-weight:600">🎉 ${isFr ? 'Profil complet ! Continuez ainsi.' : 'Profile complete! Keep it up.'}</div>`}
  `;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3 — SKILL TESTS & BADGES
// ═══════════════════════════════════════════════════════════
let currentTest = null;
let currentAnswers = [];

async function loadSkillTests() {
  const el = document.getElementById('tab-skills');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/skills/tests`);
  if (!d.success) { el.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><p>${d.error || 'Error'}</p></div>`; return; }
  const { tests } = d;
  const categories = ['All', ...[...new Set(tests.map(t => t.category))]];
  const diffColor = { beginner: '#4ade80', intermediate: '#facc15', advanced: '#f87171' };
  const verified = state.verifiedSkillNames || new Set();

  el.innerHTML = `
    <h2><i class="ti ti-certificate" style="color:var(--indigo)"></i> ${isFr ? 'Tests de compétences vérifiables' : 'Verified Skill Tests'}</h2>
    <p style="color:var(--muted);margin-bottom:16px">${isFr ? 'Réussissez un test → badge ✓ vérifié ajouté à votre profil. Les employeurs peuvent filtrer par compétences validées.' : 'Pass a test → verified ✓ badge added to your profile. Employers can filter by validated skills.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px" id="skill-filter-pills">
      ${categories.map((cat, i) => `
        <button class="skill-filter-pill" data-cat="${cat}"
          onclick="filterSkillTests('${cat}')"
          style="background:${i===0?'var(--indigo)':'var(--surface)'};color:${i===0?'#fff':''};border:1px solid ${i===0?'var(--indigo)':'var(--border)'};border-radius:20px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s">
          ${cat}
        </button>
      `).join('')}
    </div>
    <div id="skill-tests-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${tests.map(t => {
        const passed = t.passed;
        const attempted = t.score !== null && t.score !== undefined;
        return `
        <div class="skill-test-card" data-category="${t.category}" style="background:var(--surface);border:1px solid ${passed ? '#4ade8055' : 'var(--border)'};border-radius:16px;padding:20px;position:relative${passed ? ';box-shadow:0 0 0 2px #4ade8033' : ''}">
          ${passed ? `<div style="position:absolute;top:12px;right:12px;background:#4ade80;color:#000;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">✓ ${isFr ? 'Réussi' : 'Passed'}</div>` : ''}
          <div style="font-size:12px;color:${diffColor[t.difficulty] || '#facc15'};font-weight:600;margin-bottom:6px;text-transform:uppercase">${t.difficulty} · ${t.category}</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">${isFr ? t.title_fr : t.title_en}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${t.question_count} ${isFr ? 'questions' : 'questions'} · ${isFr ? 'Score min' : 'Pass score'}: ${t.pass_score}%</div>
          ${attempted ? `<div style="font-size:13px;margin-bottom:12px;color:${passed ? '#4ade80' : 'var(--muted)'}">${isFr ? 'Votre score' : 'Your score'}: <strong>${t.score}%</strong></div>` : ''}
          <button class="btn-primary" style="width:100%;font-size:13px;padding:9px" onclick="startSkillTest('${t.slug}', '${isFr ? t.title_fr : t.title_en}')">
            <i class="ti ti-${passed ? 'refresh' : 'pencil'}"></i> ${passed ? (isFr ? 'Repasser' : 'Retake') : (isFr ? 'Commencer le test' : 'Start Test')}
          </button>
        </div>
      `}).join('')}
    </div>
  `;
}

function filterSkillTests(cat) {
  // Update pill active state
  document.querySelectorAll('.skill-filter-pill').forEach(p => {
    const active = p.dataset.cat === cat;
    p.style.background    = active ? 'var(--indigo)' : 'var(--surface)';
    p.style.color         = active ? '#fff' : '';
    p.style.borderColor   = active ? 'var(--indigo)' : 'var(--border)';
  });
  // Filter cards
  document.querySelectorAll('.skill-test-card').forEach(c => {
    c.style.display = (cat === 'All' || c.dataset.category === cat) ? '' : 'none';
  });
}

async function startSkillTest(slug, title) {
  const isFr = state.lang === 'fr';
  const el = document.getElementById('tab-skills');
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/skills/tests/${slug}`);
  if (!d.success) { toast(d.error || 'Error loading test', 'error'); loadSkillTests(); return; }
  currentTest = d.test;
  currentAnswers = new Array(d.test.questions.length).fill(null);
  renderSkillTestUI();
}

function renderSkillTestUI() {
  const el = document.getElementById('tab-skills');
  if (!el || !currentTest) return;
  const isFr = state.lang === 'fr';
  const t = currentTest;
  el.innerHTML = `
    <div style="max-width:680px;margin:0 auto">
      <button class="btn-ghost" style="margin-bottom:16px" onclick="loadSkillTests()"><i class="ti ti-arrow-left"></i> ${isFr ? 'Retour' : 'Back'}</button>
      <h2>${isFr ? t.title_fr || t.title_en : t.title_en}</h2>
      <p style="color:var(--muted);margin-bottom:24px">${t.questions.length} ${isFr ? 'questions · Score minimum' : 'questions · Pass score'}: ${t.pass_score}%</p>
      <div id="test-questions">
        ${t.questions.map((q, i) => `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
            <div style="font-weight:600;margin-bottom:14px">${i + 1}. ${q.q}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="q-opts-${i}">
              ${q.opts.map((opt, j) => `
                <button onclick="selectAnswer(${i},${j})" id="q-opt-${i}-${j}"
                  style="padding:10px 14px;background:var(--bg);border:2px solid var(--border);border-radius:10px;text-align:left;cursor:pointer;font-size:13px;transition:all .2s">
                  <span style="font-weight:700;margin-right:8px">${String.fromCharCode(65+j)}.</span>${opt}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div id="test-submit-row" style="display:flex;justify-content:center;margin-top:24px">
        <button class="btn-primary" style="padding:12px 32px;font-size:15px" onclick="submitSkillTest()"><i class="ti ti-send"></i> ${isFr ? 'Soumettre le test' : 'Submit Test'}</button>
      </div>
    </div>
  `;
}

function selectAnswer(qIdx, optIdx) {
  currentAnswers[qIdx] = optIdx;
  const container = document.getElementById(`q-opts-${qIdx}`);
  if (!container) return;
  container.querySelectorAll('button').forEach((btn, j) => {
    btn.style.borderColor = j === optIdx ? 'var(--indigo)' : 'var(--border)';
    btn.style.background = j === optIdx ? '#6366F115' : 'var(--bg)';
    btn.style.color = j === optIdx ? 'var(--indigo)' : '';
    btn.style.fontWeight = j === optIdx ? '600' : '';
  });
}

async function submitSkillTest() {
  if (!currentTest) return;
  const isFr = state.lang === 'fr';
  if (currentAnswers.some(a => a === null)) {
    toast(isFr ? 'Répondez à toutes les questions' : 'Please answer all questions', 'error'); return;
  }
  const d = await api('POST', `${BASE}/api/skills/tests/${currentTest.slug}/submit`, { answers: currentAnswers });
  if (!d.success) { toast(d.error || 'Error', 'error'); return; }
  const { score, passed, correct, total, feedback } = d;
  const el = document.getElementById('tab-skills');
  const color = passed ? '#4ade80' : '#f87171';
  el.innerHTML = `
    <div style="max-width:680px;margin:0 auto">
      <div style="text-align:center;padding:32px 24px;background:var(--surface);border:2px solid ${color}33;border-radius:20px;margin-bottom:24px">
        <div style="font-size:64px;margin-bottom:8px">${passed ? '🏅' : '💪'}</div>
        <div style="font-size:36px;font-weight:800;color:${color}">${score}%</div>
        <div style="font-size:18px;font-weight:600;margin:8px 0">${passed ? (isFr ? 'Badge obtenu !' : 'Badge Earned!') : (isFr ? 'Pas encore...' : 'Not yet...')}</div>
        <div style="font-size:14px;color:var(--muted)">${correct}/${total} ${isFr ? 'bonnes réponses' : 'correct answers'} · ${isFr ? 'Score minimum' : 'Pass score'}: ${currentTest.pass_score}%</div>
        ${passed && d.added_skills?.length ? `<div style="margin-top:12px;background:#4ade8022;border-radius:10px;padding:10px;font-size:13px;color:#4ade80"><i class="ti ti-check"></i> ${isFr ? 'Compétences ajoutées à votre profil' : 'Skills added to your profile'} : <strong>${d.added_skills.join(', ')}</strong></div>` : passed ? `<div style="margin-top:12px;background:#4ade8022;border-radius:10px;padding:10px;font-size:13px;color:#4ade80"><i class="ti ti-check"></i> ${isFr ? 'Badge ajouté à votre profil !' : 'Badge added to your profile!'}</div>` : ''}
      </div>
      <div style="margin-bottom:24px">
        <div style="font-weight:700;font-size:15px;margin-bottom:12px">${isFr ? 'Vos réponses' : 'Your Answers'}</div>
        ${feedback.map((f, i) => `
          <div style="background:var(--surface);border:1px solid ${f.correct ? '#4ade8033' : '#f8717133'};border-radius:12px;padding:14px 16px;margin-bottom:8px">
            <div style="font-weight:600;margin-bottom:6px">${i+1}. ${f.q}</div>
            <div style="font-size:13px;color:${f.correct ? '#4ade80' : '#f87171'}">${f.correct ? '✓' : '✗'} ${isFr ? 'Votre réponse' : 'Your answer'}: <strong>${f.your_answer}</strong></div>
            ${!f.correct ? `<div style="font-size:13px;color:var(--muted)">${isFr ? 'Bonne réponse' : 'Correct'}: <strong>${f.correct_answer}</strong></div>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn-primary" onclick="startSkillTest('${currentTest.slug}', '')"><i class="ti ti-refresh"></i> ${isFr ? 'Réessayer' : 'Try Again'}</button>
        <button class="btn-ghost" onclick="loadSkillTests()"><i class="ti ti-arrow-left"></i> ${isFr ? 'Tous les tests' : 'All Tests'}</button>
      </div>
    </div>
  `;
  currentTest = null;
  currentAnswers = [];
  // Refresh verified skills so picker shows ✓ immediately
  if (passed) loadVerifiedSkills();
}

// ═══════════════════════════════════════════════════════════
// PHASE 3 — REFERRALS
// ═══════════════════════════════════════════════════════════
async function loadReferrals() {
  const el = document.getElementById('tab-referrals');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/referrals/my`);
  if (!d.success) { el.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><p>${d.error || 'Error'}</p></div>`; return; }
  const { code, referral_url, referrals, total, rewarded, reward_description_en, reward_description_fr } = d;
  el.innerHTML = `
    <h2><i class="ti ti-gift" style="color:var(--indigo)"></i> ${isFr ? 'Programme de référencement' : 'Referral Program'}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#6366F1,#8b5cf6);border-radius:16px;padding:24px;color:#fff">
        <div style="font-size:13px;opacity:.8;margin-bottom:8px">${isFr ? 'Votre lien de référencement' : 'Your referral link'}</div>
        <div style="font-family:monospace;font-size:14px;background:rgba(0,0,0,.2);border-radius:8px;padding:10px;word-break:break-all;margin-bottom:14px">${referral_url}</div>
        <button onclick="navigator.clipboard.writeText('${referral_url}').then(()=>toast('${isFr ? 'Lien copié !' : 'Link copied!'}', 'success'))"
          style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
          <i class="ti ti-copy"></i> ${isFr ? 'Copier le lien' : 'Copy Link'}
        </button>
        <div style="margin-top:12px;font-size:12px;opacity:.7">${isFr ? reward_description_fr : reward_description_en}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:800;color:var(--indigo)">${total}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${isFr ? 'Total référés' : 'Total referrals'}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:800;color:#4ade80">${rewarded}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${isFr ? 'Récompenses gagnées' : 'Rewards earned'}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center;grid-column:1/-1">
          <div style="font-size:13px;color:var(--muted);margin-bottom:6px">${isFr ? 'Votre code' : 'Your code'}</div>
          <div style="font-size:24px;font-weight:800;font-family:monospace;letter-spacing:4px;color:var(--indigo)">${code}</div>
        </div>
      </div>
    </div>
    ${referrals.length ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)">${isFr ? 'Mes référés' : 'My Referrals'}</div>
        ${referrals.map(r => `
          <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--indigo);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">${(r.first_name||'?')[0]}</div>
            <div style="flex:1">
              <div style="font-weight:600">${r.first_name} ${r.last_name}</div>
              <div style="font-size:12px;color:var(--muted)">${new Date(r.created_at).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA')}</div>
            </div>
            ${r.reward_granted ? `<span style="background:#4ade8022;color:#4ade80;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">+20 crédits</span>` : ''}
          </div>
        `).join('')}
      </div>
    ` : `<div class="empty-state"><i class="ti ti-users"></i><p>${isFr ? 'Aucun référé encore. Partagez votre lien !' : 'No referrals yet. Share your link!'}</p></div>`}
    <div style="margin-top:24px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
      <div style="font-weight:700;margin-bottom:12px">${isFr ? 'Comment ça marche' : 'How it works'}</div>
      ${[
        [isFr ? '1. Copiez votre lien' : '1. Copy your link', isFr ? 'Partagez-le avec vos collègues employeurs.' : 'Share it with employer colleagues.'],
        [isFr ? '2. Ils s\'inscrivent' : '2. They sign up', isFr ? 'Ils créent un compte via votre lien.' : 'They create an account via your link.'],
        [isFr ? '3. Vous gagnez 20 crédits IA' : '3. You earn 20 AI credits', isFr ? 'Automatiquement ajoutés à votre compte.' : 'Automatically added to your account.'],
      ].map(([title, desc]) => `
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <i class="ti ti-check" style="color:#4ade80;font-size:18px;flex-shrink:0;margin-top:2px"></i>
          <div><strong>${title}</strong> — <span style="color:var(--muted)">${desc}</span></div>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3 — SALARY MARKET DATA (public SEO page + tab)
// ═══════════════════════════════════════════════════════════
async function loadSalaryPage() {
  const el = document.getElementById('tab-salary');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const [trending, provinces, mySub] = await Promise.all([
    api('GET', `${BASE}/api/salary/trending`),
    api('GET', `${BASE}/api/salary/provinces`),
    state.user ? api('GET', `${BASE}/api/salary/my-submission`) : Promise.resolve({ success: false }),
  ]);
  const sub = mySub.success ? mySub.submission : null;
  const totalSubs = mySub.total || 0;

  el.innerHTML = `
    <h2><i class="ti ti-cash" style="color:var(--indigo)"></i> ${isFr ? 'Données salariales du marché' : 'Salary Market Data'}</h2>
    <p style="color:var(--muted);margin-bottom:24px">${isFr ? 'Trois sources combinées : offres d\'emploi actives, benchmarks marché Canada, et témoignages anonymes de professionnels.' : 'Three combined sources: active job postings, Canadian market benchmarks, and anonymous professional submissions.'}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
        <div style="font-weight:700;font-size:15px;margin-bottom:14px"><i class="ti ti-search" style="color:var(--indigo)"></i> ${isFr ? 'Recherche salariale' : 'Salary Search'}</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <input id="sal-title" type="text" placeholder="${isFr ? 'Titre du poste (ex: DevOps Engineer)' : 'Job title (e.g. DevOps Engineer)'}" class="field">
          <select id="sal-province" class="field">
            <option value="">${isFr ? 'Toutes les provinces' : 'All provinces'}</option>
            <option>QC</option><option>ON</option><option>BC</option><option>AB</option><option>MB</option><option>SK</option><option>NS</option><option>NB</option>
          </select>
          <button class="btn-primary" style="padding:10px" onclick="searchSalary()"><i class="ti ti-search"></i> ${isFr ? 'Rechercher' : 'Search'}</button>
        </div>
        <div id="sal-result" style="margin-top:14px"></div>
      </div>

      <div style="background:linear-gradient(135deg,#6366F1,#8b5cf6);border-radius:14px;padding:20px;color:#fff">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px"><i class="ti ti-users"></i> ${isFr ? 'Partagez votre salaire' : 'Share Your Salary'}</div>
        <div style="font-size:12px;opacity:.8;margin-bottom:14px">${isFr ? `${totalSubs.toLocaleString()} professionnels ont déjà contribué — 100% anonyme.` : `${totalSubs.toLocaleString()} professionals have contributed — 100% anonymous.`}</div>
        ${sub ? `
          <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:12px;font-size:13px;margin-bottom:12px">
            <div style="font-weight:600">${isFr ? 'Votre contribution' : 'Your contribution'}</div>
            <div style="opacity:.85;margin-top:4px">${sub.title_normalized} · ${sub.province} · ${isFr ? formatSalaryFr(sub.salary) : formatSalary(sub.salary)}${isFr ? '/an' : '/yr'}</div>
          </div>
          <button onclick="showSalarySubmitForm(true)" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;width:100%">
            <i class="ti ti-edit"></i> ${isFr ? 'Modifier' : 'Update'}
          </button>
        ` : `
          <button onclick="showSalarySubmitForm(false)" style="background:#fff;border:none;color:#6366F1;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;width:100%">
            <i class="ti ti-plus"></i> ${isFr ? 'Contribuer mes données' : 'Contribute My Data'}
          </button>
        `}
        <div id="sal-submit-form" style="display:none;margin-top:14px"></div>
      </div>
    </div>

    ${trending.success && trending.roles.length ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:24px">
      <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)"><i class="ti ti-trending-up"></i> ${isFr ? 'Postes les mieux rémunérés au Canada' : 'Top Paying Roles in Canada'}</div>
      ${trending.roles.map((r) => {
        const pct = Math.round((r.avg_salary / trending.roles[0].avg_salary) * 100);
        const title = r.norm_title || r.title_en || '';
        return `
          <div style="padding:12px 20px;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:600;font-size:14px;text-transform:capitalize">${title}</span>
              <div style="display:flex;align-items:center;gap:8px">
                ${r.is_benchmark ? `<span style="font-size:10px;background:#6366F115;color:var(--indigo);padding:2px 7px;border-radius:10px">${isFr ? 'benchmark' : 'benchmark'}</span>` : `<span style="font-size:11px;color:var(--muted)">${r.count} ${isFr ? 'offres' : 'jobs'}</span>`}
                <span style="font-weight:700;color:var(--indigo)">${isFr ? formatSalaryFr(r.avg_salary) : formatSalary(r.avg_salary)}</span>
              </div>
            </div>
            <div style="background:var(--border);border-radius:4px;height:5px">
              <div style="width:${pct}%;background:var(--indigo);border-radius:4px;height:5px"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${provinces.success && provinces.provinces.length ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)"><i class="ti ti-map"></i> ${isFr ? 'Salaire moyen par province' : 'Average Salary by Province'}</div>
      <div style="padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
        ${provinces.provinces.map(p => `
          <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:var(--indigo)">${p.province}</div>
            <div style="font-size:15px;font-weight:700;margin:4px 0">${isFr ? formatSalaryFr(p.avg_salary) : formatSalary(p.avg_salary)}</div>
            <div style="font-size:11px;color:var(--muted)">${p.job_count} ${isFr ? (p.is_benchmark ? 'benchmarks' : 'offres') : (p.is_benchmark ? 'benchmarks' : 'jobs')}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

function showSalarySubmitForm(isUpdate) {
  const isFr = state.lang === 'fr';
  const container = document.getElementById('sal-submit-form');
  if (!container) return;
  container.style.display = '';
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <input id="ssf-title" type="text" placeholder="${isFr ? 'Votre titre de poste actuel' : 'Your current job title'}"
        style="padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-size:13px;outline:none" class="ssf-input">
      <select id="ssf-province" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-size:13px" class="ssf-input">
        <option value="">${isFr ? 'Province' : 'Province'}</option>
        <option>QC</option><option>ON</option><option>BC</option><option>AB</option><option>MB</option><option>SK</option><option>NS</option><option>NB</option>
      </select>
      <input id="ssf-salary" type="number" min="20000" max="1000000" placeholder="${isFr ? 'Salaire annuel (CAD)' : 'Annual salary (CAD)'}"
        style="padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-size:13px;outline:none" class="ssf-input">
      <select id="ssf-exp" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-size:13px" class="ssf-input">
        <option value="">${isFr ? 'Années d\'expérience (optionnel)' : 'Years of experience (optional)'}</option>
        <option value="1">${isFr ? '0–2 ans' : '0–2 yrs'}</option>
        <option value="4">${isFr ? '3–5 ans' : '3–5 yrs'}</option>
        <option value="8">${isFr ? '6–10 ans' : '6–10 yrs'}</option>
        <option value="15">${isFr ? '10+ ans' : '10+ yrs'}</option>
      </select>
      <div style="display:flex;gap:8px">
        <button onclick="submitMySalary()" style="flex:1;background:#fff;border:none;color:#6366F1;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">
          <i class="ti ti-check"></i> ${isUpdate ? (isFr ? 'Mettre à jour' : 'Update') : (isFr ? 'Soumettre' : 'Submit')}
        </button>
        <button onclick="document.getElementById('sal-submit-form').style.display='none'" style="background:rgba(255,255,255,.1);border:none;color:#fff;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px">
          ${isFr ? 'Annuler' : 'Cancel'}
        </button>
      </div>
    </div>
  `;
}

async function submitMySalary() {
  const isFr = state.lang === 'fr';
  const title    = document.getElementById('ssf-title')?.value.trim();
  const province = document.getElementById('ssf-province')?.value;
  const salary   = document.getElementById('ssf-salary')?.value;
  const years_exp= document.getElementById('ssf-exp')?.value;
  if (!title || !province || !salary) {
    toast(isFr ? 'Remplissez le titre, la province et le salaire.' : 'Fill in title, province and salary.', 'error');
    return;
  }
  const d = await api('POST', `${BASE}/api/salary/submit`, { title, province, salary, years_exp });
  if (d.success) {
    toast(isFr ? `✅ Merci ! Vous rejoignez ${d.total.toLocaleString()} professionnels.` : `✅ Thank you! You've joined ${d.total.toLocaleString()} professionals.`, 'success');
    loadSalaryPage();
  } else {
    toast(d.error || (isFr ? 'Erreur' : 'Error'), 'error');
  }
}

// ── Verified skills — load once after login, store in state ──
async function loadVerifiedSkills() {
  if (!state.user) return;
  const d = await api('GET', `${BASE}/api/skills/verified`);
  if (d.success) state.verifiedSkillNames = new Set(d.skills);
}

function formatSalary(n) {
  if (!n) return 'N/A';
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}
function formatSalaryFr(n) {
  if (!n) return 'N/A';
  return n >= 1000 ? `${Math.round(n / 1000)} k$` : `${n} $`;
}

async function searchSalary() {
  const title = document.getElementById('sal-title')?.value.trim();
  const province = document.getElementById('sal-province')?.value;
  const isFr = state.lang === 'fr';
  const result = document.getElementById('sal-result');
  if (!result) return;
  if (!title && !province) {
    result.innerHTML = `<div style="color:var(--muted);font-size:13px;text-align:center;padding:8px">${isFr ? 'Entrez un titre ou choisissez une province.' : 'Enter a title or choose a province.'}</div>`;
    return;
  }
  result.innerHTML = `<div style="text-align:center;padding:16px"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:20px;color:var(--indigo)"></i></div>`;
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (province) params.set('province', province);
  const d = await api('GET', `${BASE}/api/salary/stats?${params}`);
  if (!d.success || !d.stats) {
    result.innerHTML = `<div style="color:var(--muted);text-align:center;font-size:13px;padding:8px">${isFr ? 'Aucune donnée pour ces critères.' : 'No data for these filters.'}</div>`;
    return;
  }
  const { stats, sources, low_data } = d;
  const srcParts = [];
  if (sources.jobs > 0)        srcParts.push(`${sources.jobs} ${isFr ? 'offres' : 'jobs'}`);
  if (sources.submissions > 0) srcParts.push(`${sources.submissions} ${isFr ? 'témoignages' : 'submissions'}`);
  if (sources.benchmarks > 0)  srcParts.push(`${sources.benchmarks} ${isFr ? 'benchmarks' : 'benchmarks'}`);
  result.innerHTML = `
    ${low_data ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;margin-bottom:10px"><i class="ti ti-info-circle"></i> ${isFr ? 'Données limitées — résultats indicatifs.' : 'Limited data — indicative results.'}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      ${[
        [isFr ? 'Médiane' : 'Median', isFr ? formatSalaryFr(stats.median) : formatSalary(stats.median), '#6366F1'],
        [isFr ? 'Moyenne' : 'Average', isFr ? formatSalaryFr(stats.avg) : formatSalary(stats.avg), '#8b5cf6'],
        ['P25', isFr ? formatSalaryFr(stats.p25) : formatSalary(stats.p25), '#4ade80'],
        ['P75', isFr ? formatSalaryFr(stats.p75) : formatSalary(stats.p75), '#facc15'],
      ].map(([label, val, color]) => `
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:16px;font-weight:800;color:${color}">${val}</div>
          <div style="font-size:10px;color:var(--muted)">${label}</div>
        </div>
      `).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);text-align:center">
      ${isFr ? 'Sources' : 'Sources'}: ${srcParts.join(' · ')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3 — AI CREDITS
// ═══════════════════════════════════════════════════════════
async function loadCredits() {
  const el = document.getElementById('tab-credits');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const [balance, packs, history] = await Promise.all([
    api('GET', `${BASE}/api/credits/balance`),
    api('GET', `${BASE}/api/credits/packs`),
    api('GET', `${BASE}/api/credits/history`),
  ]);
  const total = balance.total || 0;
  const free = balance.free || 0;
  const paid = balance.paid || 0;
  el.innerHTML = `
    <h2><i class="ti ti-coin" style="color:var(--indigo)"></i> ${isFr ? 'Crédits IA' : 'AI Credits'}</h2>
    <p style="color:var(--muted);margin-bottom:24px">${isFr ? 'Utilisez des crédits pour les fonctionnalités IA premium : lettres de motivation, analyse CV, préparation entretien.' : 'Use credits for premium AI features: cover letters, CV analysis, interview prep.'}</p>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:28px">
      <div style="background:linear-gradient(135deg,#6366F1,#8b5cf6);border-radius:16px;padding:28px;color:#fff;text-align:center">
        <div style="font-size:13px;opacity:.8;margin-bottom:8px">${isFr ? 'Solde total' : 'Total Balance'}</div>
        <div style="font-size:56px;font-weight:800;line-height:1">${total}</div>
        <div style="font-size:13px;opacity:.7;margin-top:8px">${isFr ? `${free} gratuits · ${paid} achetés` : `${free} free · ${paid} purchased`}</div>
        <div style="margin-top:16px;background:rgba(255,255,255,.15);border-radius:8px;padding:8px;font-size:12px">${isFr ? 'Les crédits gratuits sont utilisés en dernier' : 'Free credits used last'}</div>
      </div>

      <div>
        <div style="font-weight:700;font-size:15px;margin-bottom:14px">${isFr ? 'Acheter des crédits' : 'Buy Credits'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          ${(packs.packs || []).map(p => `
            <div style="background:var(--surface);border:2px solid var(--border);border-radius:14px;padding:20px;text-align:center;cursor:pointer;transition:all .2s"
              onmouseover="this.style.borderColor='var(--indigo)'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="font-size:32px;font-weight:800;color:var(--indigo)">${p.credits}</div>
              <div style="font-size:13px;color:var(--muted);margin:4px 0">${isFr ? 'crédits IA' : 'AI credits'}</div>
              <div style="font-size:20px;font-weight:700;margin:8px 0">${isFr ? (p.price/100).toFixed(2)+' $' : '$'+(p.price/100).toFixed(2)}</div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:12px">${isFr ? (p.price/p.credits/100*100).toFixed(1)+'¢/crédit' : (p.price/p.credits/100*100).toFixed(1)+'¢/credit'}</div>
              <button class="btn-primary" style="width:100%;font-size:13px;padding:9px" onclick="buyCredits('${p.id}')">
                <i class="ti ti-shopping-cart"></i> ${isFr ? 'Acheter' : 'Buy'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    ${history.transactions?.length ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)">${isFr ? 'Historique' : 'Transaction History'}</div>
      ${history.transactions.slice(0, 15).map(tx => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
          <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${tx.amount > 0 ? '#4ade8022' : '#f8717122'}">
            <i class="ti ti-${tx.amount > 0 ? 'plus' : 'minus'}" style="color:${tx.amount > 0 ? '#4ade80' : '#f87171'};font-size:16px"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${tx.description}</div>
            <div style="font-size:11px;color:var(--muted)">${new Date(tx.created_at).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA')}</div>
          </div>
          <div style="font-weight:700;color:${tx.amount > 0 ? '#4ade80' : '#f87171'}">${tx.amount > 0 ? '+' : ''}${tx.amount}</div>
        </div>
      `).join('')}
    </div>
    ` : `<div class="empty-state"><i class="ti ti-coin"></i><p>${isFr ? 'Aucune transaction encore.' : 'No transactions yet.'}</p></div>`}
  `;
}

async function buyCredits(packId) {
  const isFr = state.lang === 'fr';
  const d = await api('POST', `${BASE}/api/credits/checkout`, { pack_id: packId });
  if (d.success && d.url) { window.location.href = d.url; }
  else toast(d.error || (isFr ? 'Erreur lors du paiement' : 'Payment error'), 'error');
}

// Handle ?credits_success=1 on load
(function checkCreditsPurchase() {
  const p = new URLSearchParams(location.search);
  if (p.get('credits_success') === '1') {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(() => toast('✅ AI Credits purchased successfully!', 'success'), 1000);
  }
})();

// ═══════════════════════════════════════════════════════════
// HERO BACKGROUND PHOTO SLIDER — silent cross-fade
/* ── Admin Moderation ──────────────────────────────────────────────────── */
function showModerationFeedback(type, title, msg) {
  const toast = document.createElement('div');
  const bg = type === 'pending' ? '#fef3c7' : type === 'success' ? '#dcfce7' : '#fee2e2';
  const color = type === 'pending' ? '#92400e' : type === 'success' ? '#15803d' : '#b91c1c';
  toast.style.cssText = `position:fixed;top:80px;right:20px;z-index:9999;background:${bg};border:1px solid ${color}33;color:${color};border-radius:14px;padding:16px 20px;max-width:340px;box-shadow:0 8px 24px #0002;font-size:14px;line-height:1.5`;
  toast.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${title}</div><div>${msg}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 8000);
}

async function refreshModerationBadge() {
  try {
    const d = await api('GET', `${BASE}/api/moderation/stats`);
    if (!d.success) return;
    const n = parseInt(d.stats?.pending || 0);
    const badge = document.getElementById('mod-badge');
    if (badge) { badge.textContent = n; badge.style.display = n > 0 ? '' : 'none'; }
  } catch {}
}

let modCurrentStatus = 'pending';
let modCurrentPage   = 1;

async function loadAdminModeration() {
  const el = document.getElementById('tab-admin-moderation');
  if (!el) return;

  const statsD = await api('GET', `${BASE}/api/moderation/stats`);
  const stats  = statsD.stats || {};

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0"><i class="ti ti-shield-check" style="color:var(--indigo)"></i> Modération des offres</h2>
        <p style="color:var(--muted);font-size:13px;margin-top:4px">Filtre IA automatique · Les offres claires passent sans action. Seuls les cas ambigus arrivent ici.</p>
      </div>
      <button class="btn-ghost" style="font-size:13px" onclick="loadAdminModeration()"><i class="ti ti-refresh"></i> Actualiser</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px">
      ${[
        { label:'En attente',      val: stats.pending      || 0, color:'#f59e0b', icon:'ti-clock',        status:'pending'  },
        { label:'Auto-approuvées', val: stats.auto_approved|| 0, color:'#22c55e', icon:'ti-robot',        status:'active'   },
        { label:'Refusées IA',     val: stats.rejected     || 0, color:'#ef4444', icon:'ti-ban',          status:'rejected' },
        { label:'Total actives',   val: stats.total_active || 0, color:'#6366f1', icon:'ti-briefcase',    status:'active'   },
      ].map(s => `
        <div onclick="modFilterStatus('${s.status}')" style="background:var(--surface);border:2px solid ${modCurrentStatus===s.status ? s.color : 'var(--border)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all .2s">
          <i class="ti ${s.icon}" style="color:${s.color};font-size:24px;display:block;margin-bottom:6px"></i>
          <div style="font-weight:800;font-size:22px;color:${s.color}">${s.val}</div>
          <div style="font-size:11px;color:var(--muted)">${s.label}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
      ${['pending','active','rejected'].map(s => `
        <button onclick="modFilterStatus('${s}')" class="btn-ghost" style="font-size:13px;${modCurrentStatus===s?'background:var(--indigo);color:#fff;border-color:var(--indigo)':''}">
          ${{pending:'⏳ En attente',active:'✅ Approuvées',rejected:'❌ Refusées'}[s]}
          ${s==='pending' && stats.pending > 0 ? `<span style="background:#ef4444;color:#fff;border-radius:99px;font-size:10px;padding:1px 6px;margin-left:4px">${stats.pending}</span>` : ''}
        </button>
      `).join('')}
    </div>

    <div id="mod-jobs-list"><div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div></div>
    <div id="mod-pagination" style="display:flex;gap:8px;justify-content:center;margin-top:20px"></div>
  `;

  loadModJobs();
}

function modFilterStatus(status) {
  modCurrentStatus = status;
  modCurrentPage   = 1;
  loadAdminModeration();
}

async function loadModJobs() {
  const listEl = document.getElementById('mod-jobs-list');
  if (!listEl) return;

  const d = await api('GET', `${BASE}/api/moderation/jobs?status=${modCurrentStatus}&page=${modCurrentPage}`);
  if (!d.success) { listEl.innerHTML = `<div class="empty-state"><p>${d.error}</p></div>`; return; }

  const { jobs, total, limit } = d;
  const totalPages = Math.ceil(total / limit);

  if (!jobs.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-circle-check" style="font-size:40px;color:#22c55e;display:block;margin-bottom:12px"></i>
        <p>${modCurrentStatus === 'pending' ? '🎉 Aucune offre en attente — le filtre IA a tout traité !' : 'Aucune offre dans cette catégorie.'}</p>
      </div>`;
    return;
  }

  const flagLabels = { spam:'Spam', scam:'Arnaque', illegal:'Illégal', adult_content:'Adulte', gibberish:'Incohérent', salary_unrealistic:'Salaire irréaliste', too_short:'Trop court', contact_info_in_description:'Contact interdit', moderation_error:'Erreur IA' };
  const scoreColor = s => s == null ? '#94a3b8' : s >= 75 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444';

  listEl.innerHTML = jobs.map(j => {
    const flags = Array.isArray(j.ai_moderation_flags) ? j.ai_moderation_flags : (j.ai_moderation_flags ? JSON.parse(j.ai_moderation_flags) : []);
    const score = j.ai_moderation_score;
    const title = j.title_fr || j.title_en || '(sans titre)';
    const desc  = (j.description_fr || j.description_en || '').slice(0, 220);
    const date  = new Date(j.created_at).toLocaleDateString('fr-CA');

    return `
    <div id="mod-card-${esc(j.id)}" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">${esc(title)}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px">
            <i class="ti ti-building" style="font-size:11px"></i> ${esc(j.company_name)} ·
            <i class="ti ti-map-pin" style="font-size:11px"></i> ${esc(j.city || j.country || '—')} ·
            <i class="ti ti-user" style="font-size:11px"></i> ${esc(j.posted_by_email)} ·
            ${date}
          </div>
          <div style="font-size:13px;color:var(--muted);line-height:1.5">${esc(desc)}${desc.length >= 220 ? '…' : ''}</div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:22px;font-weight:800;color:${scoreColor(score)}">${score != null ? score : '—'}</div>
          <div style="font-size:10px;color:var(--muted)">Score IA</div>
        </div>
      </div>

      ${flags.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${flags.map(f => `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fdba74;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${flagLabels[f]||f}</span>`).join('')}
        </div>` : ''}
      ${j.moderation_reason ? `<div style="font-size:12px;color:var(--muted);background:var(--bg);border-radius:8px;padding:8px 10px;margin-bottom:12px;font-style:italic">💬 ${esc(j.moderation_reason)}</div>` : ''}

      ${modCurrentStatus === 'pending' ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-ghost" style="font-size:13px;color:#16a34a;border-color:#86efac" onclick="adminApproveJob('${esc(j.id)}')">
            <i class="ti ti-circle-check"></i> Approuver
          </button>
          <button class="btn-ghost" style="font-size:13px;color:#dc2626;border-color:#fca5a5" onclick="adminRejectJob('${esc(j.id)}', '${esc(title)}')">
            <i class="ti ti-x"></i> Refuser
          </button>
          <a href="${BASE}/jobs/${j.id}" target="_blank" class="btn-ghost" style="font-size:13px">
            <i class="ti ti-external-link"></i> Voir l'offre
          </a>
        </div>
      ` : `
        <div style="font-size:12px;color:var(--muted)">
          <i class="ti ti-${modCurrentStatus === 'active' ? 'circle-check' : 'ban'}" style="color:${modCurrentStatus === 'active' ? '#22c55e' : '#ef4444'}"></i>
          ${modCurrentStatus === 'active' ? 'Publiée' : 'Refusée'} · verdict IA : ${j.ai_moderation_verdict || '—'}
          ${j.moderation_note ? ' · Note: ' + esc(j.moderation_note) : ''}
        </div>
      `}
    </div>
  `}).join('');

  // Pagination
  const pagEl = document.getElementById('mod-pagination');
  if (pagEl && totalPages > 1) {
    pagEl.innerHTML = Array.from({ length: totalPages }, (_, i) => `
      <button class="btn-ghost" style="font-size:13px;${i+1===modCurrentPage?'background:var(--indigo);color:#fff;border-color:var(--indigo)':''}" onclick="modGoPage(${i+1})">${i+1}</button>
    `).join('');
  }
}

function modGoPage(p) { modCurrentPage = p; loadModJobs(); }

async function adminApproveJob(id) {
  const card = document.getElementById(`mod-card-${id}`);
  if (card) { card.style.opacity = '.5'; card.style.pointerEvents = 'none'; }
  const d = await api('POST', `${BASE}/api/moderation/jobs/${id}/approve`, {});
  if (d.success) {
    toast('✅ Offre approuvée et publiée', 'success');
    if (card) card.remove();
    refreshModerationBadge();
    const statsD = await api('GET', `${BASE}/api/moderation/stats`);
    if (statsD.stats?.pending === 0) loadAdminModeration();
  } else {
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
    toast(d.error || 'Erreur', 'error');
  }
}

async function adminRejectJob(id, title) {
  const reason = prompt(`Raison du refus pour "${title}" (visible pour l'employeur) :`);
  if (reason === null) return;
  const card = document.getElementById(`mod-card-${id}`);
  if (card) { card.style.opacity = '.5'; card.style.pointerEvents = 'none'; }
  const d = await api('POST', `${BASE}/api/moderation/jobs/${id}/reject`, { reason: reason || 'Non-conformité aux règles de publication.' });
  if (d.success) {
    toast('Offre refusée', 'info');
    if (card) card.remove();
    refreshModerationBadge();
  } else {
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
    toast(d.error || 'Erreur', 'error');
  }
}

/* ── Video Interviews — Employer UI ────────────────────────────────────── */
let viCreating = false;
let viQuestions = [''];

async function loadVideoInterviews() {
  const el = document.getElementById('etab-interviews');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/video-interviews`);
  if (!d.success) {
    if (d.upgrade) {
      el.innerHTML = `
        <div style="text-align:center;padding:48px 24px;max-width:520px;margin:0 auto">
          <div style="font-size:52px;margin-bottom:16px">🎬</div>
          <h2 style="font-size:22px;font-weight:800;margin-bottom:10px">${isFr ? 'Entretiens vidéo asynchrones' : 'Async Video Interviews'}</h2>
          <p style="color:var(--muted);font-size:15px;line-height:1.6;margin-bottom:24px">${isFr ? 'Envoyez des questions aux candidats, ils répondent en vidéo à leur rythme. L\'IA transcrit et score chaque réponse. Disponible en plan Pro.' : 'Send questions to candidates, they respond in video at their own pace. AI transcribes and scores every response. Available on Pro plan.'}</p>
          <button class="btn-primary" onclick="showEmpTab('etab-billing', document.querySelector('[data-emptab=etab-billing]'))"><i class="ti ti-crown"></i> ${isFr ? 'Passer au plan Pro' : 'Upgrade to Pro'}</button>
        </div>`;
      return;
    }
    el.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><p>${d.error}</p></div>`;
    return;
  }

  const { interviews } = d;
  const statusColor = { pending:'#94a3b8', in_progress:'#f59e0b', completed:'#22c55e', expired:'#ef4444' };
  const statusLabel = { pending: isFr ? 'En attente' : 'Pending', in_progress: isFr ? 'En cours' : 'In Progress', completed: isFr ? 'Complété' : 'Completed', expired: isFr ? 'Expiré' : 'Expired' };

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0"><i class="ti ti-video" style="color:var(--indigo)"></i> ${isFr ? 'Entretiens vidéo' : 'Video Interviews'}</h2>
        <p style="color:var(--muted);font-size:13px;margin-top:4px">${isFr ? 'Le candidat répond en audio à son rythme — l\'IA transcrit et score.' : 'Candidates respond in audio at their own pace — AI transcribes and scores.'}</p>
      </div>
      <button class="btn-primary" onclick="openViCreateForm()"><i class="ti ti-plus"></i> ${isFr ? 'Créer un entretien' : 'New Interview'}</button>
    </div>

    <div id="vi-create-form" style="display:none;background:var(--surface);border:2px solid var(--indigo);border-radius:18px;padding:24px;margin-bottom:24px"></div>
    <div id="vi-detail-panel" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px;margin-bottom:24px"></div>

    ${!interviews.length ? `
      <div class="empty-state">
        <i class="ti ti-video-off" style="font-size:40px;color:var(--muted);display:block;margin-bottom:12px"></i>
        <p>${isFr ? 'Aucun entretien créé. Commencez par en créer un !' : 'No interviews yet. Create your first one!'}</p>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${interviews.map(iv => {
          const st = iv.status;
          const exp = new Date(iv.token_expires_at);
          const isExp = exp < new Date();
          const effectiveSt = isExp && st !== 'completed' ? 'expired' : st;
          return `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
              <div style="font-weight:700;font-size:15px;line-height:1.4">${esc(iv.title)}</div>
              <span style="background:${statusColor[effectiveSt]}22;color:${statusColor[effectiveSt]};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">${statusLabel[effectiveSt] || effectiveSt}</span>
            </div>
            ${iv.candidate_name ? `<div style="font-size:13px;color:var(--muted);margin-bottom:4px"><i class="ti ti-user" style="font-size:12px"></i> ${esc(iv.candidate_name)}</div>` : ''}
            ${iv.job_title ? `<div style="font-size:13px;color:var(--muted);margin-bottom:4px"><i class="ti ti-briefcase" style="font-size:12px"></i> ${esc(iv.job_title)}</div>` : ''}
            <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
              ${iv.question_count} Q · ${iv.responses_count}/${iv.question_count} ${isFr ? 'rép.' : 'resp.'}
              ${iv.avg_score ? ` · Score moy: <strong>${iv.avg_score}%</strong>` : ''}
              · ${isFr ? 'Exp.' : 'Exp.'} ${exp.toLocaleDateString()}
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-ghost" style="flex:1;font-size:13px" onclick="viewViDetail('${esc(iv.id)}')">
                <i class="ti ti-eye"></i> ${isFr ? 'Voir' : 'View'}
              </button>
              <button class="btn-ghost" style="font-size:13px" onclick="copyViLink('${esc(iv.id)}','${esc(iv.title)}')" title="${isFr ? 'Copier le lien candidat' : 'Copy candidate link'}">
                <i class="ti ti-link"></i>
              </button>
              <button class="btn-ghost" style="color:#f87171;border-color:#f8717144;font-size:13px" onclick="deleteVi('${esc(iv.id)}','${esc(iv.title)}')">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        `}).join('')}
      </div>
    `}
  `;
}

function openViCreateForm() {
  const el = document.getElementById('vi-create-form');
  if (!el) return;
  const isFr = state.lang === 'fr';
  viQuestions = [''];
  el.style.display = 'block';
  renderViCreateForm();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderViCreateForm() {
  const el = document.getElementById('vi-create-form');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `
    <h3 style="margin:0 0 20px"><i class="ti ti-plus" style="color:var(--indigo)"></i> ${isFr ? 'Créer un entretien vidéo' : 'Create Video Interview'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="grid-column:1/-1">
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">${isFr ? 'Titre de l\'entretien' : 'Interview Title'} <span style="color:#f87171">*</span></label>
        <input id="vi-title" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="${isFr ? 'ex: Entretien Développeur Full-Stack' : 'e.g. Full-Stack Developer Interview'}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">${isFr ? 'Nom du candidat' : 'Candidate Name'}</label>
        <input id="vi-cname" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="${isFr ? 'Prénom Nom' : 'First Last'}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">${isFr ? 'Courriel candidat' : 'Candidate Email'}</label>
        <input id="vi-cemail" type="email" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="email@example.com">
      </div>
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:8px">${isFr ? 'Questions (1–5)' : 'Questions (1–5)'} <span style="color:#f87171">*</span></label>
      <div id="vi-questions-list"></div>
      <button class="btn-ghost" id="btn-add-q" style="margin-top:8px;font-size:13px" onclick="addViQuestion()">
        <i class="ti ti-plus"></i> ${isFr ? 'Ajouter une question' : 'Add Question'}
      </button>
    </div>

    <div style="background:#eff6ff;border-radius:10px;padding:12px 14px;font-size:12px;color:#1e40af;margin-bottom:16px">
      <i class="ti ti-bulb"></i> ${isFr ? 'Le candidat enregistre ses réponses en audio (max 3 min/question). L\'IA transcrit et score automatiquement.' : 'Candidate records audio responses (max 3 min/question). AI auto-transcribes and scores.'}
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn-primary" style="flex:1" onclick="submitViCreate()"><i class="ti ti-send"></i> ${isFr ? 'Créer & obtenir le lien' : 'Create & get link'}</button>
      <button class="btn-ghost" onclick="document.getElementById('vi-create-form').style.display='none'">Cancel</button>
    </div>
  `;
  renderViQuestionsList();
}

function renderViQuestionsList() {
  const el = document.getElementById('vi-questions-list');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = viQuestions.map((q, i) => `
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
      <span style="width:24px;height:24px;background:var(--indigo);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
      <input type="text" class="filter-input" style="flex:1;box-sizing:border-box" placeholder="${isFr ? `Question ${i+1}…` : `Question ${i+1}…`}" value="${esc(q)}" oninput="viQuestions[${i}]=this.value">
      ${viQuestions.length > 1 ? `<button class="btn-ghost" style="padding:6px 10px;color:#94a3b8" onclick="removeViQuestion(${i})"><i class="ti ti-x"></i></button>` : ''}
    </div>
  `).join('');
  const addBtn = document.getElementById('btn-add-q');
  if (addBtn) addBtn.style.display = viQuestions.length >= 5 ? 'none' : '';
}

function addViQuestion() {
  if (viQuestions.length >= 5) return;
  viQuestions.push('');
  renderViQuestionsList();
}

function removeViQuestion(i) {
  viQuestions.splice(i, 1);
  renderViQuestionsList();
}

async function submitViCreate() {
  const isFr = state.lang === 'fr';
  const title  = document.getElementById('vi-title')?.value.trim();
  const cname  = document.getElementById('vi-cname')?.value.trim();
  const cemail = document.getElementById('vi-cemail')?.value.trim();
  const qs = viQuestions.map(q => q.trim()).filter(Boolean);

  if (!title) { toast(isFr ? 'Titre requis' : 'Title required', 'error'); return; }
  if (!qs.length) { toast(isFr ? 'Ajoutez au moins 1 question' : 'Add at least 1 question', 'error'); return; }

  const btn = document.querySelector('#vi-create-form .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i>'; }

  const d = await api('POST', `${BASE}/api/video-interviews`, { title, candidate_name: cname || undefined, candidate_email: cemail || undefined, questions: qs });

  if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-send"></i> ${isFr ? 'Créer & obtenir le lien' : 'Create & get link'}`; }

  if (d.success) {
    document.getElementById('vi-create-form').style.display = 'none';
    const link = `${location.origin}/nexhire/interview/${d.token}`;
    showViLinkModal(title, link, cemail);
    loadVideoInterviews();
  } else if (d.upgrade) {
    // Show upgrade prompt instead of generic toast
    const isFr2 = state.lang === 'fr';
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:20px;padding:32px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 64px #0002">
        <div style="font-size:48px;margin-bottom:12px">🎬</div>
        <h3 style="font-size:18px;font-weight:800;margin-bottom:8px">${isFr2 ? 'Fonctionnalité Pro' : 'Pro Feature'}</h3>
        <p style="color:var(--muted);font-size:14px;margin-bottom:20px;line-height:1.6">
          ${isFr2 ? 'Les entretiens vidéo asynchrones sont disponibles à partir du plan <strong>Pro</strong>. Passez à Pro pour déverrouiller cette fonctionnalité et bien d\'autres.' : 'Async video interviews are available on the <strong>Pro</strong> plan. Upgrade to unlock this feature and many more.'}
        </p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn-primary" onclick="this.closest('[style*=fixed]').remove();showEmpTab('etab-billing',document.querySelector('[data-emptab=etab-billing]'))">
            <i class="ti ti-crown"></i> ${isFr2 ? 'Voir les plans' : 'View Plans'}
          </button>
          <button class="btn-ghost" onclick="this.closest('[style*=fixed]').remove()">${isFr2 ? 'Plus tard' : 'Later'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  } else {
    toast(d.error || 'Error', 'error');
  }
}

function showViLinkModal(title, link, email) {
  const isFr = state.lang === 'fr';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:20px;padding:32px;max-width:500px;width:100%;box-shadow:0 24px 64px #0002">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:48px;margin-bottom:8px">🔗</div>
        <h3 style="font-size:20px;font-weight:800">${isFr ? 'Lien candidat créé !' : 'Candidate Link Created!'}</h3>
        <p style="color:var(--muted);font-size:14px;margin-top:6px">${isFr ? 'Partagez ce lien avec' : 'Share this link with'} ${email || isFr ? 'le candidat' : 'the candidate'}</p>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:16px;word-break:break-all;font-size:13px;font-family:monospace;color:var(--muted)">${link}</div>
      <div style="display:flex;gap:10px">
        <button class="btn-primary" style="flex:1" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('${isFr ? 'Lien copié !' : 'Link copied!'}','success'))">
          <i class="ti ti-copy"></i> ${isFr ? 'Copier le lien' : 'Copy Link'}
        </button>
        ${email ? `<button class="btn-ghost" style="flex:1" onclick="window.open('mailto:${email}?subject=${encodeURIComponent(isFr ? 'Invitation entretien vidéo — '+title : 'Video Interview Invitation — '+title)}&body=${encodeURIComponent((isFr ? 'Bonjour,\n\nNous vous invitons à répondre à notre entretien vidéo asynchrone.\n\nLien : ' : 'Hello,\n\nWe invite you to complete our async video interview.\n\nLink: ')+link)}','_blank')">
          <i class="ti ti-mail"></i> ${isFr ? 'Envoyer par email' : 'Email'}
        </button>` : ''}
        <button class="btn-ghost" onclick="this.closest('[style*=fixed]').remove()">${isFr ? 'Fermer' : 'Close'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function copyViLink(interviewId, title) {
  toast('Chargement…', 'info');
  api('GET', `${BASE}/api/video-interviews/${interviewId}`).then(d => {
    if (!d.success) return;
    const iv = d.interview;
    const link = `${location.origin}/nexhire/interview/${iv.token}`;
    navigator.clipboard.writeText(link).then(() => toast('Lien copié !', 'success'));
  });
}

async function viewViDetail(id) {
  const panel = document.getElementById('vi-detail-panel');
  if (!panel) return;
  const isFr = state.lang === 'fr';
  panel.style.display = 'block';
  panel.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:24px;color:var(--indigo)"></i></div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const d = await api('GET', `${BASE}/api/video-interviews/${id}`);
  if (!d.success) { panel.innerHTML = `<p style="color:#f87171">${d.error}</p>`; return; }

  const { interview: iv, responses } = d;
  const questions = typeof iv.questions === 'string' ? JSON.parse(iv.questions) : iv.questions;
  const link = `${location.origin}/nexhire/interview/${iv.token}`;

  const scoreColor = s => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div>
        <h3 style="margin:0 0 4px;font-size:18px;font-weight:800">${esc(iv.title)}</h3>
        ${iv.candidate_name ? `<div style="color:var(--muted);font-size:13px"><i class="ti ti-user" style="font-size:12px"></i> ${esc(iv.candidate_name)} ${iv.candidate_email ? '· '+esc(iv.candidate_email) : ''}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-ghost" style="font-size:13px" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('Lien copié !','success'))"><i class="ti ti-link"></i> ${isFr ? 'Copier lien' : 'Copy link'}</button>
        <button class="btn-ghost" style="font-size:13px" onclick="document.getElementById('vi-detail-panel').style.display='none'"><i class="ti ti-x"></i></button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:24px">
      ${[
        { label: isFr ? 'Questions' : 'Questions', val: questions.length, icon: 'ti-help' },
        { label: isFr ? 'Réponses' : 'Responses', val: responses.length, icon: 'ti-microphone' },
        { label: isFr ? 'Score moyen IA' : 'Avg AI Score', val: responses.filter(r=>r.ai_score).length ? Math.round(responses.reduce((a,r)=>a+(r.ai_score||0),0)/responses.filter(r=>r.ai_score).length)+'%' : '—', icon: 'ti-brain' },
        { label: 'Statut', val: iv.status, icon: 'ti-circle' },
      ].map(m => `
        <div style="background:var(--bg);border-radius:12px;padding:14px;text-align:center">
          <i class="ti ${m.icon}" style="color:var(--indigo);font-size:20px;display:block;margin-bottom:4px"></i>
          <div style="font-weight:800;font-size:18px">${m.val}</div>
          <div style="font-size:11px;color:var(--muted)">${m.label}</div>
        </div>
      `).join('')}
    </div>

    <div>
      ${questions.map((q, i) => {
        const resp = responses.find(r => r.question_index === i);
        const fb   = resp?.ai_feedback ? (typeof resp.ai_feedback === 'string' ? JSON.parse(resp.ai_feedback) : resp.ai_feedback) : null;
        return `
        <div style="border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">
          <div style="background:var(--bg);padding:14px 18px;display:flex;align-items:center;gap:10px">
            <span style="background:var(--indigo);color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i+1}</span>
            <div style="font-weight:600;font-size:14px;flex:1">${esc(q)}</div>
            ${resp?.ai_score != null ? `<span style="font-size:18px;font-weight:800;color:${scoreColor(resp.ai_score)}">${resp.ai_score}%</span>` : '<span style="font-size:12px;color:var(--muted)">'+(resp ? '⏳ '+(isFr?'Analyse…':'Analysing…') : isFr?'En attente':'Pending')+'</span>'}
          </div>
          ${resp ? `
            <div style="padding:16px 18px">
              ${resp.transcript ? `
                <div style="margin-bottom:14px">
                  <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${isFr ? 'Transcription' : 'Transcript'}</div>
                  <div style="font-size:13px;line-height:1.7;background:var(--bg);border-radius:10px;padding:12px 14px;color:var(--text)">"${esc(resp.transcript)}"</div>
                </div>
              ` : '<div style="font-size:13px;color:var(--muted);margin-bottom:12px">⏳ '+(isFr?'Transcription en cours…':'Transcribing…')+'</div>'}
              ${fb ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                  ${fb.strengths?.length ? `
                    <div style="background:#f0fdf4;border-radius:10px;padding:12px">
                      <div style="font-size:11px;font-weight:700;color:#16a34a;margin-bottom:6px">✓ ${isFr?'Points forts':'Strengths'}</div>
                      ${fb.strengths.map(s => `<div style="font-size:12px;color:#15803d;margin-bottom:3px">• ${esc(s)}</div>`).join('')}
                    </div>
                  ` : ''}
                  ${fb.improvements?.length ? `
                    <div style="background:#fff7ed;border-radius:10px;padding:12px">
                      <div style="font-size:11px;font-weight:700;color:#ea580c;margin-bottom:6px">↑ ${isFr?'À améliorer':'To improve'}</div>
                      ${fb.improvements.map(s => `<div style="font-size:12px;color:#c2410c;margin-bottom:3px">• ${esc(s)}</div>`).join('')}
                    </div>
                  ` : ''}
                </div>
                ${fb.summary ? `<div style="font-size:13px;color:var(--muted);font-style:italic;line-height:1.6">${esc(fb.summary)}</div>` : ''}
                ${fb.keywords?.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">${fb.keywords.map(k=>`<span style="background:var(--indigo)15;color:var(--indigo);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${esc(k)}</span>`).join('')}</div>` : ''}
              ` : ''}
            </div>
          ` : `<div style="padding:14px 18px;font-size:13px;color:var(--muted)"><i class="ti ti-clock"></i> ${isFr?'Réponse non encore enregistrée':'Response not yet recorded'}</div>`}
        </div>
      `}).join('')}
    </div>

    ${responses.some(r => !r.ai_score && r.video_path) ? `
      <button class="btn-ghost" style="margin-top:8px;font-size:13px" onclick="viewViDetail('${id}')"><i class="ti ti-refresh"></i> ${isFr ? 'Actualiser l\'analyse IA' : 'Refresh AI analysis'}</button>
    ` : ''}
  `;
}

async function deleteVi(id, title) {
  const isFr = state.lang === 'fr';
  if (!confirm(`${isFr ? 'Supprimer l\'entretien' : 'Delete interview'} "${title}" ?`)) return;
  const d = await api('DELETE', `${BASE}/api/video-interviews/${id}`);
  if (d.success) { toast(isFr ? 'Entretien supprimé' : 'Interview deleted', 'success'); loadVideoInterviews(); }
  else toast(d.error || 'Error', 'error');
}

/* ── Admin — Skill Tests Manager ───────────────────────────────────────── */
let adminEditingTestId = null;

async function loadAdminSkillTests() {
  const el = document.getElementById('tab-admin-tests');
  if (!el) return;
  const isFr = state.lang === 'fr';
  el.innerHTML = `<div class="loading-state"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:28px;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/admin/skill-tests`);
  if (!d.success) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-lock"></i><p>${d.error || 'Access denied'}</p></div>`;
    return;
  }
  const { tests } = d;
  const catColors = { Developer:'#6366f1', Data:'#0ea5e9', Finance:'#f59e0b', Marketing:'#ec4899', Management:'#8b5cf6', Design:'#14b8a6', 'Soft Skills':'#22c55e', DevOps:'#f97316' };
  const diffBadge = { beginner:'#4ade80', intermediate:'#facc15', advanced:'#f87171' };
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0"><i class="ti ti-settings" style="color:var(--indigo)"></i> Admin — Skill Tests</h2>
        <p style="color:var(--muted);margin:4px 0 0">${tests.length} test${tests.length !== 1 ? 's' : ''} · ${tests.reduce((a,t) => a + parseInt(t.question_count||0), 0)} questions pool</p>
      </div>
      <button class="btn-primary" onclick="openAdminTestForm()"><i class="ti ti-plus"></i> New Test</button>
    </div>

    <div id="admin-test-form-wrapper" style="display:none;background:var(--surface);border:1px solid var(--indigo);border-radius:16px;padding:24px;margin-bottom:24px"></div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px" id="admin-tests-grid">
      ${tests.map(t => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
            <span style="background:${catColors[t.category]||'#6366f1'}22;color:${catColors[t.category]||'#6366f1'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${t.category}</span>
            <span style="background:${diffBadge[t.difficulty]||'#facc15'}33;color:${diffBadge[t.difficulty]||'#facc15'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${t.difficulty}</span>
          </div>
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">${esc(t.title_en)}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${esc(t.title_fr)}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
            <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:11px">${esc(t.slug)}</code>
            · ${t.question_count} Qs · Pass: ${t.pass_score}% · ${t.attempts} attempt${t.attempts !== '1' ? 's' : ''}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost" style="flex:1;font-size:13px" onclick="editAdminTest('${esc(t.id)}')"><i class="ti ti-pencil"></i> Edit</button>
            <button class="btn-ghost" style="color:#f87171;border-color:#f8717144;font-size:13px" onclick="deleteAdminTest('${esc(t.id)}','${esc(t.title_en)}')"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openAdminTestForm(prefill = null) {
  const wrapper = document.getElementById('admin-test-form-wrapper');
  if (!wrapper) return;
  adminEditingTestId = prefill?.id || null;
  wrapper.style.display = 'block';
  wrapper.innerHTML = `
    <h3 style="margin:0 0 16px"><i class="ti ti-${adminEditingTestId ? 'pencil' : 'plus'}"></i> ${adminEditingTestId ? 'Edit Test' : 'New Test'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Slug <span style="color:#f87171">*</span></label>
        <input id="at-slug" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="javascript-fundamentals" value="${esc(prefill?.slug||'')}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Category <span style="color:#f87171">*</span></label>
        <select id="at-cat" class="filter-select" style="width:100%">
          ${['Developer','Data','Finance','Marketing','Management','Design','Soft Skills','DevOps'].map(c => `<option value="${c}"${prefill?.category===c?' selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Title (EN) <span style="color:#f87171">*</span></label>
        <input id="at-title-en" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="JavaScript — Fundamentals" value="${esc(prefill?.title_en||'')}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Titre (FR)</label>
        <input id="at-title-fr" class="filter-input" style="width:100%;box-sizing:border-box" placeholder="JavaScript — Fondamentaux" value="${esc(prefill?.title_fr||'')}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Difficulty</label>
        <select id="at-diff" class="filter-select" style="width:100%">
          <option value="beginner"${prefill?.difficulty==='beginner'?' selected':''}>Beginner</option>
          <option value="intermediate"${prefill?.difficulty==='intermediate'?' selected':''}>Intermediate</option>
          <option value="advanced"${prefill?.difficulty==='advanced'?' selected':''}>Advanced</option>
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Pass Score (%)</label>
        <input id="at-pass" type="number" class="filter-input" style="width:100%;box-sizing:border-box" min="50" max="100" value="${prefill?.pass_score||70}">
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label style="font-size:12px;font-weight:600">Questions JSON <span style="color:#f87171">*</span> <span style="color:var(--muted);font-weight:400">(min 5, idéalement 15)</span></label>
        <button class="btn-ghost" style="font-size:11px;padding:4px 10px" onclick="insertAdminTestTemplate()"><i class="ti ti-template"></i> Template</button>
      </div>
      <textarea id="at-questions" style="width:100%;box-sizing:border-box;height:220px;font-family:monospace;font-size:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);resize:vertical" placeholder='[{"q":"Question text?","opts":["A","B","C","D"],"answer":0},...]'>${prefill?.questions ? JSON.stringify(prefill.questions, null, 2) : ''}</textarea>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Format: <code>[{"q":"...", "opts":["A","B","C","D"], "answer": 0}]</code> — answer = index de la bonne réponse</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-primary" style="flex:1" onclick="saveAdminTest()"><i class="ti ti-device-floppy"></i> ${adminEditingTestId ? 'Update Test' : 'Create Test'}</button>
      <button class="btn-ghost" onclick="closeAdminTestForm()">Cancel</button>
    </div>
  `;
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function insertAdminTestTemplate() {
  const ta = document.getElementById('at-questions');
  if (!ta || ta.value.trim()) return;
  ta.value = JSON.stringify([
    {"q":"Question 1?","opts":["Option A","Option B","Option C","Option D"],"answer":0},
    {"q":"Question 2?","opts":["Option A","Option B","Option C","Option D"],"answer":1},
    {"q":"Question 3?","opts":["Option A","Option B","Option C","Option D"],"answer":2},
    {"q":"Question 4?","opts":["Option A","Option B","Option C","Option D"],"answer":3},
    {"q":"Question 5?","opts":["Option A","Option B","Option C","Option D"],"answer":0},
  ], null, 2);
}

function closeAdminTestForm() {
  const wrapper = document.getElementById('admin-test-form-wrapper');
  if (wrapper) { wrapper.style.display = 'none'; wrapper.innerHTML = ''; }
  adminEditingTestId = null;
}

async function saveAdminTest() {
  const slug     = document.getElementById('at-slug')?.value.trim();
  const title_en = document.getElementById('at-title-en')?.value.trim();
  const title_fr = document.getElementById('at-title-fr')?.value.trim();
  const category = document.getElementById('at-cat')?.value;
  const difficulty = document.getElementById('at-diff')?.value;
  const pass_score = parseInt(document.getElementById('at-pass')?.value || '70');
  const qRaw = document.getElementById('at-questions')?.value.trim();

  if (!title_en || !category || (!adminEditingTestId && !slug)) {
    toast('Titre EN, catégorie et slug sont requis', 'error'); return;
  }

  let questions;
  if (qRaw) {
    try {
      questions = JSON.parse(qRaw);
      if (!Array.isArray(questions)) throw new Error('Must be array');
      if (questions.length < 5) { toast('Minimum 5 questions', 'error'); return; }
      for (const q of questions) {
        if (!q.q || !Array.isArray(q.opts) || q.opts.length < 2 || typeof q.answer !== 'number') {
          throw new Error('Each question needs q, opts (array), answer (number)');
        }
      }
    } catch (e) {
      toast(`JSON invalide: ${e.message}`, 'error'); return;
    }
  }

  const btn = document.querySelector('#admin-test-form-wrapper .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Saving…'; }

  const payload = { title_en, title_fr: title_fr || title_en, category, difficulty, pass_score };
  if (!adminEditingTestId) payload.slug = slug;
  if (questions) payload.questions = questions;

  const d = adminEditingTestId
    ? await api('PUT', `${BASE}/api/admin/skill-tests/${adminEditingTestId}`, payload)
    : await api('POST', `${BASE}/api/admin/skill-tests`, payload);

  if (d.success) {
    toast(adminEditingTestId ? 'Test mis à jour !' : 'Test créé !', 'success');
    closeAdminTestForm();
    loadAdminSkillTests();
  } else {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy"></i> Save'; }
    toast(d.error || 'Error', 'error');
  }
}

async function editAdminTest(id) {
  const d = await api('GET', `${BASE}/api/admin/skill-tests/${id}`);
  if (!d.success) { toast('Error loading test', 'error'); return; }
  openAdminTestForm(d.test);
}

async function deleteAdminTest(id, title) {
  if (!confirm(`Supprimer le test "${title}" ? Cette action est irréversible.`)) return;
  const d = await api('DELETE', `${BASE}/api/admin/skill-tests/${id}`);
  if (d.success) {
    toast('Test supprimé', 'success');
    loadAdminSkillTests();
  } else {
    toast(d.error || 'Error', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
(function initHeroBgSlider() {
  const slides = document.querySelectorAll('.hbg-slide');
  if (!slides.length) return;
  let current = 0;

  function goTo(n) {
    slides[current].classList.remove('hbg-on');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('hbg-on');
  }

  setInterval(() => goTo(current + 1), 6000);
})();

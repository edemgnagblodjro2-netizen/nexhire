'use strict';

const BASE = '/nexhire';
const state = {
  user: null, lang: 'en', regRole: 'candidate',
  jobs: [], currentPage: 1, jobSearchTimer: null,
  savedJobIds: new Set(), currentJobForApply: null,
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
  try {
    const d = await api('GET', `${BASE}/api/auth/me`);
    if (d.success && d.user) { state.user = d.user; state.lang = d.user.preferred_lang || 'en'; showUserNav(); }
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
  const valid = ['jobs','employer','pricing','privacy','terms','help'];
  if (hash && valid.includes(hash)) goto(hash);
}
window.addEventListener('hashchange', restoreFromHash);

// ── Lang ───────────────────────────────────────────────────
async function setLang(lang) {
  state.lang = lang; setLangUI(lang);
  if (state.user) await api('POST', `${BASE}/api/auth/set-lang`, { lang });
}
const T = {
  en: {
    'nav.jobs':'Jobs','nav.employers':'For Employers','nav.pricing':'Pricing',
    'nav.signin':'Sign in','nav.getstarted':'Get started',
    'nav.dd.profile':'Profile','nav.dd.reviews':'My reviews','nav.dd.settings':'Settings',
    'nav.dd.help':'Help Centre','nav.dd.privacy':'Privacy Centre',
    'nav.dd.employer':'Employer Dashboard','nav.dd.signout':'Sign out',
    'hero.eyebrow':'AI-Powered Global Job Matching',
    'hero.title':'Find your next <em>opportunity</em> anywhere in the world',
    'hero.sub':'Thousands of jobs worldwide. Remote, hybrid, or on-site. AI matching to find your perfect role faster than ever.',
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
    'jobs.noresult':'No jobs found. Try different filters.',
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
    'cand.role':'Candidate','cand.nav.profile':'My Profile','cand.nav.foryou':'Jobs for You',
    'cand.nav.saved':'Saved Jobs','cand.nav.apps':'Applications','cand.nav.reviews':'My Reviews','cand.nav.alerts':'Job Alerts','cand.nav.ai':'AI Coach',
    'cand.nav.score':'Profile Score','cand.nav.skills':'Skill Tests','cand.nav.referrals':'Referrals','cand.nav.salary':'Salary Data','cand.nav.credits':'AI Credits',
    'cand.tab.profile':'My Profile','cand.tab.foryou':'Jobs for You','cand.tab.saved':'Saved Jobs','cand.tab.apps':'My Applications',
    'cand.ai.title':'AI Career Agent','cand.ai.sub':'Ask anything — resume tips, interview prep, salary negotiation, career advice.',
    'cand.ai.online':'Online · Ready to help',
    'cand.ai.greeting':"Hi! I'm your Nexhire AI Career Agent. How can I help accelerate your career today?",'cand.ai.ph':'Ask me about your career...',
    'agent.qa.jobs':'Find matching jobs','agent.qa.profile':'Optimize profile',
    'agent.qa.interview':'Interview prep','agent.qa.salary':'Salary advice',
    'emp.role':'Employer','emp.nav.jobs':'My Jobs','emp.nav.post':'Post a Job','emp.nav.company':'Company','emp.nav.team':'Work Team','emp.nav.analytics':'Analytics','emp.nav.billing':'Billing',
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
    'nav.jobs':'Emplois','nav.employers':'Pour les employeurs','nav.pricing':'Tarifs',
    'nav.signin':'Connexion','nav.getstarted':'Commencer',
    'nav.dd.profile':'Profil','nav.dd.reviews':'Mes avis','nav.dd.settings':'Paramètres',
    'nav.dd.help':"Centre d'aide",'nav.dd.privacy':'Confidentialité',
    'nav.dd.employer':'Tableau de bord employeur','nav.dd.signout':'Déconnexion',
    'hero.eyebrow':'Matching IA — Emplois Mondiaux',
    'hero.title':'Trouvez votre prochaine <em>opportunité</em> partout dans le monde',
    'hero.sub':"Des milliers d'emplois mondiaux. Télétravail, hybride ou présentiel. Matching IA pour trouver votre poste idéal.",
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
    'jobs.noresult':'Aucune offre trouvée. Essayez d\'autres filtres.',
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
    'cand.role':'Candidat','cand.nav.profile':'Mon profil','cand.nav.foryou':'Emplois pour vous',
    'cand.nav.saved':'Offres sauvegardées','cand.nav.apps':'Candidatures','cand.nav.reviews':'Mes avis','cand.nav.alerts':'Alertes emploi','cand.nav.ai':'Coach IA',
    'cand.nav.score':'Score profil','cand.nav.skills':'Tests de compétences','cand.nav.referrals':'Référencement','cand.nav.salary':'Données salariales','cand.nav.credits':'Crédits IA',
    'cand.tab.profile':'Mon profil','cand.tab.foryou':'Emplois pour vous','cand.tab.saved':'Offres sauvegardées','cand.tab.apps':'Mes candidatures',
    'cand.ai.title':'Agent Carrière IA','cand.ai.sub':"Posez n'importe quelle question — conseils CV, préparation entretien, négociation salariale, orientation carrière.",
    'cand.ai.online':'En ligne · Prêt à vous aider',
    'cand.ai.greeting':"Bonjour ! Je suis votre Agent Carrière IA Nexhire. Comment puis-je accélérer votre carrière aujourd'hui ?",'cand.ai.ph':"Posez-moi une question...",
    'agent.qa.jobs':'Emplois correspondants','agent.qa.profile':'Optimiser le profil',
    'agent.qa.interview':'Préparation entrevue','agent.qa.salary':'Conseils salaire',
    'emp.role':'Employeur','emp.nav.jobs':'Mes offres','emp.nav.post':'Publier une offre','emp.nav.company':'Entreprise','emp.nav.team':"Équipe",'emp.nav.analytics':'Analytique','emp.nav.billing':'Facturation',
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

async function loadJobs() { await filterJobs(); }

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

  if (!jobs.length) { const t = T[state.lang]; list.innerHTML = `<div class="empty-state"><i class="ti ti-search-off"></i><p>${t['jobs.noresult']}</p></div>`; return; }

  list.innerHTML = jobs.map(j => {
    const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const color = companyColor(j.company_name);
    const initials = (j.company_name || 'N').slice(0, 2).toUpperCase();
    const isSaved = state.savedJobIds.has(j.id);
    const timeAgo = daysAgo(j.published_at);
    return `<div class="job-list-item js-job-card" data-job-id="${j.id}" id="jli-${j.id}" style="cursor:pointer">
      ${j.company_logo ? `<img src="${j.company_logo}" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;object-fit:contain">` : `<div class="company-logo" style="background:${color};width:44px;height:44px;border-radius:10px;flex-shrink:0;font-size:14px">${initials}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--r);font-weight:600;color:var(--dark);font-size:15px">${esc(title)}</div>
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
    pgEl.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p =>
      `<button data-page="${p}" class="${p === page ? 'btn-primary' : 'btn-ghost'}" style="margin:0 3px;padding:6px 14px;font-size:13px">${p}</button>`
    ).join('');
  } else if (pgEl) pgEl.innerHTML = '';
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
      ${state.user?.role === 'candidate' ? `<button class="btn-primary" style="flex:1" data-apply-id="${j.id}" data-apply-title="${esc(title)}"><i class="ti ti-send"></i> Apply Now</button>` : !state.user ? `<button class="btn-primary" style="flex:1" data-modal="modal-login"><i class="ti ti-send"></i> Sign in to Apply</button>` : ''}
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
  if (!state.user || state.user.role !== 'candidate') return;
  const u = state.user;
  const initials = `${(u.first_name||'')[0]||''}${(u.last_name||'')[0]||''}`.toUpperCase() || 'U';
  safeSet('dash-avatar', initials);
  safeSet('dash-name', `${u.first_name} ${u.last_name}`);
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
  return `<div class="talent-passport">
    <div class="passport-header">
      <div class="passport-avatar-lg">${initials}</div>
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
      <div class="passport-stat"><i class="ti ti-code"></i><strong>${skills.length}</strong><span>Skills</span></div>
      <div class="passport-stat"><i class="ti ti-calendar"></i><strong>${exp}y</strong><span>Exp</span></div>
      <div class="passport-stat"><i class="ti ti-world-check"></i><strong>Global</strong><span>Ready</span></div>
      <div class="passport-stat"><i class="ti ti-chart-pie"></i><strong>${pct}%</strong><span>Profile</span></div>
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
      return `<span class="sp-chip${active}" data-skill="${esc(sk.name)}" onclick="toggleSkill(this)">${img}${esc(sk.name)}</span>`;
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
      <div class="form-group"><label>${L.workPref}</label><select id="pf-mode"><option value="">${L.workAny}</option><option value="remote" ${p.work_mode_pref==='remote'?'selected':''}>${L.workRemote}</option><option value="hybrid" ${p.work_mode_pref==='hybrid'?'selected':''}>${L.workHybrid}</option><option value="onsite" ${p.work_mode_pref==='onsite'?'selected':''}>${L.workOnsite}</option></select></div>
      <div class="form-group"><label>${L.expYears}</label><input type="number" id="pf-exp" value="${p.experience_years||0}" min="0" max="50"></div>
    </div>
    <div class="form-group skill-picker-wrap">
      <label>${L.skills} <span style="color:var(--muted);font-weight:400">${L.skillsSub}</span></label>
      ${renderSkillPicker(safeJsonArr(p.skills))}
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
    renderHighlightsSection() +
    `<div id="my-endorsements-container" class="endorsements-section-placeholder"></div>`;
  updatePassportBadgesRow(getAvailBadges(_uid));
  updateSidebarOpenToWork(getAvailBadges(_uid));
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
    skills: getPickedSkills(),
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
  const profileD = await api('GET', `${BASE}/api/candidates/profile`);
  const skills = safeJsonArr(profileD.profile?.skills);
  if (!skills.length) { container.innerHTML = `<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>${T[state.lang]['dash.empty.skills']}</p></div>`; return; }

  const q = skills.slice(0, 3).join(' ');
  const d = await api('GET', `${BASE}/api/jobs?q=${encodeURIComponent(q)}&limit=5`);
  const jobs = d.jobs || [];
  if (!jobs.length) { container.innerHTML = '<div class="empty-state" style="padding:24px"><i class="ti ti-sparkles"></i><p>No matches found yet — more jobs coming!</p></div>'; return; }
  container.innerHTML = `<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Based on: ${skills.slice(0,3).map(s=>`<span class="skill-chip">${esc(s)}</span>`).join(' ')}</p>` +
    jobs.map(j => {
      const title = state.lang === 'fr' ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
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

// ── Highlights (Career Identity) ───────────────────────────
function renderHighlightsSection() {
  const uid = state.user?.id;
  if (!uid) return '';
  const highlights = JSON.parse(localStorage.getItem(`nxhi_${uid}`) || '[]');
  const typeIcons  = { project:'ti-code', cert:'ti-award', achievement:'ti-trophy', available:'ti-circle-check' };
  const typeLabels = { project:'Project', cert:'Certification', achievement:'Achievement', available:'Availability' };
  const cards = highlights.map(h => `
    <div class="highlight-card">
      <div class="highlight-icon"><i class="ti ${typeIcons[h.type]||'ti-star'}"></i></div>
      <div class="highlight-body">
        <div class="highlight-type">${typeLabels[h.type]||h.type}</div>
        <div class="highlight-title">${esc(h.title)}</div>
        ${h.desc ? `<div class="highlight-desc">${esc(h.desc)}</div>` : ''}
        ${h.url ? `<a href="${esc(h.url)}" target="_blank" class="highlight-link"><i class="ti ti-external-link" style="font-size:11px"></i> View</a>` : ''}
      </div>
      <button class="highlight-remove" onclick="removeHighlight('${h.id}')" title="Remove"><i class="ti ti-x"></i></button>
    </div>`).join('');
  return `
    <div class="highlights-section">
      <div class="highlights-header">
        <h3 class="highlights-title"><i class="ti ti-sparkles"></i> My Highlights</h3>
        <p class="highlights-sub">Projects, certifications and achievements that make you stand out.</p>
      </div>
      ${cards}
      <div class="highlight-add-form" id="highlight-form" style="display:none">
        <select id="hl-type" class="filter-select" style="width:100%;margin-bottom:8px">
          <option value="project">🛠️ Project</option>
          <option value="cert">🎓 Certification</option>
          <option value="achievement">🏆 Achievement</option>
          <option value="available">🟢 Availability update</option>
        </select>
        <input type="text" id="hl-title" class="filter-input" style="width:100%;margin-bottom:8px;box-sizing:border-box" placeholder="Title (required)">
        <input type="text" id="hl-desc" class="filter-input" style="width:100%;margin-bottom:8px;box-sizing:border-box" placeholder="Short description (optional)">
        <input type="url" id="hl-url" class="filter-input" style="width:100%;margin-bottom:12px;box-sizing:border-box" placeholder="Link / URL (optional)">
        <div style="display:flex;gap:8px">
          <button class="btn-primary" style="flex:1" onclick="addHighlight()"><i class="ti ti-plus"></i> Add</button>
          <button class="btn-ghost" onclick="document.getElementById('highlight-form').style.display='none'">Cancel</button>
        </div>
      </div>
      <button class="btn-ghost" id="btn-add-highlight" style="width:100%;margin-top:10px" onclick="document.getElementById('highlight-form').style.display='block';this.style.display='none'"><i class="ti ti-plus"></i> Add a highlight</button>
    </div>`;
}

function addHighlight() {
  const uid = state.user?.id;
  if (!uid) return;
  const title = document.getElementById('hl-title')?.value.trim();
  if (!title) { toast('Title is required', 'error'); return; }
  const highlights = JSON.parse(localStorage.getItem(`nxhi_${uid}`) || '[]');
  highlights.unshift({
    id: `hl-${Date.now()}`,
    type: document.getElementById('hl-type')?.value || 'project',
    title,
    desc: document.getElementById('hl-desc')?.value.trim() || '',
    url:  document.getElementById('hl-url')?.value.trim() || ''
  });
  localStorage.setItem(`nxhi_${uid}`, JSON.stringify(highlights));
  toast('Highlight added!', 'success');
  loadProfileForm();
}

function removeHighlight(id) {
  const uid = state.user?.id;
  if (!uid) return;
  const h = JSON.parse(localStorage.getItem(`nxhi_${uid}`) || '[]').filter(x => x.id !== id);
  localStorage.setItem(`nxhi_${uid}`, JSON.stringify(h));
  loadProfileForm();
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
}

function showEmpTab(tabId, navEl) {
  document.querySelectorAll('#pg-employer-dash .dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#pg-employer-dash .dash-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (tabId === 'etab-team') loadTeam();
  if (tabId === 'etab-analytics') loadEmployerAnalytics();
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

async function loadMessagesTab() {
  const container = document.getElementById('tab-messages') || document.getElementById('tab-applications');
  if (!container) return;
  const isFr = state.lang === 'fr';
  // Inject messages panel into applications tab if not standalone
  let msgContainer = document.getElementById('messages-panel');
  if (!msgContainer) return openMessagesPage();
}

async function openMessagesPage(appId) {
  const isFr = state.lang === 'fr';
  const d = await api('GET', `${BASE}/api/messages/threads`);
  const threads = d.threads || [];
  const threadList = threads.length
    ? threads.map(t => {
        const title = isFr ? (t.title_fr||t.title_en) : (t.title_en||t.title_fr);
        const logo = t.logo_url ? `<img src="${esc(t.logo_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:contain">` : `<div class="company-logo" style="background:${companyColor(t.company_name||'')};width:36px;height:36px;border-radius:8px;font-size:11px">${(t.company_name||'?').slice(0,2).toUpperCase()}</div>`;
        const unread = parseInt(t.unread||0);
        return `<div class="job-list-item" style="cursor:pointer;${appId===t.application_id?'background:var(--indigo)10;border-color:var(--indigo)':''}" onclick="openThread('${t.application_id}')">
          ${logo}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;color:var(--dark)">${esc(title)}</div>
            <div style="font-size:12px;color:var(--muted)">${esc(t.company_name||'')} · ${esc(t.cand_first||'')} ${esc(t.cand_last||'')}</div>
            ${t.last_message ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.last_message)}</div>` : ''}
          </div>
          ${unread ? `<span style="background:var(--indigo);color:#fff;border-radius:99px;font-size:11px;font-weight:700;padding:2px 7px;min-width:20px;text-align:center">${unread}</span>` : ''}
        </div>`;
      }).join('')
    : `<div class="empty-state" style="padding:32px 0"><i class="ti ti-messages"></i><p style="font-size:13px">${isFr?'Aucune conversation.':'No conversations yet.'}</p></div>`;

  const panel = document.getElementById('messages-panel-wrap');
  if (panel) {
    panel.innerHTML = threadList;
    if (appId) openThread(appId);
    return;
  }
  // Show as modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'messages-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `<div style="background:var(--surface);border-radius:16px;width:100%;max-width:860px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">
      <h3 style="margin:0;color:var(--dark)">${isFr?'Messages':'Messages'}</h3>
      <button class="btn-ghost" style="padding:4px 10px" onclick="document.getElementById('messages-overlay')?.remove()"><i class="ti ti-x"></i></button>
    </div>
    <div style="display:flex;flex:1;overflow:hidden;min-height:0">
      <div id="messages-panel-wrap" style="width:280px;border-right:1px solid var(--border);overflow-y:auto;padding:8px">${threadList}</div>
      <div id="messages-thread" style="flex:1;display:flex;flex-direction:column;padding:16px;overflow:hidden">
        <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px">${isFr?'Sélectionnez une conversation':'Select a conversation'}</div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  if (appId) openThread(appId);
}

async function openThread(appId) {
  _currentThreadApp = appId;
  const isFr = state.lang === 'fr';
  const threadEl = document.getElementById('messages-thread');
  if (!threadEl) return;
  threadEl.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center"><i class="ti ti-loader" style="animation:spin 1s linear infinite;color:var(--indigo)"></i></div>`;
  const d = await api('GET', `${BASE}/api/messages/${appId}`);
  const msgs = d.messages || [];
  const bubbles = msgs.map(m => {
    const mine = m.sender_id === state.user?.id;
    const name = `${m.first_name||''} ${m.last_name||''}`.trim();
    const time = new Date(m.created_at).toLocaleTimeString(isFr?'fr-CA':'en-CA', { hour:'2-digit', minute:'2-digit' });
    return `<div style="display:flex;flex-direction:${mine?'row-reverse':'row'};gap:8px;margin-bottom:12px;align-items:flex-end">
      <div style="max-width:70%">
        ${!mine?`<div style="font-size:11px;color:var(--muted);margin-bottom:3px">${esc(name)}</div>`:''}
        <div style="background:${mine?'var(--indigo)':'var(--background)'};color:${mine?'#fff':'var(--dark)'};padding:10px 14px;border-radius:${mine?'14px 14px 4px 14px':'14px 14px 14px 4px'};font-size:13px;line-height:1.5">${esc(m.body)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${mine?'right':'left'}">${time}</div>
      </div>
    </div>`;
  }).join('');
  threadEl.innerHTML = `
    <div id="msg-bubbles" style="flex:1;overflow-y:auto;padding:8px 0">${bubbles||`<div style="text-align:center;color:var(--muted);font-size:13px;padding:32px">${isFr?'Commencez la conversation':'Start the conversation'}</div>`}</div>
    <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <input type="text" id="msg-input" placeholder="${isFr?'Votre message…':'Your message…'}" style="flex:1;font-size:13px" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}">
      <button class="btn-primary" style="padding:10px 16px;font-size:13px" onclick="sendMessage()"><i class="ti ti-send"></i></button>
    </div>`;
  const bubblesEl = document.getElementById('msg-bubbles');
  if (bubblesEl) bubblesEl.scrollTop = bubblesEl.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const body = input?.value.trim();
  if (!body || !_currentThreadApp) return;
  input.value = '';
  const d = await api('POST', `${BASE}/api/messages/${_currentThreadApp}`, { body });
  if (d.success) openThread(_currentThreadApp);
  else toast(d.error || 'Error', 'error');
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
      if (p.skills?.length) {
        p.skills.forEach(s => {
          const chip = document.querySelector(`.skill-chip[data-skill="${CSS.escape(s)}"]`);
          if (chip) chip.classList.add('selected');
        });
      }
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ ${isFr?`Profil pré-rempli depuis le CV (${p.skills?.length||0} compétences détectées)`:`Profile pre-filled from CV (${p.skills?.length||0} skills detected)`}</span>`;
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
  const cur = parseInt(badge.textContent || '0');
  const next = cur + delta;
  badge.textContent = next > 0 ? next : '';
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
document.getElementById('nav-notif-bell')?.addEventListener('click', () => goto('candidate-dash'));

// ── Navbar — dropdown items ──────────────────────────────────
document.getElementById('user-dropdown')?.addEventListener('click', e => {
  const item = e.target.closest('[data-goto]');
  if (item) { toggleUserMenu(); goto(item.dataset.goto); return; }
  const logout_btn = e.target.closest('#dd-logout');
  if (logout_btn) { toggleUserMenu(); logout(); return; }
  const reviews_btn = e.target.closest('#dd-my-reviews');
  if (reviews_btn) {
    toggleUserMenu();
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

// ── Restore page from URL hash on initial load ───────────────
restoreFromHash();

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
      <button class="btn-white" style="margin-top:12px;font-size:13px" onclick="showTab('tab-skills', document.querySelector('[data-tab=tab-skills]'))">
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
  const categories = [...new Set(tests.map(t => t.category))];
  const diffColor = { beginner: '#4ade80', intermediate: '#facc15', advanced: '#f87171' };
  el.innerHTML = `
    <h2><i class="ti ti-certificate" style="color:var(--indigo)"></i> ${isFr ? 'Tests de compétences vérifiables' : 'Verified Skill Tests'}</h2>
    <p style="color:var(--muted);margin-bottom:24px">${isFr ? 'Obtenez des badges vérifiés sur votre profil. Les employeurs peuvent filtrer par compétences validées.' : 'Earn verified badges on your profile. Employers can filter by validated skills.'}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      ${categories.map(cat => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer" onclick="filterSkillTests('${cat}')">${cat}</div>
      `).join('')}
    </div>
    <div id="skill-tests-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${tests.map(t => {
        const passed = t.passed;
        const attempted = t.score !== null && t.score !== undefined;
        return `
        <div class="skill-test-card" style="background:var(--surface);border:1px solid ${passed ? '#4ade8055' : 'var(--border)'};border-radius:16px;padding:20px;position:relative${passed ? ';box-shadow:0 0 0 2px #4ade8033' : ''}">
          ${passed ? `<div style="position:absolute;top:12px;right:12px;background:#4ade80;color:#000;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">✓ ${isFr ? 'Réussi' : 'Passed'}</div>` : ''}
          <div style="font-size:12px;color:${diffColor[t.difficulty] || '#facc15'};font-weight:600;margin-bottom:6px;text-transform:uppercase">${t.difficulty}</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">${isFr ? t.title_fr : t.title_en}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${t.category} · ${t.question_count} ${isFr ? 'questions' : 'questions'} · ${isFr ? 'Score min' : 'Pass score'}: ${t.pass_score}%</div>
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
  document.querySelectorAll('.skill-test-card').forEach(c => {
    const title = c.querySelector('[style*="font-size:16px"]')?.textContent || '';
    c.style.display = title ? '' : 'none';
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
        ${passed ? `<div style="margin-top:12px;background:#4ade8022;border-radius:10px;padding:10px;font-size:13px;color:#4ade80">${isFr ? 'Badge ajouté à votre profil !' : 'Badge added to your profile!'}</div>` : ''}
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
  const [trending, provinces] = await Promise.all([
    api('GET', `${BASE}/api/salary/trending`),
    api('GET', `${BASE}/api/salary/provinces`),
  ]);
  el.innerHTML = `
    <h2><i class="ti ti-cash" style="color:var(--indigo)"></i> ${isFr ? 'Données salariales du marché' : 'Salary Market Data'}</h2>
    <p style="color:var(--muted);margin-bottom:24px">${isFr ? 'Données agrégées et anonymisées de milliers d\'offres actives au Canada.' : 'Aggregated and anonymized data from thousands of active postings across Canada.'}</p>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px">${isFr ? 'Titre du poste' : 'Job Title'}</label>
          <input id="sal-title" type="text" placeholder="${isFr ? 'Ex: Développeur React' : 'e.g. React Developer'}" class="field" style="width:100%">
        </div>
        <div style="width:120px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px">${isFr ? 'Province' : 'Province'}</label>
          <select id="sal-province" class="field" style="width:100%">
            <option value="">${isFr ? 'Toutes' : 'All'}</option>
            <option>QC</option><option>ON</option><option>BC</option><option>AB</option><option>MB</option><option>SK</option><option>NS</option><option>NB</option>
          </select>
        </div>
        <button class="btn-primary" style="padding:10px 20px" onclick="searchSalary()"><i class="ti ti-search"></i> ${isFr ? 'Rechercher' : 'Search'}</button>
      </div>
      <div id="sal-result" style="margin-top:16px"></div>
    </div>

    ${trending.success && trending.roles.length ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:24px">
      <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)"><i class="ti ti-trending-up"></i> ${isFr ? 'Postes les mieux rémunérés' : 'Top Paying Roles'}</div>
      ${trending.roles.map((r, i) => {
        const pct = Math.round((r.avg_salary / trending.roles[0].avg_salary) * 100);
        return `
          <div style="padding:14px 20px;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:600;font-size:14px">${r.title_en}</span>
              <span style="font-weight:700;color:var(--indigo)">${isFr ? formatSalaryFr(r.avg_salary) : formatSalary(r.avg_salary)} ${isFr ? '/ an' : '/ yr'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="flex:1;background:var(--border);border-radius:4px;height:6px">
                <div style="width:${pct}%;background:var(--indigo);border-radius:4px;height:6px"></div>
              </div>
              <span style="font-size:11px;color:var(--muted)">${r.count} ${isFr ? 'offres' : 'jobs'}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${provinces.success && provinces.provinces.length ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:16px 20px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border)"><i class="ti ti-map"></i> ${isFr ? 'Salaire moyen par province' : 'Average Salary by Province'}</div>
      <div style="padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
        ${provinces.provinces.map(p => `
          <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:var(--indigo)">${p.province}</div>
            <div style="font-size:15px;font-weight:700;margin:4px 0">${isFr ? formatSalaryFr(p.avg_salary) : formatSalary(p.avg_salary)}</div>
            <div style="font-size:11px;color:var(--muted)">${p.job_count} ${isFr ? 'offres' : 'jobs'}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
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
  result.innerHTML = `<div style="text-align:center;padding:16px"><i class="ti ti-loader" style="animation:spin 1s linear infinite;font-size:20px;color:var(--indigo)"></i></div>`;
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (province) params.set('province', province);
  const d = await api('GET', `${BASE}/api/salary/stats?${params}`);
  if (!d.success || !d.stats) { result.innerHTML = `<div style="color:var(--muted);text-align:center;padding:16px">${isFr ? 'Aucune donnée pour ces critères.' : 'No data for these filters.'}</div>`; return; }
  const { stats } = d;
  result.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[
        [isFr ? 'Médiane' : 'Median', formatSalary(stats.median), '#6366F1'],
        [isFr ? 'Moyenne' : 'Average', formatSalary(stats.avg), '#8b5cf6'],
        [isFr ? 'P25' : 'P25', formatSalary(stats.p25), '#4ade80'],
        [isFr ? 'P75' : 'P75', formatSalary(stats.p75), '#facc15'],
      ].map(([label, val, color]) => `
        <div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:${color}">${val}</div>
          <div style="font-size:11px;color:var(--muted)">${label}</div>
        </div>
      `).join('')}
    </div>
    <div style="font-size:12px;color:var(--muted);text-align:center">${isFr ? 'Basé sur' : 'Based on'} ${stats.count} ${isFr ? 'offres actives' : 'active job postings'}</div>
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

/**
 * AgentHub Platform — Sales Intelligence
 * Plateforme de prospection autonome par agents IA :
 * identification de prospects qualifiés, conversations personnalisées,
 * gestion des objections et suivi de la conversion.
 */

const _CSS_ID = 'si-css';

// ── API ───────────────────────────────────────────────────────────────────────
function _tok() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _tok(); return { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' }; }
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: _h(), credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
  return r.status === 204 ? null : r.json();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function _esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function _matchBadge(score) {
  const cls = score >= 85 ? 'ok' : score >= 65 ? 'warn' : 'err';
  return `<span class="si-badge si-badge-${cls}">Correspondance ${score}%</span>`;
}
function _stageBadge(stage) {
  const MAP = {
    identification:'Identifié', enrichissement:'Enrichi', contact_initial:'1er contact',
    qualification:'Qualification', objection:'Objection', negociation:'Négociation',
    proposition:'Proposition envoyée', converti:'Converti', perdu:'Perdu',
  };
  const CLS = {
    identification:'muted', enrichissement:'info', contact_initial:'info',
    qualification:'warn', objection:'warn', negociation:'ok',
    proposition:'ok', converti:'green', perdu:'err',
  };
  return `<span class="si-badge si-badge-${CLS[stage]||'muted'}">${MAP[stage]||_esc(stage)}</span>`;
}
function _agentStatus(s) {
  const cls = s === 'active' ? 'ok' : s === 'paused' ? 'warn' : 'muted';
  const lbl = s === 'active' ? 'Actif' : s === 'paused' ? 'En pause' : 'Inactif';
  return `<span class="si-badge si-badge-${cls}">${lbl}</span>`;
}

// ── Données mock ──────────────────────────────────────────────────────────────
const AGENTS = [
  { id:'a1', name:'Agent Léa', avatar:'L', color:'#0078D4',
    specialty:'Formation professionnelle & upskilling IA',
    description:'Spécialisée dans la vente de programmes de formation IA aux RH et directions de formation.',
    status:'active', conversations:14, qualified:9, converted:4,
    objections_handled:27, avg_response:'4 min', success_rate:44 },
  { id:'a2', name:'Agent Max', avatar:'M', color:'#107C10',
    specialty:'Transformation numérique PME',
    description:'Expert en identification des PME en démarche numérique, analyse des besoins de modernisation.',
    status:'active', conversations:11, qualified:7, converted:3,
    objections_handled:19, avg_response:'6 min', success_rate:43 },
  { id:'a3', name:'Agent Sofia', avatar:'S', color:'#5C2D91',
    specialty:'Services professionnels & conseil',
    description:'Cible les firmes de conseil et services professionnels cherchant à intégrer l\'IA dans leur offre.',
    status:'active', conversations:9, qualified:5, converted:2,
    objections_handled:13, avg_response:'3 min', success_rate:40 },
  { id:'a4', name:'Agent Théo', avatar:'T', color:'#CA5010',
    specialty:'Santé & organismes publics',
    description:'Maîtrise les enjeux de conformité LPRPDE et RGPD pour les organisations du secteur public.',
    status:'paused', conversations:6, qualified:3, converted:1,
    objections_handled:11, avg_response:'8 min', success_rate:33 },
];

const PROSPECTS = [
  { id:'p1', company:'DupriTech Manufacturier', contact:'Sarah Lévesque', title:'Directrice RH',
    sector:'Manufacture', source:'LinkedIn IA', score:96, agent:'Agent Léa',
    stage:'qualification', lastActivity:'Il y a 1h',
    need:'Formation IA pour 45 employés de production',
    matchReason:'Offre de formation IA production correspond à 96% des besoins déclarés',
    objections:['Budget serré Q4'], messages:7 },
  { id:'p2', company:'Groupe Santé Montréal', contact:'Marc Bouchard', title:'Directeur général',
    sector:'Santé', source:'Web intelligence', score:89, agent:'Agent Théo',
    stage:'objection', lastActivity:'Il y a 3h',
    need:'Automatisation des processus administratifs avec IA',
    matchReason:'Besoin d\'automatisation admin santé aligné à 89% avec votre offre',
    objections:['Conformité LPRPDE', 'Résistance équipe TI'], messages:12 },
  { id:'p3', company:'Cabinet Lavallée & Associés', contact:'Isabelle Fortin', title:'Associée principale',
    sector:'Services professionnels', source:'LinkedIn IA', score:84, agent:'Agent Sofia',
    stage:'negociation', lastActivity:'Il y a 2h',
    need:'Intégration IA dans l\'offre de conseil stratégique',
    matchReason:'Firme de conseil en phase de positionnement IA — 84% de match',
    objections:['ROI incertain'], messages:9 },
  { id:'p4', company:'Coopérative AgriNord', contact:'Jean-François Côté', title:'DG',
    sector:'Agriculture', source:'Événement CCI3R', score:78, agent:'Agent Max',
    stage:'proposition', lastActivity:'Il y a 5h',
    need:'Diagnostic IA et plan de transition numérique',
    matchReason:'PME en démarche numérique — 78% d\'adéquation avec l\'offre diagnostic',
    objections:[], messages:5 },
  { id:'p5', company:'Groupe Scolaire Estrie', contact:'Nathalie Roy', title:'Directrice TI',
    sector:'Éducation', source:'Web intelligence', score:91, agent:'Agent Léa',
    stage:'contact_initial', lastActivity:'Il y a 30 min',
    need:'Programme de formation IA pour enseignants et cadres',
    matchReason:'Institution éducative avec besoin de formation IA à grande échelle — 91%',
    objections:[], messages:2 },
  { id:'p6', company:'Municipalité de Sherbrooke', contact:'Pierre Gagnon', title:'DG adjoint',
    sector:'Secteur public', source:'Partenariat CCI3R', score:73, agent:'Agent Max',
    stage:'identification', lastActivity:'Il y a 1j',
    need:'IA pour optimisation des services aux citoyens',
    matchReason:'Organisation publique en phase d\'exploration IA — 73% d\'adéquation',
    objections:[], messages:1 },
  { id:'p7', company:'Pharma Innovations QC', contact:'Dre. Amélie Trahan', title:'VP Innovation',
    sector:'Pharma', source:'LinkedIn IA', score:87, agent:'Agent Sofia',
    stage:'converti', lastActivity:'Il y a 2j',
    need:'Accélération R&D par agents IA',
    matchReason:'Secteur pharma en croissance — besoin de conseil IA avancé à 87%',
    objections:['Délai de mise en œuvre'], messages:18 },
];

const CONVERSATIONS = [
  { id:'c1', prospectId:'p2', prospect:'Marc Bouchard', company:'Groupe Santé Montréal',
    agent:'Agent Théo', stage:'objection', lastTime:'Il y a 3h',
    thread:[
      { role:'ai', author:'Agent Théo', time:'Lun 14:22',
        text:'Bonjour Marc, j\'ai analysé les processus administratifs de Groupe Santé Montréal et identifié 3 zones à fort potentiel d\'automatisation IA. Seriez-vous disponible 20 minutes pour en discuter ?' },
      { role:'prospect', author:'Marc Bouchard', time:'Lun 15:04',
        text:'Merci pour votre message. La question de la conformité LPRPDE est critique pour nous — nous ne pouvons pas utiliser des outils qui ne respectent pas la réglementation québécoise sur les données de santé.' },
      { role:'ai', author:'Agent Théo', time:'Lun 15:09',
        text:'Excellente question Marc, et c\'est exactement là que notre approche se distingue. Nous opérons exclusivement avec des serveurs hébergés au Québec et notre architecture est certifiée conforme à la LPRPDE dès la conception. Je peux vous envoyer notre attestation de conformité ce soir — votre équipe TI pourra la valider dès demain.' },
      { role:'prospect', author:'Marc Bouchard', time:'Lun 16:45',
        text:'C\'est rassurant. Mais l\'équipe TI est déjà surchargée et va voir ça d\'un mauvais œil.' },
      { role:'ai', author:'Agent Théo', time:'Lun 16:51',
        text:'Je comprends tout à fait la réalité des équipes TI en santé. C\'est pourquoi notre déploiement est entièrement géré par nos experts — zéro charge pour vos ressources internes la première année. En fait, la plupart de nos clients en santé voient leur charge TI réduite de 15 à 20% après 6 mois. Seriez-vous ouvert à une démonstration avec votre équipe TI la semaine prochaine ?' },
    ]
  },
  { id:'c2', prospectId:'p1', prospect:'Sarah Lévesque', company:'DupriTech Manufacturier',
    agent:'Agent Léa', stage:'qualification', lastTime:'Il y a 1h',
    thread:[
      { role:'ai', author:'Agent Léa', time:'Mar 09:15',
        text:'Bonjour Sarah, j\'ai constaté que DupriTech est en pleine expansion de sa capacité de production. Votre secteur est précisément celui où la formation IA génère le plus de gains de productivité — jusqu\'à 30% en 6 mois selon nos données clients. Avez-vous un programme de formation IA en place pour vos équipes ?' },
      { role:'prospect', author:'Sarah Lévesque', time:'Mar 10:02',
        text:'Non, pas encore. On en parle depuis un moment mais le budget Q4 est vraiment serré.' },
      { role:'ai', author:'Agent Léa', time:'Mar 10:07',
        text:'Je comprends la contrainte Q4. C\'est justement pour ça que notre programme "IA Production Ready" est conçu en deux phases : une phase pilote légère (4 semaines, 10 employés, coût réduit de 40%) pour démontrer le ROI avant le budget Q1 — et vous négociez ensuite le déploiement complet avec des chiffres concrets. Cela vous permettrait de démarrer sans impact sur votre Q4. Cela vous intéresse ?' },
      { role:'prospect', author:'Sarah Lévesque', time:'Mar 10:44',
        text:'C\'est intéressant comme approche. Quel serait le coût du pilote ?' },
    ]
  },
  { id:'c3', prospectId:'p7', prospect:'Dre. Amélie Trahan', company:'Pharma Innovations QC',
    agent:'Agent Sofia', stage:'converti', lastTime:'Il y a 2j',
    thread:[
      { role:'ai', author:'Agent Sofia', time:'Jeu 11:30',
        text:'Bonjour Amélie, j\'ai suivi l\'annonce de votre nouveau programme R&D en oncologie — félicitations ! Les équipes pharma qui intègrent des agents IA dans leurs cycles de découverte réduisent leur time-to-insight de 40% en moyenne. Votre calendrier de mise en marché vous pousserait-il à explorer ça rapidement ?' },
      { role:'prospect', author:'Dre. Amélie Trahan', time:'Jeu 14:12',
        text:'Oui, mais on a peur que ça prenne trop de temps à déployer.' },
      { role:'ai', author:'Agent Sofia', time:'Jeu 14:18',
        text:'Votre préoccupation est fondée — la plupart des solutions IA prennent 6 à 12 mois. Notre approche est différente : déploiement en 3 semaines avec des agents pré-entraînés sur votre domaine thérapeutique. Votre équipe est opérationnelle avant la fin du mois. Je peux vous montrer un cas similaire en oncologie mercredi matin ?' },
      { role:'prospect', author:'Dre. Amélie Trahan', time:'Jeu 16:55',
        text:'Parfait. Mercredi 10h. Envoyez-moi les détails.' },
      { role:'ai', author:'Agent Sofia', time:'Jeu 17:00',
        text:'Invitations envoyées. Mercredi 10h avec notre spécialiste pharma. Au plaisir Amélie !' },
    ]
  },
];

const PIPELINE_STAGES = [
  { key:'identification',   label:'Identification',    count:6,  value:180000 },
  { key:'qualification',    label:'Qualification',     count:4,  value:145000 },
  { key:'objection',        label:'Objection levée',   count:3,  value:98000  },
  { key:'negociation',      label:'Négociation',       count:2,  value:72000  },
  { key:'proposition',      label:'Proposition',       count:2,  value:64000  },
  { key:'converti',         label:'Converti',          count:1,  value:38000  },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const _CSS = `
.si-wrap { display:flex; flex-direction:column; height:100%; min-height:0; font-family:var(--font,ui-sans-serif,system-ui,sans-serif); }

.si-tabs { display:flex; gap:0; background:#fff; border-bottom:1px solid var(--border,#E0E0E0); padding:0 20px; overflow-x:auto; flex-shrink:0; }
.si-tab { padding:11px 16px; font-size:12px; font-weight:600; color:var(--muted,#757575); border:none; background:none; cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s,border-color .15s; }
.si-tab:hover { color:var(--text,#1B1B1B); }
.si-tab.active { color:var(--primary,#0078D4); border-bottom-color:var(--primary,#0078D4); }

.si-body { flex:1; overflow-y:auto; padding:24px; min-height:0; }

/* KPI row */
.si-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:24px; }
.si-kpi { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px 18px; }
.si-kpi-accent { border-top:3px solid var(--primary,#0078D4); }
.si-kpi-green  { border-top:3px solid #107C10; }
.si-kpi-orange { border-top:3px solid #CA5010; }
.si-kpi-purple { border-top:3px solid #5C2D91; }
.si-kpi-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted,#757575); margin-bottom:6px; }
.si-kpi-value { font-size:28px; font-weight:800; color:var(--text,#1B1B1B); letter-spacing:-.02em; line-height:1; }
.si-kpi-sub { font-size:11px; color:var(--muted,#757575); margin-top:4px; }

/* Section headers */
.si-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:12px; flex-wrap:wrap; }
.si-sh-title { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); }

/* Badges */
.si-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; letter-spacing:.01em; }
.si-badge-ok     { background:#DFF6DD; color:#107C10; }
.si-badge-green  { background:#DFF6DD; color:#107C10; }
.si-badge-warn   { background:#FDE7D9; color:#CA5010; }
.si-badge-err    { background:#FDE7E9; color:#C50F1F; }
.si-badge-info   { background:#EFF6FC; color:#0078D4; }
.si-badge-muted  { background:#F3F3F3; color:#757575; }
.si-badge-purple { background:#F3EFF9; color:#5C2D91; }

/* Buttons */
.si-btn { padding:7px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:opacity .15s; }
.si-btn:hover { opacity:.85; }
.si-btn-primary   { background:var(--primary,#0078D4); color:#fff; }
.si-btn-secondary { background:#F5F5F5; color:var(--text,#1B1B1B); border:1px solid var(--border,#E0E0E0); }
.si-btn-sm { padding:5px 10px; font-size:11px; }
.si-btn-ghost { background:none; border:1px solid var(--border,#E0E0E0); color:var(--text,#1B1B1B); }

/* Toolbar */
.si-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.si-input  { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:var(--text,#1B1B1B); background:#fff; outline:none; }
.si-input:focus { border-color:var(--primary,#0078D4); box-shadow:0 0 0 2px rgba(0,120,212,.12); }
.si-select { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:var(--text,#1B1B1B); background:#fff; outline:none; cursor:pointer; }
.si-spacer { flex:1; }

/* Table */
.si-tbl-wrap { overflow-x:auto; border:1px solid var(--border,#E0E0E0); border-radius:8px; }
table.si-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.si-tbl thead th { text-align:left; padding:9px 12px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted,#757575); background:#F8F8F8; border-bottom:1px solid var(--border,#E0E0E0); white-space:nowrap; }
.si-tbl tbody td { padding:11px 12px; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:middle; }
.si-tbl tbody tr:last-child td { border-bottom:none; }
.si-tbl tbody tr:hover td { background:#F5F5F5; cursor:pointer; }
.si-company { font-weight:600; color:var(--text,#1B1B1B); }
.si-sub { font-size:11px; color:var(--muted,#757575); margin-top:1px; }
.si-need-pill { display:inline-block; background:#EFF6FC; color:#0078D4; font-size:10.5px; font-weight:600; padding:3px 8px; border-radius:4px; margin-top:4px; max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Agent avatar */
.si-avatar { width:32px; height:32px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
.si-avatar-sm { width:24px; height:24px; font-size:10px; }

/* Agent cards grid */
.si-agents-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
.si-agent-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:10px; padding:18px; }
.si-agent-header { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.si-agent-name { font-size:14px; font-weight:700; color:var(--text,#1B1B1B); }
.si-agent-spec { font-size:11px; color:var(--muted,#757575); margin-top:2px; }
.si-agent-desc { font-size:11.5px; color:#555; line-height:1.55; margin-bottom:14px; padding:10px 12px; background:#F8F8F8; border-radius:6px; border-left:3px solid var(--primary,#0078D4); }
.si-agent-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.si-agent-stat { text-align:center; padding:8px; background:#F8F8F8; border-radius:6px; }
.si-agent-stat-val { font-size:18px; font-weight:800; color:var(--text,#1B1B1B); }
.si-agent-stat-lbl { font-size:10px; color:var(--muted,#757575); text-transform:uppercase; letter-spacing:.05em; margin-top:1px; }
.si-agent-footer { margin-top:12px; padding-top:12px; border-top:1px solid var(--border,#E0E0E0); display:flex; gap:6px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.si-rate-bar { height:6px; border-radius:3px; background:#E0E0E0; flex:1; min-width:80px; }
.si-rate-fill { height:100%; border-radius:3px; background:var(--primary,#0078D4); }

/* Conversations */
.si-conv-grid { display:grid; grid-template-columns:280px 1fr; gap:16px; height:calc(100vh - 220px); min-height:400px; }
.si-conv-list { overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.si-conv-item { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:12px 14px; cursor:pointer; transition:border-color .15s; }
.si-conv-item:hover,.si-conv-item.active { border-color:var(--primary,#0078D4); box-shadow:0 0 0 1px rgba(0,120,212,.2); }
.si-conv-company { font-size:12px; font-weight:700; color:var(--text,#1B1B1B); }
.si-conv-prospect { font-size:11px; color:var(--muted,#757575); }
.si-conv-last { font-size:11px; color:#555; margin-top:6px; line-height:1.4; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.si-conv-meta { display:flex; gap:6px; align-items:center; margin-top:8px; flex-wrap:wrap; }

.si-thread-pane { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; display:flex; flex-direction:column; overflow:hidden; }
.si-thread-header { padding:14px 18px; border-bottom:1px solid var(--border,#E0E0E0); background:#F8F8F8; flex-shrink:0; }
.si-thread-title { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); }
.si-thread-sub { font-size:11px; color:var(--muted,#757575); margin-top:2px; }
.si-thread-obj { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.si-thread-obj-label { font-size:10.5px; font-weight:600; color:var(--muted,#757575); text-transform:uppercase; letter-spacing:.05em; }
.si-obj-chip { font-size:10.5px; font-weight:600; padding:2px 8px; background:#FDE7E9; color:#C50F1F; border-radius:999px; }
.si-obj-chip-ok { background:#DFF6DD; color:#107C10; }

.si-thread-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
.si-msg { max-width:78%; padding:12px 14px; border-radius:10px; font-size:12.5px; line-height:1.6; }
.si-msg-ai       { background:#F0F6FF; border:1px solid #C7E0F4; align-self:flex-start; }
.si-msg-prospect { background:#FFF8ED; border:1px solid #FDE7D9; align-self:flex-start; }
.si-msg-role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; opacity:.65; }
.si-msg-time { font-size:10px; color:var(--muted,#757575); margin-top:5px; text-align:right; }

.si-thread-footer { padding:12px 16px; border-top:1px solid var(--border,#E0E0E0); background:#F8F8F8; flex-shrink:0; }
.si-thread-empty { flex:1; display:flex; align-items:center; justify-content:center; color:var(--muted,#757575); font-size:13px; }

/* Pipeline funnel */
.si-funnel { display:flex; flex-direction:column; gap:8px; max-width:700px; }
.si-funnel-row { display:grid; grid-template-columns:160px 1fr 100px 110px; gap:12px; align-items:center; }
.si-funnel-label { font-size:12px; font-weight:600; color:var(--text,#1B1B1B); text-align:right; }
.si-funnel-bar-wrap { height:32px; background:#F3F3F3; border-radius:6px; overflow:hidden; position:relative; }
.si-funnel-bar { height:100%; border-radius:6px; display:flex; align-items:center; justify-content:flex-end; padding-right:10px; font-size:11px; font-weight:700; color:#fff; white-space:nowrap; transition:width .4s; }
.si-funnel-count { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); text-align:center; }
.si-funnel-value { font-size:12px; font-weight:600; color:var(--muted,#757575); text-align:right; }

/* Prospect detail panel */
.si-prospect-panel { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:20px; margin-bottom:16px; }
.si-prospect-header { display:flex; gap:14px; align-items:flex-start; margin-bottom:16px; }
.si-prospect-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#0078D4,#5C2D91); display:flex; align-items:center; justify-content:center; font-size:18px; color:#fff; font-weight:700; flex-shrink:0; }
.si-prospect-name { font-size:15px; font-weight:700; color:var(--text,#1B1B1B); }
.si-prospect-meta { font-size:12px; color:var(--muted,#757575); margin-top:2px; }
.si-prospect-match { background:#F0F6FF; border:1px solid #C7E0F4; border-radius:6px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#0050A0; line-height:1.5; }
.si-prospect-match strong { color:var(--primary,#0078D4); }
.si-prospect-obj { display:flex; gap:6px; flex-wrap:wrap; }

/* Empty / Loading */
.si-empty { padding:48px 24px; text-align:center; color:var(--muted,#757575); }
.si-empty-icon { font-size:32px; margin-bottom:10px; opacity:.4; }
.si-loader { display:flex; gap:10px; align-items:center; justify-content:center; padding:32px; color:var(--muted,#757575); font-size:13px; }

/* Activity feed */
.si-feed { display:flex; flex-direction:column; gap:8px; }
.si-feed-item { display:flex; gap:12px; align-items:flex-start; padding:10px 14px; background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; }
.si-feed-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
.si-feed-text { font-size:12px; color:var(--text,#1B1B1B); line-height:1.5; }
.si-feed-time { font-size:10.5px; color:var(--muted,#757575); margin-top:2px; }

/* Rapports */
.si-report-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:24px; }
.si-report-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:18px; }
.si-report-card-title { font-size:12px; font-weight:700; color:var(--muted,#757575); text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
.si-bar-chart { display:flex; flex-direction:column; gap:8px; }
.si-bar-row { display:grid; grid-template-columns:100px 1fr 40px; gap:8px; align-items:center; }
.si-bar-lbl { font-size:11px; color:var(--text,#1B1B1B); text-align:right; }
.si-bar-bg { height:14px; background:#F3F3F3; border-radius:3px; overflow:hidden; }
.si-bar-fill { height:100%; border-radius:3px; }
.si-bar-val { font-size:11px; font-weight:700; color:var(--text,#1B1B1B); }
.si-timeline { position:relative; padding-left:20px; }
.si-timeline::before { content:''; position:absolute; left:6px; top:0; bottom:0; width:2px; background:var(--border,#E0E0E0); }
.si-tl-item { position:relative; margin-bottom:16px; }
.si-tl-dot { position:absolute; left:-17px; top:3px; width:10px; height:10px; border-radius:50%; background:var(--primary,#0078D4); border:2px solid #fff; box-shadow:0 0 0 1px var(--border,#E0E0E0); }
.si-tl-date { font-size:10px; color:var(--muted,#757575); font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
.si-tl-text { font-size:12px; color:var(--text,#1B1B1B); margin-top:2px; }
`;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'dashboard',      label:'Tableau de bord' },
  { id:'prospects',      label:'Prospects IA' },
  { id:'agents',         label:'Agents IA' },
  { id:'conversations',  label:'Conversations' },
  { id:'pipeline',       label:'Pipeline' },
  { id:'rapports',       label:'Rapports' },
];

// ── Render helpers ─────────────────────────────────────────────────────────────
function _tabBar(active) {
  return `<div class="si-tabs">${TABS.map(t =>
    `<button class="si-tab${t.id===active?' active':''}" data-tab="${t.id}">${_esc(t.label)}</button>`
  ).join('')}</div>`;
}

// ── Views ─────────────────────────────────────────────────────────────────────
function _viewDashboard(el) {
  const totalProspects = PROSPECTS.length;
  const inConv = PROSPECTS.filter(p => ['qualification','objection','negociation','proposition'].includes(p.stage)).length;
  const qualified = PROSPECTS.filter(p => ['negociation','proposition','converti'].includes(p.stage)).length;
  const converted = PROSPECTS.filter(p => p.stage === 'converti').length;
  const timeSaved = 138;
  const pipelineValue = PIPELINE_STAGES.reduce((s,st)=>s+st.value,0);

  const recentActivity = [
    { icon:'🤖', text:'<strong>Agent Léa</strong> a levé l\'objection "Budget Q4" chez DupriTech Manufacturier', time:'Il y a 1h' },
    { icon:'✅', text:'<strong>Pharma Innovations QC</strong> converti — RDV confirmé pour mercredi 10h', time:'Il y a 2h' },
    { icon:'🔍', text:'<strong>Agent Max</strong> a identifié 3 nouveaux prospects dans le secteur éducation', time:'Il y a 4h' },
    { icon:'💬', text:'<strong>Agent Théo</strong> a répondu à l\'objection LPRPDE de Groupe Santé Montréal', time:'Il y a 5h' },
    { icon:'📊', text:'Score de correspondance recalculé — Groupe Scolaire Estrie passe à 91%', time:'Il y a 6h' },
    { icon:'🎯', text:'<strong>Agent Sofia</strong> a ouvert 2 nouvelles conversations dans le secteur pharma', time:'Il y a 1j' },
  ];

  el.innerHTML = `
<div class="si-body">
  <div class="si-kpis">
    <div class="si-kpi si-kpi-accent">
      <div class="si-kpi-label">Prospects identifiés</div>
      <div class="si-kpi-value">${totalProspects}</div>
      <div class="si-kpi-sub">Par agents IA ce mois</div>
    </div>
    <div class="si-kpi si-kpi-orange">
      <div class="si-kpi-label">En conversation</div>
      <div class="si-kpi-value">${inConv}</div>
      <div class="si-kpi-sub">Agents actifs 24/7</div>
    </div>
    <div class="si-kpi si-kpi-purple">
      <div class="si-kpi-label">Qualifiés</div>
      <div class="si-kpi-value">${qualified}</div>
      <div class="si-kpi-sub">Taux : ${Math.round(qualified/totalProspects*100)}%</div>
    </div>
    <div class="si-kpi si-kpi-green">
      <div class="si-kpi-label">Convertis</div>
      <div class="si-kpi-value">${converted}</div>
      <div class="si-kpi-sub">Taux de clôture : ${Math.round(converted/totalProspects*100)}%</div>
    </div>
    <div class="si-kpi">
      <div class="si-kpi-label">Heures économisées</div>
      <div class="si-kpi-value">${timeSaved}h</div>
      <div class="si-kpi-sub">vs prospection manuelle</div>
    </div>
    <div class="si-kpi">
      <div class="si-kpi-label">Valeur pipeline</div>
      <div class="si-kpi-value">${(pipelineValue/1000).toFixed(0)}k$</div>
      <div class="si-kpi-sub">Opportunités actives</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
    <div>
      <div class="si-sh"><span class="si-sh-title">Prospects chauds — À traiter en priorité</span></div>
      <div class="si-tbl-wrap">
        <table class="si-tbl">
          <thead><tr>
            <th>Entreprise</th><th>Correspondance IA</th><th>Besoin identifié</th><th>Agent</th><th>Statut</th>
          </tr></thead>
          <tbody>
            ${PROSPECTS.filter(p=>p.score>=80 && p.stage!=='converti').map(p=>`
            <tr data-prospect="${_esc(p.id)}">
              <td><div class="si-company">${_esc(p.company)}</div><div class="si-sub">${_esc(p.contact)} · ${_esc(p.title)}</div></td>
              <td>${_matchBadge(p.score)}</td>
              <td><div class="si-need-pill" title="${_esc(p.need)}">${_esc(p.need)}</div></td>
              <td><span style="font-size:11px;font-weight:600;color:var(--primary,#0078D4)">${_esc(p.agent)}</span></td>
              <td>${_stageBadge(p.stage)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <div class="si-sh"><span class="si-sh-title">Activité récente</span></div>
      <div class="si-feed">
        ${recentActivity.map(a=>`
        <div class="si-feed-item">
          <div class="si-feed-icon">${a.icon}</div>
          <div>
            <div class="si-feed-text">${a.text}</div>
            <div class="si-feed-time">${a.time}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;
}

function _viewProspects(el) {
  el.innerHTML = `
<div class="si-body">
  <div class="si-sh">
    <span class="si-sh-title">${PROSPECTS.length} prospects qualifiés par les agents IA</span>
    <button class="si-btn si-btn-primary si-btn-sm">+ Lancer une recherche IA</button>
  </div>
  <div class="si-toolbar">
    <input class="si-input" placeholder="Rechercher une entreprise ou un contact…" style="flex:1;max-width:300px" id="si-prospect-search">
    <select class="si-select" id="si-prospect-stage">
      <option value="">Tous les stades</option>
      <option value="identification">Identification</option>
      <option value="qualification">Qualification</option>
      <option value="objection">Objection</option>
      <option value="negociation">Négociation</option>
      <option value="converti">Converti</option>
    </select>
    <select class="si-select" id="si-prospect-agent">
      <option value="">Tous les agents</option>
      ${AGENTS.map(a=>`<option value="${_esc(a.name)}">${_esc(a.name)}</option>`).join('')}
    </select>
  </div>
  <div id="si-prospects-table">
    ${_prospectsTable(PROSPECTS)}
  </div>
</div>`;

  el.querySelector('#si-prospect-search').addEventListener('input', _filterProspects.bind(null,el));
  el.querySelector('#si-prospect-stage').addEventListener('change', _filterProspects.bind(null,el));
  el.querySelector('#si-prospect-agent').addEventListener('change', _filterProspects.bind(null,el));
}

function _filterProspects(el) {
  const q = el.querySelector('#si-prospect-search').value.toLowerCase();
  const stage = el.querySelector('#si-prospect-stage').value;
  const agent = el.querySelector('#si-prospect-agent').value;
  let list = PROSPECTS;
  if (q) list = list.filter(p => (p.company+p.contact+p.need).toLowerCase().includes(q));
  if (stage) list = list.filter(p => p.stage === stage);
  if (agent) list = list.filter(p => p.agent === agent);
  el.querySelector('#si-prospects-table').innerHTML = _prospectsTable(list);
}

function _prospectsTable(list) {
  if (!list.length) return `<div class="si-empty"><div class="si-empty-icon">🔍</div><p>Aucun prospect correspondant aux filtres</p></div>`;
  return `<div class="si-tbl-wrap"><table class="si-tbl">
    <thead><tr>
      <th>Entreprise</th><th>Correspondance IA</th><th>Besoin identifié</th>
      <th>Source</th><th>Agent assigné</th><th>Objections</th><th>Statut</th><th>Activité</th>
    </tr></thead>
    <tbody>
      ${list.map(p=>`<tr>
        <td>
          <div class="si-company">${_esc(p.company)}</div>
          <div class="si-sub">${_esc(p.contact)} — ${_esc(p.title)}</div>
        </td>
        <td>${_matchBadge(p.score)}</td>
        <td><div class="si-need-pill" title="${_esc(p.need)}">${_esc(p.need)}</div></td>
        <td><span style="font-size:11px;color:var(--muted,#757575)">${_esc(p.source)}</span></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--primary,#0078D4)">
            <span class="si-avatar si-avatar-sm" style="background:${_esc(AGENTS.find(a=>a.name===p.agent)?.color||'#0078D4')}">${_esc(p.agent[6]||'A')}</span>
            ${_esc(p.agent)}
          </span>
        </td>
        <td>
          ${p.objections.length
            ? p.objections.map(o=>`<span class="si-obj-chip">${_esc(o)}</span> `).join('')
            : '<span class="si-badge si-badge-muted">Aucune</span>'}
        </td>
        <td>${_stageBadge(p.stage)}</td>
        <td><span style="font-size:11px;color:var(--muted,#757575)">${_esc(p.lastActivity)}</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _viewAgents(el) {
  el.innerHTML = `
<div class="si-body">
  <div class="si-sh">
    <span class="si-sh-title">${AGENTS.filter(a=>a.status==='active').length} agents actifs — ${AGENTS.filter(a=>a.status==='paused').length} en pause</span>
    <button class="si-btn si-btn-primary si-btn-sm">+ Créer un agent</button>
  </div>
  <div class="si-agents-grid">
    ${AGENTS.map(a=>`
    <div class="si-agent-card" style="border-top:3px solid ${_esc(a.color)}">
      <div class="si-agent-header">
        <div class="si-avatar" style="background:${_esc(a.color)}">${_esc(a.avatar)}</div>
        <div>
          <div class="si-agent-name">${_esc(a.name)}</div>
          <div class="si-agent-spec">${_esc(a.specialty)}</div>
        </div>
      </div>
      <div style="margin-bottom:10px">${_agentStatus(a.status)}</div>
      <div class="si-agent-desc">${_esc(a.description)}</div>
      <div class="si-agent-stats">
        <div class="si-agent-stat">
          <div class="si-agent-stat-val">${a.conversations}</div>
          <div class="si-agent-stat-lbl">Conversations</div>
        </div>
        <div class="si-agent-stat">
          <div class="si-agent-stat-val">${a.qualified}</div>
          <div class="si-agent-stat-lbl">Qualifiés</div>
        </div>
        <div class="si-agent-stat">
          <div class="si-agent-stat-val">${a.converted}</div>
          <div class="si-agent-stat-lbl">Convertis</div>
        </div>
        <div class="si-agent-stat">
          <div class="si-agent-stat-val">${a.objections_handled}</div>
          <div class="si-agent-stat-lbl">Objections</div>
        </div>
      </div>
      <div class="si-agent-footer">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1">
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted,#757575)">
            <span>Taux de conversion</span><span style="font-weight:700;color:var(--text,#1B1B1B)">${a.success_rate}%</span>
          </div>
          <div class="si-rate-bar"><div class="si-rate-fill" style="width:${a.success_rate}%;background:${_esc(a.color)}"></div></div>
        </div>
        <div style="margin-left:12px">
          <button class="si-btn si-btn-secondary si-btn-sm">Configurer</button>
        </div>
      </div>
      <div style="margin-top:10px;font-size:10.5px;color:var(--muted,#757575)">Temps de réponse moyen : <strong>${_esc(a.avg_response)}</strong></div>
    </div>`).join('')}
  </div>

  <div style="margin-top:24px">
    <div class="si-sh"><span class="si-sh-title">Objections les plus fréquentes traitées par les agents</span></div>
    <div style="background:#fff;border:1px solid var(--border,#E0E0E0);border-radius:8px;padding:18px;max-width:560px">
      <div class="si-bar-chart">
        ${[
          {lbl:'Budget insuffisant', pct:68, color:'#C50F1F'},
          {lbl:'Conformité / Sécurité', pct:52, color:'#CA5010'},
          {lbl:'Délai de déploiement', pct:44, color:'#CA5010'},
          {lbl:'ROI incertain', pct:38, color:'#0078D4'},
          {lbl:'Résistance équipe TI', pct:28, color:'#0078D4'},
          {lbl:'Manque de temps', pct:21, color:'#5C2D91'},
        ].map(b=>`
        <div class="si-bar-row">
          <div class="si-bar-lbl">${_esc(b.lbl)}</div>
          <div class="si-bar-bg"><div class="si-bar-fill" style="width:${b.pct}%;background:${_esc(b.color)}"></div></div>
          <div class="si-bar-val">${b.pct}%</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;
}

function _viewConversations(el, activeId) {
  const first = activeId ? CONVERSATIONS.find(c=>c.id===activeId) : CONVERSATIONS[0];

  el.innerHTML = `
<div class="si-body">
  <div class="si-sh">
    <span class="si-sh-title">Conversations en cours</span>
    <div style="display:flex;gap:6px">
      <span class="si-badge si-badge-ok">${CONVERSATIONS.filter(c=>c.stage!=='converti').length} actives</span>
      <span class="si-badge si-badge-green">${CONVERSATIONS.filter(c=>c.stage==='converti').length} converties</span>
    </div>
  </div>
  <div class="si-conv-grid">
    <div class="si-conv-list" id="si-conv-list">
      ${CONVERSATIONS.map(c=>`
      <div class="si-conv-item${c.id===(first?.id)||''?' active':''}" data-conv="${_esc(c.id)}">
        <div class="si-conv-company">${_esc(c.company)}</div>
        <div class="si-conv-prospect">${_esc(c.prospect)}</div>
        <div class="si-conv-last">${_esc(c.thread[c.thread.length-1]?.text||'')}</div>
        <div class="si-conv-meta">
          ${_stageBadge(c.stage)}
          <span style="font-size:10px;color:var(--muted,#757575)">${_esc(c.lastTime)}</span>
          <span style="font-size:10.5px;font-weight:600;color:var(--primary,#0078D4)">${_esc(c.agent)}</span>
        </div>
      </div>`).join('')}
    </div>
    <div id="si-thread-pane">
      ${first ? _renderThread(first) : '<div class="si-thread-pane"><div class="si-thread-empty">Sélectionnez une conversation</div></div>'}
    </div>
  </div>
</div>`;

  el.querySelector('#si-conv-list').addEventListener('click', e => {
    const item = e.target.closest('[data-conv]');
    if (!item) return;
    const conv = CONVERSATIONS.find(c => c.id === item.dataset.conv);
    if (!conv) return;
    el.querySelectorAll('.si-conv-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    el.querySelector('#si-thread-pane').innerHTML = _renderThread(conv);
  });
}

function _renderThread(conv) {
  const prospect = PROSPECTS.find(p=>p.id===conv.prospectId);
  return `<div class="si-thread-pane">
    <div class="si-thread-header">
      <div class="si-thread-title">${_esc(conv.company)} — ${_esc(conv.prospect)}</div>
      <div class="si-thread-sub">Géré par ${_esc(conv.agent)} · ${conv.thread.length} messages · ${_stageBadge(conv.stage)}</div>
      ${prospect?.objections?.length ? `
      <div class="si-thread-obj">
        <span class="si-thread-obj-label">Objections :</span>
        ${prospect.objections.map(o=>`<span class="si-obj-chip">${_esc(o)}</span>`).join(' ')}
      </div>` : `<div class="si-thread-obj"><span class="si-thread-obj-label">Objections :</span><span class="si-obj-chip-ok si-badge">Aucune objection ouverte ✓</span></div>`}
    </div>
    <div class="si-thread-msgs">
      ${conv.thread.map(m=>`
      <div class="si-msg ${m.role==='ai'?'si-msg-ai':'si-msg-prospect'}">
        <div class="si-msg-role">${m.role==='ai'?_esc(m.author):'Prospect — '+_esc(m.author)}</div>
        ${_esc(m.text)}
        <div class="si-msg-time">${_esc(m.time)}</div>
      </div>`).join('')}
    </div>
    <div class="si-thread-footer">
      <div style="font-size:11px;color:var(--muted,#757575);margin-bottom:8px">L'agent continue la conversation automatiquement. Intervenez si nécessaire :</div>
      <div style="display:flex;gap:8px">
        <input class="si-input" placeholder="Ajouter une instruction à l'agent…" style="flex:1;font-size:12px">
        <button class="si-btn si-btn-primary si-btn-sm">Envoyer</button>
        <button class="si-btn si-btn-secondary si-btn-sm">Prendre le relais</button>
      </div>
    </div>
  </div>`;
}

function _viewPipeline(el) {
  const maxCount = Math.max(...PIPELINE_STAGES.map(s=>s.count));
  const totalValue = PIPELINE_STAGES.reduce((s,st)=>s+st.value,0);
  const COLORS = ['#0078D4','#00BCF2','#0099BC','#107C10','#498205','#217346'];

  el.innerHTML = `
<div class="si-body">
  <div class="si-sh">
    <span class="si-sh-title">Pipeline commercial — Valeur totale : ${(totalValue/1000).toFixed(0)} k$</span>
    <span class="si-badge si-badge-info">${PIPELINE_STAGES.reduce((s,st)=>s+st.count,0)} opportunités actives</span>
  </div>

  <div style="background:#fff;border:1px solid var(--border,#E0E0E0);border-radius:10px;padding:24px;margin-bottom:24px;max-width:760px">
    <div style="display:grid;grid-template-columns:160px 1fr 80px 110px;gap:12px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border,#E0E0E0)">
      <div style="font-size:10.5px;font-weight:700;color:var(--muted,#757575);text-transform:uppercase;letter-spacing:.06em;text-align:right">Étape</div>
      <div style="font-size:10.5px;font-weight:700;color:var(--muted,#757575);text-transform:uppercase;letter-spacing:.06em">Prospects</div>
      <div style="font-size:10.5px;font-weight:700;color:var(--muted,#757575);text-transform:uppercase;letter-spacing:.06em;text-align:center">Nombre</div>
      <div style="font-size:10.5px;font-weight:700;color:var(--muted,#757575);text-transform:uppercase;letter-spacing:.06em;text-align:right">Valeur estimée</div>
    </div>
    <div class="si-funnel">
      ${PIPELINE_STAGES.map((s,i)=>`
      <div class="si-funnel-row">
        <div class="si-funnel-label">${_esc(s.label)}</div>
        <div class="si-funnel-bar-wrap">
          <div class="si-funnel-bar" style="width:${Math.round(s.count/maxCount*100)}%;background:${COLORS[i]||'#0078D4'}">
            ${s.count > 1 ? `${s.count} prospects` : ''}
          </div>
        </div>
        <div class="si-funnel-count">${s.count}</div>
        <div class="si-funnel-value">${(s.value/1000).toFixed(0)} k$</div>
      </div>`).join('')}
    </div>
  </div>

  <div>
    <div class="si-sh"><span class="si-sh-title">Opportunités par agent</span></div>
    <div class="si-tbl-wrap">
      <table class="si-tbl">
        <thead><tr><th>Agent</th><th>Opportunités actives</th><th>En négociation</th><th>Convertis ce mois</th><th>Taux de succès</th></tr></thead>
        <tbody>
          ${AGENTS.map(a=>{
            const active = PROSPECTS.filter(p=>p.agent===a.name && p.stage!=='perdu').length;
            const nego = PROSPECTS.filter(p=>p.agent===a.name && ['negociation','proposition'].includes(p.stage)).length;
            return `<tr>
              <td>
                <span style="display:inline-flex;align-items:center;gap:8px">
                  <span class="si-avatar si-avatar-sm" style="background:${_esc(a.color)}">${_esc(a.avatar)}</span>
                  <span style="font-weight:600">${_esc(a.name)}</span>
                </span>
              </td>
              <td>${active}</td>
              <td>${nego}</td>
              <td>${a.converted}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:80px;height:6px;background:#E0E0E0;border-radius:3px;overflow:hidden">
                    <div style="width:${a.success_rate}%;height:100%;background:${_esc(a.color)};border-radius:3px"></div>
                  </div>
                  <span style="font-size:11px;font-weight:700">${a.success_rate}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>`;
}

function _viewRapports(el) {
  el.innerHTML = `
<div class="si-body">
  <div class="si-sh"><span class="si-sh-title">Performance de la prospection IA — Juillet 2026</span></div>

  <div class="si-report-grid">
    <div class="si-report-card">
      <div class="si-report-card-title">Taux de conversion par agent</div>
      <div class="si-bar-chart">
        ${AGENTS.map(a=>`
        <div class="si-bar-row">
          <div class="si-bar-lbl">${_esc(a.name.replace('Agent ',''))}</div>
          <div class="si-bar-bg"><div class="si-bar-fill" style="width:${a.success_rate}%;background:${_esc(a.color)}"></div></div>
          <div class="si-bar-val">${a.success_rate}%</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="si-report-card">
      <div class="si-report-card-title">Prospects par secteur</div>
      <div class="si-bar-chart">
        ${[
          {lbl:'Manufacture',pct:22,color:'#0078D4'},
          {lbl:'Santé',pct:18,color:'#107C10'},
          {lbl:'Éducation',pct:16,color:'#5C2D91'},
          {lbl:'Services pro.',pct:14,color:'#CA5010'},
          {lbl:'Secteur public',pct:12,color:'#00BCF2'},
          {lbl:'Pharma',pct:10,color:'#217346'},
        ].map(b=>`
        <div class="si-bar-row">
          <div class="si-bar-lbl">${_esc(b.lbl)}</div>
          <div class="si-bar-bg"><div class="si-bar-fill" style="width:${b.pct*4}%;background:${_esc(b.color)}"></div></div>
          <div class="si-bar-val">${b.pct}%</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="si-report-card">
      <div class="si-report-card-title">Sources de prospects</div>
      <div class="si-bar-chart">
        ${[
          {lbl:'LinkedIn IA',pct:45,color:'#0078D4'},
          {lbl:'Web intelligence',pct:30,color:'#5C2D91'},
          {lbl:'Partenariats',pct:15,color:'#107C10'},
          {lbl:'Événements',pct:10,color:'#CA5010'},
        ].map(b=>`
        <div class="si-bar-row">
          <div class="si-bar-lbl">${_esc(b.lbl)}</div>
          <div class="si-bar-bg"><div class="si-bar-fill" style="width:${b.pct*2}%;background:${_esc(b.color)}"></div></div>
          <div class="si-bar-val">${b.pct}%</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="si-report-card">
      <div class="si-report-card-title">Impact ROI — Prospection IA vs manuelle</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
        ${[
          {label:'Temps de prospection',before:'8h/prospect',after:'0.3h/prospect',gain:'96%'},
          {label:'Coût par prospect qualifié',before:'180$',after:'12$',gain:'93%'},
          {label:'Taux de réponse',before:'4%',after:'27%',gain:'+575%'},
          {label:'Cycle de vente',before:'62 jours',after:'28 jours',gain:'55%'},
        ].map(r=>`
        <div style="border-bottom:1px solid var(--border,#E0E0E0);padding-bottom:10px">
          <div style="font-size:11px;font-weight:600;color:var(--text,#1B1B1B);margin-bottom:6px">${_esc(r.label)}</div>
          <div style="display:flex;justify-content:space-between;font-size:11px">
            <span style="color:var(--muted,#757575)">Avant : <strong>${_esc(r.before)}</strong></span>
            <span style="color:var(--muted,#757575)">Après : <strong style="color:#107C10">${_esc(r.after)}</strong></span>
            <span class="si-badge si-badge-ok">↓ ${_esc(r.gain)}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div style="max-width:500px">
    <div class="si-sh"><span class="si-sh-title">Chronologie des conversions</span></div>
    <div style="background:#fff;border:1px solid var(--border,#E0E0E0);border-radius:8px;padding:20px">
      <div class="si-timeline">
        ${[
          {date:'1 Juillet',text:'Pharma Innovations QC — Contrat signé, déploiement semaine 3'},
          {date:'28 Juin',text:'Coopérative AgriNord — Proposition envoyée, décision attendue 5 juillet'},
          {date:'24 Juin',text:'Cabinet Lavallée & Associés — Entrée en négociation suite à démo IA'},
          {date:'20 Juin',text:'DupriTech Manufacturier — Phase pilote acceptée malgré budget Q4'},
          {date:'15 Juin',text:'Lancement Agent Léa — Première campagne de prospection formation IA'},
        ].map(t=>`
        <div class="si-tl-item">
          <div class="si-tl-dot"></div>
          <div class="si-tl-date">${_esc(t.date)}</div>
          <div class="si-tl-text">${_esc(t.text)}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;
}

// ── Module export ─────────────────────────────────────────────────────────────
let _activeTab = 'dashboard';

export default {
  mount(container, ctx) {
    _activeTab = 'dashboard';

    if (!document.getElementById(_CSS_ID)) {
      const s = document.createElement('style');
      s.id = _CSS_ID;
      s.textContent = _CSS;
      document.head.appendChild(s);
    }

    const wrap = document.createElement('div');
    wrap.className = 'si-wrap';
    container.appendChild(wrap);

    const _render = (tab) => {
      _activeTab = tab;
      wrap.innerHTML = _tabBar(tab);
      const body = document.createElement('div');
      body.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden';
      wrap.appendChild(body);

      if (tab === 'dashboard')     _viewDashboard(body);
      else if (tab === 'prospects') _viewProspects(body);
      else if (tab === 'agents')    _viewAgents(body);
      else if (tab === 'conversations') _viewConversations(body);
      else if (tab === 'pipeline')  _viewPipeline(body);
      else if (tab === 'rapports')  _viewRapports(body);

      wrap.querySelectorAll('.si-tab').forEach(btn => {
        btn.addEventListener('click', () => _render(btn.dataset.tab));
      });
    };

    _render(_activeTab);
  },

  unmount(container) {
    container.innerHTML = '';
  }
};

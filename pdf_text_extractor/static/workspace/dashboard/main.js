/**
 * Dashboard — module principal AgentHub Platform
 * Charts interactifs : ligne IMAI + donut dimensions
 */

const CSS = `
<style>
.db-root {
  padding: 24px 32px 48px;
  max-width: 1200px;
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
}

/* ── Demo notice ────────────────────────────────────────────────── */
.db-demo-notice {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-info-soft); border: 1px solid var(--color-info-border);
  border-radius: var(--r); padding: 10px 14px;
  font-size: 12px; color: var(--color-info-on); margin-bottom: 22px;
}

/* ── Header ─────────────────────────────────────────────────────── */
.db-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 22px; flex-wrap: wrap;
}
.db-greeting { font-size: 22px; font-weight: 600; color: var(--text); margin-bottom: 3px; letter-spacing: -.02em; }
.db-sub      { font-size: 13px; color: var(--text-sub); }

/* ── Hero card ──────────────────────────────────────────────────── */
.db-welcome {
  background: linear-gradient(135deg, #003D82 0%, #0063B1 45%, #0078D4 100%);
  border-radius: var(--r-lg); padding: 24px 28px; color: #fff;
  margin-bottom: 20px; display: flex; align-items: center; gap: 24px;
  position: relative; overflow: hidden; box-shadow: 0 4px 16px rgba(0,120,212,.22);
}
.db-welcome::before {
  content: ''; position: absolute; top: -60px; right: -40px;
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(255,255,255,.10) 0%, transparent 65%);
  pointer-events: none;
}
.db-welcome::after {
  content: ''; position: absolute; bottom: -40px; left: 40%;
  width: 160px; height: 160px;
  background: radial-gradient(circle, rgba(24,144,232,.25) 0%, transparent 65%);
  pointer-events: none;
}
.db-welcome-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 32px 32px;
}
.db-welcome-body { flex: 1; position: relative; z-index: 1; }
.db-welcome-body h3 { font-size: 14px; font-weight: 700; margin-bottom: 10px; opacity: .96; }
.db-welcome-track { height: 4px; background: rgba(255,255,255,.22); border-radius: 2px; margin-bottom: 7px; overflow: hidden; }
.db-welcome-fill  { height: 100%; background: rgba(255,255,255,.85); border-radius: 2px; }
.db-welcome-hint  { font-size: 11px; opacity: .65; }
.db-welcome-cta {
  background: rgba(255,255,255,.18); color: #fff;
  border: 1.5px solid rgba(255,255,255,.35); border-radius: var(--r);
  padding: 9px 18px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: background .15s; position: relative; font-family: var(--font);
}
.db-welcome-cta:hover { background: rgba(255,255,255,.28); }

/* ── KPI grid ───────────────────────────────────────────────────── */
.db-kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 20px;
}
.db-kpi {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 18px 20px;
  display: flex; flex-direction: column;
  transition: box-shadow var(--transition), transform var(--transition);
  cursor: default; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;
}
.db-kpi::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at var(--rx,-100%) var(--ry,-100%), rgba(0,120,212,.06) 0%, transparent 50%);
  opacity: 0; transition: opacity .25s; pointer-events: none;
}
.db-kpi:hover::before { opacity: 1; }
.db-kpi:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
.db-kpi-hd { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.db-kpi-label { font-size: 12px; font-weight: 600; color: var(--text-sub); }
.db-kpi-icon  { width: 30px; height: 30px; border-radius: var(--r); display: flex; align-items: center; justify-content: center; font-size: 14px; }
.db-kpi-val   { font-size: 28px; font-weight: 700; letter-spacing: -.02em; color: var(--text); line-height: 1; margin-bottom: 6px; }
.db-kpi-delta { font-size: 11px; font-weight: 500; color: var(--muted); }
.db-kpi-delta.up { color: var(--color-ok-text); }
.db-kpi-bar   { height: 4px; background: var(--bg-2); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.db-kpi-bar-fill { height: 100%; border-radius: 2px; }

/* ── Main grid ──────────────────────────────────────────────────── */
.db-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; margin-bottom: 16px; }
.db-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
.db-card-hd {
  padding: 14px 20px; border-bottom: 1px solid var(--border-2);
  display: flex; align-items: center; justify-content: space-between;
}
.db-card-title { font-size: 13px; font-weight: 700; color: var(--text); }

/* ── Activity ───────────────────────────────────────────────────── */
.db-activity-list { display: flex; flex-direction: column; }
.db-activity-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 13px 20px; border-bottom: 1px solid var(--border-2);
  transition: background .1s; cursor: default;
}
.db-activity-item:last-child { border-bottom: none; }
.db-activity-item:hover { background: var(--bg); }
.db-activity-dot { width: 32px; height: 32px; border-radius: var(--r); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.db-activity-body { flex: 1; min-width: 0; }
.db-activity-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.db-activity-meta  { font-size: 12px; color: var(--muted); line-height: 1.4; }
.db-activity-time  { font-size: 11px; color: var(--muted); flex-shrink: 0; white-space: nowrap; margin-top: 2px; }

/* ── Quick actions ──────────────────────────────────────────────── */
.db-actions-list { display: flex; flex-direction: column; padding: 6px 8px; gap: 2px; }
.db-action-btn {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: none; background: none; border-radius: var(--r); cursor: pointer;
  transition: background .1s; text-align: left; width: 100%; font-family: var(--font); text-decoration: none;
}
.db-action-btn:hover { background: var(--bg); }
.db-action-icon   { width: 30px; height: 30px; border-radius: var(--r); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.db-action-body   { flex: 1; }
.db-action-body strong { display: block; font-size: 13px; font-weight: 600; color: var(--text); }
.db-action-body span   { font-size: 11px; color: var(--muted); }
.db-action-chevron { color: var(--muted); flex-shrink: 0; font-size: 16px; font-weight: 300; opacity: 0; transition: opacity .1s; line-height: 1; }
.db-action-btn:hover .db-action-chevron { opacity: 1; }

/* ── Date button ────────────────────────────────────────────────── */
.db-date-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px;
  border: 1px solid var(--border); border-radius: var(--r); background: var(--card);
  font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer;
  white-space: nowrap; flex-shrink: 0; transition: border-color .15s, background .15s; font-family: var(--font);
}
.db-date-btn:hover { border-color: var(--primary); background: var(--bg); color: var(--text); }

/* ══ IMAI Charts section ═══════════════════════════════════════════ */
.db-charts-wrap { margin-bottom: 16px; }

/* Line chart card */
.db-chart-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-lg); overflow: hidden; margin-bottom: 14px;
}
.db-chart-body  { padding: 4px 8px 12px; position: relative; }
.db-chart-period { display: flex; gap: 6px; }
.db-chart-period button {
  padding: 3px 10px; border-radius: var(--r-pill); border: 1px solid var(--border);
  background: none; font-size: 11.5px; font-weight: 500; color: var(--muted);
  cursor: pointer; transition: all .12s; font-family: var(--font);
}
.db-chart-period button.active { background: var(--primary); color: #fff; border-color: var(--primary); }

/* Tooltip flottant */
.db-chart-tooltip {
  position: absolute; background: var(--text); color: #fff;
  font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: var(--r);
  pointer-events: none; white-space: nowrap; display: none; z-index: 10;
  transform: translate(-50%, -120%);
}
.db-chart-tooltip::after {
  content: ''; position: absolute; left: 50%; transform: translateX(-50%);
  top: 100%; border: 5px solid transparent; border-top-color: var(--text);
}

/* Bottom charts row: donut + dimension detail */
.db-charts-bottom {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}

/* Donut */
.db-donut-body {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px;
}
.db-donut-legend { flex: 1; }
.db-dim-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 6px; border-radius: var(--r-sm); cursor: pointer;
  transition: background .1s;
}
.db-dim-row:hover    { background: var(--bg); }
.db-dim-row.selected { background: var(--primary-lt); }
.db-dim-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.db-dim-name { font-size: 11.5px; font-weight: 500; color: var(--text-2); width: 84px; flex-shrink: 0; }
.db-dim-bar-wrap { flex: 1; height: 5px; background: var(--bg-2); border-radius: 3px; overflow: hidden; }
.db-dim-bar-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
.db-dim-score { font-size: 11px; font-weight: 700; color: var(--text); width: 26px; text-align: right; flex-shrink: 0; }

/* Dimension detail panel */
.db-dim-detail { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; min-height: 140px; }
.db-dim-detail-hd { display: flex; align-items: baseline; gap: 10px; }
.db-dim-detail-score { font-size: 34px; font-weight: 800; letter-spacing: -.03em; line-height: 1; }
.db-dim-detail-sub   { font-size: 12px; color: var(--muted); }
.db-dim-detail-name  { font-size: 13px; font-weight: 700; color: var(--text); }
.db-dim-detail-bar   { height: 6px; background: var(--bg-2); border-radius: 3px; overflow: hidden; }
.db-dim-detail-fill  { height: 100%; border-radius: 3px; transition: width .5s ease; }
.db-dim-detail-text  { font-size: 12px; color: var(--text-sub); line-height: 1.6; }
.db-obs-link {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
  padding: 8px 12px; background: var(--primary-lt); border-radius: var(--r);
  border: none; cursor: pointer; font-family: var(--font);
  font-size: 12px; font-weight: 600; color: var(--primary);
  transition: background .12s; text-decoration: none; width: 100%;
}
.db-obs-link:hover { background: var(--primary-a20); }

/* ── ATLAS recs ─────────────────────────────────────────────────── */
.db-atlas-wrap {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 5%, var(--card)), var(--card));
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: var(--r-lg); overflow: hidden;
}
.db-atlas-hd { padding: 14px 20px; border-bottom: 1px solid color-mix(in srgb, var(--primary) 10%, transparent); display: flex; align-items: center; gap: 10px; }
.db-atlas-badge { display: inline-flex; align-items: center; gap: 5px; background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: var(--r-pill); letter-spacing: .03em; }
.db-atlas-title { font-size: 13px; font-weight: 700; color: var(--text); }
.db-rec-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
.db-rec {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 13px 16px; background: var(--card); border-radius: var(--r);
  border: 1px solid var(--border-2); transition: box-shadow .12s;
}
.db-rec:hover { box-shadow: var(--shadow-sm); }
.db-rec-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary); color: #fff; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
}
.db-rec strong { display: block; font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.db-rec p      { font-size: 12px; color: var(--text-sub); line-height: 1.5; margin: 0; }

/* ── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .db-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .db-grid { grid-template-columns: 1fr; }
  .db-root { padding: 16px 16px 40px; }
  .db-welcome { flex-direction: column; align-items: flex-start; }
  .db-welcome-cta { width: 100%; text-align: center; }
  .db-charts-bottom { grid-template-columns: 1fr; }
}
</style>`;

/* ══ Données ══════════════════════════════════════════════════════ */
const IMAI_PERIODS = {
  '6m': {
    data:   [28, 35, 42, 48, 50, 44],
    labels: { fr: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin'], en: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.'] },
    // [strategie, personnes, processus, technologies, gouvernance] par mois
    dims: [
      [22, 30, 26, 35, 28],
      [28, 36, 32, 42, 33],
      [35, 42, 38, 48, 40],
      [40, 48, 44, 52, 44],
      [42, 50, 47, 55, 48],
      [38, 45, 42, 52, 40],
    ],
  },
  '12m': {
    data:   [25, 50, 28, 35, 42, 48, 50, 44],
    labels: { fr: ['Nov.', 'Déc.', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin'], en: ['Nov.', 'Dec.', 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.'] },
    dims: [
      [18, 30, 22, 32, 22],
      [45, 55, 48, 58, 48],
      [22, 30, 26, 35, 28],
      [28, 36, 32, 42, 33],
      [35, 42, 38, 48, 40],
      [40, 48, 44, 52, 44],
      [42, 50, 47, 55, 48],
      [38, 45, 42, 52, 40],
    ],
  },
};

const DIM_DEFS = [
  { key: 'strategie',    i18nKey: 'db.dim.strategie',    color: '#0078D4' },
  { key: 'personnes',    i18nKey: 'db.dim.personnes',    color: '#00B7C3' },
  { key: 'processus',    i18nKey: 'db.dim.processus',    color: '#498205' },
  { key: 'technologies', i18nKey: 'db.dim.technologies', color: '#7719AA' },
  { key: 'gouvernance',  i18nKey: 'db.dim.gouvernance',  color: '#CA5010' },
];

const _demoRecs = () => [
  { dim: NH_I18N.t('db.dim.strategie'),   text: NH_I18N.t('db.rec.strategie.text') },
  { dim: NH_I18N.t('db.dim.personnes'),   text: NH_I18N.t('db.rec.personnes.text') },
  { dim: NH_I18N.t('db.dim.gouvernance'), text: NH_I18N.t('db.rec.gouvernance.text') },
];

/* ══ État global des graphiques ═══════════════════════════════════ */
let _cs = { period: '6m', monthIdx: null, dimIdx: -1 };
let _el = null;
let _ctx = null;

const _locale  = () => NH_I18N.lang === 'en' ? 'en-CA' : 'fr-CA';
const _labels  = (period) => { const pd = IMAI_PERIODS[period]; return pd.labels[NH_I18N.lang] || pd.labels.fr; };

/* ══ Construction du graphique en courbes ════════════════════════ */
function _lineChartSVG(data, labels, selMonthIdx, selDimIdx) {
  const W = 560, H = 160, P = { t: 26, r: 18, b: 30, l: 38 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const n = data.length;

  const pts = data.map((v, i) => ({
    x: P.l + (i / (n - 1)) * cW,
    y: P.t + (1 - v / 100) * cH,
    v,
  }));

  // Bezier path
  let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    path += ` C ${cx.toFixed(2)} ${pts[i-1].y.toFixed(2)} ${cx.toFixed(2)} ${pts[i].y.toFixed(2)} ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  const area = `${path} L ${pts[n-1].x.toFixed(2)} ${(P.t+cH).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(P.t+cH).toFixed(2)} Z`;

  // Grid lines
  const grid = [0, 25, 50, 75, 100].map(v => {
    const y = (P.t + (1 - v/100) * cH).toFixed(2);
    return `<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="var(--border)" stroke-width="${v===50?1.5:1}" stroke-dasharray="${v===50?'':4}"/>
            <text x="${P.l-6}" y="${+y+3.5}" text-anchor="end" font-size="9" fill="var(--muted)">${v}</text>`;
  }).join('');

  // Circles
  const circles = pts.map((pt, i) => {
    const isSel   = i === selMonthIdx;
    const isLast  = i === n - 1 && selMonthIdx === null;
    const rr      = isSel ? 7 : isLast ? 5.5 : 3.5;
    const fill    = isSel ? 'var(--primary)' : 'var(--card)';
    const stroke  = isSel ? '#003570'       : 'var(--primary)';
    const sw      = isSel ? 2.5 : 2;
    const showVal = isSel || isLast;
    return `<circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${rr}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" data-idx="${i}"/>
            ${showVal ? `<text x="${pt.x.toFixed(2)}" y="${(pt.y - rr - 4).toFixed(2)}" text-anchor="middle" font-size="${isSel?12:10}" font-weight="${isSel?800:600}" fill="${isSel?'var(--primary)':'var(--text-sub)'}">${pt.v}</text>` : ''}`;
  }).join('');

  // X labels
  const xLabels = labels.map((lbl, i) => {
    const x = (P.l + (i / (n-1)) * cW).toFixed(2);
    const isSel = i === selMonthIdx;
    return `<text x="${x}" y="${H-4}" text-anchor="middle" font-size="9.5" fill="${isSel ? 'var(--primary)' : 'var(--muted)'}" font-weight="${isSel ? 700 : 400}">${lbl}</text>`;
  }).join('');

  // Invisible overlay rects for hover/click (one per month)
  const segW = cW / (n - 1);
  const overlays = pts.map((pt, i) => {
    const x = Math.max(P.l, pt.x - segW * 0.5);
    return `<rect x="${x.toFixed(2)}" y="${P.t}" width="${Math.min(segW, W-P.r-x).toFixed(2)}" height="${cH}" fill="transparent" style="cursor:pointer" data-idx="${i}" data-v="${pt.v}" data-lbl="${labels[i]}"/>`;
  }).join('');

  return `<svg id="db-imai-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block">
    <defs>
      <linearGradient id="dbg-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="var(--primary)" stop-opacity=".14"/>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#dbg-area)"/>
    <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${overlays}
    ${circles}
    ${xLabels}
  </svg>`;
}

/* ══ Construction du donut ═══════════════════════════════════════ */
function _donutSVG(dimScores, selDimIdx) {
  const total = dimScores.reduce((s, v) => s + v, 0);
  const CX = 80, CY = 80, R = 66, r = 46;
  let ang = -Math.PI / 2;

  const arcs = dimScores.map((score, i) => {
    const sweep = (score / total) * 2 * Math.PI;
    const x1  = (CX + R * Math.cos(ang)).toFixed(3);
    const y1  = (CY + R * Math.sin(ang)).toFixed(3);
    ang += sweep;
    const x2  = (CX + R * Math.cos(ang)).toFixed(3);
    const y2  = (CY + R * Math.sin(ang)).toFixed(3);
    const ix1 = (CX + r * Math.cos(ang - sweep)).toFixed(3);
    const iy1 = (CY + r * Math.sin(ang - sweep)).toFixed(3);
    const ix2 = (CX + r * Math.cos(ang)).toFixed(3);
    const iy2 = (CY + r * Math.sin(ang)).toFixed(3);
    const lg  = sweep > Math.PI ? 1 : 0;
    const d   = `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${lg} 0 ${ix1} ${iy1} Z`;
    const dim = DIM_DEFS[i];
    const op  = selDimIdx === -1 || selDimIdx === i ? 1 : 0.3;
    const sc  = selDimIdx === i ? 1.04 : 1;
    return `<path d="${d}" fill="${dim.color}" opacity="${op}" stroke="var(--card)" stroke-width="2" style="cursor:pointer;transition:opacity .2s,transform .15s;transform-origin:${CX}px ${CY}px;transform:scale(${sc})" data-dim="${i}"/>`;
  }).join('');

  const overall = Math.round(dimScores.reduce((s,v)=>s+v,0)/dimScores.length);
  const hasSel  = selDimIdx >= 0;
  const cLabel  = hasSel ? NH_I18N.t(DIM_DEFS[selDimIdx].i18nKey) : NH_I18N.t('db.donut.center');
  const cVal    = hasSel ? dimScores[selDimIdx]         : overall;
  const cColor  = hasSel ? DIM_DEFS[selDimIdx].color   : 'var(--primary)';

  return `<svg id="db-donut-svg" viewBox="0 0 160 160" style="width:156px;height:156px;flex-shrink:0;cursor:default">
    ${arcs}
    <text x="${CX}" y="${CY-7}"  text-anchor="middle" font-size="9"  fill="var(--muted)">${cLabel}</text>
    <text x="${CX}" y="${CY+10}" text-anchor="middle" font-size="20" font-weight="800" fill="${cColor}">${cVal}</text>
    <text x="${CX}" y="${CY+23}" text-anchor="middle" font-size="8"  fill="var(--muted)">/100</text>
  </svg>`;
}

function _donutLegend(dimScores, selDimIdx) {
  return DIM_DEFS.map((dim, i) => `
    <div class="db-dim-row${i === selDimIdx ? ' selected' : ''}" data-dim="${i}">
      <span class="db-dim-dot" style="background:${dim.color}"></span>
      <span class="db-dim-name">${NH_I18N.t(dim.i18nKey)}</span>
      <div class="db-dim-bar-wrap"><div class="db-dim-bar-fill" style="width:${dimScores[i]}%;background:${dim.color}"></div></div>
      <span class="db-dim-score">${dimScores[i]}</span>
    </div>`).join('');
}

function _dimDetail(dimScores, selDimIdx) {
  const t = NH_I18N.t.bind(NH_I18N);
  if (selDimIdx < 0) {
    const overall = Math.round(dimScores.reduce((s,v)=>s+v,0)/dimScores.length);
    return `<div class="db-dim-detail-hd">
      <span class="db-dim-detail-score" style="color:var(--primary)">${overall}</span>
      <span class="db-dim-detail-sub">${t('db.chart.score.global')}</span>
    </div>
    <div class="db-dim-detail-bar"><div class="db-dim-detail-fill" style="width:${overall}%;background:var(--primary)"></div></div>
    <div class="db-dim-detail-text">${t('db.chart.click.hint')}</div>
    <button class="db-obs-link" data-action="observatoire">${t('db.chart.obs.full')}</button>`;
  }
  const dim = DIM_DEFS[selDimIdx];
  const sc  = dimScores[selDimIdx];
  const lvl = sc < 30 ? t('db.level.debutant') : sc < 55 ? t('db.level.intermediaire') : t('db.level.avance');
  return `<div class="db-dim-detail-name">${t(dim.i18nKey)}</div>
  <div class="db-dim-detail-hd">
    <span class="db-dim-detail-score" style="color:${dim.color}">${sc}</span>
    <span class="db-dim-detail-sub">/100 · ${lvl}</span>
  </div>
  <div class="db-dim-detail-bar"><div class="db-dim-detail-fill" style="width:${sc}%;background:${dim.color}"></div></div>
  <div class="db-dim-detail-text">${t(dim.i18nKey + '.text')}</div>
  <button class="db-obs-link" data-action="observatoire">${t('db.chart.obs.go')}</button>`;
}

/* ══ KPI card ════════════════════════════════════════════════════ */
function _kpiCard({ label, value, icon, iconBg, delta, bar, barColor }) {
  return `<div class="db-kpi">
    <div class="db-kpi-hd">
      <span class="db-kpi-label">${label}</span>
      <span class="db-kpi-icon" style="background:${iconBg}">${icon}</span>
    </div>
    <div class="db-kpi-val">${value}</div>
    ${bar !== undefined ? `<div class="db-kpi-bar"><div class="db-kpi-bar-fill" style="width:${bar}%;background:${barColor||'var(--primary)'}"></div></div>` : ''}
    <div class="db-kpi-delta${delta.startsWith('↗') ? ' up' : ''}">${delta}</div>
  </div>`;
}

/* ══ Rendu principal ═════════════════════════════════════════════ */
function _render(container, ctx) {
  const t           = NH_I18N.t.bind(NH_I18N);
  const locale      = _locale();
  const partnerName = ctx?.partner?.name || 'AgentHub';
  const partnerSlug = ctx?.partnerSlug  || 'demo';
  const today    = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);
  const firstName = ctx?.userProfile?.full_name?.split(' ')[0] || ctx?.userProfile?.email?.split('@')[0] || null;

  // Diagnostic localStorage
  let diag = null;
  try { const _uid = ctx?.userProfile?.id || ctx?.user?.user_id || 'anon'; const raw = localStorage.getItem(`nh_last_diag_${partnerSlug}_${_uid}`); if (raw) diag = JSON.parse(raw); } catch {}
  const hasDiag = !!diag;

  const SCORE_COLOR = { debutant: 'var(--color-err)', intermediaire: 'var(--color-warn)', avance: 'var(--color-ok)' };
  const diagScore   = hasDiag ? diag.score        : 44;
  const diagNiveau  = hasDiag ? diag.niveau        : 'intermediaire';
  const diagLabel   = t(`db.level.${diagNiveau}`) || diagNiveau;
  const scoreColor  = SCORE_COLOR[diagNiveau] || 'var(--color-warn)';
  const dateLabel   = hasDiag ? new Date(diag.date).toLocaleDateString(locale, { month: 'long', day: 'numeric' }) : null;

  const activityItems = hasDiag
    ? [
        { icon: '✅', color: 'var(--color-ok-bg)',   title: `${t('db.activity.diag.done')} · Score ${diagScore}/100`, meta: `${diag.company} · ${t('db.kpi.score.level')} ${diagLabel}`, time: dateLabel },
        { icon: '🤖', color: 'var(--color-info-bg)', title: t('db.activity.atlas.title'), meta: t('db.activity.atlas.recs'), time: t('db.activity.available') },
        { icon: '📄', color: 'var(--color-ok-bg)',   title: t('db.activity.report.title'), meta: t('db.activity.report.meta'), time: t('db.activity.available') },
      ]
    : [
        { icon: '📊', color: 'var(--primary-lt)',    title: t('db.activity.diag.title'), meta: t('db.activity.diag.meta'), time: t('db.activity.now') },
        { icon: '🤖', color: 'var(--color-info-bg)', title: t('db.activity.atlas.title'), meta: t('db.activity.atlas.meta'), time: t('db.activity.available') },
        { icon: '📄', color: 'var(--color-ok-bg)',   title: t('db.activity.report.title'), meta: t('db.activity.report.meta'), time: t('db.activity.available') },
      ];

  const atlasRecs = hasDiag
    ? Object.entries(diag.scores || {})
        .sort(([,a],[,b]) => a - b).slice(0,3)
        .map(([dim]) => ({ dim: t(`db.dim.${dim}`) || dim, text: t(`db.dim.${dim}.text`) || '' }))
    : _demoRecs();

  // Init chart state
  _cs = { period: '6m', monthIdx: null, dimIdx: -1 };
  const pd      = IMAI_PERIODS['6m'];
  const labels  = _labels('6m');
  const curDims = pd.dims[pd.dims.length - 1];
  const latestLabel = labels[labels.length - 1];

  container.innerHTML = CSS + `
<div class="db-root">

  ${!hasDiag ? `<div class="db-demo-notice">ℹ️ <strong>${t('db.demo.notice')}</strong> — ${t('db.demo.notice.sub')}</div>` : ''}

  <div class="db-header">
    <div>
      <div class="db-greeting">${t('db.greeting')}${firstName ? ` ${firstName}` : ''} 👋</div>
      <div class="db-sub">${todayCap} · ${t('db.program')} · ${partnerName}</div>
    </div>
    <button class="db-date-btn" title="${t('db.program')}">
      📅 ${(() => { const d = new Date(); return new Date(d-7*86400000).toLocaleDateString(locale,{day:'numeric',month:'long'}) + ' – ' + d.toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'}); })()}
      <span style="opacity:.5;font-size:11px">▾</span>
    </button>
  </div>

  <div class="db-welcome">
    <div class="db-welcome-grid"></div>
    <div class="db-welcome-body" style="position:relative;z-index:1">
      <h3>Score IMAI <strong style="color:rgba(255,255,255,.95)">${diagScore}/100</strong> · ${diagLabel}</h3>
      <div class="db-welcome-track"><div class="db-welcome-fill" style="width:${diagScore}%"></div></div>
      <div class="db-welcome-hint">${hasDiag ? `${t('db.hero.assessed.prefix')} ${dateLabel} · ${diag.company}` : t('db.hero.empty')}</div>
    </div>
    <button class="db-welcome-cta" data-action="diagnostic">
      ${hasDiag ? t('db.hero.cta.view') : t('db.hero.cta.start')}
    </button>
  </div>

  <div class="db-kpi-grid">
    ${_kpiCard({
      label: t('db.kpi.score'), value: `<span style="color:${scoreColor}">${diagScore}</span><span style="font-size:16px;font-weight:500;color:var(--muted)">/100</span>`,
      icon: '🎯', iconBg: 'var(--primary-lt)', bar: diagScore, barColor: scoreColor,
      delta: `↗ ${t('db.kpi.score.level')} ${diagLabel}` })}
    ${_kpiCard({
      label: t('db.kpi.compliance'), value: '72<span style="font-size:16px;font-weight:500;color:var(--muted)">%</span>',
      icon: '🛡️', iconBg: 'var(--color-info-bg)', bar: 72, barColor: 'var(--color-info)',
      delta: t('db.kpi.compliance.delta') })}
    ${_kpiCard({
      label: t('db.kpi.actions'), value: '7',
      icon: '📋', iconBg: 'var(--color-warn-bg)',
      delta: t('db.kpi.actions.delta') })}
    ${_kpiCard({
      label: t('db.kpi.users'), value: '12',
      icon: '👥', iconBg: 'var(--color-ok-bg)',
      delta: t('db.kpi.users.delta') })}
  </div>

  <div class="db-grid">
    <div class="db-card">
      <div class="db-card-hd"><span class="db-card-title">${t('db.activity.title')}</span></div>
      <div class="db-activity-list">
        ${activityItems.map(a => `
        <div class="db-activity-item">
          <div class="db-activity-dot" style="background:${a.color}">${a.icon}</div>
          <div class="db-activity-body">
            <div class="db-activity-title">${a.title}</div>
            <div class="db-activity-meta">${a.meta}</div>
          </div>
          <span class="db-activity-time">${a.time}</span>
        </div>`).join('')}
      </div>
    </div>
    <div class="db-card">
      <div class="db-card-hd"><span class="db-card-title">${t('db.actions.title')}</span></div>
      <div class="db-actions-list">
        <button class="db-action-btn" data-action="diagnostic">
          <div class="db-action-icon" style="background:var(--primary-lt)">📊</div>
          <div class="db-action-body"><strong>${hasDiag ? t('db.actions.diag.redo') : t('db.actions.diag.start')}</strong><span>${hasDiag ? t('db.actions.diag.sub.redo') : t('db.actions.diag.sub.start')}</span></div>
          <span class="db-action-chevron">›</span>
        </button>
        <button class="db-action-btn" data-action="observatoire">
          <div class="db-action-icon" style="background:var(--color-info-bg)">🔭</div>
          <div class="db-action-body"><strong>${t('db.actions.obs.title')}</strong><span>${t('db.actions.obs.sub')}</span></div>
          <span class="db-action-chevron">›</span>
        </button>
        <a class="db-action-btn" href="/rapport/regional/${partnerSlug}" target="_blank" rel="noopener">
          <div class="db-action-icon" style="background:var(--color-ok-bg)">📄</div>
          <div class="db-action-body"><strong>${t('db.actions.report.title')}</strong><span>${t('db.actions.report.sub')}</span></div>
          <span class="db-action-chevron">›</span>
        </a>
      </div>
    </div>
  </div>

  <!-- ═══ Graphiques IMAI ═══ -->
  <div class="db-charts-wrap">

    <!-- Ligne principale -->
    <div class="db-chart-card">
      <div class="db-card-hd">
        <span class="db-card-title">${t('db.chart.imai.title')}</span>
        <div class="db-chart-period">
          <button class="active" data-period="6m">${t('db.chart.period.6m')}</button>
          <button data-period="12m">${t('db.chart.period.12m')}</button>
        </div>
      </div>
      <div class="db-chart-body" style="position:relative">
        <div id="db-chart-line-wrap">
          ${_lineChartSVG(pd.data, labels, null, -1)}
        </div>
        <div class="db-chart-tooltip" id="db-imai-tooltip"></div>
      </div>
    </div>

    <!-- Donut + Détail dimension -->
    <div class="db-charts-bottom">

      <div class="db-card">
        <div class="db-card-hd">
          <span class="db-card-title">${t('db.chart.donut.title')}</span>
          <span id="db-donut-month-lbl" style="font-size:11px;color:var(--muted)">${latestLabel} 2026</span>
        </div>
        <div class="db-donut-body" id="db-chart-donut-wrap">
          ${_donutSVG(curDims, -1)}
          <div class="db-donut-legend" id="db-donut-legend">${_donutLegend(curDims, -1)}</div>
        </div>
      </div>

      <div class="db-card">
        <div class="db-card-hd">
          <span class="db-card-title" id="db-dim-detail-title">${t('db.chart.detail.title')}</span>
        </div>
        <div class="db-dim-detail" id="db-dim-detail">
          ${_dimDetail(curDims, -1)}
        </div>
      </div>

    </div>
  </div>

  <div class="db-atlas-wrap">
    <div class="db-atlas-hd">
      <span class="db-atlas-badge">✨ ATLAS AI</span>
      <span class="db-atlas-title">${hasDiag ? t('db.atlas.title.real') : t('db.atlas.title.demo')}</span>
      ${!hasDiag ? `<span style="font-size:11px;color:var(--muted);margin-left:auto;font-weight:500">${t('db.atlas.demo.badge')}</span>` : ''}
    </div>
    <div class="db-rec-list">
      ${atlasRecs.map((r, i) => `
      <div class="db-rec">
        <div class="db-rec-num">${i + 1}</div>
        <div><strong>${r.dim}</strong><p>${r.text}</p></div>
      </div>`).join('')}
    </div>
  </div>

</div>`;

  // Actions navigation
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug   = ctx?.partnerSlug || 'demo';
      const target = btn.dataset.action;
      history.pushState({ id: target }, '', `/workspace/${slug}/${target}`);
      window.dispatchEvent(new PopStateEvent('popstate', { state: { id: target } }));
    });
  });

  _initCharts(container, ctx);
}

/* ══ Interactivité graphiques ════════════════════════════════════ */
function _currentDims() {
  const pd = IMAI_PERIODS[_cs.period];
  const idx = _cs.monthIdx !== null ? _cs.monthIdx : pd.dims.length - 1;
  return pd.dims[idx];
}

function _refreshLineChart(container) {
  const pd     = IMAI_PERIODS[_cs.period];
  const labels = _labels(_cs.period);
  const wrap   = container.querySelector('#db-chart-line-wrap');
  if (wrap) wrap.innerHTML = _lineChartSVG(pd.data, labels, _cs.monthIdx, _cs.dimIdx);
  _wireLineChart(container);
}

function _refreshDonut(container) {
  const dims = _currentDims();
  const wrap = container.querySelector('#db-chart-donut-wrap');
  if (wrap) wrap.innerHTML = _donutSVG(dims, _cs.dimIdx) +
    `<div class="db-donut-legend" id="db-donut-legend">${_donutLegend(dims, _cs.dimIdx)}</div>`;
  _wireDonut(container);
}

function _refreshDetail(container) {
  const dims   = _currentDims();
  const detail = container.querySelector('#db-dim-detail');
  const title  = container.querySelector('#db-dim-detail-title');
  if (detail) detail.innerHTML = _dimDetail(dims, _cs.dimIdx);
  if (title)  title.textContent = _cs.dimIdx >= 0 ? NH_I18N.t(DIM_DEFS[_cs.dimIdx].i18nKey) : NH_I18N.t('db.chart.detail.title');
  // Re-wire the observatoire button inside detail
  detail?.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.closest('[data-partner-slug]')?.dataset?.partnerSlug || location.pathname.split('/')[2] || 'demo';
      window.dispatchEvent(new CustomEvent('ws:navigate', { detail: { id: 'observatoire' } }));
    });
  });
}

function _wireLineChart(container) {
  const svg     = container.querySelector('#db-imai-svg');
  const tooltip = container.querySelector('#db-imai-tooltip');
  if (!svg) return;

  svg.querySelectorAll('rect[data-idx]').forEach(rect => {
    rect.addEventListener('mouseenter', e => {
      if (!tooltip) return;
      const svgRect  = svg.getBoundingClientRect();
      const idx      = +rect.dataset.idx;
      const pd       = IMAI_PERIODS[_cs.period];
      const n        = pd.data.length;
      const pct      = idx / (n - 1);
      const chartW   = svg.clientWidth;
      const P_L      = 38, P_R = 18;
      const cx       = P_L + pct * (chartW * (560 - P_L - P_R) / 560);
      tooltip.textContent  = `${_labels(_cs.period)[idx]} · ${pd.data[idx]}/100`;
      tooltip.style.display = 'block';
      tooltip.style.left    = `${P_L + pct * (100 - (P_L+P_R)/560*100)}%`;
      tooltip.style.top     = '8px';
    });
    rect.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.style.display = 'none';
    });
    rect.addEventListener('click', () => {
      const idx  = +rect.dataset.idx;
      const pd   = IMAI_PERIODS[_cs.period];
      _cs.monthIdx = _cs.monthIdx === idx ? null : idx;
      const lbl  = container.querySelector('#db-donut-month-lbl');
      const lbls = _labels(_cs.period);
      if (lbl) lbl.textContent = _cs.monthIdx !== null ? lbls[_cs.monthIdx] + ' 2026' : lbls[lbls.length - 1] + ' 2026';
      _refreshLineChart(container);
      _refreshDonut(container);
      _refreshDetail(container);
    });
  });
}

function _wireDonut(container) {
  container.querySelectorAll('#db-donut-svg path[data-dim], .db-dim-row[data-dim]').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.dim;
      _cs.dimIdx = _cs.dimIdx === i ? -1 : i;
      _refreshDonut(container);
      _refreshDetail(container);
    });
    el.addEventListener('mouseenter', () => {
      const dims    = _currentDims();
      const detail  = container.querySelector('#db-dim-detail');
      const title   = container.querySelector('#db-dim-detail-title');
      const tmpIdx  = +el.dataset.dim;
      if (detail) detail.innerHTML = _dimDetail(dims, tmpIdx);
      if (title)  title.textContent = NH_I18N.t(DIM_DEFS[tmpIdx].i18nKey);
    });
    el.addEventListener('mouseleave', () => {
      _refreshDetail(container);
    });
  });
}

function _initCharts(container, ctx) {
  // Period buttons
  container.querySelectorAll('.db-chart-period button').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.db-chart-period button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _cs.period   = btn.dataset.period;
      _cs.monthIdx = null;
      _cs.dimIdx   = -1;
      _refreshLineChart(container);
      _refreshDonut(container);
      _refreshDetail(container);
    });
  });

  _wireLineChart(container);
  _wireDonut(container);

  // KPI reveal
  container.querySelectorAll('.db-kpi').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--rx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
      card.style.setProperty('--ry', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
    });
  });
}

export default {
  mount(container, ctx)   { _el = container; _ctx = ctx; _render(container, ctx); },
  unmount(container)      { _el = null; _ctx = null; container.innerHTML = ''; },
  refresh(ctx)            { if (_el) { _ctx = ctx || _ctx; _render(_el, _ctx); } },
};

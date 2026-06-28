"""Rapport de maturité IA — page HTML auto-contenue, imprimable en PDF."""
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse

from db import get_db, row, rows
from rate_limiter import limiter
from diagnostic_questions import compute_imai
from auth import CurrentUser, get_current_user
from privacy import K_ANON_MIN

logger = logging.getLogger("rapport")
_GATING_ENFORCED = os.getenv("RAPPORT_GATING_ENFORCED", "false").lower() == "true"

router = APIRouter(prefix="/rapport", tags=["rapport"])

_AGENTHUB_LOGO = "https://lisvylfiqfsrjfvyppqh.supabase.co/storage/v1/object/public/assets/logos/agenthub-platform.png"


def _cobrand_right(partner_name: str, logo_url: str) -> str:
    """Génère le côté droit de la barre cobrand.
    - logo partenaire distinct → [logo partenaire] × [logo AgentHub]
    - pas de logo            → NomPartenaire × [logo AgentHub]
    - logo == AgentHub       → [logo AgentHub] seul (pas de doublon)
    """
    platform = f'<img class="cobrand-logo cobrand-platform-logo" src="{_AGENTHUB_LOGO}" alt="AgentHub Platform">'
    if logo_url == _AGENTHUB_LOGO:
        return platform
    partner_el = (
        f'<img class="cobrand-logo" src="{logo_url}" alt="{partner_name}">'
        if logo_url else
        f'<strong class="cobrand-partner-name">{partner_name}</strong>'
    )
    return f'{partner_el}<span class="cobrand-x">|</span>{platform}'


_MONTHS_FR = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

PLAN_ACTIONS: dict[str, dict[str, str]] = {
    "strategie": {
        "J30":  "Organisez un atelier de 2 h avec votre direction pour cartographier 3 cas d'usage IA à fort potentiel.",
        "J90":  "Rédigez une feuille de route IA 12 mois : cas d'usage prioritaires, budget, responsable, indicateurs de succès.",
        "J180": "Réalisez un premier pilote IA sur le cas retenu. Mesurez le ROI et présentez les résultats à votre direction.",
    },
    "personnes": {
        "J30":  "Identifiez un « champion numérique » dans votre équipe et évaluez les compétences IA actuelles.",
        "J90":  "Inscrivez votre champion à une formation IA et organisez une sensibilisation pour tous les employés.",
        "J180": "Déployez un plan de montée en compétences : objectifs par équipe, budget formation, indicateur d'adoption.",
    },
    "processus": {
        "J30":  "Documentez vos 3 processus les plus répétitifs — c'est le prérequis de toute automatisation.",
        "J90":  "Automatisez un premier processus simple (rapports, relances, saisie) avec un outil accessible.",
        "J180": "Mesurez le temps économisé, identifiez le prochain processus et intégrez l'amélioration continue.",
    },
    "technologies": {
        "J30":  "Faites l'inventaire de vos outils numériques et identifiez les lacunes de centralisation des données.",
        "J90":  "Testez un outil IA accessible (Copilot, ChatGPT Teams) avec 2–3 utilisateurs pilotes.",
        "J180": "Déployez l'outil retenu, formez vos équipes et commencez à centraliser vos données dans un système structuré.",
    },
    "gouvernance": {
        "J30":  "Prenez connaissance de la Loi 25 et vos obligations concernant la protection des renseignements personnels avec l'IA.",
        "J90":  "Rédigez une politique d'utilisation responsable de l'IA (1–2 pages) et désignez un responsable IA.",
        "J180": "Mettez en place un audit annuel de vos outils IA et formalisez votre gouvernance en comité dédié.",
    },
}

DIM_LABELS = {
    "strategie":    "Stratégie",
    "personnes":    "Personnes",
    "processus":    "Processus",
    "technologies": "Technologies",
    "gouvernance":  "Gouvernance",
}

NIVEAU_LABELS = {"debutant": "Débutant", "intermediaire": "Intermédiaire", "avance": "Avancé"}
NIVEAU_COLORS = {"debutant": "#ef4444", "intermediaire": "#f59e0b", "avance": "#10b981"}
NIVEAU_DESC   = {
    "debutant":      "Votre organisation débute son parcours IA. Des gains rapides sont accessibles dès maintenant.",
    "intermediaire": "Vous avez de bonnes bases. Il est temps de structurer et d'accélérer votre démarche.",
    "avance":        "Votre organisation est en avance sur la maturité IA. Continuez à innover et à partager vos apprentissages.",
}


def _check_rapport_access(cur, session_id: str) -> None:
    if not _GATING_ENFORCED:
        return
    cur.execute(
        "SELECT email_send_count FROM diagnostic_sessions WHERE id = %s AND status = 'completed'",
        (session_id,),
    )
    sess = row(cur)
    if not sess or sess["email_send_count"] == 0:
        logger.warning("rapport gated: session=%s no email submitted", session_id)
        raise HTTPException(status_code=403, detail="Veuillez soumettre votre courriel pour accéder au rapport.")


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{session_id}", response_class=HTMLResponse)
@limiter.limit("30/minute")
def get_rapport(request: Request, session_id: str):
    with get_db() as cur:
        _check_rapport_access(cur, session_id)
        cur.execute(
            """
            SELECT s.company_name, s.sector, s.size_range, s.priority_challenge,
                   s.imai_score, s.niveau,
                   s.score_strategie, s.score_personnes, s.score_processus,
                   s.score_technologies, s.score_gouvernance,
                   s.completed_at,
                   p.name AS partner_name, p.primary_color, p.logo_url
            FROM diagnostic_sessions s
            JOIN partners p ON p.id = s.partner_id
            WHERE s.id = %s AND s.status = 'completed'
            LIMIT 1
            """,
            (session_id,),
        )
        sess = row(cur)
        if not sess:
            raise HTTPException(status_code=404, detail="Rapport introuvable.")

        cur.execute(
            "SELECT question_code, answer, score, dimension FROM diagnostic_answers WHERE session_id = %s",
            (session_id,),
        )
        ans_rows = rows(cur)

        cur.execute(
            """
            SELECT imai_avg, imai_p25, imai_p75, sample_size, is_demo
            FROM diagnostic_benchmarks
            WHERE partner_id = (SELECT partner_id FROM diagnostic_sessions WHERE id = %s)
              AND sector IS NULL AND size_range IS NULL
            ORDER BY period_start DESC LIMIT 1
            """,
            (session_id,),
        )
        bench = row(cur)

    result        = compute_imai(ans_rows)
    recommendations = result["recommendations"]

    score      = float(sess["imai_score"] or 0)
    niveau     = sess["niveau"] or "debutant"
    primary    = sess["primary_color"] or "#2563eb"
    partner_nm = sess["partner_name"] or "AgentHub"
    logo_url   = sess.get("logo_url") or ""

    dim_scores = {
        "strategie":    float(sess["score_strategie"]    or 0),
        "personnes":    float(sess["score_personnes"]    or 0),
        "processus":    float(sess["score_processus"]    or 0),
        "technologies": float(sess["score_technologies"] or 0),
        "gouvernance":  float(sess["score_gouvernance"]  or 0),
    }

    sorted_asc   = sorted(dim_scores.items(), key=lambda x: x[1])
    weakest_3    = [k for k, _ in sorted_asc[:3]]
    forces_2     = [k for k, _ in sorted_asc[-2:]]
    faiblesses_2 = [k for k, _ in sorted_asc[:2]]

    date_str = ""
    if sess["completed_at"]:
        try:
            dt = sess["completed_at"]
            if hasattr(dt, "day"):
                date_str = f"{dt.day} {_MONTHS_FR[dt.month]} {dt.year}"
        except Exception:
            date_str = str(sess["completed_at"])[:10]

    return HTMLResponse(content=_build_html(
        company_name=sess["company_name"],
        sector=sess["sector"],
        size_range=sess["size_range"],
        priority_challenge=sess["priority_challenge"],
        date_str=date_str,
        score=score,
        niveau=niveau,
        primary=primary,
        partner_name=partner_nm,
        logo_url=logo_url,
        dim_scores=dim_scores,
        weakest_3=weakest_3,
        forces_2=forces_2,
        faiblesses_2=faiblesses_2,
        recommendations=recommendations,
        bench=bench,
    ))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pct_color(val: float) -> str:
    if val >= 67: return "#10b981"
    if val >= 34: return "#f59e0b"
    return "#ef4444"


def _build_html(
    company_name, sector, size_range, priority_challenge,
    date_str, score, niveau, primary, partner_name, logo_url,
    dim_scores, weakest_3, forces_2, faiblesses_2,
    recommendations, bench,
) -> str:
    nc = NIVEAU_COLORS.get(niveau, "#2563eb")
    nl = NIVEAU_LABELS.get(niveau, niveau)
    nd = NIVEAU_DESC.get(niveau, "")

    # Gauge arc — half circle: cx=100, cy=110, r=90
    # M 10 110 A 90 90 0 0 1 190 110 (clockwise = top half)
    circ = 282.74  # π * 90
    fill = (score / 100) * circ

    # ── Dimension bars (canonical order) ─────────────────────────────────────
    dim_order = list(DIM_LABELS.keys())
    dim_bars = ""
    for dim in dim_order:
        val = dim_scores.get(dim, 0)
        c   = _pct_color(val)
        dim_bars += (
            f'<div class="dim-row">'
            f'<span class="dim-name">{DIM_LABELS[dim]}</span>'
            f'<div class="dim-track"><div class="dim-fill" style="width:{val:.0f}%;background:{c}"></div></div>'
            f'<span class="dim-val" style="color:{c}">{val:.0f}/100</span>'
            f'</div>'
        )

    # ── Forces / Faiblesses ───────────────────────────────────────────────────
    forces_html = ""
    for dim in reversed(forces_2):
        val = dim_scores[dim]
        forces_html += (
            f'<div class="sw-item sw-force">'
            f'<span class="sw-icon">✅</span>'
            f'<div><strong>{DIM_LABELS[dim]}</strong>'
            f'<span class="sw-score"> — {val:.0f}/100</span></div>'
            f'</div>'
        )

    faiblesses_html = ""
    for dim in faiblesses_2:
        val = dim_scores[dim]
        faiblesses_html += (
            f'<div class="sw-item sw-faiblesse">'
            f'<span class="sw-icon">⚠️</span>'
            f'<div><strong>{DIM_LABELS[dim]}</strong>'
            f'<span class="sw-score"> — {val:.0f}/100</span></div>'
            f'</div>'
        )

    # ── Plan d'action 30/90/180j ──────────────────────────────────────────────
    def _plan_col(horizon: str, label: str, color: str) -> str:
        items = ""
        for dim in weakest_3:
            action = PLAN_ACTIONS.get(dim, {}).get(horizon, "")
            if action:
                items += f'<li><strong>{DIM_LABELS[dim]}</strong>{action}</li>'
        return (
            f'<div class="plan-col" style="border-top:4px solid {color}">'
            f'<div class="plan-horizon" style="color:{color}">{label}</div>'
            f'<ul class="plan-list">{items}</ul>'
            f'</div>'
        )

    plan_html = (
        _plan_col("J30",  "30 jours",  "#f59e0b")
        + _plan_col("J90",  "90 jours",  "#3b82f6")
        + _plan_col("J180", "180 jours", "#10b981")
    )

    # ── ATLAS Recommendations ─────────────────────────────────────────────────
    recs_html = ""
    for i, (dim, text) in enumerate(recommendations.items(), 1):
        recs_html += (
            f'<div class="rec-item">'
            f'<div class="rec-num" style="background:{primary}">{i}</div>'
            f'<div><strong>{DIM_LABELS.get(dim, dim)}</strong><p>{text}</p></div>'
            f'</div>'
        )

    # ── Benchmark ─────────────────────────────────────────────────────────────
    bench_html = ""
    if bench:
        avg  = float(bench["imai_avg"] or 0)
        p25  = float(bench["imai_p25"] or 0)
        p75  = float(bench["imai_p75"] or 0)
        n    = bench["sample_size"] or 0
        pos  = "au-dessus" if score >= avg else "en dessous"
        diff = abs(score - avg)
        note = '<span class="demo-badge">DÉMO</span>' if bench["is_demo"] else f'<span class="sample">({n} organisations)</span>'
        bench_html = (
            f'<div class="section">'
            f'<h2 class="section-title">Positionnement sectoriel {note}</h2>'
            f'<div class="bench-row">'
            f'<div class="bench-item"><div class="bench-val">{p25:.1f}</div><div class="bench-label">25e percentile</div></div>'
            f'<div class="bench-item"><div class="bench-val">{avg:.1f}</div><div class="bench-label">Moyenne</div></div>'
            f'<div class="bench-item bench-you" style="border-color:{nc};background:{nc}18">'
            f'<div class="bench-val" style="color:{nc}">{score:.1f}</div><div class="bench-label">Votre score</div></div>'
            f'<div class="bench-item"><div class="bench-val">{p75:.1f}</div><div class="bench-label">75e percentile</div></div>'
            f'</div>'
            f'<p class="bench-note">Votre score est <strong>{pos} de la moyenne</strong> de {diff:.1f} points.</p>'
            f'</div>'
        )

    # ── Company tags ──────────────────────────────────────────────────────────
    tags = [
        f'<span class="co-tag">📦 {sector}</span>',
        f'<span class="co-tag">👥 {size_range} employés</span>',
    ]
    if date_str:
        tags.append(f'<span class="co-tag">📅 {date_str}</span>')
    if priority_challenge:
        tags.append(f'<span class="co-tag">🎯 {priority_challenge}</span>')
    tags_html = "".join(tags)

    # ── CSS (plain string — no f-string, so {{ }} not needed) ────────────────
    css = """
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; background: #f0f4f8; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a { color: inherit; text-decoration: none; }

      .print-bar { background: #1e293b; padding: 14px 24px; text-align: center; }
      .print-bar button { background: #6366f1; color: #fff; border: none; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: .02em; }
      .print-bar button:hover { opacity: .9; }

      .page { max-width: 960px; margin: 24px auto 48px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.12); }

      .cobrand-bar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 10px 48px; display: flex; justify-content: space-between; align-items: center; }
      .cobrand-program { font-size: 12px; font-weight: 600; color: #64748b; letter-spacing: .02em; }
      .cobrand-right { display: flex; align-items: center; gap: 10px; }
      .cobrand-logo { height: 26px; width: auto; object-fit: contain; }
      .cobrand-platform-logo { height: 22px; }
      .cobrand-partner-name { font-size: 13px; font-weight: 700; color: #0f172a; }
      .cobrand-x { font-size: 14px; color: #94a3b8; }

      .rpt-header { padding: 36px 48px 32px; color: #fff; }
      .rpt-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; opacity: .75; margin-bottom: 8px; }
      .rpt-title { font-size: 30px; font-weight: 900; letter-spacing: -.5px; margin-bottom: 4px; }
      .rpt-subtitle { font-size: 14px; opacity: .82; }
      .rpt-powered { font-size: 11px; opacity: .55; margin-top: 20px; }

      .rpt-body { padding: 36px 48px 28px; }

      .co-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px 28px; margin-bottom: 28px; }
      .co-name { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
      .co-tags { display: flex; flex-wrap: wrap; gap: 8px; }
      .co-tag { background: #e9eef5; border-radius: 99px; padding: 4px 14px; font-size: 13px; color: #475569; }

      .score-section { display: flex; align-items: center; gap: 48px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 36px; margin-bottom: 28px; }
      .gauge-wrap { position: relative; flex-shrink: 0; width: 200px; }
      .gauge-svg { width: 200px; height: 120px; }
      .gauge-score-overlay { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap; }
      .gauge-num { font-size: 42px; font-weight: 900; letter-spacing: -2px; line-height: 1; }
      .gauge-denom { font-size: 15px; color: #94a3b8; font-weight: 500; }
      .niv-badge { display: inline-block; padding: 7px 20px; border-radius: 99px; font-size: 16px; font-weight: 800; margin-bottom: 12px; }
      .niv-desc { font-size: 14px; color: #64748b; line-height: 1.65; }

      .section { margin-bottom: 28px; }
      .section-title { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }

      .dim-row { display: flex; align-items: center; gap: 14px; margin-bottom: 11px; }
      .dim-name { font-size: 13px; color: #64748b; min-width: 115px; }
      .dim-track { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
      .dim-fill { height: 100%; border-radius: 5px; }
      .dim-val { font-size: 14px; font-weight: 700; min-width: 48px; text-align: right; }

      .sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .sw-col-label { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .05em; }
      .sw-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 10px; margin-bottom: 8px; }
      .sw-force { background: #f0fdf4; border: 1px solid #bbf7d0; }
      .sw-faiblesse { background: #fef2f2; border: 1px solid #fecaca; }
      .sw-icon { font-size: 20px; flex-shrink: 0; }
      .sw-item strong { font-size: 14px; font-weight: 700; }
      .sw-score { font-size: 13px; color: #64748b; }

      .plan-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
      .plan-col { background: #f8fafc; border-radius: 10px; padding: 20px 18px; }
      .plan-horizon { font-size: 16px; font-weight: 800; margin-bottom: 16px; }
      .plan-list { list-style: none; display: flex; flex-direction: column; gap: 14px; }
      .plan-list li { font-size: 13px; color: #475569; line-height: 1.55; }
      .plan-list li strong { color: #0f172a; display: block; margin-bottom: 3px; font-size: 13px; }

      .bench-row { display: flex; gap: 14px; margin-bottom: 14px; }
      .bench-item { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; text-align: center; }
      .bench-you { border-width: 2px !important; }
      .bench-val { font-size: 26px; font-weight: 800; }
      .bench-label { font-size: 11px; color: #94a3b8; margin-top: 5px; }
      .bench-note { font-size: 13px; color: #64748b; margin-top: 6px; }
      .demo-badge { font-size: 10px; font-weight: 700; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
      .sample { font-size: 12px; color: #94a3b8; margin-left: 6px; }

      .rec-item { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
      .rec-item:last-child { border-bottom: none; }
      .rec-num { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 800; }
      .rec-item strong { font-size: 14px; font-weight: 700; display: block; margin-bottom: 5px; }
      .rec-item p { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0; }

      .atlas-note { display: flex; gap: 14px; align-items: flex-start; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px 20px; margin-top: 20px; }
      .atlas-note .atlas-av { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
      .atlas-note p { font-size: 13px; color: #0369a1; line-height: 1.6; margin: 0; }

      .rpt-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
      .footer-brand { font-size: 13px; color: #64748b; }
      .footer-brand strong { color: #0f172a; }
      .footer-conf { font-size: 12px; color: #94a3b8; }

      @media print {
        body { background: #fff; }
        .print-bar { display: none !important; }
        .page { box-shadow: none; margin: 0; border-radius: 0; max-width: none; }
        .section, .plan-grid, .sw-grid, .bench-row, .score-section { break-inside: avoid; }
        .rpt-body { padding: 24px 36px; }
      }
      @media (max-width: 700px) {
        .rpt-header { padding: 24px 20px; }
        .rpt-body { padding: 20px 16px; }
        .rpt-footer { padding: 16px 20px; }
        .score-section { flex-direction: column; text-align: center; gap: 20px; align-items: center; }
        .plan-grid { grid-template-columns: 1fr; }
        .sw-grid { grid-template-columns: 1fr; }
        .bench-row { flex-wrap: wrap; }
        .dim-name { min-width: 85px; }
      }
    """

    cobrand_right_html = _cobrand_right(partner_name, logo_url)

    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rapport IMAI — {company_name}</title>
  <style>{css}</style>
</head>
<body>

  <div class="print-bar">
    <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  </div>

  <div class="page">

    <!-- Co-branding -->
    <div class="cobrand-bar">
      <span class="cobrand-program">Programme Accélérateur IA PME</span>
      <div class="cobrand-right">
        {cobrand_right_html}
      </div>
    </div>

    <!-- En-tête -->
    <div class="rpt-header" style="background:{primary}">
      <div class="rpt-eyebrow">Programme Accélérateur IA PME · {partner_name}</div>
      <div class="rpt-title">Rapport de maturité IA</div>
      <div class="rpt-subtitle">Indice de Maturité en Intelligence Artificielle (IMAI /100)</div>
      <div class="rpt-powered">Propulsé par AgentHub Platform · © 2026 CivicAI Inc.</div>
    </div>

    <div class="rpt-body">

      <!-- Profil entreprise -->
      <div class="co-card">
        <div class="co-name">{company_name}</div>
        <div class="co-tags">{tags_html}</div>
      </div>

      <!-- Score IMAI -->
      <div class="score-section">
        <div class="gauge-wrap">
          <svg class="gauge-svg" viewBox="0 0 200 120">
            <!-- Fond (gris) -->
            <path d="M 10 110 A 90 90 0 0 1 190 110"
              fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round"/>
            <!-- Remplissage (couleur du niveau) -->
            <path d="M 10 110 A 90 90 0 0 1 190 110"
              fill="none" stroke="{nc}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="{fill:.1f} {circ:.1f}"/>
          </svg>
          <div class="gauge-score-overlay">
            <div class="gauge-num" style="color:{nc}">{score:.0f}</div>
            <div class="gauge-denom">/100</div>
          </div>
        </div>
        <div>
          <div class="niv-badge" style="background:{nc}20;color:{nc}">{nl}</div>
          <p class="niv-desc">{nd}</p>
        </div>
      </div>

      <!-- Résultats par dimension -->
      <div class="section">
        <h2 class="section-title">Résultats par dimension</h2>
        {dim_bars}
      </div>

      {bench_html}

      <!-- Forces & Axes d'amélioration -->
      <div class="section">
        <h2 class="section-title">Forces et axes d'amélioration</h2>
        <div class="sw-grid">
          <div>
            <div class="sw-col-label">✅ Forces</div>
            {forces_html}
          </div>
          <div>
            <div class="sw-col-label">⚠️ Axes d'amélioration</div>
            {faiblesses_html}
          </div>
        </div>
      </div>

      <!-- Plan d'action 30/90/180 jours -->
      <div class="section">
        <h2 class="section-title">Plan d'action recommandé — 3 dimensions prioritaires</h2>
        <div class="plan-grid">
          {plan_html}
        </div>
      </div>

      <!-- Recommandations ATLAS -->
      <div class="section">
        <h2 class="section-title">Recommandations ATLAS</h2>
        {recs_html}
        <div class="atlas-note">
          <span class="atlas-av">🤖</span>
          <p>Ces recommandations sont générées par <strong>ATLAS</strong>, votre conseiller IA, en fonction des résultats spécifiques de {company_name}. Elles constituent un point de départ — votre conseiller {partner_name} peut vous accompagner dans leur mise en œuvre.</p>
        </div>
      </div>

    </div>

    <!-- Pied de page -->
    <div class="rpt-footer">
      <div class="footer-brand"><strong>AgentHub Platform</strong> · Powered by <strong>CivicAI Inc.</strong></div>
      <div class="footer-conf">Rapport confidentiel{f" · Généré le {date_str}" if date_str else ""} · Pour usage interne uniquement</div>
    </div>

  </div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════════════════
# Rapport régional — GET /rapport/regional/{partner_slug}
# ═══════════════════════════════════════════════════════════════════════════════

_DEMO_REGIONAL = {
    "total": 42,
    "imai_avg": 58.3,
    "niveaux": {"debutant": 10, "intermediaire": 24, "avance": 8},
    "dimensions": {
        "strategie": 61.2, "personnes": 54.8, "processus": 58.3,
        "technologies": 62.7, "gouvernance": 49.1,
    },
    "by_sector": [
        {"sector": "Industriel manufacturier",                 "count": 9, "imai_avg": 62.1},
        {"sector": "Professionnels",                           "count": 7, "imai_avg": 66.4},
        {"sector": "Commercial",                               "count": 6, "imai_avg": 59.5},
        {"sector": "Construction",                             "count": 6, "imai_avg": 48.7},
        {"sector": "Alimentation, hôtellerie et restauration", "count": 5, "imai_avg": 47.6},
        {"sector": "Entreprises de services",                  "count": 5, "imai_avg": 63.8},
    ],
    "challenges": [
        {"label": "Automatiser des tâches répétitives",      "count": 35},
        {"label": "Analyser mes données pour mieux décider", "count": 28},
        {"label": "Rester compétitif face à mes concurrents","count": 22},
        {"label": "Améliorer le service à la clientèle",     "count": 18},
        {"label": "Réduire mes coûts opérationnels",         "count": 15},
    ],
    "is_demo": True,
}

_REG_DIM_RECS: dict[str, str] = {
    "gouvernance":  "Mettre en place un parcours régional « Gouvernance IA responsable » afin d'accompagner les entreprises dont le score est inférieur à 50/100 vers des pratiques d'utilisation responsable de l'IA.",
    "personnes":    "Développer un programme régional de montée en compétences en IA générative, en mobilisant les partenaires formation de {partner_name} pour couvrir l'ensemble du territoire.",
    "processus":    "Identifier un premier groupe pilote de PMEs souhaitant automatiser leurs processus afin de documenter les gains obtenus et créer des cas de succès régionaux valorisables auprès des membres.",
    "strategie":    "Structurer un programme d'accompagnement stratégique pour aider les dirigeants à formaliser leur feuille de route IA sur 12 à 24 mois, avec des indicateurs de succès mesurables.",
    "technologies": "Négocier un accès groupé aux outils IA pour les membres de {partner_name}, réduisant les barrières à l'entrée et accélérant le déploiement à l'échelle du territoire.",
}


@router.get("/regional/{partner_slug}", response_class=HTMLResponse)
@limiter.limit("30/minute")
def get_rapport_regional(
    request: Request,
    partner_slug: str,
    user: CurrentUser = Depends(get_current_user),
):
    with get_db() as cur:
        cur.execute(
            "SELECT id, name, primary_color, logo_url FROM partners WHERE slug = %s AND is_active = true LIMIT 1",
            (partner_slug,),
        )
        partner = row(cur)
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire introuvable.")

        if str(getattr(user, "partner_id", None)) != str(partner["id"]):
            raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur de ce programme.")

        partner_id = str(partner["id"])

        cur.execute(
            """
            SELECT COUNT(*) AS total,
                   ROUND(AVG(imai_score)::numeric, 1) AS imai_avg,
                   COUNT(*) FILTER (WHERE niveau = 'debutant')      AS nb_debutant,
                   COUNT(*) FILTER (WHERE niveau = 'intermediaire') AS nb_intermediaire,
                   COUNT(*) FILTER (WHERE niveau = 'avance')        AS nb_avance,
                   ROUND(AVG(score_strategie)::numeric, 1)    AS dim_strategie,
                   ROUND(AVG(score_personnes)::numeric, 1)    AS dim_personnes,
                   ROUND(AVG(score_processus)::numeric, 1)    AS dim_processus,
                   ROUND(AVG(score_technologies)::numeric, 1) AS dim_technologies,
                   ROUND(AVG(score_gouvernance)::numeric, 1)  AS dim_gouvernance
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed'
            """,
            (partner_id,),
        )
        overall = row(cur)

        cur.execute(
            """
            SELECT sector, COUNT(*) AS count,
                   ROUND(AVG(imai_score)::numeric, 1) AS imai_avg
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed' AND sector IS NOT NULL
            GROUP BY sector
            HAVING COUNT(*) >= %s
            ORDER BY count DESC LIMIT 6
            """,
            (partner_id, K_ANON_MIN),
        )
        by_sector_rows = rows(cur)

        cur.execute(
            """
            SELECT priority_challenge AS label, COUNT(*) AS count
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed'
              AND priority_challenge IS NOT NULL AND priority_challenge <> ''
            GROUP BY priority_challenge
            HAVING COUNT(*) >= %s
            ORDER BY count DESC LIMIT 5
            """,
            (partner_id, K_ANON_MIN),
        )
        challenge_rows = rows(cur)

    total    = int(overall["total"] or 0)
    use_demo = total < 5

    if use_demo:
        d = _DEMO_REGIONAL
    else:
        d = {
            "total":    total,
            "imai_avg": float(overall["imai_avg"] or 0),
            "niveaux": {
                "debutant":      int(overall["nb_debutant"]      or 0),
                "intermediaire": int(overall["nb_intermediaire"] or 0),
                "avance":        int(overall["nb_avance"]        or 0),
            },
            "dimensions": {
                "strategie":    float(overall["dim_strategie"]    or 0),
                "personnes":    float(overall["dim_personnes"]    or 0),
                "processus":    float(overall["dim_processus"]    or 0),
                "technologies": float(overall["dim_technologies"] or 0),
                "gouvernance":  float(overall["dim_gouvernance"]  or 0),
            },
            "by_sector":  [{"sector": s["sector"], "count": int(s["count"]), "imai_avg": float(s["imai_avg"] or 0)} for s in by_sector_rows],
            "challenges": [{"label": c["label"], "count": int(c["count"])} for c in challenge_rows],
            "is_demo":    False,
        }

    from datetime import date as _date
    today_str = f"{_date.today().day} {_MONTHS_FR[_date.today().month]} {_date.today().year}"

    return HTMLResponse(content=_build_regional_html(
        partner_name=partner["name"],
        primary=partner["primary_color"] or "#2563eb",
        logo_url=partner.get("logo_url") or "",
        d=d,
        use_demo=use_demo,
        today_str=today_str,
    ))


def _build_regional_html(partner_name: str, primary: str, logo_url: str, d: dict, use_demo: bool, today_str: str) -> str:
    total      = d["total"]
    imai_avg   = d["imai_avg"]
    niveaux    = d["niveaux"]
    dims       = d["dimensions"]
    sectors    = d["by_sector"]
    challenges = d["challenges"]

    roi_h     = round(total * 3.5)
    avg_color = _pct_color(imai_avg)
    demo_badge = '<span class="demo-badge">DÉMO</span>' if use_demo else ""

    # KPI cards
    kpi_html = (
        f'<div class="kpi-card"><div class="kpi-val">{total}</div><div class="kpi-label">Entreprises participantes</div></div>'
        f'<div class="kpi-card"><div class="kpi-val" style="color:{avg_color}">{imai_avg:.1f}<span>/100</span></div><div class="kpi-label">IMAI moyen du programme</div></div>'
        f'<div class="kpi-card"><div class="kpi-val" style="color:#10b981">{roi_h} h</div><div class="kpi-label">Potentiel d\'optimisation / mois</div></div>'
    )

    # Répartition niveaux
    nd = niveaux["debutant"]; ni = niveaux["intermediaire"]; na = niveaux["avance"]
    total_niv = nd + ni + na or 1
    pct_d = round(nd / total_niv * 100); pct_i = round(ni / total_niv * 100); pct_a = round(na / total_niv * 100)
    niv_html = (
        f'<div class="niv-bar">'
        f'<div class="niv-seg" style="width:{pct_d}%;background:#ef4444"></div>'
        f'<div class="niv-seg" style="width:{pct_i}%;background:#f59e0b"></div>'
        f'<div class="niv-seg" style="width:{pct_a}%;background:#10b981"></div>'
        f'</div>'
        f'<div class="niv-legend">'
        f'<span class="niv-pill" style="color:#ef4444">🔴 Débutant — {nd} ({pct_d}%)</span>'
        f'<span class="niv-pill" style="color:#f59e0b">🟡 Intermédiaire — {ni} ({pct_i}%)</span>'
        f'<span class="niv-pill" style="color:#10b981">🟢 Avancé — {na} ({pct_a}%)</span>'
        f'</div>'
    )

    # Dimensions
    dim_bars = ""
    for dim in list(DIM_LABELS.keys()):
        val = dims.get(dim, 0)
        c   = _pct_color(val)
        dim_bars += (
            f'<div class="dim-row">'
            f'<span class="dim-name">{DIM_LABELS[dim]}</span>'
            f'<div class="dim-track"><div class="dim-fill" style="width:{val:.0f}%;background:{c}"></div></div>'
            f'<span class="dim-val" style="color:{c}">{val:.1f}/100</span>'
            f'</div>'
        )

    # Secteurs
    max_imai = max((s["imai_avg"] for s in sectors), default=100) or 100
    sector_rows = ""
    for s in sectors:
        c = _pct_color(s["imai_avg"])
        w = round(s["imai_avg"] / max_imai * 100)
        sector_rows += (
            f'<div class="sec-row">'
            f'<span class="sec-name">{s["sector"]}</span>'
            f'<span class="sec-count">{s["count"]} entreprises</span>'
            f'<div class="dim-track"><div class="dim-fill" style="width:{w}%;background:{c}"></div></div>'
            f'<span class="dim-val" style="color:{c}">{s["imai_avg"]:.1f}</span>'
            f'</div>'
        )
    if not sector_rows:
        sector_rows = '<p class="masked-note">Pas encore assez de participants par secteur pour une ventilation fiable (minimum 5 par secteur).</p>'

    masked_note = ""
    if not use_demo:
        shown = sum(s["count"] for s in sectors)
        if shown < total:
            masked_note = (
                f'<p class="masked-note">Certains secteurs comptant moins de {K_ANON_MIN} participants '
                f'ne sont pas affichés individuellement afin de préserver la confidentialité des entreprises.</p>'
            )

    # Défis
    total_ch = sum(c["count"] for c in challenges) or 1
    challenge_html = ""
    for i, ch in enumerate(challenges, 1):
        pct = round(ch["count"] / total_ch * 100)
        challenge_html += (
            f'<div class="ch-row">'
            f'<span class="ch-num">{i}</span>'
            f'<div class="ch-content">'
            f'<span class="ch-label">{ch["label"]}</span>'
            f'<div class="dim-track" style="margin-top:4px"><div class="dim-fill" style="width:{pct}%;background:{primary}"></div></div>'
            f'</div>'
            f'<span class="ch-pct">{pct}%</span>'
            f'</div>'
        )

    # Insights IA
    sorted_dims  = sorted(dims.items(), key=lambda x: x[1])
    weakest_dim  = sorted_dims[0]
    best_dim     = sorted_dims[-1]
    top_ch_label = challenges[0]["label"] if challenges else "l'automatisation"
    top_ch_pct   = round(challenges[0]["count"] / total * 100) if challenges and total > 0 else 0
    best_sector  = max(sectors, key=lambda s: s["imai_avg"]) if sectors else None
    worst_sector = min(sectors, key=lambda s: s["imai_avg"]) if sectors else None

    ins = [
        f"<strong>{top_ch_pct} % des entreprises</strong> identifient « {top_ch_label} » comme leur principal défi — c'est la priorité opérationnelle n° 1 du programme.",
        f"La dimension <strong>{DIM_LABELS[weakest_dim[0]]}</strong> ({weakest_dim[1]:.1f}/100) est la plus faible du portefeuille. Un programme ciblé sur ce levier génèrerait le plus grand impact collectif.",
    ]
    if best_sector and worst_sector and best_sector["sector"] != worst_sector["sector"]:
        ins.append(
            f"Le secteur <strong>{best_sector['sector']}</strong> se distingue ({best_sector['imai_avg']:.1f}/100) "
            f"contre {worst_sector['imai_avg']:.1f}/100 pour <strong>{worst_sector['sector']}</strong> — "
            "un potentiel de mentorat inter-sectoriel à exploiter."
        )
    else:
        ins.append(
            f"La dimension <strong>{DIM_LABELS[best_dim[0]]}</strong> ({best_dim[1]:.1f}/100) est le point fort collectif — "
            "capitaliser dessus pour des cas d'usage à fort ROI immédiat."
        )
    insights_html = "".join(
        f'<div class="insight-item"><span class="insight-icon">💡</span><p>{txt}</p></div>'
        for txt in ins
    )

    # Recommandations Chambre
    top3_weakest = [k for k, _ in sorted_dims[:3]]
    recs_ch = ""
    for i, dim in enumerate(top3_weakest, 1):
        rec = _REG_DIM_RECS.get(dim, "").format(partner_name=partner_name)
        if rec:
            recs_ch += (
                f'<div class="rec-item">'
                f'<div class="rec-num" style="background:{primary}">{i}</div>'
                f'<div><strong>Priorité {i} — {DIM_LABELS[dim]}</strong><p>{rec}</p></div>'
                f'</div>'
            )

    demo_notice_html = (
        '<div class="demo-notice">⚠️ <strong>Données de démonstration</strong> — ces résultats sont simulés '
        '(moins de 5 participations réelles enregistrées). Les données réelles s\'afficheront automatiquement '
        'dès le déploiement du programme.</div>'
    ) if use_demo else ""

    css = """
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; background: #f0f4f8; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-bar { background: #1e293b; padding: 14px 24px; text-align: center; }
      .print-bar button { background: #6366f1; color: #fff; border: none; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer; }
      .print-bar button:hover { opacity: .9; }
      .page { max-width: 960px; margin: 24px auto 48px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.12); }
      .cobrand-bar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 10px 48px; display: flex; justify-content: space-between; align-items: center; }
      .cobrand-program { font-size: 12px; font-weight: 600; color: #64748b; letter-spacing: .02em; }
      .cobrand-right { display: flex; align-items: center; gap: 10px; }
      .cobrand-logo { height: 26px; width: auto; object-fit: contain; }
      .cobrand-platform-logo { height: 22px; }
      .cobrand-partner-name { font-size: 13px; font-weight: 700; color: #0f172a; }
      .cobrand-x { font-size: 14px; color: #94a3b8; }
      .rpt-header { padding: 36px 48px 32px; color: #fff; }
      .rpt-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; opacity: .75; margin-bottom: 8px; }
      .rpt-title { font-size: 30px; font-weight: 900; letter-spacing: -.5px; margin-bottom: 4px; }
      .rpt-subtitle { font-size: 14px; opacity: .82; }
      .rpt-powered { font-size: 11px; opacity: .55; margin-top: 20px; }
      .rpt-body { padding: 36px 48px 28px; }
      .demo-notice { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
      .demo-badge { font-size: 10px; font-weight: 700; background: rgba(255,255,255,.25); color: #fff; padding: 2px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
      .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
      .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px 20px; text-align: center; }
      .kpi-val { font-size: 36px; font-weight: 900; letter-spacing: -1px; line-height: 1; margin-bottom: 6px; }
      .kpi-val span { font-size: 16px; font-weight: 500; color: #94a3b8; }
      .kpi-label { font-size: 13px; color: #64748b; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }
      .niv-bar { height: 16px; border-radius: 8px; overflow: hidden; display: flex; margin-bottom: 12px; }
      .niv-seg { height: 100%; }
      .niv-legend { display: flex; flex-wrap: wrap; gap: 20px; }
      .niv-pill { font-size: 13px; font-weight: 600; }
      .dim-row { display: flex; align-items: center; gap: 14px; margin-bottom: 11px; }
      .dim-name { font-size: 13px; color: #64748b; min-width: 115px; }
      .dim-track { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
      .dim-fill { height: 100%; border-radius: 5px; }
      .dim-val { font-size: 14px; font-weight: 700; min-width: 60px; text-align: right; }
      .sec-row { display: flex; align-items: center; gap: 12px; margin-bottom: 11px; }
      .sec-name { font-size: 13px; color: #64748b; min-width: 165px; }
      .sec-count { font-size: 12px; color: #94a3b8; min-width: 95px; text-align: right; }
      .ch-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .ch-num { width: 22px; height: 22px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #64748b; flex-shrink: 0; }
      .ch-content { flex: 1; }
      .ch-label { font-size: 13px; color: #1e293b; }
      .ch-pct { font-size: 14px; font-weight: 700; min-width: 40px; text-align: right; color: #475569; }
      .insight-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px 18px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; margin-bottom: 10px; }
      .insight-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
      .insight-item p { font-size: 13px; color: #0369a1; line-height: 1.65; }
      .rec-item { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
      .rec-item:last-child { border-bottom: none; }
      .rec-num { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 800; }
      .rec-item strong { font-size: 14px; font-weight: 700; display: block; margin-bottom: 5px; }
      .rec-item p { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0; }
      .pilot-box { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; }
      .pilot-header { margin-bottom: 20px; }
      .pilot-badge { display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 3px 10px; border-radius: 4px; margin-right: 10px; vertical-align: middle; }
      .pilot-header strong { font-size: 15px; color: #0f172a; }
      .pilot-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
      .pilot-step { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; text-align: center; flex: 1; min-width: 110px; }
      .pilot-step-icon { font-size: 20px; margin-bottom: 6px; }
      .pilot-step-label { font-size: 12px; font-weight: 700; color: #0f172a; }
      .pilot-arrow { font-size: 18px; color: #94a3b8; padding: 0 6px; flex-shrink: 0; }
      .impact-section { margin-bottom: 28px; }
      .impact-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
      .impact-col { border-radius: 10px; padding: 20px 18px; }
      .impact-col:nth-child(1) { background: #f0f9ff; border: 1px solid #bae6fd; }
      .impact-col:nth-child(2) { background: #f0fdf4; border: 1px solid #bbf7d0; }
      .impact-col:nth-child(3) { background: #faf5ff; border: 1px solid #e9d5ff; }
      .impact-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
      .impact-col:nth-child(1) .impact-title { color: #0369a1; }
      .impact-col:nth-child(2) .impact-title { color: #166534; }
      .impact-col:nth-child(3) .impact-title { color: #7c3aed; }
      .impact-col ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
      .impact-col li { font-size: 13px; line-height: 1.5; }
      .impact-col:nth-child(1) li { color: #0369a1; }
      .impact-col:nth-child(2) li { color: #166534; }
      .impact-col:nth-child(3) li { color: #7c3aed; }
      .masked-note { font-size: 12px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
      .footer-legal { font-size: 12px; color: #64748b; line-height: 1.55; padding: 16px 48px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
      .rpt-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
      .footer-brand { font-size: 13px; color: #64748b; }
      .footer-brand strong { color: #0f172a; }
      .footer-conf { font-size: 12px; color: #94a3b8; }
      @media print {
        body { background: #fff; }
        .print-bar { display: none !important; }
        .page { box-shadow: none; margin: 0; border-radius: 0; max-width: none; }
        .section, .kpi-grid, .pilot-box, .impact-grid { break-inside: avoid; }
      }
      @media (max-width: 700px) {
        .rpt-header, .rpt-body, .rpt-footer, .footer-legal { padding-left: 20px; padding-right: 20px; }
        .kpi-grid, .impact-grid { grid-template-columns: 1fr; }
        .pilot-flow { flex-direction: column; align-items: stretch; }
        .pilot-arrow { transform: rotate(90deg); text-align: center; }
        .sec-name { min-width: 100px; }
        .dim-name { min-width: 85px; }
        .niv-legend { flex-direction: column; gap: 6px; }
      }
    """

    cobrand_right_reg = _cobrand_right(partner_name, logo_url)

    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rapport régional — Programme Accélérateur IA PME · {partner_name}</title>
  <style>{css}</style>
</head>
<body>
  <div class="print-bar">
    <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  </div>
  <div class="page">

    <!-- Co-branding -->
    <div class="cobrand-bar">
      <span class="cobrand-program">Programme Accélérateur IA PME</span>
      <div class="cobrand-right">
        {cobrand_right_reg}
      </div>
    </div>

    <div class="rpt-header" style="background:{primary}">
      <div class="rpt-eyebrow">Programme Accélérateur IA PME · {partner_name}</div>
      <div class="rpt-title">Rapport régional {demo_badge}</div>
      <div class="rpt-subtitle">Synthèse complète — indicateurs, tendances et recommandations sectorielles</div>
      <div class="rpt-powered">Propulsé par AgentHub Platform · © 2026 CivicAI Inc. · Généré le {today_str}</div>
    </div>

    <div class="rpt-body">

      {demo_notice_html}

      <div class="section">
        <h2 class="section-title">Vue d'ensemble du programme</h2>
        <div class="kpi-grid">{kpi_html}</div>
      </div>

      <div class="section">
        <h2 class="section-title">Répartition des niveaux de maturité</h2>
        {niv_html}
      </div>

      <div class="section">
        <h2 class="section-title">Scores moyens par dimension</h2>
        {dim_bars}
      </div>

      <div class="section">
        <h2 class="section-title">IMAI moyen par secteur</h2>
        {masked_note}{sector_rows}
      </div>

      <div class="section">
        <h2 class="section-title">Défis prioritaires identifiés par les PMEs</h2>
        {challenge_html}
      </div>

      <div class="section">
        <h2 class="section-title">Insights IA — Observations clés</h2>
        {insights_html}
      </div>

      <div class="section">
        <h2 class="section-title">Recommandations pour {partner_name}</h2>
        {recs_ch}
      </div>

      <!-- Proposition de projet pilote -->
      <div class="pilot-box">
        <div class="pilot-header">
          <span class="pilot-badge">Programme conjoint</span>
          <strong>{partner_name} × AgentHub Platform — Phase 1 · 5 à 10 entreprises membres</strong>
        </div>
        <div class="pilot-flow">
          <div class="pilot-step"><div class="pilot-step-icon">📋</div><div class="pilot-step-label">Diagnostic</div></div>
          <div class="pilot-arrow">→</div>
          <div class="pilot-step"><div class="pilot-step-icon">📄</div><div class="pilot-step-label">Plan d'action</div></div>
          <div class="pilot-arrow">→</div>
          <div class="pilot-step"><div class="pilot-step-icon">🤝</div><div class="pilot-step-label">Accompagnement</div></div>
          <div class="pilot-arrow">→</div>
          <div class="pilot-step"><div class="pilot-step-icon">📊</div><div class="pilot-step-label">Rapport à 90 jours</div></div>
          <div class="pilot-arrow">→</div>
          <div class="pilot-step"><div class="pilot-step-icon">🗺️</div><div class="pilot-step-label">Rapport régional</div></div>
        </div>
      </div>

      <!-- Complémentarité du programme -->
      <div class="section impact-section">
        <h2 class="section-title">Complémentarité du programme</h2>
        <div class="impact-grid">
          <div class="impact-col">
            <div class="impact-title">Les PMEs bénéficient de</div>
            <ul>
              <li>✓ Un diagnostic de maturité IA</li>
              <li>✓ Un plan d'action personnalisé</li>
              <li>✓ Un accompagnement structuré</li>
              <li>✓ Une mesure concrète des progrès</li>
            </ul>
          </div>
          <div class="impact-col">
            <div class="impact-title">{partner_name} apporte</div>
            <ul>
              <li>✓ Sa connaissance des entreprises</li>
              <li>✓ Sa crédibilité et son réseau</li>
              <li>✓ La mobilisation des membres</li>
              <li>✓ L'ancrage dans le territoire</li>
            </ul>
          </div>
          <div class="impact-col">
            <div class="impact-title">AgentHub apporte</div>
            <ul>
              <li>✓ La plateforme et le diagnostic</li>
              <li>✓ ATLAS, conseiller IA personnel</li>
              <li>✓ Les analyses et tableaux de bord</li>
              <li>✓ Les outils de mesure d'impact</li>
            </ul>
          </div>
        </div>
      </div>

    </div>

    <div class="footer-legal">
      Ce rapport s'inscrit dans le cadre du programme conjoint <strong>{partner_name} × AgentHub Platform</strong>.
      Les données sont agrégées et anonymisées à partir des diagnostics réalisés par les entreprises participantes.
      <strong>{partner_name}</strong> apporte sa connaissance du territoire, sa crédibilité et son réseau de membres.
      <strong>AgentHub Platform</strong> fournit la plateforme, les analyses et les outils de mesure
      pour accompagner les PMEs dans leur progression vers l'intelligence artificielle.
    </div>

    <div class="rpt-footer">
      <div class="footer-brand"><strong>AgentHub Platform</strong> · Powered by <strong>CivicAI Inc.</strong></div>
      <div class="footer-conf">Rapport confidentiel · Réservé à l'usage interne de {partner_name}</div>
    </div>

  </div>
</body>
</html>"""

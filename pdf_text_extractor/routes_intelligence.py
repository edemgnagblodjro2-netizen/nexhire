"""API Intelligence organisationnelle — identités, corrélations, risques, M365."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth import CurrentUser
from db import get_db, rows as db_rows
from rbac import require_min_role

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


# ─────────────────────────────────────────────────────────────────────────────
# Sync — collecte + corrélation + risques
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/sync")
def sync_intelligence(user: CurrentUser = Depends(require_min_role("admin"))):
    """Collecte, corrèle et calcule les risques pour l'organisation. Admin+."""
    from collector_service import collect_all
    from correlation_engine import correlate_identities
    from risk_calculator import calculate_all_risks
    from m365_license_optimizer import run_m365_optimizer

    org = user.organization_id
    collected    = collect_all(org)
    correlations = correlate_identities(org)
    risks        = calculate_all_risks(org)
    m365         = run_m365_optimizer(org)

    return {
        "ok": True,
        "collected":    collected,
        "correlations": correlations,
        "risks":        risks,
        "m365_savings": {
            "monthly": m365["total_savings_monthly"],
            "annual":  m365["total_savings_annual"],
            "count":   m365["findings_count"],
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Risques
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/risks/summary")
def risks_summary(user: CurrentUser = Depends(require_min_role("manager"))):
    """Résumé des risques actifs et économies potentielles. Manager+."""
    from risk_calculator import get_risk_summary
    summary = get_risk_summary(user.organization_id)

    # Ajoute les économies M365 déjà calculées dans risk_findings
    with get_db() as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(cost_impact_monthly), 0) AS m365_savings
            FROM public.risk_findings
            WHERE organization_id = %s
              AND finding_type = 'unused_license'
              AND resolved_at IS NULL
              AND is_acknowledged = false
            """,
            (user.organization_id,),
        )
        r = cur.fetchone()
    summary["m365_savings_monthly"] = float(r["m365_savings"]) if r else 0
    return summary


@router.get("/risks")
def list_risks(
    severity: str | None = None,
    finding_type: str | None = None,
    acknowledged: bool = False,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    """Risques actifs filtrables. Manager+."""
    params = [user.organization_id]
    where  = "WHERE rf.organization_id = %s AND rf.resolved_at IS NULL"
    if severity:
        where += " AND rf.severity = %s"; params.append(severity)
    if finding_type:
        where += " AND rf.finding_type = %s"; params.append(finding_type)
    if not acknowledged:
        where += " AND rf.is_acknowledged = false"

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT rf.id, rf.finding_type, rf.severity, rf.title,
                   rf.description, rf.remediation, rf.cost_impact_monthly,
                   rf.is_acknowledged, rf.detected_at, rf.entity_ref,
                   d.name AS dept_name
            FROM public.risk_findings rf
            LEFT JOIN public.departments d ON d.id = rf.department_id
            {where}
            ORDER BY
              CASE rf.severity
                WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                WHEN 'medium'   THEN 3 ELSE 4 END,
              rf.detected_at DESC
            LIMIT 200
            """,
            params,
        )
        return db_rows(cur)


@router.post("/risks/{risk_id}/acknowledge")
def acknowledge_risk(risk_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    with get_db() as cur:
        cur.execute(
            """UPDATE public.risk_findings
               SET is_acknowledged=true, acknowledged_by=%s, acknowledged_at=now()
               WHERE id=%s AND organization_id=%s RETURNING id""",
            (user.id, risk_id, user.organization_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Risque introuvable.")
    return {"ok": True}


@router.post("/risks/{risk_id}/resolve")
def resolve_risk(risk_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    with get_db() as cur:
        cur.execute(
            """UPDATE public.risk_findings
               SET resolved_at=now(), is_acknowledged=true,
                   acknowledged_by=%s, acknowledged_at=now()
               WHERE id=%s AND organization_id=%s AND resolved_at IS NULL RETURNING id""",
            (user.id, risk_id, user.organization_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Risque introuvable ou déjà résolu.")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# M365 License Optimizer
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/m365/optimize")
def m365_optimize(user: CurrentUser = Depends(require_min_role("admin"))):
    """Lance l'optimiseur M365 et retourne les économies détectées. Admin+."""
    from m365_license_optimizer import run_m365_optimizer
    return run_m365_optimizer(user.organization_id)


@router.get("/m365/licenses")
def m365_licenses(user: CurrentUser = Depends(require_min_role("manager"))):
    """Résumé des pools et utilisation de licences M365. Manager+."""
    from m365_license_optimizer import get_license_summary
    return get_license_summary(user.organization_id)


@router.get("/m365/users")
def m365_users(user: CurrentUser = Depends(require_min_role("admin"))):
    """Liste les comptes M365 avec leur score d'activité. Admin+."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              ia.external_email     AS email,
              ia.display_name,
              ia.status,
              la.sku_name,
              lu.activity_score,
              lu.tier_needed,
              lu.metrics->>'days_inactive' AS days_inactive,
              lp.unit_cost_monthly  AS sku_cost,
              i.status              AS workday_status,
              i.identity_type
            FROM public.identity_accounts ia
            LEFT JOIN public.identities i          ON i.id = ia.identity_id
            LEFT JOIN public.license_assignments la ON la.account_id = ia.id AND la.is_active = true
            LEFT JOIN public.license_pools lp       ON lp.id = la.pool_id
            LEFT JOIN public.license_usage lu       ON lu.assignment_id = la.id
            WHERE ia.organization_id = %s
              AND ia.source_connector = 'microsoft_365'
            ORDER BY lu.activity_score ASC NULLS FIRST, ia.display_name
            LIMIT 500
            """,
            (user.organization_id,),
        )
        return db_rows(cur)


# ─────────────────────────────────────────────────────────────────────────────
# Identités
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/identities")
def list_identities(
    status: str | None = None,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Liste les identités maîtres de l'organisation. Admin+."""
    params = [user.organization_id]
    where  = "WHERE organization_id = %s"
    if status:
        where += " AND status = %s"; params.append(status)

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT id, identity_type, canonical_email, full_name,
                   org_unit_name, job_title, status, source_of_truth,
                   cost_monthly, created_at, updated_at
            FROM public.identities {where}
            ORDER BY full_name
            LIMIT 500
            """,
            params,
        )
        return db_rows(cur)


@router.get("/identities/{identity_id}/accounts")
def identity_accounts(
    identity_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Tous les comptes cross-systèmes d'une identité. Admin+."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT source_connector, external_id, external_email,
                   display_name, status, last_activity_at, synced_at
            FROM public.identity_accounts
            WHERE identity_id = %s AND organization_id = %s
            ORDER BY source_connector
            """,
            (identity_id, user.organization_id),
        )
        return db_rows(cur)


# ─────────────────────────────────────────────────────────────────────────────
# Économies globales (pour dashboard)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/savings")
def savings_summary(user: CurrentUser = Depends(require_min_role("manager"))):
    """
    Économies potentielles identifiées toutes sources confondues.
    Alimenté par les risk_findings avec cost_impact_monthly > 0.
    """
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              finding_type,
              COUNT(*)                          AS count,
              SUM(cost_impact_monthly)          AS monthly,
              SUM(cost_impact_monthly * 12)     AS annual
            FROM public.risk_findings
            WHERE organization_id = %s
              AND resolved_at IS NULL
              AND is_acknowledged = false
              AND cost_impact_monthly > 0
            GROUP BY finding_type
            ORDER BY monthly DESC
            """,
            (user.organization_id,),
        )
        by_type = db_rows(cur)

    total_monthly = sum(float(r["monthly"] or 0) for r in by_type)

    return {
        "total_monthly": round(total_monthly, 2),
        "total_annual":  round(total_monthly * 12, 2),
        "by_type":       [
            {
                "finding_type": r["finding_type"],
                "count":        int(r["count"]),
                "monthly":      round(float(r["monthly"] or 0), 2),
                "annual":       round(float(r["annual"] or 0), 2),
            }
            for r in by_type
        ],
    }

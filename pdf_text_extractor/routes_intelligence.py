"""API Intelligence organisationnelle — entités, corrélations, risques."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth import CurrentUser
from db import get_db, rows as db_rows
from rbac import require_min_role

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


# ── Sync ──────────────────────────────────────────────────────────────────────

@router.post("/sync")
def sync_intelligence(user: CurrentUser = Depends(require_min_role("admin"))):
    """Collecte, corrèle et calcule les risques pour l'organisation. Admin+."""
    from collector_service import collect_all
    from correlation_engine import correlate_identities
    from risk_calculator import calculate_all_risks

    org = user.organization_id
    collected   = collect_all(org)
    correlations = correlate_identities(org)
    risks        = calculate_all_risks(org)
    return {"ok": True, "collected": collected, "correlations": correlations, "risks": risks}


# ── Risques ───────────────────────────────────────────────────────────────────

@router.get("/risks/summary")
def risks_summary(user: CurrentUser = Depends(require_min_role("manager"))):
    """Résumé des risques actifs (comptages + coût total). Manager+."""
    from risk_calculator import get_risk_summary
    return get_risk_summary(user.organization_id)


@router.get("/risks")
def list_risks(
    severity: str | None = None,
    finding_type: str | None = None,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    """Risques actifs filtrables par sévérité et type. Manager+."""
    params = [user.organization_id]
    where  = "WHERE rf.organization_id = %s AND rf.resolved_at IS NULL"
    if severity:
        where += " AND rf.severity = %s"; params.append(severity)
    if finding_type:
        where += " AND rf.finding_type = %s"; params.append(finding_type)

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
def acknowledge_risk(
    risk_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Acquitte un risque (marque comme traité). Admin+."""
    with get_db() as cur:
        cur.execute(
            """
            UPDATE public.risk_findings
            SET is_acknowledged = true,
                acknowledged_by = %s,
                acknowledged_at = now()
            WHERE id = %s AND organization_id = %s
            RETURNING id
            """,
            (user.id, risk_id, user.organization_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Risque introuvable.")
    return {"ok": True}


@router.post("/risks/{risk_id}/resolve")
def resolve_risk(
    risk_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Marque un risque comme résolu. Admin+."""
    with get_db() as cur:
        cur.execute(
            """
            UPDATE public.risk_findings
            SET resolved_at = now(), is_acknowledged = true,
                acknowledged_by = %s, acknowledged_at = now()
            WHERE id = %s AND organization_id = %s AND resolved_at IS NULL
            RETURNING id
            """,
            (user.id, risk_id, user.organization_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Risque introuvable ou déjà résolu.")
    return {"ok": True}


# ── Corrélations ──────────────────────────────────────────────────────────────

@router.get("/correlations")
def list_correlations(
    status: str | None = None,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Identités cross-connecteurs, filtrables par statut. Admin+."""
    params = [user.organization_id]
    where  = "WHERE organization_id = %s"
    if status:
        where += " AND status = %s"; params.append(status)

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT correlation_key, connectors_present, status,
                   risk_level, risk_reason, cost_impact_monthly, updated_at
            FROM public.entity_correlations
            {where}
            ORDER BY
              CASE risk_level
                WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                WHEN 'medium'   THEN 3 ELSE 4 END,
              updated_at DESC
            LIMIT 500
            """,
            params,
        )
        return db_rows(cur)


# ── Entités ───────────────────────────────────────────────────────────────────

@router.get("/entities")
def list_entities(
    entity_type: str | None = None,
    source: str | None = None,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Entités normalisées, filtrables par type et connecteur source. Admin+."""
    params = [user.organization_id]
    where  = "WHERE organization_id = %s"
    if entity_type:
        where += " AND entity_type = %s"; params.append(entity_type)
    if source:
        where += " AND source_connector = %s"; params.append(source)

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT id, entity_type, source_connector, source_id,
                   email, display_name, department_name, status,
                   cost_monthly, last_activity_at, synced_at
            FROM public.entities
            {where}
            ORDER BY entity_type, source_connector, display_name
            LIMIT 500
            """,
            params,
        )
        return db_rows(cur)

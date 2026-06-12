"""
Moteur de corrélation cross-connecteurs.
Regroupe les entités 'person' par email et détecte les anomalies d'identité :
- Compte orphelin : inactif dans Workday (RH) mais encore actif dans M365/Jira
- Compte fantôme  : actif dans des apps métier mais introuvable dans Workday
"""
from __future__ import annotations

import json
from db import get_db, rows as db_rows


def correlate_identities(org_id: str) -> dict:
    """
    Crée ou met à jour les lignes entity_correlations et risk_findings
    pour toutes les identités de l'organisation.
    """
    # Charge toutes les entités person avec un email
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, source_connector, email, display_name,
                   department_name, data, cost_monthly, status
            FROM public.entities
            WHERE organization_id = %s
              AND entity_type = 'person'
              AND email IS NOT NULL
            ORDER BY email, source_connector
            """,
            (org_id,),
        )
        entities = db_rows(cur)

    # Groupe par email normalisé
    by_email: dict[str, list[dict]] = {}
    for e in entities:
        key = (e["email"] or "").lower().strip()
        if key:
            by_email.setdefault(key, []).append(e)

    correlations_created = 0
    risks_detected = 0

    for email, group in by_email.items():
        connectors_present = sorted({e["source_connector"] for e in group})

        # Workday est la source de vérité RH
        wd_entries = [e for e in group if e["source_connector"] == "workday"]
        m365_entries = [e for e in group if e["source_connector"] == "microsoft_365"]
        jira_entries = [e for e in group if e["source_connector"] == "jira"]

        wd_active   = any(e["status"] == "active"   for e in wd_entries)
        wd_inactive = any(e["status"] == "inactive" for e in wd_entries)
        wd_absent   = len(wd_entries) == 0
        m365_active = any(e["status"] == "active"   for e in m365_entries)
        jira_active = any(e["status"] == "active"   for e in jira_entries)

        cost_monthly = sum(float(e["cost_monthly"] or 0) for e in group)
        display_name = next((e["display_name"] for e in group if e["display_name"]), email)

        status     = "normal"
        risk_level = "low"
        risk_reason: str | None = None

        if wd_inactive and (m365_active or jira_active):
            active_in = []
            if m365_active: active_in.append("Microsoft 365")
            if jira_active: active_in.append("Jira")
            status      = "orphan"
            risk_level  = "critical"
            risk_reason = (
                f"Employé marqué inactif dans Workday mais encore actif dans : "
                f"{', '.join(active_in)}. Les accès n'ont pas été révoqués."
            )

        elif wd_absent and (m365_active or jira_active):
            apps = []
            if m365_active: apps.append("Microsoft 365")
            if jira_active: apps.append("Jira")
            status      = "ghost"
            risk_level  = "high"
            risk_reason = (
                f"Utilisateur actif dans {', '.join(apps)} "
                f"mais introuvable dans Workday. Compte non référencé RH."
            )

        entity_ids = [str(e["id"]) for e in group]

        with get_db() as cur:
            cur.execute(
                """
                INSERT INTO public.entity_correlations
                  (organization_id, correlation_key, entity_ids, connectors_present,
                   status, risk_level, risk_reason, cost_impact_monthly, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
                ON CONFLICT (organization_id, correlation_key)
                DO UPDATE SET
                  entity_ids          = EXCLUDED.entity_ids,
                  connectors_present  = EXCLUDED.connectors_present,
                  status              = EXCLUDED.status,
                  risk_level          = EXCLUDED.risk_level,
                  risk_reason         = EXCLUDED.risk_reason,
                  cost_impact_monthly = EXCLUDED.cost_impact_monthly,
                  updated_at          = now()
                """,
                (
                    org_id, email, entity_ids, connectors_present,
                    status, risk_level, risk_reason, cost_monthly,
                ),
            )
        correlations_created += 1

        if status in ("orphan", "ghost"):
            risks_detected += 1
            _upsert_identity_risk(org_id, status, display_name, email, cost_monthly, risk_reason)

    return {
        "correlations": correlations_created,
        "risks_detected": risks_detected,
    }


def _upsert_identity_risk(
    org_id: str,
    status: str,
    display_name: str,
    email: str,
    cost_monthly: float,
    risk_reason: str | None,
) -> None:
    if status == "orphan":
        finding_type = "orphan_account"
        severity     = "critical"
        title        = f"Compte orphelin — {display_name}"
        remediation  = (
            f"Révoquer immédiatement les accès de {display_name} ({email}) "
            f"dans tous les systèmes actifs et archiver le compte."
        )
    else:
        finding_type = "ghost_license"
        severity     = "high"
        title        = f"Compte fantôme — {display_name}"
        remediation  = (
            f"Vérifier si {display_name} ({email}) est un employé actif. "
            f"Si non, supprimer le compte et annuler les licences associées."
        )

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.risk_findings
              (organization_id, finding_type, severity, title, description,
               entity_ref, cost_impact_monthly, remediation, detected_at)
            VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s,%s,now())
            ON CONFLICT (organization_id, finding_type, title) DO UPDATE SET
              description         = EXCLUDED.description,
              cost_impact_monthly = EXCLUDED.cost_impact_monthly,
              remediation         = EXCLUDED.remediation,
              detected_at         = now(),
              resolved_at         = NULL,
              is_acknowledged     = false
            """,
            (
                org_id, finding_type, severity, title, risk_reason,
                json.dumps({"email": email, "name": display_name}),
                cost_monthly, remediation,
            ),
        )

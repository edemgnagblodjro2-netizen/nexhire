"""
Moteur de corrélation cross-connecteurs — modèle universel.
Analyse les identity_accounts pour détecter :
- Comptes orphelins : terminé dans Workday, encore actif ailleurs
- Comptes fantômes  : actif dans des apps, absent de Workday
- Licences orphelines : licence active pour une identité terminée
Met à jour le statut des comptes et crée des risk_findings.
"""

from __future__ import annotations

import json
from db import get_db, rows as db_rows


def correlate_identities(org_id: str) -> dict:
    """
    Compare le statut Workday (RH, source de vérité) avec les comptes
    dans chaque autre système. Génère risk_findings pour chaque anomalie.
    """
    # Charge toutes les identités (source Workday)
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, canonical_email, full_name, status
            FROM public.identities
            WHERE organization_id = %s AND source_of_truth = 'workday'
            """,
            (org_id,),
        )
        identities = {str(r["id"]): dict(r) for r in cur.fetchall()}

    # Charge tous les comptes non-Workday
    with get_db() as cur:
        cur.execute(
            """
            SELECT ia.id, ia.identity_id, ia.source_connector,
                   ia.external_id, ia.external_email, ia.display_name, ia.status,
                   i.status AS workday_status, i.full_name AS workday_name,
                   i.canonical_email
            FROM public.identity_accounts ia
            LEFT JOIN public.identities i ON i.id = ia.identity_id
            WHERE ia.organization_id = %s
              AND ia.source_connector != 'workday'
              AND ia.status = 'active'
            """,
            (org_id,),
        )
        accounts = db_rows(cur)

    # Charge tous les comptes actifs M365 sans identité liée
    with get_db() as cur:
        cur.execute(
            """
            SELECT ia.id, ia.external_email, ia.display_name, ia.source_connector
            FROM public.identity_accounts ia
            WHERE ia.organization_id = %s
              AND ia.identity_id IS NULL
              AND ia.status = 'active'
            """,
            (org_id,),
        )
        unlinked = db_rows(cur)

    orphans_found = 0
    ghosts_found = 0

    # Règle 1 : compte orphelin (employé terminé mais accès non révoqués)
    for acct in accounts:
        wd_status = acct.get("workday_status")
        if wd_status in ("terminated", "inactive") and acct["status"] == "active":
            _flag_account(org_id, acct["id"], "orphan")
            _create_risk(
                org_id=org_id,
                finding_type="orphan_account",
                severity="critical",
                title=f"Compte orphelin — {acct['display_name'] or acct['external_email']}",
                description=(
                    f"{acct['workday_name'] or acct['display_name']} est marqué "
                    f"{'terminé' if wd_status == 'terminated' else 'inactif'} dans Workday "
                    f"mais son compte {acct['source_connector'].replace('_', ' ').title()} "
                    f"est toujours actif."
                ),
                entity_ref={
                    "email": acct["canonical_email"] or acct["external_email"],
                    "name": acct["workday_name"] or acct["display_name"],
                    "connector": acct["source_connector"],
                },
                cost_impact_monthly=_license_cost(org_id, acct["id"]),
                remediation=(
                    f"Révoquer immédiatement l'accès de "
                    f"{acct['workday_name'] or acct['display_name']} "
                    f"dans {acct['source_connector']} et désactiver la licence associée."
                ),
            )
            orphans_found += 1

    # Règle 2 : compte fantôme (actif dans un système, pas dans Workday)
    for acct in unlinked:
        email = acct.get("external_email", "").lower()
        if not email:
            continue
        # Vérifier que cette personne n'est vraiment pas dans Workday
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM public.identities WHERE organization_id=%s AND canonical_email=%s",
                (org_id, email),
            )
            if cur.fetchone():
                continue  # existe dans Workday, juste non liée → OK

        _flag_account(org_id, acct["id"], "ghost")
        _create_risk(
            org_id=org_id,
            finding_type="ghost_license",
            severity="high",
            title=f"Compte fantôme — {acct['display_name'] or email}",
            description=(
                f"L'utilisateur {acct['display_name'] or email} est actif dans "
                f"{acct['source_connector'].replace('_', ' ').title()} "
                f"mais introuvable dans Workday. Compte non référencé RH."
            ),
            entity_ref={"email": email, "name": acct["display_name"], "connector": acct["source_connector"]},
            cost_impact_monthly=_license_cost(org_id, acct["id"]),
            remediation=(
                f"Vérifier si {acct['display_name'] or email} est un employé actif. "
                f"Si non, supprimer le compte et annuler les licences."
            ),
        )
        ghosts_found += 1

    return {
        "correlations": len(accounts) + len(unlinked),
        "orphans": orphans_found,
        "ghosts": ghosts_found,
        "risks_detected": orphans_found + ghosts_found,
    }


def _flag_account(org_id: str, account_id: str, new_status: str) -> None:
    with get_db() as cur:
        cur.execute(
            "UPDATE public.identity_accounts SET status=%s WHERE id=%s AND organization_id=%s",
            (new_status, account_id, org_id),
        )


def _license_cost(org_id: str, account_id: str) -> float:
    """Retourne le coût mensuel des licences actives pour ce compte."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(lp.unit_cost_monthly), 0) AS total
                FROM public.license_assignments la
                JOIN public.license_pools lp ON lp.id = la.pool_id
                WHERE la.account_id = %s AND la.is_active = true
                """,
                (account_id,),
            )
            r = cur.fetchone()
        return float(r["total"]) if r else 0
    except Exception:
        return 0


def _create_risk(
    org_id: str,
    finding_type: str,
    severity: str,
    title: str,
    description: str,
    entity_ref: dict,
    cost_impact_monthly: float,
    remediation: str,
) -> None:
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
                org_id,
                finding_type,
                severity,
                title,
                description,
                json.dumps(entity_ref),
                cost_impact_monthly,
                remediation,
            ),
        )

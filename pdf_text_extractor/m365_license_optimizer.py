"""
Optimiseur de licences Microsoft 365.
Détecte 6 types d'anomalies sur les licences M365 et génère des risk_findings
avec le montant d'économies mensuel potentiel.

Règles :
  1. Licence inutilisée       — inactif > 90j, licence toujours assignée
  2. Licence surdimensionnée  — E5 mais usage basique (E3 suffirait)
  3. Licence sur-dimensionnée — E3 mais usage minimal (Business Basic suffirait)
  4. Compte orphelin          — terminé Workday, licence M365 encore active
  5. Shared Mailbox avec licence payante
  6. Consultant avec licence interne coûteuse (E3/E5)
"""

from __future__ import annotations

import json
from db import get_db, rows as db_rows

# Coûts de référence M365 ($/utilisateur/mois, CAD approximatif)
_SKU_COST = {
    "E5": 57.0,
    "E3": 22.0,
    "E1": 10.0,
    "Business Premium": 26.0,
    "Business Standard": 15.0,
    "Business Basic": 8.0,
    "Frontline F1": 2.25,
    "Frontline F3": 8.0,
}

_TIER_TO_SKU = {
    "enterprise": "E5",
    "advanced": "E3",
    "standard": "Business Basic",
    "basic": "Business Basic",
    "none": None,
}


def run_m365_optimizer(org_id: str) -> dict:
    """Lance toutes les règles et retourne le résumé des économies."""
    # Résout les findings calculés automatiquement avant de recalculer —
    # évite de conserver des findings obsolètes (ex. 999 jours après correction)
    _reset_calculated_findings(org_id)

    findings = []
    findings += _rule_unused_licenses(org_id)
    findings += _rule_oversized_e5(org_id)
    findings += _rule_oversized_e3(org_id)
    findings += _rule_orphan_accounts(org_id)
    findings += _rule_contractor_licenses(org_id)

    total_savings_monthly = sum(f["savings_monthly"] for f in findings)
    by_type = {}
    for f in findings:
        by_type.setdefault(f["rule"], []).append(f)

    return {
        "total_savings_monthly": round(total_savings_monthly, 2),
        "total_savings_annual": round(total_savings_monthly * 12, 2),
        "findings_count": len(findings),
        "by_rule": {
            rule: {
                "count": len(items),
                "savings_monthly": round(sum(i["savings_monthly"] for i in items), 2),
                "users": [i["display_name"] for i in items[:10]],
            }
            for rule, items in by_type.items()
        },
        "top_findings": sorted(findings, key=lambda x: x["savings_monthly"], reverse=True)[:20],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Règle 1 — Licences inutilisées (inactif > 90 jours)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_unused_licenses(org_id: str) -> list[dict]:
    """Utilisateurs avec score d'activité = 0 (inactifs > 90j)."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  ia.external_email AS email,
                  ia.display_name,
                  la.sku_name,
                  lu.activity_score,
                  lu.metrics->>'days_inactive' AS days_inactive,
                  lu.metrics->>'data_source'   AS data_source,
                  lp.unit_cost_monthly AS sku_cost
                FROM public.license_usage lu
                JOIN public.license_assignments la ON la.id = lu.assignment_id
                JOIN public.identity_accounts ia   ON ia.id = la.account_id
                LEFT JOIN public.license_pools lp  ON lp.id = la.pool_id
                WHERE la.organization_id = %s
                  AND la.connector_type = 'microsoft_365'
                  AND la.is_active = true
                  AND lu.activity_score = 0
                  AND (lu.metrics->>'days_inactive')::int > 90
                  AND COALESCE(lu.metrics->>'data_source', 'report') != 'created_date'
                ORDER BY sku_cost DESC
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception:
        rows = []

    findings = []
    for r in rows:
        cost = float(r.get("sku_cost") or _SKU_COST.get(r["sku_name"], 22))
        savings = cost  # économie = coût total de la licence

        days_str = r.get("days_inactive", "> 90")
        source_map = {"report": "rapport d'usage Graph", "signin": "historique de connexion"}
        source_lbl = source_map.get(r.get("data_source", "report"), "données Graph")
        _upsert_risk_finding(
            org_id=org_id,
            finding_type="unused_license",
            severity="high",
            title=f"Licence M365 inutilisée — {r['display_name'] or r['email']}",
            description=(
                f"Licence {r['sku_name']} ({cost:.0f} $/mois) assignée à "
                f"{r['display_name'] or r['email']} sans aucune activité depuis "
                f"{days_str} jours (source : {source_lbl})."
            ),
            cost_impact_monthly=savings,
            remediation=f"Révoquer la licence {r['sku_name']} de {r['email']} et récupérer la licence.",
        )
        findings.append(
            {
                "rule": "unused_license",
                "email": r["email"],
                "display_name": r["display_name"],
                "current_sku": r["sku_name"],
                "suggested_sku": None,
                "savings_monthly": savings,
                "reason": f"Inactif depuis {days_str} jours ({source_lbl})",
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 2 — E5 surdimensionné (E3 suffirait)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_oversized_e5(org_id: str) -> list[dict]:
    """Utilisateurs avec licence E5 mais usage réel ≤ E3."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  ia.external_email AS email,
                  ia.display_name,
                  lu.activity_score,
                  lu.tier_needed,
                  lu.metrics
                FROM public.license_usage lu
                JOIN public.license_assignments la ON la.id = lu.assignment_id
                JOIN public.identity_accounts ia   ON ia.id = la.account_id
                WHERE la.organization_id = %s
                  AND la.connector_type = 'microsoft_365'
                  AND la.sku_name = 'E5'
                  AND la.is_active = true
                  AND lu.tier_needed IN ('advanced','standard','basic','none')
                  AND lu.activity_score > 0
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception:
        rows = []

    findings = []
    for r in rows:
        tier = r.get("tier_needed", "advanced")
        target = _TIER_TO_SKU.get(tier, "E3")
        if not target:
            continue
        savings = _SKU_COST["E5"] - _SKU_COST.get(target, 22)
        if savings <= 0:
            continue

        _upsert_risk_finding(
            org_id=org_id,
            finding_type="unused_license",
            severity="medium",
            title=f"Licence E5 surdimensionnée — {r['display_name'] or r['email']}",
            description=(
                f"{r['display_name'] or r['email']} possède une licence E5 "
                f"({_SKU_COST['E5']:.0f} $/mois) mais n'utilise que les fonctionnalités "
                f"d'un {target} ({_SKU_COST.get(target, 22):.0f} $/mois). "
                f"Fonctionnalités avancées (Defender, Purview, Power BI Pro) non utilisées."
            ),
            cost_impact_monthly=savings,
            remediation=f"Dégrader la licence de {r['email']} de E5 vers {target}. Économie : {savings:.0f} $/mois.",
        )
        findings.append(
            {
                "rule": "oversized_e5",
                "email": r["email"],
                "display_name": r["display_name"],
                "current_sku": "E5",
                "suggested_sku": target,
                "savings_monthly": round(savings, 2),
                "reason": f"Usage réel : {tier} — fonctions avancées E5 non utilisées",
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 3 — E3 surdimensionné (Business Basic suffirait)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_oversized_e3(org_id: str) -> list[dict]:
    """Utilisateurs E3 qui n'utilisent qu'Outlook + Teams → Business Basic."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  ia.external_email AS email,
                  ia.display_name,
                  lu.activity_score,
                  lu.tier_needed,
                  lu.metrics
                FROM public.license_usage lu
                JOIN public.license_assignments la ON la.id = lu.assignment_id
                JOIN public.identity_accounts ia   ON ia.id = la.account_id
                WHERE la.organization_id = %s
                  AND la.connector_type = 'microsoft_365'
                  AND la.sku_name = 'E3'
                  AND la.is_active = true
                  AND lu.tier_needed IN ('standard','basic')
                  AND lu.activity_score > 0
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception:
        rows = []

    findings = []
    for r in rows:
        savings = _SKU_COST["E3"] - _SKU_COST["Business Basic"]
        if savings <= 0:
            continue

        _upsert_risk_finding(
            org_id=org_id,
            finding_type="unused_license",
            severity="medium",
            title=f"Licence E3 surdimensionnée — {r['display_name'] or r['email']}",
            description=(
                f"{r['display_name'] or r['email']} possède une licence E3 "
                f"({_SKU_COST['E3']:.0f} $/mois) mais n'utilise qu'Outlook et Teams. "
                f"Business Basic ({_SKU_COST['Business Basic']:.0f} $/mois) serait suffisant."
            ),
            cost_impact_monthly=savings,
            remediation=f"Dégrader vers Business Basic. Économie : {savings:.0f} $/mois.",
        )
        findings.append(
            {
                "rule": "oversized_e3",
                "email": r["email"],
                "display_name": r["display_name"],
                "current_sku": "E3",
                "suggested_sku": "Business Basic",
                "savings_monthly": round(savings, 2),
                "reason": "Usage limité à Outlook + Teams — SharePoint/Intune non utilisés",
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 4 — Comptes orphelins avec licences actives
# ─────────────────────────────────────────────────────────────────────────────


def _rule_orphan_accounts(org_id: str) -> list[dict]:
    """Comptes M365 actifs pour des identités terminées dans Workday."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  ia.external_email AS email,
                  ia.display_name,
                  la.sku_name,
                  lp.unit_cost_monthly AS sku_cost,
                  i.status AS workday_status
                FROM public.identity_accounts ia
                JOIN public.identities i        ON i.id = ia.identity_id
                LEFT JOIN public.license_assignments la ON la.account_id = ia.id AND la.is_active = true
                LEFT JOIN public.license_pools lp       ON lp.id = la.pool_id
                WHERE ia.organization_id = %s
                  AND ia.source_connector = 'microsoft_365'
                  AND ia.status IN ('active','orphan')
                  AND i.status IN ('terminated','inactive')
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception:
        rows = []

    findings = []
    seen = set()
    for r in rows:
        email = r["email"]
        if email in seen:
            continue
        seen.add(email)
        cost = float(r.get("sku_cost") or _SKU_COST.get(r.get("sku_name", "E3"), 22))
        wd_stat = r.get("workday_status", "terminated")

        _upsert_risk_finding(
            org_id=org_id,
            finding_type="orphan_account",
            severity="critical",
            title=f"Compte M365 orphelin — {r['display_name'] or email}",
            description=(
                f"{r['display_name'] or email} est {'terminé' if wd_stat == 'terminated' else 'inactif'} "
                f"dans Workday mais son compte Microsoft 365 est toujours actif "
                f"avec une licence {r.get('sku_name','M365')} ({cost:.0f} $/mois). "
                f"Risque d'accès non autorisé aux données de l'organisation."
            ),
            cost_impact_monthly=cost,
            remediation=(
                f"URGENT : Désactiver le compte M365 de {email}, "
                f"révoquer la licence {r.get('sku_name','M365')} et "
                f"vérifier les accès SharePoint et Teams actifs."
            ),
        )
        findings.append(
            {
                "rule": "orphan_m365",
                "email": email,
                "display_name": r["display_name"],
                "current_sku": r.get("sku_name"),
                "suggested_sku": None,
                "savings_monthly": cost,
                "reason": f"Employé {wd_stat} dans Workday, accès M365 non révoqué",
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 5 — Consultants avec licences internes coûteuses
# ─────────────────────────────────────────────────────────────────────────────


def _rule_contractor_licenses(org_id: str) -> list[dict]:
    """Consultants/partenaires avec licences E3/E5 — Frontline F1 suffit."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  ia.external_email AS email,
                  ia.display_name,
                  la.sku_name,
                  lp.unit_cost_monthly AS sku_cost,
                  i.identity_type
                FROM public.identity_accounts ia
                JOIN public.identities i        ON i.id = ia.identity_id
                LEFT JOIN public.license_assignments la ON la.account_id = ia.id AND la.is_active = true
                LEFT JOIN public.license_pools lp       ON lp.id = la.pool_id
                WHERE ia.organization_id = %s
                  AND ia.source_connector = 'microsoft_365'
                  AND ia.status = 'active'
                  AND i.identity_type IN ('contractor','partner','vendor')
                  AND la.sku_name IN ('E3','E5')
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception:
        rows = []

    findings = []
    for r in rows:
        sku = r.get("sku_name", "E3")
        cost = float(r.get("sku_cost") or _SKU_COST.get(sku, 22))
        savings = cost - _SKU_COST["Frontline F1"]
        if savings <= 0:
            continue
        id_type = r.get("identity_type", "consultant")

        findings.append(
            {
                "rule": "contractor_license",
                "email": r["email"],
                "display_name": r["display_name"],
                "current_sku": sku,
                "suggested_sku": "Frontline F1",
                "savings_monthly": round(savings, 2),
                "reason": f"{id_type.capitalize()} avec licence interne {sku}",
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Helpers — persistance
# ─────────────────────────────────────────────────────────────────────────────


def _reset_calculated_findings(org_id: str) -> None:
    """
    Marque comme résolus les findings calculés automatiquement (non acknowledgés)
    avant chaque recalcul. Évite de garder des findings obsolètes en base
    quand la règle ne s'applique plus (ex. compte récent, données corrigées).
    """
    with get_db() as cur:
        cur.execute(
            """
            UPDATE public.risk_findings
            SET resolved_at = now()
            WHERE organization_id = %s
              AND finding_type IN ('unused_license', 'orphan_account')
              AND resolved_at IS NULL
              AND is_acknowledged = false
            """,
            (org_id,),
        )


def _upsert_risk_finding(
    org_id: str,
    finding_type: str,
    severity: str,
    title: str,
    description: str,
    cost_impact_monthly: float,
    remediation: str,
) -> None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.risk_findings
              (organization_id, finding_type, severity, title, description,
               cost_impact_monthly, remediation, detected_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,now())
            ON CONFLICT (organization_id, finding_type, title) DO UPDATE SET
              severity            = EXCLUDED.severity,
              description         = EXCLUDED.description,
              cost_impact_monthly = EXCLUDED.cost_impact_monthly,
              remediation         = EXCLUDED.remediation,
              detected_at         = now(),
              resolved_at         = NULL
            """,
            (org_id, finding_type, severity, title, description, cost_impact_monthly, remediation),
        )


# ─────────────────────────────────────────────────────────────────────────────
# API helper — résumé rapide sans sync
# ─────────────────────────────────────────────────────────────────────────────


def get_license_summary(org_id: str) -> dict:
    """Résumé des licences M365 : pools, assignées, économies potentielles."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  sku_name,
                  quantity_total,
                  quantity_assigned,
                  unit_cost_monthly,
                  (quantity_total - quantity_assigned) AS quantity_unassigned,
                  unit_cost_monthly * quantity_total    AS monthly_total,
                  unit_cost_monthly * (quantity_total - quantity_assigned) AS monthly_waste
                FROM public.license_pools
                WHERE organization_id = %s AND connector_type = 'microsoft_365'
                ORDER BY monthly_total DESC
                """,
                (org_id,),
            )
            pools = db_rows(cur)

        with get_db() as cur:
            cur.execute(
                """
                SELECT
                  -- Même critère que l'optimiseur : données réelles uniquement
                  COUNT(*) FILTER (
                    WHERE lu.activity_score = 0
                      AND (lu.metrics->>'days_inactive')::int > 90
                      AND COALESCE(lu.metrics->>'data_source','report') != 'created_date'
                  ) AS inactive_count,
                  COUNT(*) FILTER (WHERE lu.tier_needed = 'standard'
                                     AND la.sku_name IN ('E3','E5'))        AS oversized_count,
                  COUNT(*) FILTER (
                    WHERE lu.tier_needed = 'none'
                      AND lu.activity_score = 0
                      AND COALESCE(lu.metrics->>'data_source','report') != 'created_date'
                  ) AS revoke_count,
                  COALESCE(SUM(lp.unit_cost_monthly)
                    FILTER (
                      WHERE lu.activity_score = 0
                        AND (lu.metrics->>'days_inactive')::int > 90
                        AND COALESCE(lu.metrics->>'data_source','report') != 'created_date'
                    ), 0) AS inactive_cost
                FROM public.license_usage lu
                JOIN public.license_assignments la ON la.id = lu.assignment_id
                LEFT JOIN public.license_pools lp  ON lp.id = la.pool_id
                WHERE la.organization_id = %s
                  AND la.connector_type = 'microsoft_365'
                  AND la.is_active = true
                """,
                (org_id,),
            )
            stats = cur.fetchone()
            stats = dict(stats) if stats else {}

        return {
            "pools": pools,
            "inactive_count": int(stats.get("inactive_count") or 0),
            "oversized_count": int(stats.get("oversized_count") or 0),
            "revoke_count": int(stats.get("revoke_count") or 0),
            "inactive_cost": float(stats.get("inactive_cost") or 0),
        }
    except Exception:
        return {"pools": [], "inactive_count": 0, "oversized_count": 0, "revoke_count": 0, "inactive_cost": 0}

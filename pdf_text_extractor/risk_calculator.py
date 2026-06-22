"""
Calculateur de risques organisationnels.
Applique des règles métier sur les tables existantes (budget_entries, contracts,
licenses, it_applications) pour générer des risk_findings.
"""
from __future__ import annotations

from db import get_db, rows as db_rows


def calculate_all_risks(org_id: str) -> dict:
    """Lance tous les calculateurs et retourne le nombre de risques détectés."""
    return {
        "budget_overspend": _risk_budget_overspend(org_id),
        "contract_expiry":  _risk_contract_expiry(org_id),
        "unused_licenses":  _risk_unused_licenses(org_id),
        "duplicate_tools":  _risk_duplicate_tools(org_id),
    }


def get_risk_summary(org_id: str) -> dict:
    """Résumé des risques actifs non acquittés."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL) AS critical,
              COUNT(*) FILTER (WHERE severity = 'high'     AND resolved_at IS NULL) AS high,
              COUNT(*) FILTER (WHERE severity = 'medium'   AND resolved_at IS NULL) AS medium,
              COUNT(*) FILTER (WHERE severity = 'low'      AND resolved_at IS NULL) AS low,
              COALESCE(SUM(cost_impact_monthly)
                FILTER (WHERE resolved_at IS NULL AND is_acknowledged = false), 0) AS total_cost_monthly
            FROM public.risk_findings
            WHERE organization_id = %s AND is_acknowledged = false
            """,
            (org_id,),
        )
        r = cur.fetchone()
    if not r:
        return {"critical": 0, "high": 0, "medium": 0, "low": 0, "total_cost_monthly": 0}
    return dict(r)


# ── Règles métier ─────────────────────────────────────────────────────────────

def _risk_budget_overspend(org_id: str) -> int:
    """Dépassement budget : dépenses réelles > 95 % du budget alloué."""
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT d.id AS dept_id, d.name AS dept_name,
                   COALESCE(SUM(b.allocated), 0) AS total_alloc,
                   COALESCE(SUM(b.actual),    0) AS total_actual
            FROM public.departments d
            LEFT JOIN public.budget_entries b ON b.department_id = d.id
            WHERE d.organization_id = %s
            GROUP BY d.id, d.name
            HAVING COALESCE(SUM(b.allocated), 0) > 0
            """,
            (org_id,),
        )
        depts = db_rows(cur)

    for d in depts:
        alloc  = float(d["total_alloc"])
        actual = float(d["total_actual"])
        pct    = actual / alloc * 100 if alloc > 0 else 0
        if pct < 95:
            continue

        overage  = actual - alloc
        severity = "critical" if pct >= 105 else "high"
        sign     = "Dépassement" if overage > 0 else "Limite critique"
        _upsert_risk(
            org_id=org_id,
            dept_id=str(d["dept_id"]),
            finding_type="budget_overspend",
            severity=severity,
            title=f"Dépassement budgétaire — {d['dept_name']}",
            description=(
                f"Budget consommé à {pct:.0f} % "
                f"(alloué : {alloc:,.0f} $, réel : {actual:,.0f} $). "
                f"{sign} de {abs(overage):,.0f} $."
            ),
            cost_impact_monthly=overage / 12 if overage > 0 else 0,
            remediation="Revoir les dépenses du département. Ajuster le budget ou réduire les coûts.",
        )
        count += 1
    return count


def _risk_contract_expiry(org_id: str) -> int:
    """Contrats expirant dans les 30 prochains jours."""
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT c.id, c.vendor, c.annual_value, c.renewal_date,
                   c.department_id, d.name AS dept_name,
                   (c.renewal_date - CURRENT_DATE) AS days_left
            FROM public.contracts c
            LEFT JOIN public.departments d ON d.id = c.department_id
            WHERE c.organization_id = %s
              AND c.renewal_date IS NOT NULL
              AND c.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            ORDER BY c.renewal_date
            """,
            (org_id,),
        )
        contracts = db_rows(cur)

    for c in contracts:
        delta    = c["days_left"]
        days     = delta.days if hasattr(delta, "days") else int(delta or 0)
        severity = "critical" if days <= 7 else "high" if days <= 14 else "medium"
        val      = float(c["annual_value"] or 0)
        _upsert_risk(
            org_id=org_id,
            dept_id=str(c["department_id"]) if c["department_id"] else None,
            finding_type="contract_expiry",
            severity=severity,
            title=f"Contrat à renouveler — {c['vendor']}",
            description=(
                f"Le contrat avec {c['vendor']} expire dans {days} jour{'s' if days != 1 else ''}. "
                f"Valeur annuelle : {val:,.0f} $."
            ),
            cost_impact_monthly=val / 12,
            remediation=f"Initier le processus de renouvellement avec {c['vendor']} immédiatement.",
        )
        count += 1
    return count


def _risk_unused_licenses(org_id: str) -> int:
    """Licences avec taux d'utilisation < 20 %."""
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT l.id, l.product_name, l.quantity, l.assigned_count,
                   l.cost_per_unit, l.department_id, d.name AS dept_name,
                   CASE WHEN l.quantity > 0
                        THEN ROUND(l.assigned_count::numeric / l.quantity * 100)
                        ELSE 0 END AS usage_pct
            FROM public.licenses l
            LEFT JOIN public.departments d ON d.id = l.department_id
            WHERE l.organization_id = %s
              AND l.quantity > 0
              AND (l.assigned_count::numeric / l.quantity) < 0.20
            """,
            (org_id,),
        )
        licenses = db_rows(cur)

    for lic in licenses:
        unused  = int(lic["quantity"] or 0) - int(lic["assigned_count"] or 0)
        waste   = unused * float(lic["cost_per_unit"] or 0)
        pct     = int(lic["usage_pct"] or 0)
        severity = "high" if waste > 500 else "medium"
        _upsert_risk(
            org_id=org_id,
            dept_id=str(lic["department_id"]) if lic["department_id"] else None,
            finding_type="unused_license",
            severity=severity,
            title=f"Licences inutilisées — {lic['product_name']}",
            description=(
                f"{unused} licence{'s' if unused != 1 else ''} non assignée{'s' if unused != 1 else ''} "
                f"sur {lic['quantity']} ({pct} % d'utilisation). "
                f"Coût mensuel non utilisé : {waste:,.0f} $."
            ),
            cost_impact_monthly=waste,
            remediation=(
                f"Réduire le contrat de {unused} licence{'s' if unused != 1 else ''} "
                f"ou réassigner à d'autres utilisateurs."
            ),
        )
        count += 1
    return count


def _risk_duplicate_tools(org_id: str) -> int:
    """Catégories applicatives avec ≥ 3 outils actifs (redondance potentielle)."""
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT category,
                   COUNT(DISTINCT id)    AS tool_count,
                   SUM(monthly_cost)     AS total_cost,
                   ARRAY_AGG(name ORDER BY name) AS tools
            FROM public.it_applications
            WHERE organization_id = %s
              AND status = 'active'
              AND category IS NOT NULL
            GROUP BY category
            HAVING COUNT(DISTINCT id) >= 3
            """,
            (org_id,),
        )
        duplicates = db_rows(cur)

    for dup in duplicates:
        monthly  = float(dup["total_cost"] or 0)
        tool_list = (dup["tools"] or [])[:5]
        _upsert_risk(
            org_id=org_id,
            dept_id=None,
            finding_type="duplicate_tool",
            severity="medium",
            title=f"Outils en doublon — {dup['category']}",
            description=(
                f"{dup['tool_count']} outils dans la catégorie « {dup['category']} » : "
                f"{', '.join(tool_list)}{'…' if len(dup['tools'] or []) > 5 else ''}. "
                f"Coût mensuel combiné : {monthly:,.0f} $."
            ),
            cost_impact_monthly=monthly * 0.40,
            remediation="Standardiser sur un outil unique par catégorie et migrer les contrats.",
        )
        count += 1
    return count


# ── Persistance ───────────────────────────────────────────────────────────────

def _upsert_risk(
    org_id: str,
    dept_id: str | None,
    finding_type: str,
    severity: str,
    title: str,
    description: str,
    cost_impact_monthly: float = 0,
    remediation: str | None = None,
) -> None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.risk_findings
              (organization_id, department_id, finding_type, severity,
               title, description, cost_impact_monthly, remediation, detected_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
            ON CONFLICT (organization_id, finding_type, title) DO UPDATE SET
              severity            = EXCLUDED.severity,
              description         = EXCLUDED.description,
              cost_impact_monthly = EXCLUDED.cost_impact_monthly,
              remediation         = EXCLUDED.remediation,
              detected_at         = now(),
              resolved_at         = NULL
            """,
            (
                org_id, dept_id or None, finding_type, severity,
                title, description, cost_impact_monthly, remediation,
            ),
        )

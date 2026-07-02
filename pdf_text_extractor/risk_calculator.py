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
        "contract_expiry": _risk_contract_expiry(org_id),
        "unused_licenses": _risk_unused_licenses(org_id),
        "duplicate_tools": _risk_duplicate_tools(org_id),
        "auto_renew_risk": _risk_auto_renew(org_id),
        "commitment_gap": _risk_commitment_gap(org_id),
        "shadow_it": _risk_shadow_it(org_id),
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
        alloc = float(d["total_alloc"])
        actual = float(d["total_actual"])
        pct = actual / alloc * 100 if alloc > 0 else 0
        if pct < 95:
            continue

        overage = actual - alloc
        severity = "critical" if pct >= 105 else "high"
        sign = "Dépassement" if overage > 0 else "Limite critique"
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
        delta = c["days_left"]
        days = delta.days if hasattr(delta, "days") else int(delta or 0)
        severity = "critical" if days <= 7 else "high" if days <= 14 else "medium"
        val = float(c["annual_value"] or 0)
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
    """Analyse les licences en 2 catégories distinctes :
    1. Surplus réel = non assignées dépassant le buffer_target déclaré → à réduire au renouvellement.
    2. Assignées inactives = assignées depuis ≥ 90 j sans activité enregistrée → à récupérer maintenant.
    Ne déclenche PAS d'alerte sur les licences en stock intentionnel (buffer_target).
    """
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT l.id, l.product_name, l.quantity, l.assigned_count,
                   COALESCE(l.buffer_target, 0) AS buffer_target,
                   l.cost_per_unit, l.billing_cycle,
                   l.department_id, d.name AS dept_name
            FROM public.licenses l
            LEFT JOIN public.departments d ON d.id = l.department_id
            WHERE l.organization_id = %s
              AND l.quantity > 0
            """,
            (org_id,),
        )
        licenses = db_rows(cur)

    for lic in licenses:
        qty = int(lic["quantity"] or 0)
        assigned = int(lic["assigned_count"] or 0)
        buffer = int(lic["buffer_target"] or 0)
        unit = float(lic["cost_per_unit"] or 0)
        cycle = lic.get("billing_cycle", "annual")
        monthly = unit if cycle == "monthly" else unit / 12 if cycle == "annual" else 0

        # ── Catégorie 1 : surplus au-delà du buffer déclaré ──────────────────
        # Stock non assigné = qty - assigned. Portion intentionnelle = buffer.
        # Surplus = stock non assigné - buffer. Si > 0 : à réduire au renouvellement.
        unassigned = qty - assigned
        surplus = unassigned - buffer
        if surplus > 0 and monthly > 0:
            waste_monthly = surplus * monthly
            severity = "high" if waste_monthly > 200 else "medium"
            _upsert_risk(
                org_id=org_id,
                dept_id=str(lic["department_id"]) if lic["department_id"] else None,
                finding_type="license_surplus",
                severity=severity,
                title=f"Surplus de licences à réduire — {lic['product_name']}",
                description=(
                    f"{surplus} licence{'s' if surplus != 1 else ''} en excédent au-delà du stock tampon "
                    f"({buffer} réservée{'s' if buffer != 1 else ''}) sur {qty} achetées. "
                    f"Coût mensuel du surplus : {waste_monthly:,.0f} $. "
                    f"À négocier lors du prochain renouvellement."
                ),
                cost_impact_monthly=waste_monthly,
                remediation=(
                    f"Réduire de {surplus} licence{'s' if surplus != 1 else ''} au renouvellement. "
                    f"Si des embauches sont prévues, ajustez d'abord le stock tampon (buffer_target)."
                ),
            )
            count += 1

        # ── Catégorie 2 : assignées sans activité déclarée (90 j+) ───────────
        # Applicable aux licences saisies manuellement sans connecteur d'activité.
        # Heuristique : si assigned > 0 mais notes contient "inactif" ou usage_pct = 0
        # Pour les licences M365, m365_license_optimizer gère ce cas avec les données Graph réelles.
        # Ici on ne lève cette alerte que si assigned > qty (incohérence de saisie).
        if assigned > qty:
            _upsert_risk(
                org_id=org_id,
                dept_id=str(lic["department_id"]) if lic["department_id"] else None,
                finding_type="license_overassigned",
                severity="medium",
                title=f"Incohérence de saisie — {lic['product_name']}",
                description=(
                    f"Le nombre de licences assignées ({assigned}) dépasse "
                    f"la quantité achetée ({qty}). Vérifiez la saisie."
                ),
                cost_impact_monthly=0,
                remediation="Corriger le champ 'Licences assignées' dans Parc IT → Licences.",
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
        monthly = float(dup["total_cost"] or 0)
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


def _risk_auto_renew(org_id: str) -> int:
    """Contrats avec auto_renew=true dont la fenêtre de résiliation est imminente.

    La fenêtre = cancellation_notice_days avant le renewal_date.
    Si aujourd'hui > renewal_date - cancellation_notice_days → alerte critique :
    l'organisation risque d'être reconduite automatiquement sans avoir pu résilier.
    """
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT c.id, c.vendor, c.annual_value, c.renewal_date,
                   c.cancellation_notice_days,
                   c.department_id, d.name AS dept_name,
                   (c.renewal_date - CURRENT_DATE) AS days_to_renewal,
                   (c.renewal_date - c.cancellation_notice_days) AS deadline_date
            FROM public.contracts c
            LEFT JOIN public.departments d ON d.id = c.department_id
            WHERE c.organization_id = %s
              AND c.auto_renew = true
              AND c.renewal_date IS NOT NULL
              AND c.renewal_date > CURRENT_DATE
              AND CURRENT_DATE >= (c.renewal_date - c.cancellation_notice_days)
              AND c.status = 'active'
            ORDER BY c.renewal_date
            """,
            (org_id,),
        )
        contracts = db_rows(cur)

    for c in contracts:
        delta = c["days_to_renewal"]
        days = delta.days if hasattr(delta, "days") else int(delta or 0)
        notice = int(c["cancellation_notice_days"] or 60)
        val = float(c["annual_value"] or 0)
        deadline = str(c["deadline_date"])[:10] if c["deadline_date"] else "inconnue"
        _upsert_risk(
            org_id=org_id,
            dept_id=str(c["department_id"]) if c["department_id"] else None,
            finding_type="auto_renew_risk",
            severity="critical",
            title=f"Fenêtre de résiliation dépassée — {c['vendor']}",
            description=(
                f"Le contrat avec {c['vendor']} se renouvelle automatiquement dans {days} jour{'s' if days != 1 else ''} "
                f"({str(c['renewal_date'])[:10]}). La fenêtre de résiliation ({notice} jours) est déjà dépassée depuis le {deadline}. "
                f"Sans action immédiate, ce contrat ({val:,.0f} $/an) sera reconduit pour une nouvelle période."
            ),
            cost_impact_monthly=val / 12,
            remediation=(
                f"Contacter {c['vendor']} immédiatement pour négocier ou résilier. "
                f"Même si la fenêtre est dépassée, certains fournisseurs acceptent une résiliation tardive. "
                f"Sinon, préparez la renégociation dès maintenant pour le prochain cycle."
            ),
        )
        count += 1
    return count


def _risk_commitment_gap(org_id: str) -> int:
    """Contrats avec un engagement minimum non atteint.

    min_commitment_qty = sièges/unités plancher contractuel.
    actual_seats_used  = usage réel déclaré par l'admin.
    Si actual < min_commitment → l'organisation paie des unités fantômes.
    """
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT c.id, c.vendor, c.annual_value, c.renewal_date,
                   c.min_commitment_qty, c.actual_seats_used,
                   c.department_id, d.name AS dept_name
            FROM public.contracts c
            LEFT JOIN public.departments d ON d.id = c.department_id
            WHERE c.organization_id = %s
              AND c.min_commitment_qty IS NOT NULL
              AND c.actual_seats_used IS NOT NULL
              AND c.actual_seats_used < c.min_commitment_qty
              AND c.status = 'active'
            """,
            (org_id,),
        )
        contracts = db_rows(cur)

    for c in contracts:
        min_qty = int(c["min_commitment_qty"])
        actual = int(c["actual_seats_used"])
        gap = min_qty - actual
        val = float(c["annual_value"] or 0)
        unit_cost = val / min_qty / 12 if min_qty > 0 else 0
        waste_monthly = gap * unit_cost
        severity = "high" if waste_monthly > 300 else "medium"
        _upsert_risk(
            org_id=org_id,
            dept_id=str(c["department_id"]) if c["department_id"] else None,
            finding_type="commitment_gap",
            severity=severity,
            title=f"Engagement minimum non atteint — {c['vendor']}",
            description=(
                f"Contrat {c['vendor']} : engagement contractuel de {min_qty} sièges, "
                f"utilisation réelle de {actual} ({gap} sièges fantômes payés). "
                f"Coût mensuel des unités non utilisées : {waste_monthly:,.0f} $."
            ),
            cost_impact_monthly=waste_monthly,
            remediation=(
                f"Lors du renouvellement, négocier un volume minimum aligné sur l'usage réel ({actual} sièges). "
                f"D'ici là, identifier si des équipes pourraient absorber les {gap} sièges excédentaires."
            ),
        )
        count += 1
    return count


def _risk_shadow_it(org_id: str) -> int:
    """Détecte les fournisseurs récurrents dans les transactions financières
    qui n'ont aucun contrat ni licence déclaré dans NexHire.

    Critère : vendor référencé dans ≥ 2 transactions financières (paid) au cours
    des 12 derniers mois, dont le nom ne correspond à aucun vendor lié à un contrat actif.
    Exclut les catégories non-logicielles (maintenance, hardware).
    """
    count = 0
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              v.id AS vendor_id,
              v.name AS vendor_name,
              v.category,
              COUNT(ft.id)           AS txn_count,
              SUM(ft.amount)         AS total_amount,
              MAX(ft.transaction_date) AS last_txn
            FROM public.vendors v
            JOIN public.financial_transactions ft
              ON ft.vendor_id = v.id
             AND ft.organization_id = %s
             AND ft.status = 'paid'
             AND ft.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
            WHERE v.organization_id = %s
              AND v.category IN ('software','cloud','telecom')
              AND v.contract_id IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM public.contracts c
                  WHERE c.organization_id = %s
                    AND c.status = 'active'
                    AND LOWER(c.vendor) = LOWER(v.name)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.licenses l
                  WHERE l.organization_id = %s
                    AND LOWER(l.vendor) = LOWER(v.name)
              )
            GROUP BY v.id, v.name, v.category
            HAVING COUNT(ft.id) >= 2
            ORDER BY total_amount DESC
            """,
            (org_id, org_id, org_id, org_id),
        )
        shadow_vendors = db_rows(cur)

    for sv in shadow_vendors:
        total = float(sv["total_amount"] or 0)
        monthly_est = total / 12
        severity = "high" if total > 1000 else "medium"
        _upsert_risk(
            org_id=org_id,
            dept_id=None,
            finding_type="shadow_it",
            severity=severity,
            title=f"Shadow IT détecté — {sv['vendor_name']}",
            description=(
                f"{sv['vendor_name']} (catégorie : {sv['category']}) apparaît dans "
                f"{sv['txn_count']} transaction{'s' if sv['txn_count'] != 1 else ''} financière{'s' if sv['txn_count'] != 1 else ''} "
                f"({total:,.0f} $ sur 12 mois) mais n'a aucun contrat ni licence déclaré dans NexHire. "
                f"Outil potentiellement acheté hors processus d'approvisionnement officiel."
            ),
            cost_impact_monthly=monthly_est,
            remediation=(
                f"Identifier le département qui utilise {sv['vendor_name']} et créer le contrat ou la licence correspondante. "
                f"Vérifier si cet outil a été évalué par la sécurité et s'il existe un accord de traitement des données (DPA)."
            ),
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
                org_id,
                dept_id or None,
                finding_type,
                severity,
                title,
                description,
                cost_impact_monthly,
                remediation,
            ),
        )

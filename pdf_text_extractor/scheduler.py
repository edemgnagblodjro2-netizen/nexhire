"""Tâches planifiées — rapport mensuel + alertes licences."""
from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def sync_entra_all_orgs() -> None:
    """Synchronise Entra ID (MFA, rôles, groupes, membres) pour toutes les orgs M365 actives."""
    try:
        from db import get_db, rows
        from entra_collector import collect_entra_id
        from entra_risk_analyzer import run_entra_risk_analyzer
    except Exception as exc:
        logger.error("scheduler import error (entra sync): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT DISTINCT c.organization_id
                FROM connectors c
                WHERE c.connector_type = 'microsoft_365'
                  AND c.status = 'active'
                """
            )
            orgs = [r["organization_id"] for r in rows(cur)]
    except Exception as exc:
        logger.error("scheduler DB error (entra sync): %s", exc)
        return

    synced = errors = 0
    for org_id in orgs:
        try:
            stats = collect_entra_id(str(org_id))
            risks = run_entra_risk_analyzer(str(org_id))
            logger.info(
                "Entra sync org=%s postures=%d findings=%d",
                org_id,
                stats.get("postures_updated", 0),
                risks.get("findings_count", 0),
            )
            synced += 1
        except Exception as exc:
            logger.error("Entra sync failed org=%s : %s", org_id, exc)
            errors += 1

    logger.info("Entra sync quotidien — %d orgs OK, %d erreurs", synced, errors)


def check_license_expiry_all_orgs() -> None:
    """Envoie des notifications webhook pour les licences expirant dans 30 jours."""
    try:
        from db import get_db, rows
        from routes_webhooks import send_webhook_notification
    except Exception as exc:
        logger.error("scheduler import error (license expiry): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT organization_id, software_name,
                          (expires_at::date - CURRENT_DATE) AS days_left
                   FROM licenses
                   WHERE expires_at BETWEEN now() AND now() + interval '30 days'
                   ORDER BY expires_at"""
            )
            licenses = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (license expiry): %s", exc)
        return

    for lic in licenses:
        try:
            send_webhook_notification(lic["organization_id"], "license_expiry", {
                "software_name": lic.get("software_name", ""),
                "days_left": int(lic.get("days_left") or 0),
            })
        except Exception as exc:
            logger.error("license expiry notification org %s : %s", lic.get("organization_id"), exc)

    logger.info("Vérification licences — %d licences expirant bientôt", len(licenses))


def check_trial_expiry_all_orgs() -> None:
    """Envoie un email d'avertissement aux orgs dont le trial expire dans 7 ou 3 jours."""
    try:
        from db import get_db, rows
        from email_service import send_trial_expiry_warning
    except Exception as exc:
        logger.error("scheduler import error (trial expiry): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT name, owner_email,
                          (trial_ends_at::date - CURRENT_DATE) AS days_left
                   FROM organizations
                   WHERE subscription_status = 'trialing'
                     AND trial_ends_at IS NOT NULL
                     AND owner_email IS NOT NULL
                     AND (trial_ends_at::date - CURRENT_DATE) IN (7, 3, 1)"""
            )
            orgs = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (trial expiry): %s", exc)
        return

    for org in orgs:
        try:
            send_trial_expiry_warning(
                to_email=org["owner_email"],
                org_name=org["name"],
                days_left=int(org["days_left"]),
            )
        except Exception as exc:
            logger.error("trial expiry email org %s : %s", org.get("name"), exc)

    logger.info("Trial expiry check — %d emails envoyés", len(orgs))


def check_connector_health_all_orgs() -> None:
    """Alerte les owners des orgs ayant au moins un connecteur en status=error."""
    try:
        from db import get_db, rows
        from email_service import send_connector_alert
    except Exception as exc:
        logger.error("scheduler import error (connector health): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT c.connector_type, c.last_error, c.updated_at,
                       o.id AS org_id, o.name AS org_name, o.owner_email
                FROM connectors c
                JOIN organizations o ON o.id = c.organization_id
                WHERE c.status = 'error'
                  AND o.owner_email IS NOT NULL
                  AND o.owner_email <> ''
                ORDER BY o.id, c.updated_at DESC
                """
            )
            failed = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (connector health): %s", exc)
        return

    # Grouper par organisation
    orgs: dict[str, dict] = {}
    for c in failed:
        oid = c["org_id"]
        if oid not in orgs:
            orgs[oid] = {
                "org_name":   c["org_name"],
                "owner_email": c["owner_email"],
                "connectors": [],
            }
        orgs[oid]["connectors"].append({
            "connector_type": c["connector_type"],
            "last_error":     c["last_error"] or "Erreur inconnue",
            "updated_at":     str(c["updated_at"] or ""),
        })

    sent = 0
    for org in orgs.values():
        try:
            ok = send_connector_alert(
                to_email=org["owner_email"],
                org_name=org["org_name"],
                failed_connectors=org["connectors"],
            )
            if ok:
                sent += 1
        except Exception as exc:
            logger.error("connector alert org %s : %s", org.get("org_name"), exc)

    logger.info(
        "Connector health check — %d orgs affectées, %d alertes envoyées",
        len(orgs), sent,
    )


def send_monthly_reports_all_orgs() -> None:
    """Envoie le rapport mensuel à tous les admins des orgs qui l'ont activé."""
    try:
        from db import get_db, row, rows
        from email_service import send_monthly_report_rich
    except Exception as exc:
        logger.error("scheduler import error: %s", exc)
        return

    month_label = datetime.now().strftime("%B %Y")
    logger.info("Rapport mensuel — %s — démarrage", month_label)

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT o.id, o.name, o.owner_email
                   FROM organizations o
                   WHERE o.monthly_report_enabled = TRUE
                     AND o.owner_email IS NOT NULL
                     AND o.owner_email <> ''"""
            )
            orgs = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error: %s", exc)
        return

    for org in orgs:
        try:
            _send_for_org(org)
        except Exception as exc:
            logger.error("rapport mensuel org %s : %s", org.get("id"), exc)

    logger.info("Rapport mensuel — %s — terminé (%d orgs)", month_label, len(orgs))


def send_weekly_briefing_all_orgs() -> None:
    """Envoie le briefing exécutif du lundi à tous les owners/admins."""
    try:
        from db import get_db, row, rows
        from email_service import send_executive_briefing
        from routes_dashboard import _dept_health, _health_badge
        from datetime import date, timedelta
    except Exception as exc:
        logger.error("scheduler import error (weekly briefing): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT o.id, o.name, o.owner_email
                   FROM organizations o
                   WHERE o.owner_email IS NOT NULL AND o.owner_email <> ''"""
            )
            orgs = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (weekly briefing): %s", exc)
        return

    sent = 0
    for org in orgs:
        try:
            _send_briefing_for_org(org)
            sent += 1
        except Exception as exc:
            logger.error("weekly briefing org %s : %s", org.get("id"), exc)

    logger.info("Weekly briefing — %d emails envoyés", sent)


def _send_briefing_for_org(org: dict) -> None:
    from db import get_db, row, rows
    from email_service import send_executive_briefing
    from routes_dashboard import _dept_health, _health_badge
    from datetime import date, timedelta

    org_id   = org["id"]
    org_name = org["name"]
    to_email = org["owner_email"]
    today    = date.today()

    # Départements
    try:
        with get_db() as cur:
            cur.execute("SELECT id, name FROM departments WHERE organization_id = %s", (org_id,))
            depts = rows(cur)
    except Exception:
        depts = []

    dept_scores = []
    for d in depts:
        s = _dept_health(org_id, d["id"])
        b = _health_badge(s)
        dept_scores.append({"dept": d["name"], "score": s, "badge": b})

    org_score = round(sum(ds["score"] for ds in dept_scores) / len(dept_scores), 1) if dept_scores else 0.0
    org_badge = _health_badge(org_score)
    top_risks = sorted([ds for ds in dept_scores if ds["badge"] in ("red","yellow")], key=lambda x: x["score"])[:5]
    depts_at_risk = sum(1 for ds in dept_scores if ds["badge"] in ("red","yellow"))

    # Budget
    budget_total = budget_spent = 0.0
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT COALESCE(SUM(allocated),0) AS t, COALESCE(SUM(actual),0) AS s FROM budget_entries WHERE organization_id = %s",
                (org_id,),
            )
            br = row(cur) or {}
        budget_total = float(br.get("t") or 0)
        budget_spent = float(br.get("s") or 0)
    except Exception:
        pass
    budget_pct = round(budget_spent / budget_total * 100, 1) if budget_total > 0 else 0.0

    # Contrats à renouveler dans 90 jours
    contracts_due = 0
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT COUNT(*) AS cnt FROM contracts
                   WHERE organization_id = %s AND status = 'active'
                     AND renewal_date <= %s AND renewal_date >= %s""",
                (org_id, (today + timedelta(days=90)).isoformat(), today.isoformat()),
            )
            cr = row(cur) or {}
        contracts_due = int(cr.get("cnt") or 0)
    except Exception:
        pass

    # Économies potentielles
    savings = 0.0
    try:
        with get_db() as cur:
            cur.execute("SELECT quantity, assigned_count, cost_per_unit, billing_cycle FROM licenses WHERE organization_id = %s", (org_id,))
            for l in (cur.fetchall() or []):
                qty = int(l.get("quantity") or 0); asgn = int(l.get("assigned_count") or 0)
                cost = float(l.get("cost_per_unit") or 0)
                if qty > 0 and asgn / qty < 0.8:
                    mul = 12 if l.get("billing_cycle") == "monthly" else 1
                    savings += (qty - asgn) * cost * mul
    except Exception:
        pass

    send_executive_briefing(
        to_email=to_email,
        org_name=org_name,
        score=org_score,
        badge=org_badge,
        depts_total=len(depts),
        depts_at_risk=depts_at_risk,
        contracts_due=contracts_due,
        savings_potential=round(savings, 0),
        budget_pct=budget_pct,
        top_risks=top_risks,
    )


def schedule_deletion_for_expired_orgs() -> None:
    """Planifie la suppression (J+30) pour les orgs verrouillées sans abonnement actif."""
    try:
        from db import get_db, rows
    except Exception as exc:
        logger.error("scheduler import error (schedule deletion): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """UPDATE organizations
                   SET deletion_scheduled_at = NOW() + INTERVAL '30 days'
                   WHERE subscription_status IN ('trial_expired', 'canceled')
                     AND deletion_scheduled_at IS NULL
                     AND stripe_customer_id IS NULL
                   RETURNING id, name, owner_email"""
            )
            newly_scheduled = cur.fetchall() or []
    except Exception as exc:
        logger.error("scheduler DB error (schedule deletion): %s", exc)
        return

    logger.info(
        "Planification suppression — %d nouveaux comptes mis en file (J+30)",
        len(newly_scheduled),
    )


def process_account_deletions() -> None:
    """Envoie les emails d'avertissement hebdomadaires et supprime les comptes arrivés à échéance."""
    try:
        from db import get_db, rows
        from email_service import send_account_deletion_warning
    except Exception as exc:
        logger.error("scheduler import error (process deletions): %s", exc)
        return

    # ── 1. Emails d'avertissement (J-23, J-16, J-9, J-2) ──────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT name, owner_email,
                          (deletion_scheduled_at::date - CURRENT_DATE) AS days_remaining
                   FROM organizations
                   WHERE deletion_scheduled_at IS NOT NULL
                     AND subscription_status NOT IN ('active', 'trialing')
                     AND owner_email IS NOT NULL
                     AND (deletion_scheduled_at::date - CURRENT_DATE) IN (23, 16, 9, 2)"""
            )
            orgs_warn = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (deletion warnings): %s", exc)
        orgs_warn = []

    warned = 0
    for org in orgs_warn:
        try:
            ok = send_account_deletion_warning(
                to_email=org["owner_email"],
                org_name=org["name"],
                days_until_deletion=int(org["days_remaining"]),
            )
            if ok:
                warned += 1
        except Exception as exc:
            logger.error("deletion warning email org=%s : %s", org.get("name"), exc)

    logger.info("Avertissements suppression — %d emails envoyés", warned)

    # ── 2. Suppression définitive des comptes arrivés à échéance ───────────────
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT id, name
                   FROM organizations
                   WHERE deletion_scheduled_at IS NOT NULL
                     AND deletion_scheduled_at <= NOW()
                     AND subscription_status NOT IN ('active', 'trialing')"""
            )
            orgs_delete = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (fetch deletions): %s", exc)
        orgs_delete = []

    deleted = errors = 0
    for org in orgs_delete:
        try:
            _hard_delete_org(str(org["id"]))
            deleted += 1
            logger.info("Compte supprimé — org_id=%s (%s)", org["id"], org["name"])
        except Exception as exc:
            errors += 1
            logger.error("Échec suppression org=%s : %s", org.get("id"), exc)

    logger.info(
        "Suppressions — %d comptes supprimés, %d erreurs",
        deleted, errors,
    )


def index_knowledge_m365_all_orgs() -> None:
    """Indexe (ou ré-indexe) les docs OneDrive de tous les connecteurs M365 actifs."""
    try:
        from db import get_db, rows
        from knowledge_indexer import index_m365_documents
    except Exception as exc:
        logger.error("scheduler import error (knowledge index): %s", exc)
        return

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT id, organization_id
                   FROM connectors
                   WHERE connector_type = 'microsoft_365' AND status = 'active'"""
            )
            connectors = rows(cur)
    except Exception as exc:
        logger.error("scheduler DB error (knowledge index): %s", exc)
        return

    total_indexed = total_errors = 0
    orgs_done: set = set()
    for conn in connectors:
        org_id = str(conn["organization_id"])
        if org_id in orgs_done:
            continue
        orgs_done.add(org_id)
        try:
            result = index_m365_documents(org_id)
            total_indexed += result.get("indexed", 0)
            total_errors  += result.get("errors", 0)
        except Exception as exc:
            logger.error("knowledge index org=%s : %s", org_id, exc)
            total_errors += 1

    logger.info(
        "Knowledge M365 index — %d documents indexés, %d erreurs",
        total_indexed, total_errors,
    )


def _hard_delete_org(org_id: str) -> None:
    """Supprime toutes les données d'une organisation de façon irréversible."""
    from db import get_db
    with get_db() as cur:
        # Suppression des données sensibles en premier
        cur.execute("DELETE FROM connectors   WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM documents    WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM audit_logs   WHERE organization_id = %s", (org_id,))
        # Suppression de l'organisation — les FK CASCADE gèrent le reste
        cur.execute("DELETE FROM organizations WHERE id = %s", (org_id,))


def _send_for_org(org: dict) -> None:
    from db import get_db, row
    from email_service import send_monthly_report_rich

    org_id = org["id"]
    org_name = org["name"]
    to_email = org["owner_email"]

    with get_db() as cur:
        # Requêtes IA du mois
        cur.execute(
            """SELECT COUNT(*) AS total_queries,
                      ROUND(AVG(rating)::NUMERIC,1) AS avg_rating,
                      COUNT(DISTINCT user_id) AS active_users
               FROM audit_logs
               WHERE organization_id = %s
                 AND action = 'agent_query'
                 AND created_at >= date_trunc('month', now())""",
            (org_id,),
        )
        stats = row(cur) or {}

        # Licences expirant dans 30 jours
        cur.execute(
            """SELECT COUNT(*) AS expiring_count
               FROM licenses
               WHERE organization_id = %s
                 AND expires_at BETWEEN now() AND now() + interval '30 days'""",
            (org_id,),
        )
        lic = row(cur) or {}

        # Derniers snapshots KPI (score moyen des depts)
        cur.execute(
            """SELECT AVG(health_score) AS avg_health, COUNT(DISTINCT dept_id) AS dept_count
               FROM kpi_snapshots
               WHERE org_id = %s
                 AND snapshot_date >= date_trunc('month', now())""",
            (org_id,),
        )
        kpi = row(cur) or {}

        # Top 3 depts avec le meilleur score ce mois
        cur.execute(
            """SELECT dept_name, health_score
               FROM kpi_snapshots
               WHERE org_id = %s
                 AND snapshot_date >= date_trunc('month', now())
               ORDER BY health_score DESC LIMIT 3""",
            (org_id,),
        )
        top_depts = [{"name": r["dept_name"], "score": r["health_score"]} for r in (cur.fetchall() or [])]

        # Économies potentielles totales
        cur.execute(
            """SELECT COALESCE(SUM(
                 COALESCE((data->>'contracts_savings')::numeric,0) +
                 COALESCE((data->>'license_savings')::numeric,0)
               ),0) AS total_savings
               FROM optimization_cache
               WHERE organization_id = %s""",
            (org_id,),
        )
        sav = row(cur) or {}

    send_monthly_report_rich(
        to_email=to_email,
        org_name=org_name,
        total_queries=int(stats.get("total_queries") or 0),
        avg_rating=float(stats.get("avg_rating") or 0),
        active_users=int(stats.get("active_users") or 0),
        expiring_licenses=int(lic.get("expiring_count") or 0),
        avg_health=round(float(kpi.get("avg_health") or 0)),
        dept_count=int(kpi.get("dept_count") or 0),
        total_savings=int(sav.get("total_savings") or 0),
        top_depts=top_depts,
    )

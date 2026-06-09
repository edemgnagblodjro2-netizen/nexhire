"""Tâches planifiées — rapport mensuel + alertes licences."""
from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


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
                          (subscription_end::date - CURRENT_DATE) AS days_left
                   FROM organizations
                   WHERE subscription_status = 'trialing'
                     AND subscription_end IS NOT NULL
                     AND owner_email IS NOT NULL
                     AND (subscription_end::date - CURRENT_DATE) IN (7, 3, 1)"""
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

"""Webhooks Slack / Teams — notifications d'événements NexHire."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from auth import CurrentUser
from db import get_db, row
from rbac import require_min_role

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

_EVENTS = ["member_join", "license_expiry", "budget_alert", "subscription"]


class WebhookConfig(BaseModel):
    slack_url:  str | None = None
    teams_url:  str | None = None
    events:     list[str] = ["member_join", "license_expiry", "budget_alert"]


# ── GET /api/webhooks/config ──────────────────────────────────────────────────

@router.get("/config")
def get_webhook_config(user: CurrentUser = Depends(require_min_role("admin"))):
    with get_db() as cur:
        cur.execute(
            "SELECT webhook_slack, webhook_teams, webhook_events FROM organizations WHERE id = %s LIMIT 1",
            (user.organization_id,),
        )
        r = row(cur) or {}
    return {
        "slack_url": r.get("webhook_slack") or "",
        "teams_url": r.get("webhook_teams") or "",
        "events":    r.get("webhook_events") or ["member_join", "license_expiry", "budget_alert"],
    }


# ── POST /api/webhooks/config ─────────────────────────────────────────────────

@router.post("/config")
def save_webhook_config(
    cfg: WebhookConfig,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    with get_db() as cur:
        cur.execute(
            """UPDATE organizations
               SET webhook_slack = %s, webhook_teams = %s, webhook_events = %s
               WHERE id = %s""",
            (cfg.slack_url or None, cfg.teams_url or None, cfg.events, user.organization_id),
        )
    return {"ok": True}


# ── DELETE /api/webhooks/config ───────────────────────────────────────────────

@router.delete("/config")
def delete_webhook_config(user: CurrentUser = Depends(require_min_role("admin"))):
    with get_db() as cur:
        cur.execute(
            "UPDATE organizations SET webhook_slack = NULL, webhook_teams = NULL WHERE id = %s",
            (user.organization_id,),
        )
    return {"ok": True}


# ── POST /api/webhooks/test ───────────────────────────────────────────────────

@router.post("/test")
def test_webhook(
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Envoie un message test sur les webhooks configurés."""
    with get_db() as cur:
        cur.execute(
            "SELECT name, webhook_slack, webhook_teams FROM organizations WHERE id = %s LIMIT 1",
            (user.organization_id,),
        )
        org = row(cur) or {}

    sent: list[str] = []
    if org.get("webhook_slack"):
        if _post_slack(org["webhook_slack"], org.get("name", ""), "test", {"message": "Test de webhook NexHire ✅"}):
            sent.append("slack")
    if org.get("webhook_teams"):
        if _post_teams(org["webhook_teams"], org.get("name", ""), "test", {"message": "Test de webhook NexHire ✅"}):
            sent.append("teams")

    if not sent:
        raise HTTPException(400, "Aucun webhook configuré ou URLs inaccessibles.")
    return {"sent": sent}


# ── POST /api/reports/monthly ─────────────────────────────────────────────────

@router.post("/reports/monthly")
def send_monthly_report_endpoint(
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Génère et envoie le rapport mensuel par email à l'admin."""
    with get_db() as cur:
        cur.execute(
            "SELECT name, owner_email FROM organizations WHERE id = %s LIMIT 1",
            (user.organization_id,),
        )
        org = row(cur) or {}

        # Stats du mois courant
        cur.execute(
            """SELECT COUNT(*) AS total_queries,
                      ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
                      COUNT(DISTINCT user_id) AS active_users
               FROM audit_logs
               WHERE organization_id = %s
                 AND action = 'agent_query'
                 AND created_at >= date_trunc('month', now())""",
            (user.organization_id,),
        )
        stats = row(cur) or {}

        cur.execute(
            """SELECT COUNT(*) AS expiring_count
               FROM licenses
               WHERE organization_id = %s
                 AND expires_at BETWEEN now() AND now() + interval '30 days'""",
            (user.organization_id,),
        )
        lic = row(cur) or {}

    to_email = user.email or org.get("owner_email", "")
    if not to_email:
        raise HTTPException(400, "Aucune adresse email destinataire trouvée.")

    background.add_task(_do_send_monthly, to_email, org.get("name", "Organisation"), stats, lic)
    return {"ok": True, "to": to_email}


def _do_send_monthly(to_email: str, org_name: str, stats: dict, lic: dict) -> None:
    from email_service import send_monthly_report
    send_monthly_report(
        to_email=to_email,
        org_name=org_name,
        total_queries=stats.get("total_queries") or 0,
        avg_rating=float(stats.get("avg_rating") or 0),
        active_users=stats.get("active_users") or 0,
        expiring_licenses=lic.get("expiring_count") or 0,
    )


# ── Helpers internes ──────────────────────────────────────────────────────────

def _post_slack(url: str, org_name: str, event: str, data: dict) -> bool:
    try:
        resp = httpx.post(url, json={
            "blocks": [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*[NexHire — {org_name}]*\n{_event_label(event, data)}",
                },
            }],
        }, timeout=8)
        return resp.status_code in (200, 201, 204)
    except Exception:
        return False


def _post_teams(url: str, org_name: str, event: str, data: dict) -> bool:
    try:
        resp = httpx.post(url, json={
            "@type":    "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary":  f"NexHire — {org_name}",
            "themeColor": "6366f1",
            "title":    f"NexHire — {org_name}",
            "text":     _event_label(event, data),
        }, timeout=8)
        return resp.status_code in (200, 201, 204)
    except Exception:
        return False


def _event_label(event: str, data: dict) -> str:
    labels = {
        "member_join":    f"👤 Nouveau membre : {data.get('email', '')}",
        "license_expiry": f"⚠️ Licence expirant bientôt : {data.get('software_name', '')} ({data.get('days_left', '?')} jours)",
        "budget_alert":   f"🚨 Alerte budget : {data.get('category', '')} — {data.get('pct', '?')}% consommé",
        "subscription":   f"💳 Abonnement : {data.get('status', '')}",
        "test":           data.get("message", "Test NexHire"),
    }
    return labels.get(event, f"Événement : {event}")


def send_webhook_notification(org_id: str, event: str, data: dict) -> None:
    """Envoie une notification webhook en arrière-plan. Dégradation silencieuse."""
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT name, webhook_slack, webhook_teams, webhook_events FROM organizations WHERE id = %s LIMIT 1",
                (org_id,),
            )
            org = row(cur) or {}

        allowed = org.get("webhook_events") or []
        if event != "test" and event not in allowed:
            return

        if org.get("webhook_slack"):
            _post_slack(org["webhook_slack"], org.get("name", ""), event, data)
        if org.get("webhook_teams"):
            _post_teams(org["webhook_teams"], org.get("name", ""), event, data)
    except Exception:
        pass

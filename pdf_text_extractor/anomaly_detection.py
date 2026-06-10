"""Détection d'activité suspecte — Niveau 3.

Trois types de détection :
1. Impossible travel  — même user, pays différents, < 4h
2. Export massif      — > 1000 enregistrements en une session
3. Comportement anormal — accès à des départements hors profil habituel

Toutes les alertes sont :
  - Enregistrées dans security_alerts (DB)
  - Loggées dans audit_logs avec action="security_alert"
  - Notifiées par email à l'admin de l'organisation (si email_service disponible)
"""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from audit import AuditEvent, log_audit
from db import get_db, row, rows


# ── Géolocalisation IP ────────────────────────────────────────────────────────

_PRIVATE_PREFIXES = ("127.", "10.", "172.16.", "172.17.", "172.18.", "172.19.",
                     "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
                     "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
                     "172.30.", "172.31.", "192.168.", "::1", "")


def _is_private(ip: str) -> bool:
    return any(ip.startswith(p) for p in _PRIVATE_PREFIXES)


def _geolocate(ip: str) -> dict[str, str]:
    if _is_private(ip):
        return {"country": "LOCAL", "city": "Local", "region": "—"}
    try:
        r = httpx.get(f"https://ipinfo.io/{ip}/json",
                      headers={"Accept": "application/json"},
                      timeout=3)
        if r.status_code == 200:
            d = r.json()
            return {
                "country": d.get("country", "?"),
                "city":    d.get("city", "?"),
                "region":  d.get("region", "?"),
            }
    except Exception:
        pass
    return {"country": "?", "city": "?", "region": "?"}


# ── Persistance alerte ────────────────────────────────────────────────────────

def _store_alert(
    org_id: str,
    user_id: str | None,
    alert_type: str,
    severity: str,
    details: dict,
    ip_address: str | None = None,
) -> None:
    try:
        with get_db() as cur:
            cur.execute(
                """INSERT INTO security_alerts
                   (organization_id, user_id, alert_type, severity, details, ip_address)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (org_id, user_id, alert_type, severity,
                 json.dumps(details, default=str), ip_address),
            )
    except Exception:
        pass

    log_audit(AuditEvent(
        action="security_alert",
        organization_id=org_id,
        user_id=user_id,
        ip_address=ip_address,
        success=False,
        http_status=200,
        error_detail=f"{alert_type}: {json.dumps(details, default=str)[:300]}",
        metadata={"severity": severity, "alert_type": alert_type},
    ))


def _notify_admin(org_id: str, subject: str, body: str) -> None:
    try:
        from db import get_db, row as _row
        with get_db() as cur:
            cur.execute(
                "SELECT u.email FROM users u WHERE u.organization_id = %s "
                "AND u.role IN ('admin','owner') ORDER BY u.role DESC LIMIT 1",
                (org_id,),
            )
            admin = _row(cur)
        if admin and admin.get("email"):
            from email_service import _send
            _send(admin["email"], f"⚠️ NexHire Alerte sécurité : {subject}", body)
    except Exception:
        pass


# ── 1. Détection impossible travel ────────────────────────────────────────────

def check_impossible_travel(user_id: str, new_ip: str, org_id: str) -> None:
    """Compare l'IP courante avec le dernier login connu.
    Alerte si pays différent et délai < 4 heures.
    """
    if _is_private(new_ip):
        return

    try:
        with get_db() as cur:
            cur.execute(
                """SELECT ip_address, created_at FROM audit_logs
                   WHERE user_id = %s AND action = 'auth_login' AND success = TRUE
                   AND ip_address IS NOT NULL AND ip_address != %s
                   ORDER BY created_at DESC LIMIT 1""",
                (user_id, new_ip),
            )
            last = row(cur)

        if not last or not last.get("ip_address"):
            return

        last_ip  = last["ip_address"]
        last_at  = last["created_at"]
        if hasattr(last_at, "tzinfo") and last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=UTC)

        elapsed  = datetime.now(UTC) - last_at
        if elapsed > timedelta(hours=4):
            return

        geo_prev = _geolocate(last_ip)
        geo_new  = _geolocate(new_ip)

        if geo_prev.get("country") in ("LOCAL", "?") or geo_new.get("country") in ("LOCAL", "?"):
            return

        if geo_prev["country"] != geo_new["country"]:
            details = {
                "ancien_ip":   last_ip,
                "ancien_pays": f"{geo_prev['city']}, {geo_prev['country']}",
                "nouveau_ip":  new_ip,
                "nouveau_pays": f"{geo_new['city']}, {geo_new['country']}",
                "délai_min":   int(elapsed.total_seconds() / 60),
            }
            _store_alert(org_id, user_id, "impossible_travel", "critical", details, new_ip)
            _notify_admin(
                org_id,
                "Connexion suspecte (impossible travel)",
                f"""<h3>⚠️ Connexion depuis deux pays en {details['délai_min']} minutes</h3>
<p>Utilisateur : {user_id}</p>
<p>Ancien emplacement : <strong>{details['ancien_pays']}</strong> ({last_ip})</p>
<p>Nouveau emplacement : <strong>{details['nouveau_pays']}</strong> ({new_ip})</p>
<p>Délai : {details['délai_min']} minutes</p>
<p>Vérifiez si ce compte est compromis.</p>""",
            )
    except Exception:
        pass


# ── 2. Détection export massif ────────────────────────────────────────────────

_EXPORT_THRESHOLD_SINGLE  = 1_000
_EXPORT_THRESHOLD_HOURLY  = 5_000


def check_bulk_export(
    user_id: str,
    org_id: str,
    record_count: int,
    resource_type: str,
    ip: str | None = None,
) -> None:
    """Alerte si un export dépasse les seuils."""
    try:
        alert_single = record_count >= _EXPORT_THRESHOLD_SINGLE

        # Cumul horaire depuis audit_logs
        with get_db() as cur:
            cur.execute(
                """SELECT COALESCE(SUM((metadata->>'record_count')::int), 0) AS total
                   FROM audit_logs
                   WHERE user_id = %s
                     AND action = 'data_export'
                     AND created_at > NOW() - INTERVAL '1 hour'""",
                (user_id,),
            )
            r = row(cur)
        hourly_total = int((r or {}).get("total", 0)) + record_count
        alert_hourly = hourly_total >= _EXPORT_THRESHOLD_HOURLY

        if alert_single:
            details = {
                "ressource":    resource_type,
                "nb_enreg":     record_count,
                "seuil":        _EXPORT_THRESHOLD_SINGLE,
            }
            _store_alert(org_id, user_id, "bulk_export", "high", details, ip)

        if alert_hourly:
            details = {
                "ressource":       resource_type,
                "cumul_heure":     hourly_total,
                "seuil_heure":     _EXPORT_THRESHOLD_HOURLY,
            }
            _store_alert(org_id, user_id, "bulk_export_hourly", "critical", details, ip)
            _notify_admin(
                org_id,
                "Export massif de données détecté",
                f"""<h3>⚠️ Export massif — {hourly_total:,} enregistrements en 1h</h3>
<p>Utilisateur : {user_id}</p>
<p>Ressource : {resource_type}</p>
<p>Volume : <strong>{hourly_total:,} enregistrements</strong> exportés en moins d'une heure.</p>
<p>Vérifiez si cette activité est autorisée.</p>""",
            )
    except Exception:
        pass


# ── 3. Détection comportementale ──────────────────────────────────────────────

_DEPT_THRESHOLD_HOURLY = 5


def check_dept_behavior(
    user_id: str,
    org_id: str,
    dept_type: str | None,
    ip: str | None = None,
) -> None:
    """Alerte si l'utilisateur accède à un département inhabituel ou à trop de
    départements différents en une heure.
    """
    if not dept_type:
        return
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT COUNT(DISTINCT metadata->>'dept_type') AS dept_count
                   FROM audit_logs
                   WHERE user_id = %s
                     AND action = 'agent_query'
                     AND created_at > NOW() - INTERVAL '1 hour'""",
                (user_id,),
            )
            r = row(cur)
        dept_count = int((r or {}).get("dept_count", 0)) + 1

        if dept_count >= _DEPT_THRESHOLD_HOURLY:
            details = {
                "dept_type":     dept_type,
                "depts_heure":   dept_count,
                "seuil":         _DEPT_THRESHOLD_HOURLY,
            }
            _store_alert(org_id, user_id, "behavior_anomaly", "medium", details, ip)

        # Vérifier si ce dept_type est dans le profil normal (30 derniers jours)
        with get_db() as cur:
            cur.execute(
                """SELECT COUNT(*) AS cnt FROM audit_logs
                   WHERE user_id = %s
                     AND action = 'agent_query'
                     AND metadata->>'dept_type' = %s
                     AND created_at > NOW() - INTERVAL '30 days'""",
                (user_id, dept_type),
            )
            r2 = row(cur)
        if int((r2 or {}).get("cnt", 0)) == 0:
            details = {
                "dept_type":  dept_type,
                "message":    "Premier accès à ce département en 30 jours",
            }
            _store_alert(org_id, user_id, "unusual_dept_access", "low", details, ip)
    except Exception:
        pass

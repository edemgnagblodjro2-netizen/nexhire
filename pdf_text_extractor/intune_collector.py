"""
Collecteur Intune (Microsoft Endpoint Manager) — inventaire & conformité appareils.

Peuple :
  assets  → appareils enrollés Intune avec état de conformité

Permission Graph App requise (à ajouter dans Azure App Registration) :
  DeviceManagementManagedDevices.Read.All

Les tokens OAuth sont partagés avec le connecteur Microsoft 365.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from db import get_db
from m365_collector import GRAPH, _auth_headers, _get_all

log = logging.getLogger(__name__)

# Mapping type appareil Graph → libellé normalisé
_DEVICE_TYPE_MAP: dict[str, str] = {
    "desktop": "desktop",
    "windowsRT": "desktop",
    "winMO6": "mobile",
    "nokia": "mobile",
    "windowsPhone": "mobile",
    "mac": "mac",
    "winCE": "desktop",
    "winEmbedded": "desktop",
    "iPhone": "mobile",
    "iPad": "tablet",
    "iPod": "mobile",
    "android": "mobile",
    "androidForWork": "mobile",
    "androidEnterprise": "mobile",
    "androidnGMS": "mobile",
    "surfaceHub": "other",
    "holoLens": "other",
    "cloudPC": "cloudPC",
    "blackberry": "mobile",
    "unknown": "unknown",
}

# Champs $select à demander à l'API pour limiter la réponse
_SELECT = ",".join(
    [
        "id",
        "deviceName",
        "operatingSystem",
        "osVersion",
        "complianceState",
        "deviceType",
        "managementAgent",
        "enrolledDateTime",
        "lastSyncDateTime",
        "userPrincipalName",
        "userId",
        "model",
        "manufacturer",
        "serialNumber",
        "isEncrypted",
        "isSupervised",
        "managedDeviceOwnerType",
        "azureADDeviceId",
    ]
)


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────────────────────────────────────


def collect_intune(org_id: str) -> dict:
    """
    Collecte les appareils Intune et les persiste dans public.assets.
    Retourne des statistiques de la collecte.
    """
    headers = _auth_headers(org_id)

    devices = _get_all(
        headers,
        f"{GRAPH}/deviceManagement/managedDevices",
        params={"$select": _SELECT, "$top": "999"},
    )

    stats = {
        "devices_total": 0,
        "compliant": 0,
        "noncompliant": 0,
        "unknown": 0,
        "encrypted": 0,
        "unencrypted": 0,
        "never_synced_30d": 0,
        "errors": 0,
    }

    now = datetime.now(timezone.utc)

    for device in devices:
        try:
            _upsert_asset(org_id, device, stats, now)
            stats["devices_total"] += 1

            cs = device.get("complianceState", "unknown")
            if cs == "compliant":
                stats["compliant"] += 1
            elif cs == "noncompliant":
                stats["noncompliant"] += 1
            else:
                stats["unknown"] += 1

            if device.get("isEncrypted") is True:
                stats["encrypted"] += 1
            elif device.get("isEncrypted") is False:
                stats["unencrypted"] += 1

            last_sync = device.get("lastSyncDateTime")
            if last_sync:
                dt = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
                if (now - dt).days > 30:
                    stats["never_synced_30d"] += 1

        except Exception as exc:
            log.warning("Intune device %s error: %s", device.get("id"), exc)
            stats["errors"] += 1

    log.info(
        "Intune collect done — %d devices (%d compliant, %d noncompliant, %d encrypted)",
        stats["devices_total"],
        stats["compliant"],
        stats["noncompliant"],
        stats["encrypted"],
    )
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# Upsert
# ─────────────────────────────────────────────────────────────────────────────


def _upsert_asset(org_id: str, d: dict, stats: dict, now: datetime) -> None:
    device_type_raw = d.get("deviceType") or "unknown"
    device_type = _DEVICE_TYPE_MAP.get(device_type_raw, "other")

    os_name = (d.get("operatingSystem") or "").strip() or None
    os_version = (d.get("osVersion") or "").strip() or None

    compliance = d.get("complianceState") or "unknown"
    owner_upn = (d.get("userPrincipalName") or "").lower().strip() or None

    enrolled_at = _parse_dt(d.get("enrolledDateTime"))
    last_sync_at = _parse_dt(d.get("lastSyncDateTime"))

    # Résoudre l'identité propriétaire
    owner_identity_id = _resolve_owner(org_id, owner_upn) if owner_upn else None

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.assets
              (organization_id, source_connector, external_id,
               display_name, device_type, os, os_version,
               serial_number, model, manufacturer,
               compliance_state, is_encrypted, is_supervised, management_state,
               owner_upn, owner_identity_id,
               enrolled_at, last_sync_at, synced_at, raw_data)
            VALUES (%s,'intune',%s, %s,%s,%s,%s, %s,%s,%s,
                    %s,%s,%s,%s, %s,%s, %s,%s,now(),%s)
            ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
              display_name       = EXCLUDED.display_name,
              device_type        = EXCLUDED.device_type,
              os                 = EXCLUDED.os,
              os_version         = EXCLUDED.os_version,
              serial_number      = EXCLUDED.serial_number,
              model              = EXCLUDED.model,
              manufacturer       = EXCLUDED.manufacturer,
              compliance_state   = EXCLUDED.compliance_state,
              is_encrypted       = EXCLUDED.is_encrypted,
              is_supervised      = EXCLUDED.is_supervised,
              management_state   = EXCLUDED.management_state,
              owner_upn          = EXCLUDED.owner_upn,
              owner_identity_id  = EXCLUDED.owner_identity_id,
              enrolled_at        = EXCLUDED.enrolled_at,
              last_sync_at       = EXCLUDED.last_sync_at,
              synced_at          = now(),
              raw_data           = EXCLUDED.raw_data
            """,
            (
                org_id,
                d["id"],
                d.get("deviceName"),
                device_type,
                os_name,
                os_version,
                d.get("serialNumber") or None,
                d.get("model") or None,
                d.get("manufacturer") or None,
                compliance,
                d.get("isEncrypted"),
                d.get("isSupervised"),
                d.get("managementAgent") or None,
                owner_upn,
                owner_identity_id,
                enrolled_at,
                last_sync_at,
                _raw(d),
            ),
        )


def _resolve_owner(org_id: str, upn: str) -> str | None:
    """Cherche l'identity_id correspondant au UPN du propriétaire."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT id FROM public.identities
                WHERE organization_id = %s
                  AND canonical_email = %s
                LIMIT 1
                """,
                (org_id, upn),
            )
            row = cur.fetchone()
            return row["id"] if row else None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Résumé (pour le dashboard)
# ─────────────────────────────────────────────────────────────────────────────


def get_intune_summary(org_id: str) -> dict:
    """Retourne les KPIs de conformité Intune pour l'organisation."""
    from db import rows as db_rows

    with get_db() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*)                                                         AS total,
              COUNT(*) FILTER (WHERE compliance_state = 'compliant')          AS compliant,
              COUNT(*) FILTER (WHERE compliance_state = 'noncompliant')       AS noncompliant,
              COUNT(*) FILTER (WHERE compliance_state NOT IN ('compliant','noncompliant')) AS unknown,
              COUNT(*) FILTER (WHERE is_encrypted = true)                     AS encrypted,
              COUNT(*) FILTER (WHERE is_encrypted = false)                    AS unencrypted,
              COUNT(*) FILTER (WHERE last_sync_at < now() - interval '30 days') AS stale_30d,
              COUNT(*) FILTER (WHERE last_sync_at < now() - interval '90 days') AS stale_90d
            FROM public.assets
            WHERE organization_id = %s
              AND source_connector = 'intune'
            """,
            (org_id,),
        )
        row = cur.fetchone()

        cur.execute(
            """
            SELECT os, COUNT(*) AS count
            FROM public.assets
            WHERE organization_id = %s AND source_connector = 'intune'
            GROUP BY os
            ORDER BY count DESC
            """,
            (org_id,),
        )
        by_os = db_rows(cur)

        cur.execute(
            """
            SELECT device_type, COUNT(*) AS count
            FROM public.assets
            WHERE organization_id = %s AND source_connector = 'intune'
            GROUP BY device_type
            ORDER BY count DESC
            """,
            (org_id,),
        )
        by_type = db_rows(cur)

    total = int(row["total"] or 0)
    compliant = int(row["compliant"] or 0)

    return {
        "total": total,
        "compliant": compliant,
        "noncompliant": int(row["noncompliant"] or 0),
        "unknown": int(row["unknown"] or 0),
        "encrypted": int(row["encrypted"] or 0),
        "unencrypted": int(row["unencrypted"] or 0),
        "stale_30d": int(row["stale_30d"] or 0),
        "stale_90d": int(row["stale_90d"] or 0),
        "compliance_rate": round(compliant / total * 100, 1) if total else 0,
        "by_os": [{"os": r["os"] or "Inconnu", "count": int(r["count"])} for r in by_os],
        "by_type": [{"type": r["device_type"] or "other", "count": int(r["count"])} for r in by_type],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _raw(d: dict) -> str:
    import json

    keep = {
        "id",
        "deviceName",
        "operatingSystem",
        "osVersion",
        "complianceState",
        "deviceType",
        "enrolledDateTime",
        "lastSyncDateTime",
        "userPrincipalName",
        "model",
        "manufacturer",
        "serialNumber",
        "isEncrypted",
        "isSupervised",
        "managedDeviceOwnerType",
        "azureADDeviceId",
        "managementAgent",
    }
    return json.dumps({k: d[k] for k in keep if k in d})

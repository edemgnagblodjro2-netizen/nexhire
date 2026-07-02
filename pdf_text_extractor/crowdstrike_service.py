"""CrowdStrike Falcon — détections et alertes cybersécurité.

Auth : OAuth2 client_credentials → bearer token (expiry ~30 min, auto-refresh).
Credentials : client_id, client_secret, base_url — stockés chiffrés par org.
Aucune variable d'env requise.
"""

from __future__ import annotations

import httpx
from connector_loader import load_creds


def _get_token(base_url: str, client_id: str, client_secret: str) -> str:
    r = httpx.post(
        f"{base_url}/oauth2/token",
        data={"client_id": client_id, "client_secret": client_secret},
        headers={"Accept": "application/json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def search_crowdstrike(query: str, org_id: str, severity: str = "all", limit: int = 5) -> list[dict]:
    creds, _ = load_creds("crowdstrike", org_id)
    if not creds:
        return [{"error": "CrowdStrike non connecté"}]

    base_url = creds.get("base_url", "https://api.crowdstrike.com").rstrip("/")
    client_id = creds.get("client_id", "").strip()
    client_secret = creds.get("client_secret", "").strip()

    if not client_id or not client_secret:
        return [{"error": "Credentials CrowdStrike incomplets — reconfigurer le connecteur"}]

    try:
        token = _get_token(base_url, client_id, client_secret)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

        # Recherche détections
        filter_str = f"behaviors.objective:'*{query}*'"
        if severity != "all":
            sev_map = {"critical": "Critical", "high": "High", "medium": "Medium", "low": "Low"}
            if severity in sev_map:
                filter_str += f"+max_severity_displayname:'{sev_map[severity]}'"

        r = httpx.get(
            f"{base_url}/detects/queries/detects/v1",
            headers=headers,
            params={"filter": filter_str, "limit": limit, "sort": "created_timestamp.desc"},
            timeout=12,
        )
        r.raise_for_status()
        ids = r.json().get("resources", [])

        if not ids:
            return [{"message": "Aucune détection trouvée", "filtre": filter_str}]

        # Récupérer les détails
        det_r = httpx.post(
            f"{base_url}/detects/entities/summaries/GET/v1", headers=headers, json={"ids": ids[:limit]}, timeout=12
        )
        det_r.raise_for_status()

        return [
            {
                "id": d.get("detection_id"),
                "titre": (d.get("behaviors") or [{}])[0].get("description", "—"),
                "sévérité": d.get("max_severity_displayname"),
                "hôte": (d.get("device") or {}).get("hostname"),
                "statut": d.get("status"),
                "détecté": d.get("created_timestamp"),
                "source": "crowdstrike",
            }
            for d in det_r.json().get("resources", [])
        ]

    except httpx.HTTPStatusError as exc:
        return [{"error": f"CrowdStrike HTTP {exc.response.status_code}", "source": "crowdstrike"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "crowdstrike"}]

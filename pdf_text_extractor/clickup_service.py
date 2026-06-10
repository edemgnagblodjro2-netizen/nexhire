"""ClickUp — tâches, espaces et listes via ClickUp REST API v2.

Auth : API Token (Bearer). Aucune variable d'env requise.
Credentials stockés chiffrés par organisation.
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds

_BASE = "https://api.clickup.com/api/v2"


def search_clickup(query: str, org_id: str,
                   status: str = "all", space: str | None = None,
                   limit: int = 10) -> list[dict]:
    creds, _ = load_creds("clickup", org_id)
    if not creds:
        return [{"error": "ClickUp non connecté"}]

    api_token = creds.get("api_key", creds.get("api_token", "")).strip()
    if not api_token:
        return [{"error": "API Token ClickUp manquant — reconfigurer le connecteur"}]

    headers = {"Authorization": api_token, "Content-Type": "application/json"}

    try:
        # Récupérer les équipes (workspaces)
        teams_r = httpx.get(f"{_BASE}/team", headers=headers, timeout=10)
        teams_r.raise_for_status()
        teams = teams_r.json().get("teams", [])
        if not teams:
            return [{"error": "Aucune équipe ClickUp trouvée"}]

        team_id = teams[0]["id"]

        # Recherche de tâches
        params: dict = {
            "query":          query,
            "include_closed": "true" if status in ("all", "closed") else "false",
            "page":           0,
        }
        if status == "open":
            params["include_closed"] = "false"

        r = httpx.get(f"{_BASE}/team/{team_id}/task",
                      headers=headers,
                      params=params,
                      timeout=12)
        r.raise_for_status()
        tasks = r.json().get("tasks", [])

        return [
            {
                "id":       t.get("id"),
                "titre":    t.get("name"),
                "statut":   (t.get("status") or {}).get("status"),
                "priorité": (t.get("priority") or {}).get("priority"),
                "assignés": [a.get("username") for a in (t.get("assignees") or [])],
                "liste":    (t.get("list") or {}).get("name"),
                "espace":   (t.get("space") or {}).get("name"),
                "échéance": t.get("due_date"),
                "source":   "clickup",
            }
            for t in tasks[:limit]
        ]

    except httpx.HTTPStatusError as exc:
        return [{"error": f"ClickUp HTTP {exc.response.status_code}", "source": "clickup"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "clickup"}]

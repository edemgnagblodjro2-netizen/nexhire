"""Asana — tâches, projets et workspaces via Asana REST API v1.

Auth : Personal Access Token (PAT). Aucune variable d'env requise.
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds

_BASE = "https://app.asana.com/api/1.0"


def search_asana(query: str, org_id: str,
                 status: str = "all", project: str | None = None,
                 limit: int = 10) -> list[dict]:
    creds, _ = load_creds("asana", org_id)
    if not creds:
        return [{"error": "Asana non connecté"}]

    api_key = creds.get("api_key", "").strip()
    if not api_key:
        return [{"error": "API Key Asana manquante — reconfigurer le connecteur"}]

    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}

    try:
        # Récupérer les workspaces disponibles
        ws_r = httpx.get(f"{_BASE}/workspaces", headers=headers, timeout=10)
        ws_r.raise_for_status()
        workspaces = ws_r.json().get("data", [])
        if not workspaces:
            return [{"error": "Aucun workspace Asana trouvé"}]

        workspace_gid = workspaces[0]["gid"]

        # Recherche de tâches
        params: dict = {
            "workspace": workspace_gid,
            "text":      query,
            "opt_fields": "name,completed,due_on,assignee.name,projects.name,notes",
            "limit": limit,
        }
        if status == "open":
            params["completed"] = "false"
        elif status == "completed":
            params["completed"] = "true"

        r = httpx.get(f"{_BASE}/tasks/search", headers=headers,
                      params=params, timeout=12)
        r.raise_for_status()
        tasks = r.json().get("data", [])

        return [
            {
                "id":       t.get("gid"),
                "titre":    t.get("name"),
                "statut":   "Complétée" if t.get("completed") else "Ouverte",
                "échéance": t.get("due_on"),
                "assigné":  (t.get("assignee") or {}).get("name"),
                "projet":   ((t.get("projects") or [{}])[0]).get("name"),
                "source":   "asana",
            }
            for t in tasks
        ]

    except httpx.HTTPStatusError as exc:
        return [{"error": f"Asana HTTP {exc.response.status_code}", "source": "asana"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "asana"}]

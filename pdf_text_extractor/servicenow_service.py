"""ServiceNow REST API — Basic Auth (username + password) par organisation.

Les credentials sont saisis par l'admin dans le formulaire connecteur
et stockés chiffrés en base. Aucune variable d'env, aucune app OAuth à créer.
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds


def search_servicenow(
    query: str, org_id: str, status: str = "all", priority: str = "all", limit: int = 5
) -> list[dict]:
    creds, _ = load_creds("servicenow", org_id)
    if not creds:
        return [{"error": "ServiceNow non connecté"}]

    instance = creds.get("instance_url", "").rstrip("/")
    username = creds.get("username", "")
    password = creds.get("password", "")

    if not instance or not username:
        return [{"error": "Credentials ServiceNow incomplets — reconfigurer le connecteur"}]

    sysparm_query = f"short_descriptionLIKE{query}^ORdescriptionLIKE{query}"
    if status != "all":
        state_map = {"open": "1", "in_progress": "2", "resolved": "6"}
        if status in state_map:
            sysparm_query += f"^state={state_map[status]}"
    if priority != "all":
        prio_map = {"critical": "1", "high": "2", "medium": "3", "low": "4"}
        if priority in prio_map:
            sysparm_query += f"^priority={prio_map[priority]}"

    try:
        r = httpx.get(
            f"{instance}/api/now/table/incident",
            auth=(username, password),
            params={
                "sysparm_query":  sysparm_query,
                "sysparm_limit":  limit,
                "sysparm_fields": "number,short_description,priority,state,assigned_to,sys_created_on",
            },
            timeout=12,
        )
        r.raise_for_status()
        return [
            {
                "id":       row.get("number"),
                "titre":    row.get("short_description"),
                "priorité": (row.get("priority") or {}).get("display_value", row.get("priority")),
                "statut":   (row.get("state") or {}).get("display_value", row.get("state")),
                "assigné":  (row.get("assigned_to") or {}).get("display_value", row.get("assigned_to")),
                "créé":     row.get("sys_created_on"),
                "source":   "servicenow",
            }
            for row in r.json().get("result", [])
        ]
    except httpx.HTTPStatusError as exc:
        return [{"error": f"ServiceNow HTTP {exc.response.status_code}", "source": "servicenow"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "servicenow"}]

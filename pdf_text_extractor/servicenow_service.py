"""ServiceNow REST API — vrais appels à partir des tokens OAuth stockés."""
from __future__ import annotations

import os

import httpx
from connector_loader import bearer, load_creds, refresh_oauth


def _instance_url() -> str:
    return os.environ.get("SNOW_INSTANCE_URL", "").rstrip("/")


def search_servicenow(
    query: str, org_id: str, status: str = "all", priority: str = "all", limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("servicenow", org_id)
    if not creds:
        return [{"error": "ServiceNow non connecté"}]

    instance = _instance_url()
    token_url = f"{instance}/oauth_token.do" if instance else ""
    creds = refresh_oauth(creds, cid, token_url, "SNOW_CLIENT_ID", "SNOW_CLIENT_SECRET")

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
            headers=bearer(creds),
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
                "priorité": row.get("priority", {}).get("display_value") if isinstance(row.get("priority"), dict) else row.get("priority"),
                "statut":   row.get("state", {}).get("display_value") if isinstance(row.get("state"), dict) else row.get("state"),
                "assigné":  row.get("assigned_to", {}).get("display_value") if isinstance(row.get("assigned_to"), dict) else row.get("assigned_to"),
                "créé":     row.get("sys_created_on"),
                "source":   "servicenow",
            }
            for row in r.json().get("result", [])
        ]
    except Exception as exc:
        return [{"error": str(exc), "source": "servicenow"}]

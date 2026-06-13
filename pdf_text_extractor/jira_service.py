"""Jira Cloud REST API — vrais appels à partir des tokens OAuth Atlassian."""
from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth, save_creds

_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
_RESOURCES  = "https://api.atlassian.com/oauth/token/accessible-resources"
_SEARCH_URL = "https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue/search"


def _get_cloud_id(creds: dict) -> tuple[str | None, str | None]:
    """Retourne (cloud_id, error_detail). cloud_id est None si l'appel échoue."""
    try:
        r = httpx.get(_RESOURCES, headers=bearer(creds), timeout=10)
        if r.status_code != 200:
            return None, f"accessible-resources HTTP {r.status_code}: {r.text[:200]}"
        resources = r.json()
        if not resources:
            return None, "accessible-resources: aucun site Jira trouvé pour ce token"
        return resources[0]["id"], None
    except Exception as exc:
        return None, str(exc)


def search_jira(
    query: str, org_id: str, status: str = "all", project: str | None = None, limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("jira", org_id)
    if not creds:
        return [{"error": "Jira non connecté"}]
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")

    cloud_id = creds.get("cloud_id")
    if not cloud_id:
        cloud_id, cloud_err = _get_cloud_id(creds)
        if not cloud_id:
            return [{"error": f"Impossible d'accéder au cloud Jira — {cloud_err}"}]
        creds["cloud_id"] = cloud_id
        save_creds(cid, creds)

    jql_parts = [f'text ~ "{query}"']
    if status != "all":
        status_map = {"todo": "To Do", "in_progress": "In Progress", "done": "Done", "blocked": "Blocked"}
        if status in status_map:
            jql_parts.append(f'status = "{status_map[status]}"')
    if project:
        jql_parts.append(f'project = "{project}"')

    jql = " AND ".join(jql_parts) + " ORDER BY updated DESC"

    try:
        r = httpx.get(
            _SEARCH_URL.format(cloud_id=cloud_id),
            headers=bearer(creds),
            params={"jql": jql, "maxResults": limit,
                    "fields": "summary,status,priority,assignee,duedate,project"},
            timeout=12,
        )
        r.raise_for_status()
        return [
            {
                "id":       issue.get("key"),
                "titre":    issue["fields"].get("summary"),
                "statut":   issue["fields"].get("status", {}).get("name"),
                "priorité": issue["fields"].get("priority", {}).get("name"),
                "assigné":  (issue["fields"].get("assignee") or {}).get("displayName"),
                "projet":   issue["fields"].get("project", {}).get("name"),
                "échéance": issue["fields"].get("duedate"),
                "source":   "jira",
            }
            for issue in r.json().get("issues", [])
        ]
    except Exception as exc:
        return [{"error": str(exc), "source": "jira"}]

"""Jira Cloud REST API — supporte OAuth 2.0 (3LO) et API Token (Basic Auth)."""
from __future__ import annotations

import base64

import httpx
from connector_loader import bearer, load_creds, refresh_oauth, save_creds

_TOKEN_URL  = "https://auth.atlassian.com/oauth/token"
_RESOURCES  = "https://api.atlassian.com/oauth/token/accessible-resources"
_SEARCH_OAUTH = "https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue/search"
_SEARCH_PAT   = "{base_url}/rest/api/3/issue/search"


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _is_api_token(creds: dict) -> bool:
    return bool(creds.get("api_token") and creds.get("email") and creds.get("base_url"))


def _basic_auth(creds: dict) -> dict[str, str]:
    token = base64.b64encode(f"{creds['email']}:{creds['api_token']}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Accept": "application/json",
            "Content-Type": "application/json"}


def _get_cloud_id(creds: dict) -> tuple[str | None, str | None]:
    """Retourne (cloud_id, error_detail) pour auth OAuth."""
    try:
        r = httpx.get(_RESOURCES, headers=bearer(creds), timeout=10)
        if r.status_code != 200:
            return None, f"accessible-resources HTTP {r.status_code}: {r.text[:300]}"
        resources = r.json()
        if not resources:
            return None, "accessible-resources: aucun site Jira accessible pour ce token"
        # Préférer un resource ayant explicitement read:jira-work
        jira_res = next(
            (res for res in resources if "read:jira-work" in res.get("scopes", [])),
            resources[0],
        )
        return jira_res["id"], None
    except Exception as exc:
        return None, str(exc)


# ── Recherche principale ──────────────────────────────────────────────────────

def search_jira(
    query: str, org_id: str, status: str = "all", project: str | None = None, limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("jira", org_id)
    if not creds:
        return [{"error": "Jira non connecté"}]

    # ── Mode API Token (Basic Auth) ───────────────────────────────────────────
    if _is_api_token(creds):
        return _search_with_pat(creds, query, status, project, limit)

    # ── Mode OAuth ────────────────────────────────────────────────────────────
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")

    cloud_id = creds.get("cloud_id")
    if not cloud_id:
        cloud_id, cloud_err = _get_cloud_id(creds)
        if not cloud_id:
            return [{"error": f"Impossible d'accéder au cloud Jira — {cloud_err}"}]
        creds["cloud_id"] = cloud_id
        save_creds(cid, creds)

    return _search_issues(
        _SEARCH_OAUTH.format(cloud_id=cloud_id),
        bearer(creds),
        query, status, project, limit,
    )


def _search_with_pat(
    creds: dict, query: str, status: str, project: str | None, limit: int
) -> list[dict]:
    url = _SEARCH_PAT.format(base_url=creds["base_url"].rstrip("/"))
    return _search_issues(url, _basic_auth(creds), query, status, project, limit)


def _search_issues(
    url: str, headers: dict, query: str, status: str, project: str | None, limit: int
) -> list[dict]:
    jql_parts = []
    if query.strip():
        clean = query.replace('"', '\\"')
        jql_parts.append(f'text ~ "{clean}"')
    if status != "all":
        status_map = {"todo": "To Do", "in_progress": "In Progress",
                      "done": "Done", "blocked": "Blocked"}
        if status in status_map:
            jql_parts.append(f'status = "{status_map[status]}"')
    if project:
        jql_parts.append(f'project = "{project}"')

    jql = (" AND ".join(jql_parts) if jql_parts else "ORDER BY updated DESC")
    if jql_parts:
        jql += " ORDER BY updated DESC"

    try:
        r = httpx.post(
            url,
            headers=headers,
            json={"jql": jql, "maxResults": limit,
                  "fields": ["summary", "status", "priority", "assignee", "duedate", "project"]},
            timeout=12,
        )
        if not r.is_success:
            return [{"error": f"Jira HTTP {r.status_code}: {r.text[:400]}", "source": "jira"}]
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

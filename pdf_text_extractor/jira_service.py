"""Jira Cloud REST API — supporte OAuth 2.0 (3LO) et API Token (Basic Auth)."""
from __future__ import annotations

import base64

import httpx
from connector_loader import bearer, load_creds, refresh_oauth, save_creds

_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
_RESOURCES = "https://api.atlassian.com/oauth/token/accessible-resources"


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _is_api_token(creds: dict) -> bool:
    return bool(creds.get("api_token") and creds.get("email") and creds.get("base_url"))


def _basic_auth(creds: dict) -> dict[str, str]:
    token = base64.b64encode(f"{creds['email']}:{creds['api_token']}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Accept": "application/json",
            "Content-Type": "application/json"}


def _get_cloud_info(creds: dict) -> tuple[str | None, str | None, str | None]:
    """Retourne (cloud_id, cloud_url, error_detail).

    Utilise accessible-resources pour obtenir l'URL directe du site Jira.
    L'URL directe (ex: https://site.atlassian.net) fonctionne avec les Bearer tokens
    OAuth sans nécessiter la claim `aud: api.atlassian.com`.
    """
    try:
        r = httpx.get(_RESOURCES, headers=bearer(creds), timeout=10)
        if r.status_code != 200:
            return None, None, f"accessible-resources HTTP {r.status_code}: {r.text[:300]}"
        resources = r.json()
        if not resources:
            return None, None, "accessible-resources: aucun site Jira accessible pour ce token"
        jira_res = next(
            (res for res in resources if "read:jira-work" in res.get("scopes", [])),
            resources[0],
        )
        return jira_res["id"], jira_res.get("url", "").rstrip("/"), None
    except Exception as exc:
        return None, None, str(exc)


# ── Recherche principale ──────────────────────────────────────────────────────

def search_jira(
    query: str, org_id: str, status: str = "all", project: str | None = None, limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("jira", org_id)
    if not creds:
        return [{"error": "Jira non connecté"}]

    # ── Mode API Token (Basic Auth) ───────────────────────────────────────────
    if _is_api_token(creds):
        url = f"{creds['base_url'].rstrip('/')}/rest/api/3/search/jql"
        return _search_issues(url, _basic_auth(creds), query, status, project, limit)

    # ── Mode OAuth — URL directe du site (évite la contrainte audience JWT) ──
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")

    cloud_url = creds.get("cloud_url")
    if not cloud_url:
        cloud_id, cloud_url, cloud_err = _get_cloud_info(creds)
        if not cloud_url:
            return [{"error": f"Impossible d'accéder au cloud Jira — {cloud_err}"}]
        creds["cloud_id"]  = cloud_id
        creds["cloud_url"] = cloud_url
        save_creds(cid, creds)

    url = f"{cloud_url}/rest/api/3/search/jql"
    return _search_issues(url, bearer(creds), query, status, project, limit)


def _search_issues(
    url: str, headers: dict, query: str, status: str, project: str | None, limit: int
) -> list[dict]:
    jql_parts = ["project is not EMPTY"]

    if project:
        jql_parts = [f'project = "{project}"']

    if status != "all":
        status_map = {"todo": "To Do", "in_progress": "In Progress",
                      "done": "Done", "blocked": "Blocked"}
        if status in status_map:
            jql_parts.append(f'status = "{status_map[status]}"')

    jql = " AND ".join(jql_parts) + " ORDER BY updated DESC"

    try:
        r = httpx.get(
            url,
            headers=headers,
            params={"jql": jql, "maxResults": limit,
                    "fields": "summary,status,priority,assignee,duedate,project"},
            timeout=12,
        )
        if not r.is_success:
            return [{"error": f"Jira HTTP {r.status_code}: {r.text[:400]}", "source": "jira"}]
        data   = r.json()
        issues = data.get("issues") or data.get("values", [])
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
            for issue in issues
        ]
    except Exception as exc:
        return [{"error": str(exc), "source": "jira"}]

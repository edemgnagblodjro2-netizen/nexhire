"""Salesforce REST API — vrais appels à partir des tokens OAuth stockés."""

from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token"
_API_VER = "v59.0"


def _get(path: str, creds: dict, params: dict | None = None) -> dict:
    instance = creds.get("instance_url", "https://login.salesforce.com")
    url = f"{instance}/services/data/{_API_VER}/{path}"
    r = httpx.get(url, headers=bearer(creds), params=params or {}, timeout=12)
    r.raise_for_status()
    return r.json()


def get_salesforce_info(org_id: str) -> dict:
    """Ping Salesforce — retourne org info + limites API."""
    creds, cid = load_creds("salesforce", org_id)
    if not creds:
        return {"error": "Salesforce non connecté"}
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "SF_CLIENT_ID", "SF_CLIENT_SECRET")
    try:
        limits = _get("limits/", creds)
        daily = limits.get("DailyApiRequests", {})
        return {
            "instance_url": creds.get("instance_url"),
            "api_requests_used": daily.get("Max", 0) - daily.get("Remaining", 0),
            "api_requests_max": daily.get("Max"),
            "api_requests_left": daily.get("Remaining"),
        }
    except Exception as exc:
        return {"error": str(exc)}


def search_salesforce(query: str, org_id: str, object_type: str = "all", limit: int = 5) -> list[dict]:
    creds, cid = load_creds("salesforce", org_id)
    if not creds:
        return [{"error": "Salesforce non connecté"}]
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "SF_CLIENT_ID", "SF_CLIENT_SECRET")

    results: list[dict] = []
    try:
        # SOQL FIND search across multiple objects
        soql = f"FIND {{{query}}} IN ALL FIELDS RETURNING Opportunity(Name,Amount,StageName,CloseDate LIMIT {limit}),Account(Name,Type,AnnualRevenue LIMIT {limit}),Contract(Name,Status,EndDate LIMIT {limit}),Case(Subject,Status,Priority LIMIT {limit})"
        data = _get("search/", creds, {"q": soql})
        for record_type, records in data.get("searchRecords", {}).items():
            for r in (records if isinstance(records, list) else []):
                item: dict = {"type": record_type.lower(), "source": "salesforce"}
                item.update({k.lower(): v for k, v in r.items() if k != "attributes"})
                results.append(item)
                if len(results) >= limit:
                    break
    except Exception as exc:
        results.append({"error": str(exc), "source": "salesforce"})
    return results[:limit]

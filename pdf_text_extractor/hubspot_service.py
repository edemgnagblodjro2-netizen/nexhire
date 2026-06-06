"""HubSpot CRM REST API — vrais appels à partir des tokens OAuth stockés."""
from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"
_BASE       = "https://api.hubapi.com"


def search_hubspot(
    query: str, org_id: str, object_type: str = "all", limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("hubspot", org_id)
    if not creds:
        return [{"error": "HubSpot non connecté"}]
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET")

    results: list[dict] = []
    targets = (
        ["contact", "company", "deal", "ticket"]
        if object_type == "all"
        else [object_type]
    )

    for obj in targets:
        if len(results) >= limit:
            break
        try:
            r = httpx.post(
                f"{_BASE}/crm/v3/objects/{obj}s/search",
                headers={**bearer(creds), "Content-Type": "application/json"},
                json={
                    "query": query,
                    "limit": limit,
                    "properties": _props(obj),
                },
                timeout=12,
            )
            if r.status_code != 200:
                continue
            for item in r.json().get("results", []):
                results.append(_format(obj, item))
                if len(results) >= limit:
                    break
        except Exception:
            continue

    return results[:limit] or [{"error": "Aucun résultat HubSpot", "source": "hubspot"}]


def _props(obj: str) -> list[str]:
    return {
        "contact": ["firstname", "lastname", "email", "company", "lifecyclestage", "lastmodifieddate"],
        "company": ["name", "domain", "industry", "annualrevenue", "numberofemployees"],
        "deal":    ["dealname", "amount", "dealstage", "closedate", "pipeline"],
        "ticket":  ["subject", "hs_pipeline_stage", "createdate", "hs_ticket_priority"],
    }.get(obj, ["name"])


def _format(obj: str, item: dict) -> dict:
    p = item.get("properties", {})
    base: dict = {"type": obj, "id": item.get("id"), "source": "hubspot"}
    if obj == "contact":
        base.update({"nom": f"{p.get('firstname','')} {p.get('lastname','')}".strip(),
                     "email": p.get("email"), "entreprise": p.get("company"),
                     "statut": p.get("lifecyclestage")})
    elif obj == "company":
        base.update({"nom": p.get("name"), "domaine": p.get("domain"),
                     "industrie": p.get("industry"), "revenu": p.get("annualrevenue")})
    elif obj == "deal":
        base.update({"nom": p.get("dealname"), "valeur": p.get("amount"),
                     "étape": p.get("dealstage"), "fermeture": p.get("closedate")})
    elif obj == "ticket":
        base.update({"sujet": p.get("subject"), "statut": p.get("hs_pipeline_stage"),
                     "priorité": p.get("hs_ticket_priority"), "créé": p.get("createdate")})
    return base

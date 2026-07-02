"""Autotask PSA — client REST API pour MSP (tickets, temps, projets, facturation).

Autotask REST API v1.0 — auth : ApiIntegrationCode + UserName + Secret en headers.
Docs : https://ww1.autotask.net/help/DeveloperHelp/Content/AdminSetup/2ExtensionsIntegrations/APIs/REST/General_Topics/AT_REST_API_Getting_Started.htm
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from crypto import decrypt
from db import get_db, row as db_row

# Autotask zone-aware base URL (zone 4 = default North America)
AUTOTASK_BASE = "https://webservices{zone}.autotask.net/ATServicesRest/v1.0"
DEFAULT_ZONE = "4"


def _load_config(org_id: str) -> dict | None:
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT encrypted_credentials FROM connectors
                   WHERE organization_id = %s AND connector_type = 'autotask'
                   AND status = 'connected' LIMIT 1""",
                (org_id,),
            )
            r = db_row(cur)
        if not r:
            return None
        raw = decrypt(r["encrypted_credentials"])
        cfg = json.loads(raw)
        if cfg.get("simulated"):
            return None
        return cfg
    except Exception:
        return None


def _headers(cfg: dict) -> dict:
    return {
        "ApiIntegrationCode": cfg.get("api_integration_code", ""),
        "UserName": cfg.get("username", ""),
        "Secret": cfg.get("secret") or cfg.get("api_key", ""),
        "Content-Type": "application/json",
    }


def _base_url(cfg: dict) -> str:
    # Supporte zone_url complet (https://webservices24.autotask.net) ou numéro seul
    zone_url = cfg.get("zone_url", "")
    if zone_url.startswith("http"):
        return zone_url.rstrip("/") + "/ATServicesRest/v1.0"
    zone = cfg.get("zone", DEFAULT_ZONE)
    return AUTOTASK_BASE.format(zone=zone)


def search_autotask(
    query: str,
    type: str = "all",
    status: str = "all",
    limit: int = 5,
    org_id: str | None = None,
) -> list[dict]:
    """Recherche dans Autotask PSA (tickets, projets, temps).

    type: "ticket" | "project" | "time_entry" | "all"
    status: "open" | "in_progress" | "completed" | "all"
    """
    cfg = _load_config(org_id) if org_id else None
    if cfg:
        try:
            return _real_search(cfg, query, type, status, limit)
        except Exception:
            pass

    from agent_service import _mock_autotask

    return _mock_autotask(query=query, type=type, status=status, limit=limit)


def _real_search(cfg: dict, query: str, type: str, status: str, limit: int) -> list[dict]:
    base = _base_url(cfg)
    headers = _headers(cfg)
    results: list[dict] = []

    with httpx.Client(timeout=20) as client:
        # Autotask utilise un endpoint de query avec un body JSON
        if type in ("ticket", "all"):
            filter_items: list[dict] = [{"op": "contains", "field": "title", "value": query}]
            if status != "all":
                status_map = {"open": 1, "in_progress": 8, "completed": 5}
                if status in status_map:
                    filter_items.append({"op": "eq", "field": "status", "value": status_map[status]})

            body = {
                "filter": filter_items,
                "maxRecords": limit,
            }
            resp = client.post(
                f"{base}/Tickets/query", headers=headers, json={"filter": filter_items, "maxRecords": limit}
            )
            if resp.status_code == 200:
                tickets = resp.json().get("items", [])
                for t in tickets:
                    results.append(
                        {
                            "id": f"AT-{t.get('id', '')}",
                            "type": "ticket",
                            "titre": t.get("title", ""),
                            "statut": _status_label(t.get("status")),
                            "priorité": _priority_label(t.get("priority")),
                            "assigné_à": t.get("assignedResourceRoleID", ""),
                            "créé": (t.get("createDate", "")[:10] if t.get("createDate") else ""),
                            "due": (t.get("dueDateTime", "")[:10] if t.get("dueDateTime") else ""),
                        }
                    )

        if type in ("project", "all"):
            resp = client.post(
                f"{base}/Projects/query",
                headers=headers,
                json={"filter": [{"op": "contains", "field": "projectName", "value": query}], "maxRecords": limit},
            )
            if resp.status_code == 200:
                projects = resp.json().get("items", [])
                for p in projects:
                    results.append(
                        {
                            "id": f"PRJ-{p.get('id', '')}",
                            "type": "project",
                            "titre": p.get("projectName", ""),
                            "statut": p.get("status", ""),
                            "début": (p.get("startDateTime", "")[:10] if p.get("startDateTime") else ""),
                            "fin": (p.get("endDateTime", "")[:10] if p.get("endDateTime") else ""),
                        }
                    )

    return results[:limit] if results else []


def _status_label(code: Any) -> str:
    labels = {1: "Nouveau", 5: "Complété", 8: "En cours", 11: "Attente client", 29: "En attente"}
    return labels.get(int(code), str(code)) if code is not None else "Inconnu"


def _priority_label(code: Any) -> str:
    labels = {1: "Critique", 2: "Haute", 3: "Moyenne", 4: "Faible"}
    return labels.get(int(code), str(code)) if code is not None else "—"

"""Workday — client API REST pour RH, paie et effectifs.

Utilise les credentials (tenant, client_id, client_secret) stockés chiffrés.
Auth : OAuth2 client_credentials → access_token → REST API.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from crypto import decrypt
from db import get_db, row as db_row


def _load_config(org_id: str) -> dict | None:
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT encrypted_credentials FROM connectors
                   WHERE organization_id = %s AND connector_type = 'workday'
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


def _get_access_token(cfg: dict) -> str:
    """Obtient un access_token Workday via OAuth2 client_credentials."""
    tenant      = cfg.get("tenant", "")
    client_id   = cfg.get("client_id", "")
    client_secret = cfg.get("client_secret", "")
    token_url   = f"https://{tenant}.workday.com/ccx/oauth2/{tenant}/token"

    resp = httpx.post(
        token_url,
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def query_workday(
    category: str,
    department: str | None = None,
    period: str = "current",
    org_id: str | None = None,
) -> dict:
    """Interroge Workday pour les données RH.

    category: "headcount" | "leaves" | "recruiting" | "payroll" | "performance"
    """
    cfg = _load_config(org_id) if org_id else None
    if cfg:
        try:
            return _real_query(cfg, category, department, period)
        except Exception:
            pass

    from agent_service import _mock_workday
    return _mock_workday(category=category, department=department, period=period)


def _real_query(cfg: dict, category: str, department: str | None, period: str) -> dict:
    tenant  = cfg.get("tenant", "")
    base    = f"https://{tenant}.workday.com/ccx/api/v1/{tenant}"
    token   = _get_access_token(cfg)
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    with httpx.Client(timeout=20) as client:
        if category == "headcount":
            url  = f"{base}/workers"
            resp = client.get(url, headers=headers, params={"limit": 100})
            resp.raise_for_status()
            data = resp.json()
            workers = data.get("data", [])
            return {
                "source":         "Workday",
                "effectif_total": data.get("total", len(workers)),
                "workers_sample": [
                    {
                        "id":         w.get("id", ""),
                        "name":       w.get("descriptor", ""),
                        "position":   w.get("primaryJob", {}).get("descriptor", ""),
                    }
                    for w in workers[:10]
                ],
            }

        elif category == "leaves":
            url  = f"{base}/leaveRequests"
            resp = client.get(url, headers=headers, params={"limit": 50, "status": "open"})
            resp.raise_for_status()
            data = resp.json()
            leaves = data.get("data", [])
            return {
                "source":    "Workday",
                "congés_en_cours": len(leaves),
                "leaves":    [
                    {
                        "employee": l.get("worker", {}).get("descriptor", ""),
                        "type":     l.get("leaveType", {}).get("descriptor", ""),
                        "start":    l.get("startDate", ""),
                        "end":      l.get("endDate", ""),
                    }
                    for l in leaves[:10]
                ],
            }

        elif category == "recruiting":
            url  = f"{base}/jobPostings"
            resp = client.get(url, headers=headers, params={"limit": 20, "status": "open"})
            resp.raise_for_status()
            data = resp.json()
            postings = data.get("data", [])
            return {
                "source":          "Workday",
                "postes_vacants":  len(postings),
                "postings":        [
                    {
                        "title":      p.get("descriptor", ""),
                        "department": p.get("organizationalUnit", {}).get("descriptor", ""),
                        "posted":     p.get("postedOn", ""),
                    }
                    for p in postings[:10]
                ],
            }

        elif category == "payroll":
            url  = f"{base}/payrollResults"
            resp = client.get(url, headers=headers, params={"limit": 1, "period": period})
            resp.raise_for_status()
            data = resp.json()
            return {"source": "Workday", "category": "payroll", "data": data}

    return {"source": "Workday", "category": category, "note": "Catégorie non prise en charge."}

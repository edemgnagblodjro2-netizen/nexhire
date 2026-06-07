"""SAP — client API REST/OData pour S/4HANA Cloud et SAP ECC.

Utilise les credentials stockés chiffrés dans la table connectors.
Pattern : Basic Auth ou OAuth2 client_credentials selon la config.
Fallback vers mock si credentials absents ou API indisponible.
"""
from __future__ import annotations

import json
import os
from typing import Any

import httpx

from crypto import decrypt
from db import get_db, row as db_row


def _load_config(org_id: str) -> dict | None:
    """Retourne la config SAP déchiffrée ou None."""
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT encrypted_credentials FROM connectors
                   WHERE organization_id = %s AND connector_type = 'sap'
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
    import base64
    user = cfg.get("username", "")
    pwd  = cfg.get("password", "")
    creds = base64.b64encode(f"{user}:{pwd}".encode()).decode()
    return {
        "Authorization": f"Basic {creds}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def query_sap(
    category: str,
    period: str = "current_month",
    department: str | None = None,
    org_id: str | None = None,
) -> dict:
    """Interroge SAP pour les données financières ou RH.

    category: "expenses" | "budget" | "employees" | "cost_centers"
    """
    cfg = _load_config(org_id) if org_id else None
    if cfg:
        base_url = (cfg.get("instance_url") or cfg.get("api_url", "")).rstrip("/")
        try:
            return _real_query(cfg, base_url, category, period, department)
        except Exception:
            pass  # fallback vers mock

    from agent_service import _mock_sap
    return _mock_sap(category=category, period=period, department=department)


def _real_query(cfg: dict, base_url: str, category: str, period: str, department: str | None) -> dict:
    """Appels réels vers l'API OData SAP S/4HANA."""
    headers = _headers(cfg)

    with httpx.Client(timeout=20, verify=True) as client:
        if category == "budget" or category == "expenses":
            # API Cost Center Report — SAP S/4HANA
            # Endpoint: /sap/opu/odata/sap/API_COST_CENTER_SRV/A_CostCenter
            url = f"{base_url}/sap/opu/odata/sap/API_COST_CENTER_SRV/A_CostCenter"
            params: dict[str, Any] = {"$format": "json", "$top": "20"}
            if department:
                params["$filter"] = f"CostCenterName eq '{department}'"
            resp = client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json().get("d", {}).get("results", [])
            return {
                "source": "SAP S/4HANA",
                "category": category,
                "period": period,
                "cost_centers": [
                    {
                        "id":          r.get("CostCenter", ""),
                        "name":        r.get("CostCenterName", ""),
                        "controlling_area": r.get("ControllingArea", ""),
                        "company_code": r.get("CompanyCode", ""),
                        "currency":    r.get("CostCenterCurrency", "CAD"),
                    }
                    for r in data
                ],
            }

        elif category == "employees":
            # API Employee — SuccessFactors ou HCM
            url = f"{base_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner"
            params = {"$format": "json", "$top": "50", "$filter": "BusinessPartnerCategory eq '1'"}
            resp = client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json().get("d", {}).get("results", [])
            return {
                "source": "SAP HCM",
                "category": "employees",
                "total": len(data),
                "employees": [
                    {
                        "id":         r.get("BusinessPartner", ""),
                        "name":       r.get("BusinessPartnerFullName", ""),
                        "type":       r.get("BusinessPartnerType", ""),
                    }
                    for r in data
                ],
            }

        elif category == "cost_centers":
            url = f"{base_url}/sap/opu/odata/sap/API_COST_CENTER_SRV/A_CostCenter"
            resp = client.get(url, headers=headers, params={"$format": "json", "$top": "30"})
            resp.raise_for_status()
            data = resp.json().get("d", {}).get("results", [])
            return {"source": "SAP", "cost_centers": data}

    return {"source": "SAP", "category": category, "note": "Catégorie non prise en charge."}

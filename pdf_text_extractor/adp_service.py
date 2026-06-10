"""ADP Workforce Now — données RH via ADP API (OAuth2 client_credentials).

Auth : client_id + client_secret → bearer token.
Credentials stockés chiffrés par organisation. Aucune variable d'env requise.
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds

_TOKEN_URL = "https://accounts.adp.com/auth/oauth/v2/token"
_API_BASE  = "https://api.adp.com"


def _get_token(client_id: str, client_secret: str) -> str:
    r = httpx.post(_TOKEN_URL,
                   data={"grant_type": "client_credentials"},
                   auth=(client_id, client_secret),
                   headers={"Accept": "application/json"},
                   timeout=10)
    r.raise_for_status()
    return r.json()["access_token"]


def query_adp(category: str, org_id: str, period: str = "current_month") -> dict:
    creds, _ = load_creds("adp", org_id)
    if not creds:
        return {"error": "ADP non connecté"}

    client_id     = creds.get("client_id", "").strip()
    client_secret = creds.get("client_secret", "").strip()

    if not client_id or not client_secret:
        return {"error": "Credentials ADP incomplets — reconfigurer le connecteur"}

    try:
        token   = _get_token(client_id, client_secret)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

        if category == "headcount":
            r = httpx.get(f"{_API_BASE}/hr/v2/workers",
                          headers=headers,
                          params={"$select": "associateOID,person/legalName,workerDates/originalHireDate,workAssignments/assignmentStatus"},
                          timeout=12)
            r.raise_for_status()
            workers = r.json().get("workers", [])
            actifs = [w for w in workers if
                      (w.get("workAssignments") or [{}])[0].get("assignmentStatus", {}).get("statusCode", {}).get("codeValue") == "Active"]
            return {
                "total_employés":  len(workers),
                "actifs":          len(actifs),
                "source":          "adp",
            }

        if category == "payroll":
            r = httpx.get(f"{_API_BASE}/payroll/v1/payroll-output",
                          headers=headers,
                          params={"$top": 1},
                          timeout=12)
            r.raise_for_status()
            data = r.json()
            return {
                "dernière_paie": data,
                "source": "adp",
            }

        if category == "time_off":
            r = httpx.get(f"{_API_BASE}/time/v2/workers/time-off-requests",
                          headers=headers,
                          params={"$top": 20},
                          timeout=12)
            r.raise_for_status()
            requests = r.json().get("timeOffRequests", [])
            pending  = [x for x in requests if x.get("requestStatus", {}).get("statusCode", {}).get("codeValue") == "Pending"]
            return {
                "demandes_total":   len(requests),
                "en_attente":       len(pending),
                "source":           "adp",
            }

        return {"error": f"Catégorie ADP inconnue : {category}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"ADP HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": str(exc)}

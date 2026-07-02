"""Microsoft Intune — gestion appareils via Microsoft Graph API.

Auth : OAuth 2.0 client_credentials (pas de user — service account).
Credentials : tenant_id, client_id, client_secret — stockés chiffrés par org.
Aucune variable d'env requise.
"""

from __future__ import annotations

import httpx
from connector_loader import load_creds

_GRAPH = "https://graph.microsoft.com/v1.0"


def _get_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    r = httpx.post(
        url,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def query_intune(category: str, org_id: str, department: str | None = None) -> dict:
    creds, _ = load_creds("intune", org_id)
    if not creds:
        return {"error": "Intune non connecté"}

    tenant_id = creds.get("tenant_id", "").strip()
    client_id = creds.get("client_id", "").strip()
    client_secret = creds.get("client_secret", "").strip()

    if not tenant_id or not client_id or not client_secret:
        return {"error": "Credentials Intune incomplets — reconfigurer le connecteur"}

    try:
        token = _get_token(tenant_id, client_id, client_secret)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

        if category == "devices":
            r = httpx.get(
                f"{_GRAPH}/deviceManagement/managedDevices",
                headers=headers,
                params={
                    "$select": "id,deviceName,operatingSystem,complianceState,lastSyncDateTime,userPrincipalName",
                    "$top": 20,
                },
                timeout=12,
            )
            r.raise_for_status()
            devices = r.json().get("value", [])
            compliant = [d for d in devices if d.get("complianceState") == "compliant"]
            noncompliant = [d for d in devices if d.get("complianceState") == "noncompliant"]
            return {
                "appareils_total": len(devices),
                "conformes": len(compliant),
                "non_conformes": len(noncompliant),
                "appareils": [
                    {
                        "nom": d.get("deviceName"),
                        "os": d.get("operatingSystem"),
                        "conformité": d.get("complianceState"),
                        "utilisateur": d.get("userPrincipalName"),
                        "dernière_sync": d.get("lastSyncDateTime"),
                    }
                    for d in devices[:15]
                ],
            }

        if category == "compliance":
            r = httpx.get(f"{_GRAPH}/deviceManagement/deviceCompliancePolicies", headers=headers, timeout=12)
            r.raise_for_status()
            policies = r.json().get("value", [])
            return {
                "politiques_total": len(policies),
                "politiques": [
                    {
                        "nom": p.get("displayName"),
                        "plateforme": p.get("@odata.type", "").replace("#microsoft.graph.", ""),
                        "créée": p.get("createdDateTime"),
                    }
                    for p in policies
                ],
            }

        if category == "apps":
            r = httpx.get(
                f"{_GRAPH}/deviceAppManagement/mobileApps",
                headers=headers,
                params={"$select": "id,displayName,publisher,publishingState", "$top": 20},
                timeout=12,
            )
            r.raise_for_status()
            apps = r.json().get("value", [])
            return {
                "apps_déployées": len(apps),
                "liste": [
                    {"nom": a.get("displayName"), "éditeur": a.get("publisher"), "statut": a.get("publishingState")}
                    for a in apps
                ],
            }

        return {"error": f"Catégorie Intune inconnue : {category}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"Intune HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": str(exc)}

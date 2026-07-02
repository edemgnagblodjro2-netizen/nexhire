"""BambooHR — données RH via API REST.

Auth : API Key (Basic auth — api_key comme mot de passe, 'x' comme utilisateur).
Credentials stockés par organisation. Aucune variable d'env requise.
"""

from __future__ import annotations

import httpx
from connector_loader import load_creds


def _auth(api_key: str) -> tuple[str, str]:
    return (api_key, "x")


def query_bamboohr(category: str, org_id: str, department: str | None = None, limit: int = 10) -> dict:
    creds, _ = load_creds("bamboohr", org_id)
    if not creds:
        return {"error": "BambooHR non connecté"}

    subdomain = creds.get("subdomain", "").strip()
    api_key = creds.get("api_key", "").strip()
    if not subdomain or not api_key:
        return {"error": "Credentials BambooHR incomplets — reconfigurer le connecteur"}

    base = f"https://api.bamboohr.com/api/gateway.php/{subdomain}/v1"
    auth = _auth(api_key)
    headers = {"Accept": "application/json"}

    try:
        if category == "headcount":
            r = httpx.get(f"{base}/employees/directory", auth=auth, headers=headers, timeout=12)
            r.raise_for_status()
            employees = r.json().get("employees", [])
            if department:
                employees = [e for e in employees if department.lower() in (e.get("department") or "").lower()]
            return {
                "effectif_total": len(employees),
                "département_filtre": department or "tous",
                "employés": [
                    {
                        "id": e.get("id"),
                        "nom": e.get("displayName"),
                        "poste": e.get("jobTitle"),
                        "département": e.get("department"),
                        "statut": e.get("employmentStatus"),
                    }
                    for e in employees[:limit]
                ],
            }

        if category in ("time_off", "congés"):
            r = httpx.get(
                f"{base}/time_off/requests",
                auth=auth,
                headers=headers,
                params={"start": "2026-01-01", "end": "2026-12-31", "status": "approved"},
                timeout=12,
            )
            r.raise_for_status()
            requests = r.json() if isinstance(r.json(), list) else []
            return {
                "demandes_approuvées": len(requests),
                "liste": [
                    {
                        "employé": req.get("employee", {}).get("name"),
                        "type": req.get("type", {}).get("name"),
                        "début": req.get("start"),
                        "fin": req.get("end"),
                    }
                    for req in requests[:limit]
                ],
            }

        if category in ("onboarding", "new_hires"):
            r = httpx.get(f"{base}/employees/directory", auth=auth, headers=headers, timeout=12)
            r.raise_for_status()
            employees = r.json().get("employees", [])
            recent = [e for e in employees if (e.get("hireDate") or "") >= "2026-01-01"]
            return {
                "nouvelles_embauches_2026": len(recent),
                "liste": [
                    {
                        "nom": e.get("displayName"),
                        "poste": e.get("jobTitle"),
                        "département": e.get("department"),
                        "arrivée": e.get("hireDate"),
                    }
                    for e in recent[:limit]
                ],
            }

        return {"error": f"Catégorie BambooHR inconnue : {category}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"BambooHR HTTP {exc.response.status_code}"}
    except Exception as exc:
        return {"error": str(exc)}

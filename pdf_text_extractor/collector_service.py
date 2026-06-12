"""
Collecteur de données normalisé.
Lit les données brutes de chaque connecteur et les normalise en entités métier
communes persistées dans la table `entities`.
"""
from __future__ import annotations

import json
from typing import Any

from db import get_db, rows as db_rows, row as db_row
from connector_loader import load_creds

# ── Données démo (utilisées quand un connecteur n'est pas connecté) ───────────
# Scénario réaliste : Jean Dupont est parti (inactif Workday) mais conserve
# ses accès M365 et Jira → compte orphelin. ancien.employe n'est pas dans
# Workday → compte fantôme.

_DEMO_WORKDAY = [
    {"id": "WD001", "name": "Marie Tremblay",   "email": "marie.tremblay@corp.com",   "department": "Ressources Humaines", "active": True,  "salary_monthly": 5800},
    {"id": "WD002", "name": "Jean Dupont",       "email": "jean.dupont@corp.com",       "department": "Finances",            "active": False, "salary_monthly": 6200},
    {"id": "WD003", "name": "Sophie Lavoie",     "email": "sophie.lavoie@corp.com",     "department": "Technologies",        "active": True,  "salary_monthly": 7100},
    {"id": "WD004", "name": "Marc Bouchard",     "email": "marc.bouchard@corp.com",     "department": "Finances",            "active": True,  "salary_monthly": 5500},
    {"id": "WD005", "name": "Isabelle Roy",      "email": "isabelle.roy@corp.com",      "department": "Direction",           "active": True,  "salary_monthly": 9800},
    {"id": "WD006", "name": "Thomas Gagnon",     "email": "thomas.gagnon@corp.com",     "department": "Technologies",        "active": True,  "salary_monthly": 6800},
]

_DEMO_M365 = [
    {"id": "M365-001", "email": "marie.tremblay@corp.com",  "name": "Marie Tremblay",  "department": "Ressources Humaines", "enabled": True,  "cost_monthly": 22},
    # Jean Dupont : inactif Workday, encore actif M365 → orphan
    {"id": "M365-002", "email": "jean.dupont@corp.com",      "name": "Jean Dupont",      "department": "Finances",            "enabled": True,  "cost_monthly": 22},
    {"id": "M365-003", "email": "sophie.lavoie@corp.com",    "name": "Sophie Lavoie",    "department": "Technologies",        "enabled": True,  "cost_monthly": 38},
    {"id": "M365-004", "email": "marc.bouchard@corp.com",    "name": "Marc Bouchard",    "department": "Finances",            "enabled": True,  "cost_monthly": 22},
    {"id": "M365-005", "email": "isabelle.roy@corp.com",     "name": "Isabelle Roy",     "department": "Direction",           "enabled": True,  "cost_monthly": 57},
    # Ancien employé : présent M365 mais absent Workday → ghost
    {"id": "M365-006", "email": "ancien.employe@corp.com",   "name": "Ancien Employé",   "department": "TI",                  "enabled": True,  "cost_monthly": 22},
    {"id": "M365-007", "email": "thomas.gagnon@corp.com",    "name": "Thomas Gagnon",    "department": "Technologies",        "enabled": True,  "cost_monthly": 22},
]

_DEMO_JIRA = [
    {"id": "JR-001", "email": "marie.tremblay@corp.com", "name": "Marie Tremblay", "cost_monthly": 8},
    # Jean Dupont toujours actif Jira malgré son départ
    {"id": "JR-002", "email": "jean.dupont@corp.com",     "name": "Jean Dupont",     "cost_monthly": 8},
    {"id": "JR-003", "email": "sophie.lavoie@corp.com",   "name": "Sophie Lavoie",   "cost_monthly": 8},
    {"id": "JR-004", "email": "marc.bouchard@corp.com",   "name": "Marc Bouchard",   "cost_monthly": 8},
    {"id": "JR-005", "email": "thomas.gagnon@corp.com",   "name": "Thomas Gagnon",   "cost_monthly": 8},
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _upsert_entity(
    org_id: str,
    entity_type: str,
    source_connector: str,
    source_id: str,
    email: str | None,
    display_name: str | None,
    department_name: str | None,
    data: dict,
    cost_monthly: float = 0,
    last_activity_at: str | None = None,
    status: str = "active",
) -> None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.entities
              (organization_id, entity_type, source_connector, source_id,
               email, display_name, department_name, data, cost_monthly,
               last_activity_at, status, synced_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,now())
            ON CONFLICT (organization_id, source_connector, entity_type, source_id)
            DO UPDATE SET
              email            = EXCLUDED.email,
              display_name     = EXCLUDED.display_name,
              department_name  = EXCLUDED.department_name,
              data             = EXCLUDED.data,
              cost_monthly     = EXCLUDED.cost_monthly,
              last_activity_at = EXCLUDED.last_activity_at,
              status           = EXCLUDED.status,
              synced_at        = now()
            """,
            (
                org_id, entity_type, source_connector, source_id or "",
                email, display_name, department_name,
                json.dumps(data), cost_monthly,
                last_activity_at, status,
            ),
        )


# ── Workday ───────────────────────────────────────────────────────────────────

def collect_workday(org_id: str) -> int:
    """Normalise les employés Workday → entités 'person'."""
    workers = _fetch_workday_workers(org_id)
    for w in workers:
        _upsert_entity(
            org_id=org_id,
            entity_type="person",
            source_connector="workday",
            source_id=w.get("id", ""),
            email=w.get("email"),
            display_name=w.get("name"),
            department_name=w.get("department"),
            data=w,
            cost_monthly=float(w.get("salary_monthly") or 0),
            status="active" if w.get("active", True) else "inactive",
        )
    return len(workers)


def _fetch_workday_workers(org_id: str) -> list[dict]:
    """Tente l'API réelle, repli sur démo si non configuré."""
    try:
        from workday_service import _load_config, _get_access_token, _api_base
        import httpx
        cfg = _load_config(org_id)
        if not cfg:
            return _DEMO_WORKDAY

        token = _get_access_token(cfg)
        base  = _api_base(cfg)
        r = httpx.get(
            f"{base}/workers",
            headers={"Authorization": f"Bearer {token}"},
            params={"limit": 500},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        result = []
        for w in data.get("data", []):
            result.append({
                "id":             w.get("id"),
                "name":           (w.get("person") or {}).get("legalName", {}).get("fullName"),
                "email":          (w.get("businessContact") or {}).get("emailAddress"),
                "department":     (w.get("position") or {}).get("businessUnit", {}).get("descriptor"),
                "active":         w.get("workerStatus", {}).get("descriptor") == "Active",
                "salary_monthly": 0,
            })
        return result or _DEMO_WORKDAY
    except Exception:
        return _DEMO_WORKDAY


# ── Microsoft 365 ─────────────────────────────────────────────────────────────

def collect_microsoft_365(org_id: str) -> int:
    """Normalise les utilisateurs M365 → entités 'person'."""
    users = _fetch_m365_users(org_id)
    for u in users:
        _upsert_entity(
            org_id=org_id,
            entity_type="person",
            source_connector="microsoft_365",
            source_id=u.get("id", ""),
            email=u.get("email"),
            display_name=u.get("name"),
            department_name=u.get("department"),
            data=u,
            cost_monthly=float(u.get("cost_monthly") or 22),
            status="active" if u.get("enabled", True) else "inactive",
        )
    return len(users)


def _fetch_m365_users(org_id: str) -> list[dict]:
    try:
        from m365_service import _load_tokens, _refresh_if_needed
        import httpx
        tokens, cid = _load_tokens(org_id)
        if not tokens:
            return _DEMO_M365

        tokens = _refresh_if_needed(tokens, cid)
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        r = httpx.get(
            "https://graph.microsoft.com/v1.0/users",
            headers=headers,
            params={"$select": "id,displayName,userPrincipalName,department,accountEnabled", "$top": 500},
            timeout=15,
        )
        r.raise_for_status()
        result = []
        for u in r.json().get("value", []):
            result.append({
                "id":         u.get("id"),
                "email":      u.get("userPrincipalName"),
                "name":       u.get("displayName"),
                "department": u.get("department"),
                "enabled":    u.get("accountEnabled", True),
                "cost_monthly": 22,
            })
        return result or _DEMO_M365
    except Exception:
        return _DEMO_M365


# ── Jira ──────────────────────────────────────────────────────────────────────

def collect_jira(org_id: str) -> int:
    """Normalise les utilisateurs Jira actifs → entités 'person'."""
    users = _fetch_jira_users(org_id)
    for u in users:
        _upsert_entity(
            org_id=org_id,
            entity_type="person",
            source_connector="jira",
            source_id=u.get("id", ""),
            email=u.get("email"),
            display_name=u.get("name"),
            department_name=None,
            data=u,
            cost_monthly=float(u.get("cost_monthly") or 8),
            status="active",
        )
    return len(users)


def _fetch_jira_users(org_id: str) -> list[dict]:
    try:
        from connector_loader import load_creds, bearer, refresh_oauth
        import httpx
        creds, cid = load_creds("jira", org_id)
        if not creds:
            return _DEMO_JIRA

        creds = refresh_oauth(creds, cid,
            "https://auth.atlassian.com/oauth/token",
            "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")

        # Récupère le cloud_id
        res = httpx.get("https://api.atlassian.com/oauth/token/accessible-resources",
                        headers=bearer(creds), timeout=10)
        res.raise_for_status()
        cloud_id = (res.json() or [{}])[0].get("id")
        if not cloud_id:
            return _DEMO_JIRA

        r = httpx.get(
            f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/users/search",
            headers=bearer(creds),
            params={"maxResults": 500, "accountType": "atlassian"},
            timeout=15,
        )
        r.raise_for_status()
        result = []
        for u in r.json():
            result.append({
                "id":           u.get("accountId"),
                "email":        u.get("emailAddress"),
                "name":         u.get("displayName"),
                "cost_monthly": 8,
            })
        return result or _DEMO_JIRA
    except Exception:
        return _DEMO_JIRA


# ── Point d'entrée ────────────────────────────────────────────────────────────

def collect_all(org_id: str) -> dict:
    """Lance la collecte pour tous les connecteurs disponibles."""
    return {
        "workday":        collect_workday(org_id),
        "microsoft_365":  collect_microsoft_365(org_id),
        "jira":           collect_jira(org_id),
    }

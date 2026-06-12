"""
Collecteur de données normalisé — modèle universel AgentHub.
Normalise les données de chaque connecteur en :
  - identities     (enregistrement maître de la personne)
  - identity_accounts  (compte dans chaque système)
  - license_pools      (contrats de licences M365)
  - license_assignments (qui a quelle licence)
Données démo activées automatiquement si le connecteur n'est pas configuré.
"""
from __future__ import annotations

import json
from typing import Any

from db import get_db, rows as db_rows, row as db_row

# ─────────────────────────────────────────────────────────────────────────────
# Données démo — scénario réaliste multi-risques
# Jean Dupont : terminé dans Workday, encore actif M365 + Jira → ORPHAN
# ancien.employe : actif M365 mais absent Workday → GHOST
# Alice Morin : licence E5 mais utilisation minimale → OVERSIZED
# Bob Carrier : licence E3 mais inactif depuis 95j → UNUSED
# ─────────────────────────────────────────────────────────────────────────────

_DEMO_WORKDAY = [
    {"id": "WD001", "name": "Marie Tremblay",  "email": "marie.tremblay@corp.com",  "dept": "Ressources Humaines", "status": "active",     "salary_monthly": 5800, "title": "Chef RH"},
    {"id": "WD002", "name": "Jean Dupont",     "email": "jean.dupont@corp.com",     "dept": "Finances",            "status": "terminated", "salary_monthly": 0,    "title": "Analyste financier"},
    {"id": "WD003", "name": "Sophie Lavoie",   "email": "sophie.lavoie@corp.com",   "dept": "Technologies",        "status": "active",     "salary_monthly": 7100, "title": "Développeuse senior"},
    {"id": "WD004", "name": "Marc Bouchard",   "email": "marc.bouchard@corp.com",   "dept": "Finances",            "status": "active",     "salary_monthly": 5500, "title": "Contrôleur"},
    {"id": "WD005", "name": "Isabelle Roy",    "email": "isabelle.roy@corp.com",    "dept": "Direction",           "status": "active",     "salary_monthly": 9800, "title": "Directrice générale"},
    {"id": "WD006", "name": "Thomas Gagnon",   "email": "thomas.gagnon@corp.com",   "dept": "Technologies",        "status": "active",     "salary_monthly": 6800, "title": "Architecte cloud"},
    {"id": "WD007", "name": "Alice Morin",     "email": "alice.morin@corp.com",     "dept": "Ventes",              "status": "active",     "salary_monthly": 5200, "title": "Représentante"},
    {"id": "WD008", "name": "Bob Carrier",     "email": "bob.carrier@corp.com",     "dept": "Marketing",           "status": "active",     "salary_monthly": 5000, "title": "Coordonnateur"},
]

_DEMO_M365 = [
    # email,                      name,               dept,     enabled, sku,     cost,  days_inactive, features_used
    ("marie.tremblay@corp.com",  "Marie Tremblay",   "RH",     True,  "E3",    22,   5,   ["exchange","teams","sharepoint","word","excel"]),
    ("jean.dupont@corp.com",     "Jean Dupont",      "Finance",True,  "E3",    22,   45,  ["exchange"]),       # terminé WD → ORPHAN
    ("sophie.lavoie@corp.com",   "Sophie Lavoie",    "IT",     True,  "E5",    57,   2,   ["exchange","teams","sharepoint","defender","intune"]),
    ("marc.bouchard@corp.com",   "Marc Bouchard",    "Finance",True,  "E3",    22,   10,  ["exchange","teams","excel"]),
    ("isabelle.roy@corp.com",    "Isabelle Roy",     "DIR",    True,  "E5",    57,   3,   ["exchange","teams","word","excel","powerpoint"]),
    ("thomas.gagnon@corp.com",   "Thomas Gagnon",    "IT",     True,  "E5",    57,   1,   ["exchange","teams","azure","defender","powerbi"]),
    ("alice.morin@corp.com",     "Alice Morin",      "Ventes", True,  "E5",    57,   8,   ["exchange","teams","word"]),   # E5 mais usage basique → OVERSIZED
    ("bob.carrier@corp.com",     "Bob Carrier",      "Mktg",   True,  "E3",    22,   95,  []),                # inactif 95j → UNUSED
    ("ancien.employe@corp.com",  "Ancien Employé",   "TI",     True,  "E3",    22,   180, ["exchange"]),      # absent WD → GHOST
]

_DEMO_JIRA = [
    ("marie.tremblay@corp.com",  "Marie Tremblay",  "JIRA-001"),
    ("jean.dupont@corp.com",     "Jean Dupont",     "JIRA-002"),  # terminé WD → ORPHAN
    ("sophie.lavoie@corp.com",   "Sophie Lavoie",   "JIRA-003"),
    ("marc.bouchard@corp.com",   "Marc Bouchard",   "JIRA-004"),
    ("thomas.gagnon@corp.com",   "Thomas Gagnon",   "JIRA-005"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers DB
# ─────────────────────────────────────────────────────────────────────────────

def _upsert_identity(
    org_id: str,
    canonical_email: str,
    full_name: str | None,
    org_unit_name: str | None,
    job_title: str | None,
    status: str,
    source_of_truth: str,
    cost_monthly: float,
    metadata: dict,
) -> str | None:
    """Upsert une identité maître, retourne son UUID."""
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.identities
              (organization_id, canonical_email, full_name, org_unit_name, job_title,
               status, source_of_truth, cost_monthly, metadata, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, canonical_email) DO UPDATE SET
              full_name       = EXCLUDED.full_name,
              org_unit_name   = EXCLUDED.org_unit_name,
              job_title       = EXCLUDED.job_title,
              status          = EXCLUDED.status,
              source_of_truth = EXCLUDED.source_of_truth,
              cost_monthly    = EXCLUDED.cost_monthly,
              metadata        = EXCLUDED.metadata,
              updated_at      = now()
            RETURNING id
            """,
            (
                org_id, canonical_email, full_name, org_unit_name, job_title,
                status, source_of_truth, cost_monthly,
                json.dumps(metadata),
            ),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_account(
    org_id: str,
    identity_id: str | None,
    source_connector: str,
    external_id: str,
    external_email: str | None,
    display_name: str | None,
    status: str,
    last_activity_at: str | None,
    data: dict,
) -> str | None:
    """Upsert un compte dans un système source, retourne son UUID."""
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.identity_accounts
              (organization_id, identity_id, source_connector, external_id,
               external_email, display_name, status, last_activity_at, data, synced_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
              identity_id      = COALESCE(EXCLUDED.identity_id, identity_accounts.identity_id),
              external_email   = EXCLUDED.external_email,
              display_name     = EXCLUDED.display_name,
              status           = EXCLUDED.status,
              last_activity_at = EXCLUDED.last_activity_at,
              data             = EXCLUDED.data,
              synced_at        = now()
            RETURNING id
            """,
            (
                org_id, identity_id, source_connector, external_id,
                external_email, display_name, status,
                last_activity_at, json.dumps(data),
            ),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_license_pool(
    org_id: str,
    connector_type: str,
    sku_name: str,
    sku_id: str,
    qty_total: int,
    qty_assigned: int,
    unit_cost_monthly: float,
    data: dict,
) -> str | None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_pools
              (organization_id, connector_type, sku_name, sku_id,
               quantity_total, quantity_assigned, unit_cost_monthly, data, synced_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, connector_type, sku_name) DO UPDATE SET
              sku_id           = EXCLUDED.sku_id,
              quantity_total   = EXCLUDED.quantity_total,
              quantity_assigned = EXCLUDED.quantity_assigned,
              unit_cost_monthly = EXCLUDED.unit_cost_monthly,
              data             = EXCLUDED.data,
              synced_at        = now()
            RETURNING id
            """,
            (org_id, connector_type, sku_name, sku_id,
             qty_total, qty_assigned, unit_cost_monthly, json.dumps(data)),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_license_assignment(
    org_id: str,
    identity_id: str | None,
    account_id: str | None,
    pool_id: str | None,
    sku_name: str,
    connector_type: str,
) -> str | None:
    if not account_id:
        return None
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_assignments
              (organization_id, identity_id, account_id, pool_id, sku_name, connector_type)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON CONFLICT (organization_id, account_id, sku_name) DO UPDATE SET
              identity_id = COALESCE(EXCLUDED.identity_id, license_assignments.identity_id),
              pool_id     = COALESCE(EXCLUDED.pool_id, license_assignments.pool_id)
            RETURNING id
            """,
            (org_id, identity_id, account_id, pool_id, sku_name, connector_type),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_usage(
    org_id: str,
    assignment_id: str,
    period_start: str,
    period_end: str,
    metrics: dict,
    activity_score: int,
    tier_needed: str,
) -> None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_usage
              (organization_id, assignment_id, period_start, period_end,
               metrics, activity_score, tier_needed)
            VALUES (%s,%s,%s,%s,%s::jsonb,%s,%s)
            ON CONFLICT (assignment_id, period_start) DO UPDATE SET
              metrics        = EXCLUDED.metrics,
              activity_score = EXCLUDED.activity_score,
              tier_needed    = EXCLUDED.tier_needed
            """,
            (org_id, assignment_id, period_start, period_end,
             json.dumps(metrics), activity_score, tier_needed),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Workday
# ─────────────────────────────────────────────────────────────────────────────

def collect_workday(org_id: str) -> int:
    workers = _fetch_workday(org_id)
    for w in workers:
        status_map = {"active": "active", "terminated": "terminated",
                      "inactive": "inactive", "on_leave": "on_leave"}
        wd_status = status_map.get(w.get("status", "active"), "active")

        identity_id = _upsert_identity(
            org_id=org_id,
            canonical_email=w["email"],
            full_name=w.get("name"),
            org_unit_name=w.get("dept"),
            job_title=w.get("title"),
            status=wd_status,
            source_of_truth="workday",
            cost_monthly=float(w.get("salary_monthly") or 0),
            metadata=w,
        )
        _upsert_account(
            org_id=org_id,
            identity_id=identity_id,
            source_connector="workday",
            external_id=w["id"],
            external_email=w["email"],
            display_name=w.get("name"),
            status=wd_status,
            last_activity_at=None,
            data=w,
        )
    return len(workers)


def _fetch_workday(org_id: str) -> list[dict]:
    try:
        from workday_service import _load_config, _get_access_token, _api_base
        import httpx
        cfg = _load_config(org_id)
        if not cfg:
            return _DEMO_WORKDAY
        token = _get_access_token(cfg)
        base  = _api_base(cfg)
        r = httpx.get(f"{base}/workers", headers={"Authorization": f"Bearer {token}"},
                      params={"limit": 500}, timeout=15)
        r.raise_for_status()
        result = []
        for w in r.json().get("data", []):
            result.append({
                "id":             w.get("id", ""),
                "name":           (w.get("person") or {}).get("legalName", {}).get("fullName"),
                "email":          (w.get("businessContact") or {}).get("emailAddress"),
                "dept":           (w.get("position") or {}).get("businessUnit", {}).get("descriptor"),
                "status":         "active" if (w.get("workerStatus") or {}).get("descriptor") == "Active" else "terminated",
                "salary_monthly": 0,
                "title":          (w.get("position") or {}).get("jobProfile", {}).get("descriptor"),
            })
        return result or _DEMO_WORKDAY
    except Exception:
        return _DEMO_WORKDAY


# ─────────────────────────────────────────────────────────────────────────────
# Microsoft 365 — utilisateurs + licences + usage
# ─────────────────────────────────────────────────────────────────────────────

def collect_microsoft_365(org_id: str) -> int:
    data = _fetch_m365(org_id)
    pool_ids: dict[str, str | None] = {}  # sku_name → pool_id

    for (email, name, dept, enabled, sku, cost, days_inactive, features) in data:
        # Résoudre l'identité existante (créée par Workday si possible)
        identity_id = _resolve_identity_id(org_id, email)

        # Compte M365
        acct_status = "active" if enabled else "inactive"
        acct_id = _upsert_account(
            org_id=org_id,
            identity_id=identity_id,
            source_connector="microsoft_365",
            external_id=f"M365-{email}",
            external_email=email,
            display_name=name,
            status=acct_status,
            last_activity_at=None,
            data={"department": dept, "accountEnabled": enabled, "sku": sku,
                  "days_inactive": days_inactive, "features": features},
        )

        # Pool de licence (upsert une fois par SKU)
        if sku not in pool_ids:
            pool_ids[sku] = _upsert_license_pool(
                org_id=org_id,
                connector_type="microsoft_365",
                sku_name=sku,
                sku_id=f"SKU-{sku}",
                qty_total=50,     # remplacé par API réelle
                qty_assigned=len([d for d in data if d[4] == sku]),
                unit_cost_monthly=cost,
                data={"sku_friendly": sku},
            )

        # Attribution
        assign_id = _upsert_license_assignment(
            org_id=org_id,
            identity_id=identity_id,
            account_id=acct_id,
            pool_id=pool_ids.get(sku),
            sku_name=sku,
            connector_type="microsoft_365",
        )

        # Usage (simulé sur période J-30 à J)
        if assign_id:
            score, tier = _compute_m365_score(features, days_inactive, sku)
            from datetime import date, timedelta
            today = date.today()
            _upsert_usage(
                org_id=org_id,
                assignment_id=assign_id,
                period_start=(today - timedelta(days=30)).isoformat(),
                period_end=today.isoformat(),
                metrics={
                    "exchange_active":    "exchange" in features,
                    "teams_active":       "teams" in features,
                    "sharepoint_active":  "sharepoint" in features,
                    "onedrive_active":    "onedrive" in features,
                    "word_active":        "word" in features,
                    "excel_active":       "excel" in features,
                    "powerpoint_active":  "powerpoint" in features,
                    "defender_active":    "defender" in features,
                    "intune_active":      "intune" in features,
                    "powerbi_active":     "powerbi" in features,
                    "days_inactive":      days_inactive,
                },
                activity_score=score,
                tier_needed=tier,
            )
    return len(data)


def _compute_m365_score(features: list[str], days_inactive: int, sku: str) -> tuple[int, str]:
    """Calcule le score d'activité et le tier réellement nécessaire."""
    if days_inactive > 90:
        return 0, "none"

    weights = {
        "exchange": 25, "teams": 25, "sharepoint": 15, "onedrive": 15,
        "word": 8, "excel": 8, "powerpoint": 4,
    }
    score = min(sum(w for k, w in weights.items() if k in features), 100)

    # Tier réellement nécessaire
    advanced_features = {"defender", "intune", "powerbi", "azure", "purview"}
    uses_advanced = bool(advanced_features & set(features))
    uses_collab   = bool({"sharepoint", "onedrive", "teams"} & set(features))

    if uses_advanced:
        tier = "enterprise"   # E5 justifié
    elif uses_collab:
        tier = "advanced"     # E3 justifié
    elif features:
        tier = "standard"     # Business Basic suffisant
    else:
        tier = "none"         # rien du tout

    return score, tier


def _fetch_m365(org_id: str) -> list[tuple]:
    """Retourne les données M365 (réelles ou démo)."""
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
            params={"$select": "id,displayName,userPrincipalName,department,accountEnabled,assignedLicenses",
                    "$top": 500},
            timeout=15,
        )
        r.raise_for_status()
        result = []
        for u in r.json().get("value", []):
            skus = [lic.get("skuId", "") for lic in (u.get("assignedLicenses") or [])]
            sku  = "E3"  # simplification — à enrichir avec SKU mapping réel
            result.append((
                u.get("userPrincipalName"), u.get("displayName"),
                u.get("department"), u.get("accountEnabled", True),
                sku, 22, 0, ["exchange"],
            ))
        return result or _DEMO_M365
    except Exception:
        return _DEMO_M365


# ─────────────────────────────────────────────────────────────────────────────
# Jira
# ─────────────────────────────────────────────────────────────────────────────

def collect_jira(org_id: str) -> int:
    users = _fetch_jira(org_id)
    for (email, name, ext_id) in users:
        identity_id = _resolve_identity_id(org_id, email)
        _upsert_account(
            org_id=org_id,
            identity_id=identity_id,
            source_connector="jira",
            external_id=ext_id,
            external_email=email,
            display_name=name,
            status="active",
            last_activity_at=None,
            data={"email": email},
        )
    return len(users)


def _fetch_jira(org_id: str) -> list[tuple]:
    try:
        from connector_loader import load_creds, bearer, refresh_oauth
        import httpx
        creds, cid = load_creds("jira", org_id)
        if not creds:
            return _DEMO_JIRA
        creds = refresh_oauth(creds, cid,
            "https://auth.atlassian.com/oauth/token",
            "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")
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
        return [
            (u.get("emailAddress"), u.get("displayName"), u.get("accountId", ""))
            for u in r.json()
        ] or _DEMO_JIRA
    except Exception:
        return _DEMO_JIRA


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_identity_id(org_id: str, email: str) -> str | None:
    """Recherche l'UUID d'une identité par son email canonique."""
    if not email:
        return None
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM public.identities WHERE organization_id = %s AND canonical_email = %s",
                (org_id, email.lower().strip()),
            )
            r = cur.fetchone()
        return str(r["id"]) if r else None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────────────────────────────────────

def collect_all(org_id: str) -> dict:
    """Lance la collecte complète pour tous les connecteurs."""
    return {
        "workday":       collect_workday(org_id),
        "microsoft_365": collect_microsoft_365(org_id),
        "jira":          collect_jira(org_id),
    }

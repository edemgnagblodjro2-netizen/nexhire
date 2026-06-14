from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from crypto import encrypt
from db import get_db, rows, row
from rbac import ROLE_RANK, require_active_subscription, require_min_role

VALID_TYPES = frozenset({
    # OAuth
    "microsoft_365", "salesforce", "servicenow", "jira",
    "zendesk", "hubspot", "google_workspace", "slack", "quickbooks",
    # API Key / Credentials
    "sap", "workday", "autotask",
    "bamboohr", "adp",
    "asana", "monday", "clickup",
    "aws", "netsuite", "intune", "crowdstrike",
    "epicor",
})

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


def _check_type(connector_type: str) -> None:
    if connector_type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Type de connecteur inconnu : {connector_type}. "
                   f"Valeurs acceptées : {sorted(VALID_TYPES)}",
        )


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _is_admin(user: CurrentUser) -> bool:
    return ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account


def _connector_id_or_404(connector_type: str, org_id: str) -> str:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM connectors WHERE organization_id = %s AND connector_type = %s LIMIT 1",
            (org_id, connector_type),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Connecteur introuvable ou non connecté.")
    return result["id"]


@router.get("")
def list_connectors(user: CurrentUser = Depends(require_min_role("user"))):
    """Liste les connecteurs accessibles à l'utilisateur.

    - Admin/owner : tous les connecteurs + leurs départements assignés.
    - Membre : uniquement les connecteurs explicitement assignés à ses départements.
    """
    if _is_admin(user):
        # Jointure pour récupérer les départements assignés à chaque connecteur
        with get_db() as cur:
            cur.execute(
                """
                SELECT c.id, c.connector_type, c.status,
                       c.connected_at, c.last_error, c.updated_at,
                       d.id   AS dept_id,
                       d.name AS dept_name
                FROM connectors c
                LEFT JOIN connector_departments cd ON cd.connector_id = c.id
                LEFT JOIN departments d ON d.id = cd.department_id
                WHERE c.organization_id = %s
                ORDER BY c.connector_type, d.name
                """,
                (user.organization_id,),
            )
            raw = rows(cur)

        # Grouper les départements par connecteur
        result: dict[str, dict] = {}
        for r in raw:
            ct = r["connector_type"]
            if ct not in result:
                result[ct] = {
                    "id": r["id"], "connector_type": ct,
                    "status": r["status"], "connected_at": r["connected_at"],
                    "last_error": r["last_error"], "updated_at": r["updated_at"],
                    "departments": [],
                }
            if r["dept_id"]:
                result[ct]["departments"].append({"id": r["dept_id"], "name": r["dept_name"]})
        return list(result.values())

    # Membres : récupérer leurs départements
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT department_id FROM department_members WHERE user_id = %s",
                (user.id,),
            )
            dept_ids = [r["department_id"] for r in rows(cur)]

        # Aucun département assigné → aucun connecteur visible
        if not dept_ids:
            return []

        # Seulement les connecteurs explicitement assignés aux départements du membre
        with get_db() as cur:
            cur.execute(
                """
                SELECT DISTINCT c.id, c.connector_type, c.status,
                                c.connected_at, c.last_error, c.updated_at
                FROM connectors c
                WHERE c.organization_id = %s
                  AND EXISTS (
                      SELECT 1 FROM connector_departments
                      WHERE connector_id = c.id
                        AND department_id = ANY(%s::uuid[])
                  )
                """,
                (user.organization_id, dept_ids),
            )
            return rows(cur)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Erreur serveur interne.") from exc


@router.get("/{connector_type}/status")
def connector_status(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Statut d'un connecteur spécifique."""
    _check_type(connector_type)
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, connector_type, status, connected_at, last_error, updated_at
            FROM connectors
            WHERE organization_id = %s AND connector_type = %s
            LIMIT 1
            """,
            (user.organization_id, connector_type),
        )
        result = row(cur)
    if not result:
        return {"connector_type": connector_type, "status": "disconnected"}
    return result


# ── Maturité / confiance des connecteurs ─────────────────────────────────────

@router.get("/trust")
def connectors_trust(user: CurrentUser = Depends(require_min_role("manager"))):
    """Retourne le niveau de maturité de chaque connecteur (mock vs réel validé)."""
    from connector_trust import CONNECTOR_TRUST, get_trust_label, maturity_summary

    with get_db() as cur:
        cur.execute(
            "SELECT connector_type, status FROM connectors WHERE organization_id = %s",
            (user.organization_id,),
        )
        configured = {r["connector_type"]: r["status"] for r in rows(cur)}

    result = []
    for ctype, trust in CONNECTOR_TRUST.items():
        result.append({
            "connector_type": ctype,
            "trust_level":    trust["trust_level"],
            "trust_label":    get_trust_label(trust["trust_level"]),
            "can_sandbox":    trust["can_sandbox"],
            "validated_at":   trust["validated_at"],
            "notes":          trust["notes"],
            "configured":     ctype in configured,
            "conn_status":    configured.get(ctype),
        })

    result.sort(key=lambda x: (-x["trust_level"], x["connector_type"]))
    return {"connectors": result, "summary": maturity_summary()}


# ── Santé globale des connecteurs ─────────────────────────────────────────────

@router.get("/health")
def connectors_health(user: CurrentUser = Depends(require_min_role("manager"))):
    """Retourne les connecteurs en erreur ou dont le token OAuth expire dans 7 jours."""
    from datetime import timedelta
    soon = (datetime.now(UTC) + timedelta(days=7)).isoformat()

    with get_db() as cur:
        cur.execute(
            """
            SELECT connector_type, status, last_error,
                   token_expires_at, connected_at
            FROM connectors
            WHERE organization_id = %s
              AND (
                status = 'error'
                OR (token_expires_at IS NOT NULL AND token_expires_at <= %s::timestamptz)
              )
            ORDER BY
              CASE WHEN status = 'error' THEN 0 ELSE 1 END,
              token_expires_at NULLS LAST
            """,
            (user.organization_id, soon),
        )
        raw = rows(cur)

    alerts = []
    for r in raw:
        is_token_error = r["status"] == "error" and r.get("last_error") and (
            "Token refresh" in (r["last_error"] or "") or "401" in (r["last_error"] or "")
        )
        alerts.append({
            "connector_type":   r["connector_type"],
            "status":           r["status"],
            "last_error":       r["last_error"],
            "token_expires_at": r["token_expires_at"].isoformat() if r["token_expires_at"] else None,
            "alert_type":       "token_expired" if is_token_error else
                                "error" if r["status"] == "error" else "expiring_soon",
        })

    return {
        "alerts":         alerts,
        "error_count":    sum(1 for a in alerts if a["status"] == "error"),
        "expiring_count": sum(1 for a in alerts if a["status"] != "error"),
    }


# ── Gestion des accès par département ─────────────────────────────────────────

@router.get("/{connector_type}/departments")
def list_connector_departments(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Retourne les départements autorisés pour ce connecteur."""
    _check_type(connector_type)
    connector_id = _connector_id_or_404(connector_type, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            SELECT d.id, d.name, d.dept_type
            FROM connector_departments cd
            JOIN departments d ON d.id = cd.department_id
            WHERE cd.connector_id = %s
            ORDER BY d.name
            """,
            (connector_id,),
        )
        return rows(cur)


@router.post("/{connector_type}/departments/{dept_id}", status_code=201)
def add_connector_department(
    connector_type: str,
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Autorise un département à accéder à ce connecteur.
    Crée le connecteur (disconnected) s'il n'existe pas encore."""
    _check_type(connector_type)

    # Auto-créer le connecteur s'il n'est pas encore configuré
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM connectors WHERE organization_id = %s AND connector_type = %s LIMIT 1",
            (user.organization_id, connector_type),
        )
        existing = row(cur)

    if existing:
        connector_id = existing["id"]
    else:
        with get_db() as cur:
            cur.execute(
                """INSERT INTO connectors (organization_id, connector_type, status)
                   VALUES (%s, %s, 'disconnected') RETURNING id""",
                (user.organization_id, connector_type),
            )
            created = row(cur)
        if not created:
            raise HTTPException(status_code=500, detail="Impossible de créer le connecteur.")
        connector_id = created["id"]

    # Vérifier que le département appartient à la même organisation
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM departments WHERE id = %s AND organization_id = %s LIMIT 1",
            (dept_id, user.organization_id),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Département introuvable.")

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO connector_departments (connector_id, department_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (connector_id, dept_id),
        )
    return {"connector_type": connector_type, "department_id": dept_id, "status": "added"}


@router.delete("/{connector_type}/departments/{dept_id}", status_code=204)
def remove_connector_department(
    connector_type: str,
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Retire l'accès d'un département à ce connecteur."""
    _check_type(connector_type)
    connector_id = _connector_id_or_404(connector_type, user.organization_id)
    with get_db() as cur:
        cur.execute(
            "DELETE FROM connector_departments WHERE connector_id = %s AND department_id = %s",
            (connector_id, dept_id),
        )


# ── Connexion / Déconnexion ────────────────────────────────────────────────────

# Champs obligatoires par connecteur (validation minimale)
_REQUIRED_FIELDS: dict[str, list[str]] = {
    "sap":      ["api_url", "username", "password"],
    "workday":  ["tenant_url", "client_id", "client_secret"],
    "autotask": ["username", "api_key", "api_integration_code", "zone_url"],
}


@router.post("/{connector_type}/credentials", status_code=status.HTTP_200_OK)
async def save_credentials(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Enregistre les credentials réels d'un connecteur (chiffrés Fernet)."""
    _check_type(connector_type)
    payload: dict = await request.json()

    # Validation minimale des champs obligatoires
    required = _REQUIRED_FIELDS.get(connector_type, [])
    missing = [f for f in required if not payload.get(f, "").strip()]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Champs manquants : {', '.join(missing)}",
        )

    # Nettoyage + normalisation des champs selon le connecteur
    creds: dict = {k: v.strip() for k, v in payload.items() if isinstance(v, str) and v.strip()}

    if connector_type == "sap":
        creds["instance_url"] = creds.pop("api_url", creds.get("instance_url", ""))

    elif connector_type == "workday":
        # Extrait le nom du tenant depuis l'URL si besoin
        tenant_url = creds.get("tenant_url", "")
        if not creds.get("tenant") and tenant_url:
            # https://<tenant>.workday.com/... ou https://wd3-impl.workday.com/ccx/service/<tenant>
            import re
            m = re.search(r"workday\.com/ccx/service/([^/]+)", tenant_url)
            if m:
                creds["tenant"] = m.group(1)
            else:
                m2 = re.match(r"https?://([^.]+)\.workday\.com", tenant_url)
                if m2:
                    creds["tenant"] = m2.group(1)

    elif connector_type == "autotask":
        # Renomme api_key → secret (nom attendu par autotask_service)
        if "api_key" in creds:
            creds["secret"] = creds.pop("api_key")
        # Extrait le numéro de zone depuis l'URL (ex: https://webservices24.autotask.net → 24)
        zone_url = creds.get("zone_url", "")
        if zone_url and not creds.get("zone"):
            import re
            m = re.search(r"webservices(\d+)", zone_url)
            creds["zone"] = m.group(1) if m else "4"

    encrypted = encrypt(json.dumps(creds))
    now = _now()

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM connectors WHERE organization_id = %s AND connector_type = %s LIMIT 1",
            (user.organization_id, connector_type),
        )
        existing = row(cur)

    if existing:
        with get_db() as cur:
            cur.execute(
                """UPDATE connectors SET
                       status = 'connected',
                       encrypted_credentials = %s,
                       connected_at = %s,
                       last_error = NULL,
                       updated_at = %s
                   WHERE id = %s""",
                (encrypted, now, now, existing["id"]),
            )
    else:
        with get_db() as cur:
            cur.execute(
                """INSERT INTO connectors
                       (organization_id, connector_type, status, encrypted_credentials, connected_at, updated_at)
                   VALUES (%s, %s, 'connected', %s, %s, %s)""",
                (user.organization_id, connector_type, encrypted, now, now),
            )

    background.add_task(log_audit, AuditEvent(
        action="connector_credentials_saved",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
    ))
    return {"connector_type": connector_type, "status": "connected"}


@router.post("/{connector_type}/ping")
def ping_connector(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Teste la connexion réelle d'un connecteur credentials (SAP, Workday, Autotask)."""
    _check_type(connector_type)
    org_id = user.organization_id

    try:
        if connector_type == "sap":
            from sap_service import _load_config, _headers
            import httpx
            cfg = _load_config(org_id)
            if not cfg:
                return {"ok": False, "error": "Connecteur non configuré ou credentials manquants."}
            base_url = (cfg.get("instance_url") or cfg.get("api_url", "")).rstrip("/")
            with httpx.Client(timeout=10) as client:
                resp = client.get(
                    f"{base_url}/sap/opu/odata/sap/API_COST_CENTER_SRV/A_CostCenter",
                    headers=_headers(cfg),
                    params={"$format": "json", "$top": "1"},
                )
            if resp.status_code in (200, 401, 403):
                ok = resp.status_code == 200
                return {"ok": ok, "http_status": resp.status_code,
                        "error": None if ok else f"HTTP {resp.status_code} — vérifiez vos credentials SAP."}
            resp.raise_for_status()

        elif connector_type == "workday":
            from workday_service import _load_config, _get_access_token, _api_base
            import httpx
            cfg = _load_config(org_id)
            if not cfg:
                return {"ok": False, "error": "Connecteur non configuré ou credentials manquants."}
            token = _get_access_token(cfg)
            base  = _api_base(cfg)
            with httpx.Client(timeout=10) as client:
                resp = client.get(
                    f"{base}/workers",
                    headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                    params={"limit": 1},
                )
            ok = resp.status_code == 200
            return {"ok": ok, "http_status": resp.status_code,
                    "error": None if ok else f"HTTP {resp.status_code} — vérifiez vos credentials Workday."}

        elif connector_type == "autotask":
            from autotask_service import _load_config, _headers as at_headers, _base_url
            import httpx
            cfg = _load_config(org_id)
            if not cfg:
                return {"ok": False, "error": "Connecteur non configuré ou credentials manquants."}
            base = _base_url(cfg)
            with httpx.Client(timeout=10) as client:
                resp = client.post(
                    f"{base}/Tickets/query",
                    headers=at_headers(cfg),
                    json={"filter": [], "maxRecords": 1},
                )
            ok = resp.status_code in (200, 204)
            return {"ok": ok, "http_status": resp.status_code,
                    "error": None if ok else f"HTTP {resp.status_code} — vérifiez vos credentials Autotask."}

        elif connector_type == "jira":
            from jira_service import _is_api_token, _basic_auth, _get_cloud_info
            from connector_loader import load_creds, bearer
            import httpx
            creds, _ = load_creds("jira", org_id)
            if not creds:
                return {"ok": False, "error": "Connecteur Jira non trouvé en DB."}
            if _is_api_token(creds):
                base_url = creds["base_url"].rstrip("/")
                headers = _basic_auth(creds)
                # Test 1 : authentification
                r1 = httpx.get(f"{base_url}/rest/api/3/myself", headers=headers, timeout=10)
                if r1.status_code != 200:
                    return {"ok": False, "mode": "api_token", "step": "myself",
                            "http_status": r1.status_code, "error": r1.text[:300]}
                account = r1.json().get("displayName")
                # Test 2 : recherche d'issues
                r2 = httpx.get(
                    f"{base_url}/rest/api/3/issue/search",
                    headers=headers,
                    params={"jql": "ORDER BY updated DESC", "maxResults": 1,
                            "fields": "summary,status"},
                    timeout=12,
                )
                search_ok = r2.status_code == 200
                return {
                    "ok": search_ok,
                    "mode": "api_token",
                    "account": account,
                    "myself_status": 200,
                    "search_status": r2.status_code,
                    "search_total": r2.json().get("total") if search_ok else None,
                    "search_error": None if search_ok else r2.text[:400],
                }
            else:
                from connector_loader import refresh_oauth
                _TOKEN_URL = "https://auth.atlassian.com/oauth/token"
                creds = refresh_oauth(creds, _, _TOKEN_URL, "JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET")
                # Vérifie les scopes réels du token via accessible-resources
                r_res = httpx.get(
                    "https://api.atlassian.com/oauth/token/accessible-resources",
                    headers={**bearer(creds), "Accept": "application/json"},
                    timeout=10,
                )
                resources = r_res.json() if r_res.status_code == 200 else []
                token_scopes = resources[0].get("scopes", []) if resources else []
                cloud_id  = resources[0].get("id") if resources else None
                cloud_url = (resources[0].get("url") or "").rstrip("/") if resources else ""
                if not cloud_url:
                    return {"ok": False, "mode": "oauth", "token_scopes": token_scopes,
                            "error": f"accessible-resources HTTP {r_res.status_code}"}
                # Test search via URL directe (évite contrainte audience JWT)
                search_url = f"{cloud_url}/rest/api/3/issue/search"
                rs = httpx.get(
                    search_url,
                    headers={**bearer(creds), "Accept": "application/json"},
                    params={"jql": "ORDER BY updated DESC", "maxResults": 1,
                            "fields": "summary,status"},
                    timeout=12,
                )
                search_ok = rs.status_code == 200
                return {
                    "ok": search_ok,
                    "mode": "oauth",
                    "cloud_id": cloud_id,
                    "cloud_url": cloud_url,
                    "token_scopes": token_scopes,
                    "search_url": search_url,
                    "search_status": rs.status_code,
                    "search_total": rs.json().get("total") if search_ok else None,
                    "search_error": None if search_ok else rs.text[:400],
                }

        return {"ok": False, "error": f"Ping non supporté pour le connecteur '{connector_type}'."}

    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.post("/{connector_type}/connect", status_code=status.HTTP_200_OK)
def connect(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Simule la connexion (stocke {"simulated": true} chiffré Fernet)."""
    _check_type(connector_type)
    creds = encrypt(json.dumps({"simulated": True}))
    now = _now()

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM connectors WHERE organization_id = %s AND connector_type = %s LIMIT 1",
            (user.organization_id, connector_type),
        )
        existing = row(cur)

    if existing:
        with get_db() as cur:
            cur.execute(
                """
                UPDATE connectors SET
                    status = %s,
                    encrypted_credentials = %s,
                    connected_at = %s,
                    last_error = NULL,
                    updated_at = %s
                WHERE id = %s
                """,
                ("connected", creds, now, now, existing["id"]),
            )
    else:
        with get_db() as cur:
            cur.execute(
                """
                INSERT INTO connectors (
                    organization_id, connector_type, status,
                    encrypted_credentials, connected_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (user.organization_id, connector_type, "connected", creds, now, now),
            )

    background.add_task(log_audit, AuditEvent(
        action="connector_connect",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
    ))
    return {"connector_type": connector_type, "status": "connected"}


@router.post("/{connector_type}/disconnect", status_code=status.HTTP_200_OK)
def disconnect(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Déconnecte et efface les credentials chiffrés."""
    _check_type(connector_type)

    with get_db() as cur:
        cur.execute(
            """
            UPDATE connectors SET
                status = %s,
                encrypted_credentials = NULL,
                connected_at = NULL,
                updated_at = %s
            WHERE organization_id = %s AND connector_type = %s
            """,
            ("disconnected", _now(), user.organization_id, connector_type),
        )

    background.add_task(log_audit, AuditEvent(
        action="connector_disconnect",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
    ))
    return {"connector_type": connector_type, "status": "disconnected"}

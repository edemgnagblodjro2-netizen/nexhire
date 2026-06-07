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
    - Membre : connecteurs sans restriction (org-wide) OU assignés à ses départements.
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
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        dept_ids = [r["department_id"] for r in rows(cur)]

    with get_db() as cur:
        cur.execute(
            """
            SELECT DISTINCT c.id, c.connector_type, c.status,
                            c.connected_at, c.last_error, c.updated_at
            FROM connectors c
            WHERE c.organization_id = %s
              AND (
                  NOT EXISTS (
                      SELECT 1 FROM connector_departments WHERE connector_id = c.id
                  )
                  OR EXISTS (
                      SELECT 1 FROM connector_departments
                      WHERE connector_id = c.id
                        AND department_id = ANY(%s)
                  )
              )
            """,
            (user.organization_id, dept_ids or []),
        )
        return rows(cur)


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
    """Autorise un département à accéder à ce connecteur."""
    _check_type(connector_type)
    connector_id = _connector_id_or_404(connector_type, user.organization_id)

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
    "autotask": ["username", "api_key", "zone_url"],
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

"""Politiques Vivantes — pilier 6 de l'architecture v3.

Politiques avec règles auto-vérifiables via connecteurs.

GET  /api/politiques               → liste avec statuts agrégés
GET  /api/politiques/summary       → KPIs globaux
GET  /api/politiques/{id}          → détail + règles
POST /api/politiques               → créer
PUT  /api/politiques/{id}          → modifier
POST /api/politiques/{id}/verify   → déclencher vérification auto → policy_rule_runs
GET  /api/politiques/{id}/rules    → lister les règles
POST /api/politiques/{id}/rules    → ajouter une règle
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/politiques", tags=["politiques-vivantes"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class PolicyCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    category: str = Field(default="gouvernance")
    description: str | None = None
    owner: str | None = None
    review_cycle_days: int = Field(default=365, ge=1)
    framework_ref: str | None = None
    playbook_id: str | None = None


class PolicyUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    description: str | None = None
    owner: str | None = None
    status: str | None = None
    review_cycle_days: int | None = None
    framework_ref: str | None = None
    playbook_id: str | None = None


class RuleCreate(BaseModel):
    connector_type: str = Field(..., description="ex: entra_id, ms365, custom")
    connector_action: str = Field(..., description="ex: check_mfa_enabled")
    condition_description: str
    expected_value: str | None = None
    severity: str = Field(default="medium")


# ── Helper ────────────────────────────────────────────────────────────────────


def _policy_dict(r) -> dict:
    d = dict(r)
    for k in ("id", "org_id", "responsible_id", "playbook_id"):
        if k in d and d[k] is not None:
            d[k] = str(d[k])
    for k in ("created_at", "updated_at", "last_verified_at", "expires_at"):
        if k in d and d[k] is not None:
            d[k] = d[k].isoformat()
    return d


def _rule_dict(r) -> dict:
    d = dict(r)
    for k in ("id", "policy_id"):
        if k in d and d[k] is not None:
            d[k] = str(d[k])
    if "last_run_at" in d and d["last_run_at"] is not None:
        d["last_run_at"] = d["last_run_at"].isoformat()
    return d


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("/summary")
def get_summary(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE status = 'active')  AS active,
              COUNT(*) FILTER (WHERE status = 'draft')   AS draft,
              COUNT(*) FILTER (WHERE status = 'violated') AS violated,
              COUNT(*) FILTER (WHERE status = 'expired') AS expired,
              COUNT(*) AS total
            FROM policies WHERE org_id = %s
        """,
            (oid,),
        )
        counts = dict(row(cur) or {})

    with get_db() as cur:
        cur.execute(
            """
            SELECT COUNT(DISTINCT pr.policy_id)
            FROM policy_rules pr
            WHERE pr.connector_type != 'manual'
            AND EXISTS (
                SELECT 1 FROM policies p WHERE p.id = pr.policy_id AND p.org_id = %s
            )
        """,
            (oid,),
        )
        auto_row = row(cur)
        counts["auto_verifiable"] = auto_row["count"] if auto_row else 0

    return counts


@router.get("")
def list_policies(
    category: str | None = None,
    status: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    filters = ["p.org_id = %s"]
    params: list = [oid]
    if category:
        filters.append("p.category = %s")
        params.append(category)
    if status:
        filters.append("p.status = %s")
        params.append(status)

    where = " AND ".join(filters)
    with get_db() as cur:
        cur.execute(
            f"""
            SELECT p.*,
              COUNT(pr.id) AS rule_count,
              COUNT(pr.id) FILTER (WHERE pr.last_status = 'violated') AS violated_rules,
              COUNT(pr.id) FILTER (WHERE pr.connector_type != 'manual') AS auto_rules
            FROM policies p
            LEFT JOIN policy_rules pr ON pr.policy_id = p.id
            WHERE {where}
            GROUP BY p.id
            ORDER BY
              CASE p.status WHEN 'violated' THEN 0 WHEN 'active' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
              p.updated_at DESC
        """,
            params,
        )
        policies = [_policy_dict(r) for r in rows(cur)]

    return {"policies": policies}


@router.get("/{policy_id}/rules")
def list_rules(
    policy_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM policies WHERE id = %s AND org_id = %s LIMIT 1",
            (policy_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Politique introuvable")

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM policy_rules WHERE policy_id = %s ORDER BY created_at",
            (policy_id,),
        )
        return {"rules": [_rule_dict(r) for r in rows(cur)]}


@router.get("/{policy_id}")
def get_policy(
    policy_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            "SELECT * FROM policies WHERE id = %s AND org_id = %s LIMIT 1",
            (policy_id, oid),
        )
        p = row(cur)
        if not p:
            raise HTTPException(404, "Politique introuvable")

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM policy_rules WHERE policy_id = %s ORDER BY created_at",
            (policy_id,),
        )
        rule_list = [_rule_dict(r) for r in rows(cur)]

    result = _policy_dict(p)
    result["rules"] = rule_list
    return result


@router.post("")
def create_policy(
    body: PolicyCreate,
    user: CurrentUser = Depends(get_current_user),
):
    require_min_role(user, "admin")
    oid = str(user.organization_id)
    pid = str(uuid.uuid4())
    now = datetime.now(UTC)

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO policies
              (id, org_id, title, category, description, owner, status,
               review_cycle_days, framework_ref, playbook_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,'draft',%s,%s,%s,%s,%s)
        """,
            (
                pid,
                oid,
                body.title,
                body.category,
                body.description,
                body.owner,
                body.review_cycle_days,
                body.framework_ref,
                body.playbook_id,
                now,
                now,
            ),
        )

    return {"id": pid, "status": "draft"}


@router.put("/{policy_id}")
def update_policy(
    policy_id: str,
    body: PolicyUpdate,
    user: CurrentUser = Depends(get_current_user),
):
    require_min_role(user, "admin")
    oid = str(user.organization_id)

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(400, "Aucun champ à mettre à jour")

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    params = list(fields.values()) + [datetime.now(UTC), policy_id, oid]

    with get_db() as cur:
        cur.execute(
            f"UPDATE policies SET {set_clause}, updated_at = %s WHERE id = %s AND org_id = %s",
            params,
        )
    return {"updated": True}


@router.post("/{policy_id}/rules")
def add_rule(
    policy_id: str,
    body: RuleCreate,
    user: CurrentUser = Depends(get_current_user),
):
    require_min_role(user, "admin")
    oid = str(user.organization_id)

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM policies WHERE id = %s AND org_id = %s LIMIT 1",
            (policy_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Politique introuvable")

    rid = str(uuid.uuid4())
    now = datetime.now(UTC)
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO policy_rules
              (id, policy_id, connector_type, connector_action,
               condition_description, expected_value, severity, last_status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'pending',%s)
        """,
            (
                rid,
                policy_id,
                body.connector_type,
                body.connector_action,
                body.condition_description,
                body.expected_value,
                body.severity,
                now,
            ),
        )
    return {"id": rid}


@router.post("/{policy_id}/verify")
def verify_policy(
    policy_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Déclenche une vérification de toutes les règles auto-vérifiables de la politique."""
    require_min_role(user, "admin")
    oid = str(user.organization_id)

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM policies WHERE id = %s AND org_id = %s LIMIT 1",
            (policy_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Politique introuvable")

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM policy_rules WHERE policy_id = %s AND connector_type != 'manual'",
            (policy_id,),
        )
        rule_list = rows(cur)

    now = datetime.now(UTC)
    run_ids = []
    for rule in rule_list:
        run_id = str(uuid.uuid4())
        # Simulation: statut "running" → résultat réel à brancher sur le connecteur
        with get_db() as cur:
            cur.execute(
                """
                INSERT INTO policy_rule_runs
                  (id, rule_id, policy_id, status, started_at)
                VALUES (%s,%s,%s,'running',%s)
                ON CONFLICT DO NOTHING
            """,
                (run_id, str(rule["id"]), policy_id, now),
            )
        run_ids.append(run_id)

    with get_db() as cur:
        cur.execute(
            "UPDATE policies SET last_verified_at = %s WHERE id = %s",
            (now, policy_id),
        )

    return {"triggered": len(run_ids), "run_ids": run_ids}

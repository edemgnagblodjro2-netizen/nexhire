"""Playbooks — processus métier multi-étapes au-dessus du Centre d'Orchestration.

Routes :
  GET    /api/playbooks                       Liste
  POST   /api/playbooks                       Créer
  GET    /api/playbooks/{id}                  Détail
  PUT    /api/playbooks/{id}                  Modifier
  DELETE /api/playbooks/{id}                  Archiver
  POST   /api/playbooks/{id}/run              Déclencher une exécution
  GET    /api/playbooks/{id}/runs             Historique d'exécutions
  GET    /api/playbooks/runs/{run_id}         Détail d'une exécution en cours
  POST   /api/playbooks/runs/{run_id}/step/{idx}/approve  Valider étape humaine
  POST   /api/playbooks/runs/{run_id}/step/{idx}/reject   Rejeter étape
  POST   /api/playbooks/runs/{run_id}/cancel  Annuler
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])


def _ser(d: dict) -> dict:
    return {
        k: str(v) if v is not None and not isinstance(v, (str, int, float, bool, list, dict)) else v
        for k, v in d.items()
    }


# ── Liste ──────────────────────────────────────────────────────────────────────


@router.get("")
def list_playbooks(
    user: CurrentUser = Depends(get_current_user),
    category: str | None = None,
    status: str | None = Query(default="active"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    oid = str(user.organization_id)
    sql = """
        SELECT p.*,
               u.full_name AS responsible_name
        FROM playbooks p
        LEFT JOIN users u ON u.id = p.responsible_id
        WHERE p.org_id = %s
    """
    params: list = [oid]

    if category:
        sql += " AND p.category = %s"
        params.append(category)
    if status:
        statuses = [s.strip() for s in status.split(",")]
        phs = ",".join(["%s"] * len(statuses))
        sql += f" AND p.status IN ({phs})"
        params.extend(statuses)

    sql += " ORDER BY p.run_count DESC, p.created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(sql, params)
        items = [_ser(dict(r)) for r in rows(cur)]

    return {"playbooks": items, "total": len(items)}


# ── Détail ─────────────────────────────────────────────────────────────────────


@router.get("/{playbook_id}")
def get_playbook(playbook_id: str, user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT p.*, u.full_name AS responsible_name
               FROM playbooks p
               LEFT JOIN users u ON u.id = p.responsible_id
               WHERE p.id = %s AND p.org_id = %s""",
            (playbook_id, oid),
        )
        p = row(cur)
    if not p:
        raise HTTPException(status_code=404, detail="Playbook introuvable.")
    return _ser(dict(p))


# ── Créer ──────────────────────────────────────────────────────────────────────


class PlaybookCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    category: str = "general"
    icon: str = "📋"
    sla_minutes: int | None = None
    responsible_dept: str | None = None
    steps: list = Field(default_factory=list)
    trigger_type: list[str] = Field(default_factory=lambda: ["manual"])


@router.post("", status_code=201)
def create_playbook(
    request: Request,
    payload: PlaybookCreate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """INSERT INTO playbooks
               (org_id, name, description, category, icon, sla_minutes,
                responsible_dept, steps, trigger_type, created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s)
               RETURNING id""",
            (
                oid,
                payload.name,
                payload.description,
                payload.category,
                payload.icon,
                payload.sla_minutes,
                payload.responsible_dept,
                json.dumps(payload.steps),
                payload.trigger_type,
                str(user.id),
            ),
        )
        created = row(cur)
    log_audit(
        AuditEvent(
            action="playbook_created",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=201,
        )
    )
    return {"ok": True, "id": str(created["id"])}


# ── Modifier ───────────────────────────────────────────────────────────────────


class PlaybookUpdate(BaseModel):
    name: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    category: str | None = None
    icon: str | None = None
    sla_minutes: int | None = None
    steps: list | None = None
    status: str | None = None


@router.put("/{playbook_id}")
def update_playbook(
    playbook_id: str,
    request: Request,
    payload: PlaybookUpdate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)
    fields, params = [], []
    if payload.name is not None:
        fields.append("name = %s")
        params.append(payload.name)
    if payload.description is not None:
        fields.append("description = %s")
        params.append(payload.description)
    if payload.category is not None:
        fields.append("category = %s")
        params.append(payload.category)
    if payload.icon is not None:
        fields.append("icon = %s")
        params.append(payload.icon)
    if payload.sla_minutes is not None:
        fields.append("sla_minutes = %s")
        params.append(payload.sla_minutes)
    if payload.steps is not None:
        fields.append("steps = %s::jsonb")
        params.append(json.dumps(payload.steps))
    if payload.status is not None:
        fields.append("status = %s")
        params.append(payload.status)
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier.")
    params.extend([playbook_id, oid])
    with get_db() as cur:
        cur.execute(
            f"UPDATE playbooks SET {', '.join(fields)}, updated_at=now() WHERE id = %s AND org_id = %s RETURNING id",
            params,
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Playbook introuvable.")
    return {"ok": True}


# ── Déclencher ────────────────────────────────────────────────────────────────


class RunPayload(BaseModel):
    context: dict = Field(default_factory=dict)
    trigger_type: str = "manual"


@router.post("/{playbook_id}/run", status_code=201)
def run_playbook(
    playbook_id: str,
    request: Request,
    payload: RunPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            "SELECT id, steps, sla_minutes FROM playbooks WHERE id = %s AND org_id = %s AND status = 'active'",
            (playbook_id, oid),
        )
        pb = row(cur)
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook introuvable ou inactif.")

    steps = pb["steps"] if isinstance(pb["steps"], list) else []
    total = len(steps)

    import datetime

    sla_deadline = None
    if pb.get("sla_minutes"):
        sla_deadline = (datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=pb["sla_minutes"])).isoformat()

    with get_db() as cur:
        cur.execute(
            """INSERT INTO playbook_runs
               (playbook_id, org_id, status, trigger_type, triggered_by, context, total_steps, sla_deadline, started_at)
               VALUES (%s,%s,'running',%s,%s,%s::jsonb,%s,%s,now())
               RETURNING id""",
            (playbook_id, oid, payload.trigger_type, str(user.id), json.dumps(payload.context), total, sla_deadline),
        )
        run = row(cur)
        run_id = str(run["id"])

        # Créer les step_runs initiaux
        for s in steps:
            cur.execute(
                """INSERT INTO playbook_step_runs
                   (run_id, step_index, step_type, step_name, status)
                   VALUES (%s,%s,%s,%s,'pending')""",
                (run_id, s.get("index", 0), s.get("type", "automation"), s.get("name", "")),
            )

        # Incrémenter run_count
        cur.execute(
            "UPDATE playbooks SET run_count = run_count + 1, last_run_at = now() WHERE id = %s",
            (playbook_id,),
        )

    log_audit(
        AuditEvent(
            action="playbook_triggered",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=201,
            resource_ids=[playbook_id],
        )
    )
    return {"ok": True, "run_id": run_id, "total_steps": total}


# ── Historique d'exécutions ───────────────────────────────────────────────────


@router.get("/{playbook_id}/runs")
def list_runs(
    playbook_id: str,
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT r.*, u.full_name AS triggered_by_name
               FROM playbook_runs r
               LEFT JOIN users u ON u.id = r.triggered_by
               WHERE r.playbook_id = %s AND r.org_id = %s
               ORDER BY r.created_at DESC LIMIT %s""",
            (playbook_id, oid, limit),
        )
        items = [_ser(dict(r)) for r in rows(cur)]
    return {"runs": items}


# ── Détail d'un run ────────────────────────────────────────────────────────────


@router.get("/runs/{run_id}")
def get_run(run_id: str, user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            "SELECT * FROM playbook_runs WHERE id = %s AND org_id = %s",
            (run_id, oid),
        )
        run = row(cur)
        if not run:
            raise HTTPException(status_code=404, detail="Run introuvable.")
        cur.execute(
            "SELECT * FROM playbook_step_runs WHERE run_id = %s ORDER BY step_index",
            (run_id,),
        )
        step_runs = [_ser(dict(s)) for s in rows(cur)]

    return {**_ser(dict(run)), "step_runs": step_runs}


# ── Valider / Rejeter étape humaine ───────────────────────────────────────────


class StepActionPayload(BaseModel):
    comment: str | None = Field(None, max_length=500)


@router.post("/runs/{run_id}/step/{step_idx}/approve")
def approve_step(
    run_id: str,
    step_idx: int,
    request: Request,
    payload: StepActionPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE playbook_step_runs
               SET status = 'completed', human_action_by = %s, human_action_at = now(),
                   human_comment = %s, ended_at = now()
               WHERE run_id = %s AND step_index = %s AND status = 'waiting'
               RETURNING id""",
            (str(user.id), payload.comment, run_id, step_idx),
        )
        updated = row(cur)
    if not updated:
        raise HTTPException(status_code=404, detail="Étape introuvable ou déjà traitée.")
    # Avancer le run
    with get_db() as cur:
        cur.execute(
            "UPDATE playbook_runs SET current_step = %s WHERE id = %s",
            (step_idx + 1, run_id),
        )
    return {"ok": True}


@router.post("/runs/{run_id}/step/{step_idx}/reject")
def reject_step(
    run_id: str,
    step_idx: int,
    request: Request,
    payload: StepActionPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE playbook_step_runs
               SET status = 'failed', human_action_by = %s, human_action_at = now(),
                   human_comment = %s, ended_at = now()
               WHERE run_id = %s AND step_index = %s AND status = 'waiting'
               RETURNING id""",
            (str(user.id), payload.comment, run_id, step_idx),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Étape introuvable.")
        cur.execute(
            "UPDATE playbook_runs SET status = 'failed', ended_at = now() WHERE id = %s",
            (run_id,),
        )
    return {"ok": True}


# ── Annuler un run ─────────────────────────────────────────────────────────────


@router.post("/runs/{run_id}/cancel")
def cancel_run(
    run_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE playbook_runs
               SET status = 'cancelled', ended_at = now()
               WHERE id = %s AND org_id = %s AND status IN ('pending','running','waiting_human')
               RETURNING id""",
            (run_id, oid),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Run introuvable ou déjà terminé.")
    return {"ok": True}

"""Analytics d'utilisation — suivi, satisfaction, tableau de bord."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from auth import CurrentUser
from db import get_db, rows, row
from rbac import require_min_role

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Models ─────────────────────────────────────────────────────────────────

class RatingPayload(BaseModel):
    audit_id:  str
    score:     int = Field(..., ge=1, le=5)
    comment:   str | None = Field(None, max_length=300)


class UsageEvent(BaseModel):
    event_type: Literal["query", "export", "connector_test", "login", "logout"]
    meta:       dict = {}


# ── Rate a response ────────────────────────────────────────────────────────

@router.post("/rate")
def rate_response(payload: RatingPayload, user: CurrentUser = Depends(require_min_role("user"))):
    """Enregistre une note (1-5 étoiles) pour une réponse de l'agent."""
    with get_db() as cur:
        cur.execute(
            """
            UPDATE audit_logs
            SET satisfaction_score = %s, satisfaction_comment = %s
            WHERE id = %s AND user_id = %s
            """,
            (payload.score, payload.comment, payload.audit_id, str(user.id)),
        )
    return {"ok": True}


# ── Log a usage event ──────────────────────────────────────────────────────

@router.post("/event")
def log_event(payload: UsageEvent, user: CurrentUser = Depends(require_min_role("user"))):
    """Enregistre un événement d'utilisation (frontend-initiated)."""
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO usage_events (user_id, org_id, event_type, meta, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                str(user.id),
                str(user.organization_id) if user.organization_id else None,
                payload.event_type,
                json.dumps(payload.meta),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    return {"ok": True}


# ── Dashboard stats ────────────────────────────────────────────────────────

@router.get("/dashboard")
def analytics_dashboard(
    days:  int  = 30,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Retourne les métriques d'utilisation pour le tableau de bord."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    org_id = str(user.organization_id)

    # 1. Queries d'agent uniquement — filtrées par organisation
    with get_db() as cur:
        cur.execute(
            """
            SELECT created_at, user_id, satisfaction_score, metadata
            FROM audit_logs
            WHERE action = 'agent_query'
              AND organization_id = %s
              AND created_at >= %s
            """,
            (org_id, since),
        )
        audit_rows = rows(cur)

    with get_db() as cur:
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM audit_logs WHERE action = 'agent_query' AND organization_id = %s AND created_at >= %s",
            (org_id, since),
        )
        cnt_row = row(cur)
    total_queries = cnt_row["cnt"] if cnt_row else 0

    # 2. Queries par jour
    by_day: dict[str, int] = {}
    for r in audit_rows:
        created = r.get("created_at")
        day = str(created)[:10] if created else ""
        by_day[day] = by_day.get(day, 0) + 1
    queries_per_day = [{"date": k, "count": v} for k, v in sorted(by_day.items())]

    # 3. Connecteurs utilisés — via metadata.sources
    connector_counts: dict[str, int] = {}
    for r in audit_rows:
        meta = r.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        srcs = meta.get("sources") or []
        for src in (srcs if isinstance(srcs, list) else []):
            connector_counts[str(src)] = connector_counts.get(str(src), 0) + 1
    top_connectors = sorted(connector_counts.items(), key=lambda x: -x[1])[:8]

    # 3b. Activité quotidienne par connecteur
    connector_daily: dict[str, dict[str, int]] = {}
    for r in audit_rows:
        meta = r.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        srcs = meta.get("sources") or []
        day = str(r.get("created_at"))[:10] if r.get("created_at") else ""
        if not day:
            continue
        for src in (srcs if isinstance(srcs, list) else []):
            s = str(src)
            if s not in connector_daily:
                connector_daily[s] = {}
            connector_daily[s][day] = connector_daily[s].get(day, 0) + 1

    # 4. Satisfaction moyenne
    scores = [r["satisfaction_score"] for r in audit_rows if r.get("satisfaction_score")]
    avg_score = round(sum(scores) / len(scores), 2) if scores else None
    score_dist = {str(i): scores.count(i) for i in range(1, 6)}
    rated_count = len(scores)

    # 5. Top users (uniquement pour les admins)
    top_users = []
    if getattr(user, "role", "") in ("admin", "superadmin"):
        user_counts: dict[str, int] = {}
        for r in audit_rows:
            uid = str(r.get("user_id", "?"))
            user_counts[uid] = user_counts.get(uid, 0) + 1
        top_users = sorted(user_counts.items(), key=lambda x: -x[1])[:5]
        top_users = [{"user_id": k, "count": v} for k, v in top_users]

    # 6. Usage events (exports, etc.)
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT event_type FROM usage_events WHERE org_id = %s AND created_at >= %s",
                (org_id, since),
            )
            evt_rows = rows(cur)
        event_counts: dict[str, int] = {}
        for e in evt_rows:
            et = e["event_type"]
            event_counts[et] = event_counts.get(et, 0) + 1
    except Exception:
        event_counts = {}

    # 7. % utilisation (actifs / total users de l'org, si admin)
    utilization_pct = None
    try:
        if getattr(user, "role", "") in ("admin", "owner", "superadmin"):
            with get_db() as cur:
                cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE organization_id = %s", (org_id,))
                total_row = row(cur)
            total_users = (total_row["cnt"] if total_row else 0) or 1
            active_ids = {str(r.get("user_id")) for r in audit_rows if r.get("user_id")}
            utilization_pct = round(len(active_ids) / total_users * 100, 1)
    except Exception:
        pass

    return {
        "period_days":      days,
        "total_queries":    total_queries,
        "queries_per_day":  queries_per_day,
        "top_connectors":   [{"name": k, "count": v} for k, v in top_connectors],
        "connector_daily":  {k: [{"date": d, "count": c} for d, c in sorted(v.items())] for k, v in connector_daily.items()},
        "avg_satisfaction": avg_score,
        "satisfaction_dist": score_dist,
        "rated_count":      rated_count,
        "top_users":        top_users,
        "event_counts":     event_counts,
        "utilization_pct":  utilization_pct,
    }

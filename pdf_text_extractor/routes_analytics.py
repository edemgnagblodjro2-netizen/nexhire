"""Analytics d'utilisation — suivi, satisfaction, tableau de bord."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

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
    sb = service_client()
    res = sb.table("audit_logs").update({
        "satisfaction_score": payload.score,
        "satisfaction_comment": payload.comment,
    }).eq("id", payload.audit_id).eq("user_id", str(user.id)).execute()
    return {"ok": True}


# ── Log a usage event ──────────────────────────────────────────────────────

@router.post("/event")
def log_event(payload: UsageEvent, user: CurrentUser = Depends(require_min_role("user"))):
    """Enregistre un événement d'utilisation (frontend-initiated)."""
    sb = service_client()
    sb.table("usage_events").insert({
        "user_id":    str(user.id),
        "org_id":     str(user.organization_id) if user.organization_id else None,
        "event_type": payload.event_type,
        "meta":       payload.meta,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return {"ok": True}


# ── Dashboard stats ────────────────────────────────────────────────────────

@router.get("/dashboard")
def analytics_dashboard(
    days:  int  = 30,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Retourne les métriques d'utilisation pour le tableau de bord."""
    sb = service_client()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # 1. Queries d'agent uniquement
    q = (sb.table("audit_logs")
           .select("created_at,user_id,satisfaction_score,metadata", count="exact")
           .eq("action", "agent_query")
           .gte("created_at", since)
           .execute())
    total_queries = q.count or 0
    rows = q.data or []

    # 2. Queries par jour
    by_day: dict[str, int] = {}
    for r in rows:
        day = r.get("created_at", "")[:10]
        by_day[day] = by_day.get(day, 0) + 1
    queries_per_day = [{"date": k, "count": v} for k, v in sorted(by_day.items())]

    # 3. Connecteurs utilisés — via metadata.sources
    connector_counts: dict[str, int] = {}
    for r in rows:
        meta = r.get("metadata") or {}
        srcs = meta.get("sources") or []
        for src in (srcs if isinstance(srcs, list) else []):
            connector_counts[str(src)] = connector_counts.get(str(src), 0) + 1
    top_connectors = sorted(connector_counts.items(), key=lambda x: -x[1])[:8]

    # 4. Satisfaction moyenne
    scores = [r["satisfaction_score"] for r in rows if r.get("satisfaction_score")]
    avg_score = round(sum(scores) / len(scores), 2) if scores else None
    score_dist = {str(i): scores.count(i) for i in range(1, 6)}
    rated_count = len(scores)

    # 5. Top users (uniquement pour les admins)
    top_users = []
    if getattr(user, "role", "") in ("admin", "superadmin"):
        user_counts: dict[str, int] = {}
        for r in rows:
            uid = str(r.get("user_id", "?"))
            user_counts[uid] = user_counts.get(uid, 0) + 1
        top_users = sorted(user_counts.items(), key=lambda x: -x[1])[:5]
        top_users = [{"user_id": k, "count": v} for k, v in top_users]

    # 6. Usage events (exports, etc.)
    try:
        evts = sb.table("usage_events").select("event_type").gte("created_at", since).execute()
        event_counts: dict[str, int] = {}
        for e in (evts.data or []):
            et = e["event_type"]
            event_counts[et] = event_counts.get(et, 0) + 1
    except Exception:
        event_counts = {}

    # 7. % utilisation (actifs / total users si admin)
    utilization_pct = None
    try:
        if getattr(user, "role", "") in ("admin", "superadmin"):
            all_u = sb.table("users").select("id", count="exact").execute()
            total_users = all_u.count or 1
            active_ids = {str(r.get("user_id")) for r in rows if r.get("user_id")}
            utilization_pct = round(len(active_ids) / total_users * 100, 1)
    except Exception:
        pass

    return {
        "period_days":      days,
        "total_queries":    total_queries,
        "queries_per_day":  queries_per_day,
        "top_connectors":   [{"name": k, "count": v} for k, v in top_connectors],
        "avg_satisfaction": avg_score,
        "satisfaction_dist": score_dist,
        "rated_count":      rated_count,
        "top_users":        top_users,
        "event_counts":     event_counts,
        "utilization_pct":  utilization_pct,
    }

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from agent_service import AgentResponse, run_agent
from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from rbac import require_active_subscription, require_min_role
from supabase_client import service_client
from usage import check_and_consume_query

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentQuery(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    assistant_mode: str = Field("enterprise", pattern="^(enterprise|municipal|recruiting)$")
    language: str = Field("fr", pattern="^(fr|en)$")


class AgentQueryResponse(BaseModel):
    answer: str
    sources: list[str]
    tools_called: list[dict]


def _connected_connectors(organization_id: str) -> list[str]:
    """Retourne les types de connecteurs actifs pour l'organisation."""
    try:
        sb = service_client()
        res = (
            sb.table("connectors")
            .select("connector_type")
            .eq("organization_id", organization_id)
            .eq("status", "connected")
            .execute()
        )
        return [row["connector_type"] for row in (res.data or [])]
    except Exception:
        return []


@router.post("/query", response_model=AgentQueryResponse)
def agent_query(
    payload: AgentQuery,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("user")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Pose une question en langage naturel.

    L'agent consulte automatiquement les connecteurs actifs de l'organisation,
    synthétise les résultats et retourne une réponse structurée avec les sources.
    """
    # Vérifie le quota mensuel et incrémente le compteur (HTTP 429 si dépassé).
    check_and_consume_query(user.organization_id, user.subscription_status)

    connectors = _connected_connectors(user.organization_id)

    try:
        result: AgentResponse = run_agent(
            payload.question,
            assistant_mode=payload.assistant_mode,
            language=payload.language,
            connected_connectors=connectors if connectors else None,
            org_id=user.organization_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        background.add_task(log_audit, AuditEvent(
            action="agent_query",
            query=payload.question,
            organization_id=user.organization_id,
            user_id=user.id,
            ip_address=client_ip(request),
            success=False,
            http_status=500,
            error_detail=str(exc),
            metadata={"assistant_mode": payload.assistant_mode, "language": payload.language},
        ))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    background.add_task(log_audit, AuditEvent(
        action="agent_query",
        query=payload.question,
        organization_id=user.organization_id,
        user_id=user.id,
        ip_address=client_ip(request),
        success=True,
        http_status=200,
        metadata={
            "assistant_mode": payload.assistant_mode,
            "language": payload.language,
            "sources": result.sources,
            "tools_count": len(result.tools_called),
        },
    ))

    return AgentQueryResponse(
        answer=result.answer,
        sources=result.sources,
        tools_called=result.tools_called,
    )

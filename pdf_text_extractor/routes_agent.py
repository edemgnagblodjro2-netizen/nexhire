from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from agent_service import AgentResponse, run_agent
from audit import AuditEvent, client_ip, log_audit, log_audit_sync
from auth import CurrentUser
from db import get_db, rows, row
from rbac import require_active_subscription, require_min_role
from usage import check_and_consume_query

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/quota")
def get_quota(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne l'utilisation des requêtes du mois en cours pour l'organisation."""
    with get_db() as cur:
        cur.execute("SELECT get_org_quota(%s) AS result", (user.organization_id,))
        r = row(cur)
    data = r["result"] if r and isinstance(r.get("result"), dict) else {}
    return {
        "used":   data.get("used", 0),
        "limit":  data.get("limit", 1000),
        "period": data.get("period", ""),
    }


class AgentQuery(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    assistant_mode: str = Field("enterprise", pattern="^(enterprise|municipal|recruiting)$")
    language: str = Field("fr", pattern="^(fr|en)$")
    dept_type: str | None = None   # workspace actif côté frontend — prioritaire sur le dept DB


class AgentQueryResponse(BaseModel):
    answer: str
    sources: list[str]
    tools_called: list[dict]
    audit_id: str | None = None
    connector_warnings: list[str] = []
    has_simulated_data: bool = False
    simulated_tools: list[str] = []


def _error_connectors_for_user(user: CurrentUser) -> list[str]:
    """Retourne les connecteurs en status=error pour l'org de l'utilisateur."""
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT connector_type FROM connectors WHERE organization_id = %s AND status = 'error'",
                (user.organization_id,),
            )
            return [r["connector_type"] for r in rows(cur)]
    except Exception:
        return []


def _connected_connectors_for_user(user: CurrentUser) -> list[str]:
    """Retourne les connecteurs actifs filtrés selon les droits département de l'utilisateur.

    - Admins/owners : voient tous les connecteurs.
    - Autres : connecteurs org-wide (sans restriction) + connecteurs de leurs départements.
    - Dégradation gracieuse si connector_departments n'existe pas encore.
    """
    is_admin = user.role in ("admin", "owner")
    try:
        with get_db() as cur:
            if is_admin:
                cur.execute(
                    "SELECT connector_type FROM connectors WHERE organization_id = %s AND status = 'connected'",
                    (user.organization_id,),
                )
                return [r["connector_type"] for r in rows(cur)]

            # Récupère les départements de l'utilisateur
            cur.execute(
                "SELECT department_id FROM department_members WHERE user_id = %s",
                (user.id,),
            )
            dept_ids = [r["department_id"] for r in rows(cur)]

            if not dept_ids:
                # Pas de département → connecteurs org-wide seulement (sans restriction)
                cur.execute(
                    """
                    SELECT DISTINCT c.connector_type
                    FROM connectors c
                    WHERE c.organization_id = %s AND c.status = 'connected'
                      AND NOT EXISTS (
                          SELECT 1 FROM connector_departments cd WHERE cd.connector_id = c.id
                      )
                    """,
                    (user.organization_id,),
                )
            else:
                # Connecteurs org-wide OU assignés à l'un de ses départements
                cur.execute(
                    """
                    SELECT DISTINCT c.connector_type
                    FROM connectors c
                    WHERE c.organization_id = %s AND c.status = 'connected'
                      AND (
                          NOT EXISTS (SELECT 1 FROM connector_departments cd WHERE cd.connector_id = c.id)
                          OR EXISTS (
                              SELECT 1 FROM connector_departments cd
                              WHERE cd.connector_id = c.id AND cd.department_id = ANY(%s::uuid[])
                          )
                      )
                    """,
                    (user.organization_id, dept_ids),
                )
            return [r["connector_type"] for r in rows(cur)]
    except Exception:
        # Table connector_departments pas encore créée → retourne tout
        try:
            with get_db() as cur:
                cur.execute(
                    "SELECT connector_type FROM connectors WHERE organization_id = %s AND status = 'connected'",
                    (user.organization_id,),
                )
                return [r["connector_type"] for r in rows(cur)]
        except Exception:
            return []


def _get_user_dept_type(user_id: str) -> str | None:
    """Retourne le type du premier département de l'utilisateur, ou None."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT d.dept_type
                FROM department_members dm
                JOIN departments d ON d.id = dm.department_id
                WHERE dm.user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            r = row(cur)
        return r["dept_type"] if r else None
    except Exception:
        return None


@router.post("/query", response_model=AgentQueryResponse)
def agent_query(
    payload: AgentQuery,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("user")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Pose une question en langage naturel.

    L'agent consulte automatiquement les connecteurs actifs autorisés pour le département
    de l'utilisateur, synthétise les résultats et retourne une réponse structurée.
    """
    check_and_consume_query(user.organization_id, user.subscription_status)

    connectors = _connected_connectors_for_user(user)
    error_connectors = _error_connectors_for_user(user)
    # Workspace actif (envoyé par le frontend) prend la priorité sur le département DB de l'utilisateur
    dept_type = payload.dept_type or _get_user_dept_type(user.id)

    try:
        result: AgentResponse = run_agent(
            payload.question,
            assistant_mode=payload.assistant_mode,
            language=payload.language,
            connected_connectors=connectors if connectors else None,
            org_id=user.organization_id,
            dept_type=dept_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service IA temporairement indisponible.") from exc
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
        raise HTTPException(status_code=500, detail="Erreur serveur interne.") from exc

    audit_id = log_audit_sync(AuditEvent(
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
        audit_id=audit_id,
        connector_warnings=error_connectors,
        has_simulated_data=result.has_simulated_data,
        simulated_tools=result.simulated_tools,
    )

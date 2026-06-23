from __future__ import annotations

import logging
import traceback

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from agent_service import AgentResponse, run_agent
from audit import AuditEvent, client_ip, log_audit, log_audit_sync
from auth import CurrentUser
from db import get_db, rows, row
from rate_limiter import limiter
from rbac import require_active_subscription, require_min_role
from usage import check_and_consume_query

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/health")
def agent_health(user: CurrentUser = Depends(require_min_role("admin"))):
    """Vérifie la connectivité OpenAI et la validité de la clé API."""
    import os
    api_key = os.getenv("OPENAI_API_KEY", "")
    model   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    key_present = bool(api_key)
    key_prefix  = api_key[:8] + "..." if len(api_key) > 8 else "(trop courte)"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        test = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        ok = bool(test.choices)
        error = None
    except Exception as exc:
        ok = False
        error = f"{type(exc).__name__}: {str(exc)[:300]}"

    return {
        "openai_key_present": key_present,
        "openai_key_prefix":  key_prefix,
        "openai_model":       model,
        "openai_reachable":   ok,
        "error":              error,
    }


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
    language: str = Field("fr", pattern="^(fr|en|es)$")
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


@router.post("/query")
@limiter.limit("10/minute")
def agent_query(
    request: Request,
    payload: AgentQuery = Body(...),
    user: CurrentUser = Depends(require_min_role("user")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Pose une question en langage naturel.

    L'agent consulte automatiquement les connecteurs actifs autorisés pour le département
    de l'utilisateur, synthétise les résultats et retourne une réponse structurée.
    """
    try:
        check_and_consume_query(user.organization_id, user.subscription_status)

        connectors = _connected_connectors_for_user(user)
        error_connectors = _error_connectors_for_user(user)
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
            exc_type = type(exc).__name__
            exc_module = type(exc).__module__ or ""
            is_openai = "openai" in exc_module

            logger.error("[agent_query] run_agent FAILED — %s: %s", exc_type, str(exc)[:500])

            if is_openai and "Authentication" in exc_type:
                user_msg = "Clé API OpenAI invalide ou manquante — contactez l'administrateur."
                http_code = 503
            elif is_openai and "RateLimit" in exc_type:
                user_msg = "Limite de requêtes OpenAI atteinte — réessayez dans quelques secondes."
                http_code = 429
            elif is_openai and ("Connection" in exc_type or "Timeout" in exc_type):
                user_msg = "Service IA temporairement inaccessible — réessayez dans quelques instants."
                http_code = 503
            elif is_openai and "BadRequest" in exc_type:
                user_msg = f"Requête refusée par l'IA : {str(exc)[:200]}"
                http_code = 400
            elif is_openai:
                user_msg = f"Erreur OpenAI ({exc_type}) : {str(exc)[:200]}"
                http_code = 503
            else:
                user_msg = f"Erreur interne ({exc_type}) : {str(exc)[:300]}"
                http_code = 500

            log_audit_sync(AuditEvent(
                action="agent_query",
                query=payload.question,
                organization_id=user.organization_id,
                user_id=user.id,
                ip_address=client_ip(request),
                success=False,
                http_status=http_code,
                error_detail=f"{exc_type}: {str(exc)[:500]}",
                metadata={"assistant_mode": payload.assistant_mode, "language": payload.language},
            ))
            raise HTTPException(status_code=http_code, detail=user_msg) from exc

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

        import json as _json
        from agent_service import _json_default
        raw = {
            "answer":            result.answer,
            "sources":           result.sources,
            "tools_called":      result.tools_called,
            "audit_id":          audit_id,
            "connector_warnings": error_connectors,
            "has_simulated_data": result.has_simulated_data,
            "simulated_tools":   result.simulated_tools,
        }
        # Sérialiser via notre encoder robuste puis retourner JSONResponse
        # pour contourner la validation Pydantic du response_model
        safe_body = _json.loads(_json.dumps(raw, ensure_ascii=False, default=_json_default))
        return JSONResponse(content=safe_body)

    except HTTPException:
        raise  # Laisser FastAPI gérer les HTTPException normalement
    except Exception as exc:
        # Capture tout ce qui échappe (construction AgentQueryResponse, etc.)
        tb = traceback.format_exc()
        logger.error("[agent_query] UNHANDLED EXCEPTION — %s: %s\n%s", type(exc).__name__, str(exc)[:500], tb)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur critique ({type(exc).__name__}) : {str(exc)[:300]}",
        ) from exc

from __future__ import annotations

import io
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette import status
_NO_CACHE_EXTS = (".js", ".css")
_NO_CACHE_HEADERS = [
    (b"cache-control", b"no-store, no-cache, must-revalidate, max-age=0"),
    (b"pragma",        b"no-cache"),
    (b"expires",       b"0"),
]
_STRIP_CACHE_KEYS = {b"cache-control", b"pragma", b"etag", b"last-modified", b"expires"}


class NoCacheStaticMiddleware:
    """Middleware ASGI pur — modifie les headers avant envoi (fonctionne avec StaticFiles streaming)."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope.get("path", "").startswith("/static/") \
                and any(scope["path"].endswith(e) for e in _NO_CACHE_EXTS):

            async def send_no_cache(message):
                if message["type"] == "http.response.start":
                    headers = [
                        (k, v) for k, v in message.get("headers", [])
                        if k.lower() not in _STRIP_CACHE_KEYS
                    ]
                    headers.extend(_NO_CACHE_HEADERS)
                    message = {**message, "headers": headers}
                await send(message)

            await self.app(scope, receive, send_no_cache)
        else:
            await self.app(scope, receive, send)

from ai_service import AIConfigurationError, AssistantService
from audit import AuditEvent, client_ip, log_audit
from pdf_utils import MAX_UPLOAD_BYTES, PdfExtractionError, extract_text_from_pdf, is_allowed_pdf
from storage import DocumentStore
from routes_agent import router as agent_router
from routes_audit import router as audit_router
from routes_auth import router as auth_router
from routes_connectors import router as connectors_router
from routes_oauth import router as oauth_router
from routes_reports import router as reports_router
from routes_analytics        import router as analytics_router
from routes_settings         import router as settings_router
from routes_members          import router as members_router
from routes_service_accounts import router as sa_router
from routes_departments      import router as departments_router
from routes_budget           import router as budget_router
from routes_licenses         import router as licenses_router
from routes_servers          import router as servers_router
from routes_apps             import router as apps_router
from routes_optimization     import router as optimization_router
from routes_contracts        import router as contracts_router
from routes_workforce        import router as workforce_router
from routes_dashboard        import router as dashboard_router
from routes_billing          import router as billing_router
from routes_sso              import router as sso_router
from routes_webhooks         import router as webhooks_router

STATIC_DIR = Path(__file__).parent / "static"


class DocumentResponse(BaseModel):
    id: str
    filename: str
    character_count: int
    text_preview: str
    warning: str | None = None


class SummaryResponse(BaseModel):
    document_id: str
    summary: str


class AssistantContext(BaseModel):
    assistant_mode: str = Field(
        "enterprise",
        pattern="^(enterprise|municipal|recruiting)$",
    )
    language: str = Field("fr", pattern="^(fr|en)$")


class SummaryRequest(AssistantContext):
    pass


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    user_id: str | None = None
    organization_id: str | None = None
    assistant_mode: str = Field(
        "enterprise",
        pattern="^(enterprise|municipal|recruiting)$",
    )
    language: str = Field("fr", pattern="^(fr|en)$")


class ChatResponse(BaseModel):
    document_id: str
    question: str
    answer: str
    conversation_id: str


def create_app(
    *,
    storage: DocumentStore | None = None,
    assistant: AssistantService | None = None,
) -> FastAPI:
    app = FastAPI(
        title="NexHire Enterprise Assistant",
        description=(
            "API FastAPI bilingue pour televerser des documents, resumer leur "
            "contenu et poser des questions en contexte entreprise ou recrutement."
        ),
        version="1.0.0",
    )
    app.include_router(auth_router)
    app.include_router(connectors_router)
    app.include_router(oauth_router)
    app.include_router(audit_router)
    app.include_router(agent_router)
    app.include_router(reports_router)
    app.include_router(analytics_router)
    app.include_router(settings_router)
    app.include_router(members_router)
    app.include_router(sa_router)
    app.include_router(departments_router)
    app.include_router(budget_router)
    app.include_router(licenses_router)
    app.include_router(servers_router)
    app.include_router(apps_router)
    app.include_router(optimization_router)
    app.include_router(dashboard_router)
    app.include_router(contracts_router)
    app.include_router(workforce_router)
    app.include_router(billing_router)
    app.include_router(sso_router)
    app.include_router(webhooks_router)
    app.state.storage = storage or DocumentStore.from_env()
    app.state.assistant = assistant or AssistantService.from_env()

    app.add_middleware(NoCacheStaticMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/")
    def portal():
        return FileResponse(
            STATIC_DIR / "index.html",
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
            },
        )

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/readiness")
    def readiness():
        """Vérifie les variables d'env et la connexion DB."""
        import os
        checks: dict = {}
        for var in ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
                    "FERNET_KEYS", "OPENAI_API_KEY"]:
            checks[var] = "set" if os.environ.get(var) else "MISSING"
        try:
            from db import get_db, row as db_row
            with get_db() as cur:
                cur.execute("SELECT id FROM organizations LIMIT 1")
                db_row(cur)
            checks["db"] = "ok"
        except Exception as exc:
            checks["db"] = f"error: {type(exc).__name__}: {exc}"
        env_ok = all(v == "set" for k, v in checks.items() if k != "db")
        db_ok  = checks.get("db", "").startswith("ok")
        return {"ready": env_ok and db_ok, "checks": checks}

    @app.post(
        "/api/documents",
        response_model=DocumentResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def upload_document(
        request: Request,
        background: BackgroundTasks,
        file: Annotated[UploadFile, File()],
        organization_id: Annotated[str | None, Form()] = None,
        user_id: Annotated[str | None, Form()] = None,
        store: DocumentStore = Depends(get_storage),
    ):
        if not file.filename or not is_allowed_pdf(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seuls les fichiers PDF sont acceptes.",
            )

        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Le PDF depasse la limite de 16 Mo.",
            )

        try:
            text = extract_text_from_pdf(io.BytesIO(content))
        except PdfExtractionError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le fichier PDF n'a pas pu etre lu.",
            ) from exc

        warning = None
        if not text.strip():
            warning = (
                "Aucun texte extractible n'a ete trouve. "
                "Un OCR sera necessaire pour les PDF scannes."
            )

        document = store.create_document(
            filename=file.filename,
            content_text=text,
            organization_id=organization_id,
            user_id=user_id,
        )
        background.add_task(log_audit, AuditEvent(
            action="document_upload",
            query=file.filename,
            organization_id=organization_id,
            user_id=user_id,
            resource_ids=[document["id"]],
            ip_address=client_ip(request),
            http_status=201,
            metadata={"char_count": len(text), "has_warning": bool(warning)},
        ))
        return DocumentResponse(
            id=document["id"],
            filename=document["filename"],
            character_count=len(text),
            text_preview=text[:1200],
            warning=warning,
        )

    @app.post("/api/documents/{document_id}/summary", response_model=SummaryResponse)
    def summarize_document(
        document_id: str,
        request: Request,
        background: BackgroundTasks,
        payload: SummaryRequest = Body(default_factory=SummaryRequest),
        store: DocumentStore = Depends(get_storage),
        ai: AssistantService = Depends(get_assistant),
    ):
        document = _document_or_404(store, document_id)

        try:
            summary = ai.summarize(
                document["content_text"],
                assistant_mode=payload.assistant_mode,
                language=payload.language,
            )
        except AIConfigurationError as exc:
            background.add_task(log_audit, AuditEvent(
                action="document_summary",
                query=document_id,
                organization_id=document.get("organization_id"),
                user_id=document.get("user_id"),
                resource_ids=[document_id],
                ip_address=client_ip(request),
                success=False,
                http_status=503,
                error_detail=str(exc),
            ))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

        store.update_document_summary(document_id, summary)
        background.add_task(log_audit, AuditEvent(
            action="document_summary",
            query=document_id,
            organization_id=document.get("organization_id"),
            user_id=document.get("user_id"),
            resource_ids=[document_id],
            ip_address=client_ip(request),
            http_status=200,
            metadata={"assistant_mode": payload.assistant_mode, "language": payload.language},
        ))
        return SummaryResponse(document_id=document_id, summary=summary)

    @app.post("/api/documents/{document_id}/chat", response_model=ChatResponse)
    def chat_with_document(
        document_id: str,
        request: Request,
        background: BackgroundTasks,
        payload: ChatRequest,
        store: DocumentStore = Depends(get_storage),
        ai: AssistantService = Depends(get_assistant),
    ):
        document = _document_or_404(store, document_id)
        org_id = payload.organization_id or document.get("organization_id")
        usr_id = payload.user_id or document.get("user_id")

        try:
            answer = ai.answer_question(
                document["content_text"],
                payload.question,
                assistant_mode=payload.assistant_mode,
                language=payload.language,
            )
        except AIConfigurationError as exc:
            background.add_task(log_audit, AuditEvent(
                action="document_chat",
                query=payload.question,
                organization_id=org_id,
                user_id=usr_id,
                resource_ids=[document_id],
                ip_address=client_ip(request),
                success=False,
                http_status=503,
                error_detail=str(exc),
            ))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

        conversation = store.create_conversation(
            document_id=document_id,
            question=payload.question,
            answer=answer,
            organization_id=org_id,
            user_id=usr_id,
            model=ai.model,
            assistant_mode=payload.assistant_mode,
            language=payload.language,
        )

        background.add_task(log_audit, AuditEvent(
            action="document_chat",
            query=payload.question,
            organization_id=org_id,
            user_id=usr_id,
            resource_ids=[document_id, conversation["id"]],
            ip_address=client_ip(request),
            http_status=200,
            metadata={"assistant_mode": payload.assistant_mode, "language": payload.language},
        ))
        return ChatResponse(
            document_id=document_id,
            question=payload.question,
            answer=answer,
            conversation_id=conversation["id"],
        )

    return app


def get_storage(request: Request) -> DocumentStore:
    return request.app.state.storage


def get_assistant(request: Request) -> AssistantService:
    return request.app.state.assistant


def _document_or_404(store: DocumentStore, document_id: str) -> dict:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable.",
        )
    return document


app = create_app()

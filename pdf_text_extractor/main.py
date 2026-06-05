from __future__ import annotations

import io
from pathlib import Path
from typing import Annotated

from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette import status

from ai_service import AIConfigurationError, AssistantService
from connector_hub import (
    CONNECTORS,
    CONNECTORS_BY_ID,
    build_oauth_url,
    connector_payload,
    search_data,
)
from pdf_utils import MAX_UPLOAD_BYTES, PdfExtractionError, extract_text_from_pdf, is_allowed_pdf
from storage import DocumentStore


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
    connector_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    document_id: str
    question: str
    answer: str
    conversation_id: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    account_type: str = Field("business", pattern="^(business|individual|organization)$")
    plan: str = Field("monthly", pattern="^(monthly|annual)$")


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=1)


class AccountResponse(BaseModel):
    id: str
    name: str
    email: str
    account_type: str
    plan: str
    plan_label: str
    trial_days: int


class ConnectorResponse(BaseModel):
    id: str
    name: str
    phase: int
    priority_label: str
    status: str
    description: str
    scopes: list[str]
    actions: list[dict[str, str]]


class OAuthStartRequest(BaseModel):
    organization_id: str = "demo-org"
    user_id: str | None = None
    redirect_uri: str = "http://127.0.0.1:8000/api/connectors/oauth/callback"


class OAuthStartResponse(BaseModel):
    connector_id: str
    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    connector_id: str
    code: str = Field(..., min_length=3)
    state: str
    organization_id: str = "demo-org"
    user_id: str | None = None


class ConnectionResponse(BaseModel):
    id: str
    organization_id: str
    connector_id: str
    status: str
    created_by: str | None = None
    updated_at: str


class ConnectorSearchRequest(BaseModel):
    source: str
    query: str = Field(..., min_length=1)
    organization_id: str = "demo-org"
    user_id: str | None = None


class ConnectorSearchResponse(BaseModel):
    source: str
    source_name: str
    query: str
    organization_id: str
    user_id: str | None = None
    results: list[dict[str, str]]


class AuditLogResponse(BaseModel):
    id: str
    organization_id: str
    user_id: str | None = None
    action: str
    source: str
    query: str | None = None
    metadata: dict
    created_at: str


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
    app.state.storage = storage or DocumentStore.from_env()
    app.state.assistant = assistant or AssistantService.from_env()

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
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/billing/plans")
    def billing_plans():
        return {
            "trial_days": 14,
            "plans": [
                {"id": "monthly", "price": 99, "currency": "CAD", "interval": "month"},
                {"id": "annual", "price": 990, "currency": "CAD", "interval": "year"},
            ],
        }

    @app.get("/api/connectors", response_model=list[ConnectorResponse])
    def list_connectors(store: DocumentStore = Depends(get_storage)):
        return [
            connector_payload(
                connector,
                status=store.connector_status(connector.id),
            )
            for connector in CONNECTORS
        ]

    @app.post("/api/connectors/{connector_id}/connect", response_model=ConnectorResponse)
    def connect_connector(
        connector_id: str,
        store: DocumentStore = Depends(get_storage),
    ):
        connector = CONNECTORS_BY_ID.get(connector_id)
        if connector is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connecteur introuvable.",
            )

        connector_status = store.connect_connector(connector_id)
        return connector_payload(connector, status=connector_status)

    @app.post("/api/connectors/{connector_id}/oauth/start", response_model=OAuthStartResponse)
    def start_connector_oauth(
        connector_id: str,
        payload: OAuthStartRequest,
        store: DocumentStore = Depends(get_storage),
    ):
        connector = CONNECTORS_BY_ID.get(connector_id)
        if connector is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connecteur introuvable.",
            )

        state = f"{payload.organization_id}:{connector_id}"
        authorization_url = build_oauth_url(
            connector,
            state=state,
            redirect_uri=payload.redirect_uri,
        )
        store.create_audit_log(
            organization_id=payload.organization_id,
            user_id=payload.user_id,
            action="oauth_start",
            source=connector_id,
            metadata={"redirect_uri": payload.redirect_uri},
        )
        return OAuthStartResponse(
            connector_id=connector_id,
            authorization_url=authorization_url,
            state=state,
        )

    @app.post("/api/connectors/oauth/callback", response_model=ConnectionResponse)
    def complete_connector_oauth(
        payload: OAuthCallbackRequest,
        store: DocumentStore = Depends(get_storage),
    ):
        if payload.connector_id not in CONNECTORS_BY_ID:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connecteur introuvable.",
            )

        expected_state = f"{payload.organization_id}:{payload.connector_id}"
        if payload.state != expected_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Etat OAuth invalide.",
            )

        store.save_connector_token(
            organization_id=payload.organization_id,
            connector_id=payload.connector_id,
            access_token=f"access:{payload.code}",
            refresh_token=f"refresh:{payload.code}",
        )
        connection = store.upsert_connection(
            organization_id=payload.organization_id,
            connector_id=payload.connector_id,
            status="active",
            created_by=payload.user_id,
        )
        store.create_audit_log(
            organization_id=payload.organization_id,
            user_id=payload.user_id,
            action="connector_connected",
            source=payload.connector_id,
            metadata={"connection_id": connection["id"]},
        )
        return connection

    @app.get("/api/connections", response_model=list[ConnectionResponse])
    def list_connections(
        organization_id: str = "demo-org",
        store: DocumentStore = Depends(get_storage),
    ):
        return store.list_connections(organization_id=organization_id)

    @app.post("/api/connectors/search", response_model=ConnectorSearchResponse)
    def search_connector_data(
        payload: ConnectorSearchRequest,
        store: DocumentStore = Depends(get_storage),
    ):
        if payload.source not in CONNECTORS_BY_ID:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connecteur introuvable.",
            )

        result = search_data(
            source=payload.source,
            query=payload.query,
            organization_id=payload.organization_id,
            user_id=payload.user_id,
        )
        store.create_audit_log(
            organization_id=payload.organization_id,
            user_id=payload.user_id,
            action="search_data",
            source=payload.source,
            query=payload.query,
            metadata={"result_count": len(result["results"])},
        )
        return result

    @app.get("/api/audit-logs", response_model=list[AuditLogResponse])
    def list_audit_logs(
        organization_id: str = "demo-org",
        store: DocumentStore = Depends(get_storage),
    ):
        return store.list_audit_logs(organization_id=organization_id)

    @app.post("/api/auth/register", response_model=AccountResponse)
    def register_account(
        payload: RegisterRequest,
        store: DocumentStore = Depends(get_storage),
    ):
        try:
            return store.create_account(
                name=payload.name,
                email=payload.email,
                password=payload.password,
                account_type=payload.account_type,
                plan=payload.plan,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

    @app.post("/api/auth/login", response_model=AccountResponse)
    def login_account(
        payload: LoginRequest,
        store: DocumentStore = Depends(get_storage),
    ):
        account = store.authenticate_account(
            email=payload.email,
            password=payload.password,
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe invalide.",
            )
        return account

    @app.post(
        "/api/documents",
        response_model=DocumentResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def upload_document(
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
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

        store.update_document_summary(document_id, summary)
        return SummaryResponse(document_id=document_id, summary=summary)

    @app.post("/api/documents/{document_id}/chat", response_model=ChatResponse)
    def chat_with_document(
        document_id: str,
        payload: ChatRequest,
        store: DocumentStore = Depends(get_storage),
        ai: AssistantService = Depends(get_assistant),
    ):
        document = _document_or_404(store, document_id)

        try:
            connectors = _connector_names(payload.connector_ids)
            answer = ai.answer_question(
                document["content_text"],
                payload.question,
                assistant_mode=payload.assistant_mode,
                language=payload.language,
                connector_context=connectors,
            )
        except AIConfigurationError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

        conversation = store.create_conversation(
            document_id=document_id,
            question=payload.question,
            answer=answer,
            organization_id=payload.organization_id or document.get("organization_id"),
            user_id=payload.user_id or document.get("user_id"),
            model=ai.model,
            assistant_mode=payload.assistant_mode,
            language=payload.language,
            connector_ids=payload.connector_ids,
        )

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


def _connector_names(connector_ids: list[str]) -> list[str]:
    names = []
    for connector_id in connector_ids:
        connector = CONNECTORS_BY_ID.get(connector_id)
        if connector is not None:
            names.append(connector.name)
    return names


app = create_app()

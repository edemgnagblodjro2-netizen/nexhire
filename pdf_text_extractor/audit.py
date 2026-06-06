from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import Request


@dataclass
class AuditEvent:
    action: str                              # document_upload | document_summary | document_chat
                                             # connector_connect | connector_disconnect | connector_list
                                             # auth_login | auth_signup
    query: str = ""                          # texte libre : question, filename, type de connecteur…
    organization_id: str | None = None
    user_id: str | None = None
    connector: str | None = None             # type de connecteur si applicable
    success: bool = True
    http_status: int = 200
    ip_address: str | None = None
    resource_ids: list[str] = field(default_factory=list)   # doc_id, conversation_id, connector_id…
    error_detail: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)  # champs libres pour évolutions futures


def client_ip(request: Request) -> str | None:
    """Extrait l'IP réelle (gère X-Forwarded-For pour Render / proxies)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _build_row(event: AuditEvent) -> dict:
    row: dict = {
        "organization_id": event.organization_id,
        "user_id": event.user_id,
        "connector": event.connector,
        "query": event.query or event.action,
        "action": event.action,
        "success": event.success,
        "ip_address": event.ip_address,
        "http_status": event.http_status,
        "resource_ids": event.resource_ids,
        "error_detail": event.error_detail,
    }
    if event.metadata:
        row["metadata"] = event.metadata
    return row


def log_audit(event: AuditEvent) -> None:
    """Insère un log d'audit. Conçu pour tourner dans un BackgroundTask.
    N'émet jamais d'exception — une panne d'audit ne doit pas bloquer la requête."""
    try:
        from supabase_client import service_client
        sb = service_client()
        row = _build_row(event)
        try:
            sb.table("audit_logs").insert(row).execute()
        except Exception:
            row.pop("metadata", None)
            sb.table("audit_logs").insert(row).execute()
    except Exception:
        pass


def log_audit_sync(event: AuditEvent) -> str | None:
    """Insère un log d'audit de façon synchrone et retourne l'UUID de la ligne créée.
    Utilisé quand l'ID d'audit doit être inclus dans la réponse HTTP (ex: agent query)."""
    try:
        from supabase_client import service_client
        sb = service_client()
        row = _build_row(event)
        try:
            res = sb.table("audit_logs").insert(row).execute()
        except Exception:
            row.pop("metadata", None)
            res = sb.table("audit_logs").insert(row).execute()
        if res.data:
            return res.data[0].get("id")
    except Exception:
        pass
    return None

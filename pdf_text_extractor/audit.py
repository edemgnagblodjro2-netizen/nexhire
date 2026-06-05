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


def log_audit(event: AuditEvent) -> None:
    """Insère un log d'audit. Conçu pour tourner dans un BackgroundTask.
    N'émet jamais d'exception — une panne d'audit ne doit pas bloquer la requête."""
    try:
        from supabase_client import service_client  # import paresseux
        sb = service_client()
        sb.table("audit_logs").insert({
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
            "metadata": event.metadata,
        }).execute()
    except Exception:
        pass

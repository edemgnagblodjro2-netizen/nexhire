from __future__ import annotations

import os
import hashlib
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from supabase import Client, create_client


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


@dataclass
class DocumentStore:
    supabase: Client | None = None
    documents: dict[str, dict[str, Any]] = field(default_factory=dict)
    conversations: list[dict[str, Any]] = field(default_factory=list)
    accounts: dict[str, dict[str, Any]] = field(default_factory=dict)
    connector_statuses: dict[str, str] = field(default_factory=dict)
    connections: dict[str, dict[str, Any]] = field(default_factory=dict)
    connector_tokens: dict[str, dict[str, Any]] = field(default_factory=dict)
    audit_logs: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_env(cls) -> "DocumentStore":
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

        if url and key:
            return cls(supabase=create_client(url, key))

        return cls()

    def create_document(
        self,
        *,
        filename: str,
        content_text: str,
        organization_id: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "organization_id": organization_id,
            "user_id": user_id,
            "filename": filename,
            "mime_type": "application/pdf",
            "content_text": content_text,
        }

        if self.supabase is not None:
            response = self.supabase.table("documents").insert(payload).execute()
            return response.data[0]

        document = {
            "id": str(uuid4()),
            "created_at": _now_iso(),
            **payload,
        }
        self.documents[document["id"]] = document
        return document

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        if self.supabase is not None:
            response = (
                self.supabase.table("documents")
                .select("*")
                .eq("id", document_id)
                .single()
                .execute()
            )
            return response.data

        return self.documents.get(document_id)

    def update_document_summary(self, document_id: str, summary: str) -> None:
        if self.supabase is not None:
            (
                self.supabase.table("documents")
                .update({"summary": summary})
                .eq("id", document_id)
                .execute()
            )
            return

        if document_id in self.documents:
            self.documents[document_id]["summary"] = summary

    def create_conversation(
        self,
        *,
        document_id: str,
        question: str,
        answer: str,
        organization_id: str | None = None,
        user_id: str | None = None,
        model: str | None = None,
        assistant_mode: str = "enterprise",
        language: str = "fr",
        connector_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "organization_id": organization_id,
            "user_id": user_id,
            "document_id": document_id,
            "question": question,
            "answer": answer,
            "model": model,
            "assistant_mode": assistant_mode,
            "language": language,
            "connector_ids": connector_ids or [],
        }

        if self.supabase is not None:
            response = self.supabase.table("conversations").insert(payload).execute()
            return response.data[0]

        conversation = {
            "id": str(uuid4()),
            "created_at": _now_iso(),
            **payload,
        }
        self.conversations.append(conversation)
        return conversation

    def create_account(
        self,
        *,
        name: str,
        email: str,
        password: str,
        account_type: str,
        plan: str,
    ) -> dict[str, Any]:
        normalized_email = email.strip().lower()
        if normalized_email in self.accounts:
            raise ValueError("Un compte existe deja pour cet email.")

        account = {
            "id": str(uuid4()),
            "name": name.strip(),
            "email": normalized_email,
            "password_hash": _hash_password(password),
            "account_type": account_type,
            "plan": plan,
            "trial_days": 14,
            "created_at": _now_iso(),
        }
        self.accounts[normalized_email] = account
        return _public_account(account)

    def authenticate_account(self, *, email: str, password: str) -> dict[str, Any] | None:
        account = self.accounts.get(email.strip().lower())
        if account is None:
            return None

        if account["password_hash"] != _hash_password(password):
            return None

        return _public_account(account)

    def connector_status(self, connector_id: str) -> str:
        return self.connector_statuses.get(connector_id, "planned")

    def connect_connector(self, connector_id: str) -> str:
        self.connector_statuses[connector_id] = "connected"
        return self.connector_statuses[connector_id]

    def upsert_connection(
        self,
        *,
        organization_id: str,
        connector_id: str,
        status: str,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        key = _connection_key(organization_id, connector_id)
        connection = self.connections.get(
            key,
            {
                "id": str(uuid4()),
                "organization_id": organization_id,
                "connector_id": connector_id,
                "created_by": created_by,
                "created_at": _now_iso(),
            },
        )
        connection.update(
            {
                "status": status,
                "updated_at": _now_iso(),
            }
        )
        self.connections[key] = connection
        self.connector_statuses[connector_id] = "connected" if status == "active" else status
        return connection

    def list_connections(self, *, organization_id: str) -> list[dict[str, Any]]:
        return [
            connection
            for connection in self.connections.values()
            if connection["organization_id"] == organization_id
        ]

    def save_connector_token(
        self,
        *,
        organization_id: str,
        connector_id: str,
        access_token: str,
        refresh_token: str | None = None,
    ) -> dict[str, Any]:
        key = _connection_key(organization_id, connector_id)
        token = {
            "id": str(uuid4()),
            "organization_id": organization_id,
            "connector_id": connector_id,
            "access_token_hash": _hash_password(access_token),
            "refresh_token_hash": _hash_password(refresh_token or access_token),
            "created_at": _now_iso(),
        }
        self.connector_tokens[key] = token
        return token

    def create_audit_log(
        self,
        *,
        organization_id: str,
        user_id: str | None,
        action: str,
        source: str,
        query: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        log = {
            "id": str(uuid4()),
            "organization_id": organization_id,
            "user_id": user_id,
            "action": action,
            "source": source,
            "query": query,
            "metadata": metadata or {},
            "created_at": _now_iso(),
        }
        self.audit_logs.append(log)
        return log

    def list_audit_logs(self, *, organization_id: str) -> list[dict[str, Any]]:
        return [
            log
            for log in self.audit_logs
            if log["organization_id"] == organization_id
        ]


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _public_account(account: dict[str, Any]) -> dict[str, Any]:
    public = {key: value for key, value in account.items() if key != "password_hash"}
    public["plan_label"] = "990 $/annee" if public["plan"] == "annual" else "99 $/mois"
    return public


def _connection_key(organization_id: str, connector_id: str) -> str:
    return f"{organization_id}:{connector_id}"

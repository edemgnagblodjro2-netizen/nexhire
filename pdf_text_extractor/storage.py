from __future__ import annotations

import os
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
        department_id: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "organization_id": organization_id,
            "user_id": user_id,
            "filename": filename,
            "mime_type": "application/pdf",
            "content_text": content_text,
            "department_id": department_id,
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

    def delete_document(self, document_id: str, organization_id: str) -> bool:
        """Supprime définitivement le texte extrait du document."""
        if self.supabase is not None:
            resp = (
                self.supabase.table("documents")
                .delete()
                .eq("id", document_id)
                .eq("organization_id", organization_id)
                .execute()
            )
            return bool(resp.data)
        if document_id in self.documents:
            del self.documents[document_id]
            return True
        return False

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

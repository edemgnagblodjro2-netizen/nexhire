"""Recherche interne en langage naturel sur les documents de l'organisation."""
from __future__ import annotations

import json
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, rows
from rbac import ROLE_RANK, require_min_role

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchPayload(BaseModel):
    query:    str = Field(..., min_length=1, max_length=500)
    language: str = Field(default="fr", pattern="^(fr|en)$")


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    """None = admin/owner → voit tout. Liste = IDs autorisés (peut être vide)."""
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


@router.post("/internal")
async def search_internal(
    request: Request,
    payload: SearchPayload,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Recherche en langage naturel sur les documents accessibles à l'utilisateur."""
    store = request.app.state.storage
    ai    = request.app.state.assistant

    allowed = _allowed_dept_ids(user)

    # ── Récupère les documents autorisés ────────────────────────────────────
    if store.supabase:
        q = (
            store.supabase.table("documents")
            .select("id, filename, content_text, summary, created_at")
            .eq("organization_id", str(user.organization_id))
            .order("created_at", desc=True)
            .limit(50)
        )
        if allowed is not None:
            if allowed:
                ids_str = ",".join(allowed)
                q = q.or_(f"department_id.is.null,department_id.in.({ids_str})")
            else:
                q = q.is_("department_id", "null")
        docs = q.execute().data or []
    else:
        docs = [
            d for d in store.documents.values()
            if str(d.get("organization_id") or "") == str(user.organization_id)
            and (
                allowed is None
                or d.get("department_id") is None
                or d.get("department_id") in allowed
            )
        ]

    if not docs:
        return {
            "success": False,
            "answer":  "Aucun document trouvé dans votre espace. Téléversez des documents dans l'onglet Documents pour activer la recherche interne.",
            "sources": [],
        }

    # ── Score de pertinence par mots-clés ────────────────────────────────────
    query_words = [w for w in payload.query.lower().split() if len(w) > 2]
    scored: list[tuple[int, dict]] = []
    for doc in docs:
        text  = (doc.get("content_text") or "").lower()
        score = sum(1 for w in query_words if w in text)
        scored.append((score, doc))

    scored.sort(key=lambda x: -x[0])
    top = [d for _, d in scored[:5]] or docs[:3]

    # ── Contexte pour l'IA ───────────────────────────────────────────────────
    parts = []
    for doc in top:
        text = (doc.get("content_text") or "")[:2500]
        parts.append(f"[Document : {doc['filename']}]\n{text}")
    context = "\n\n---\n\n".join(parts)

    lang_str = "French" if payload.language == "fr" else "English"

    system_prompt = (
        f"You are an internal knowledge base assistant. "
        f"Answer questions using ONLY the provided documents. "
        f"Respond in {lang_str}. "
        "If the answer is not in the documents, say so clearly. "
        "Always cite which document(s) you used by name. "
        "Keep the answer concise and structured."
    )
    user_prompt = f"Question: {payload.query}\n\nDocuments:\n{context}"

    if ai.backend is None:
        return {
            "success": False,
            "answer":  "Service IA non configuré (OPENAI_API_KEY manquant).",
            "sources": [],
        }

    try:
        answer = ai.backend.complete(system_prompt, user_prompt)
        sources = [
            {
                "id":         d["id"],
                "filename":   d["filename"],
                "preview":    (d.get("content_text") or "")[:200].strip(),
                "created_at": str(d.get("created_at", ""))[:10],
            }
            for d in top
        ]
        return {"success": True, "answer": answer, "sources": sources}
    except Exception as exc:
        return {
            "success": False,
            "answer":  "Service IA temporairement indisponible.",
            "sources": [],
            "error":   type(exc).__name__,
        }

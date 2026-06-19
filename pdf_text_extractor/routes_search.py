"""Recherche interne en langage naturel sur les documents de l'organisation."""
from __future__ import annotations

import json
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import require_min_role

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchPayload(BaseModel):
    query:    str = Field(..., min_length=1, max_length=500)
    language: str = Field(default="fr", pattern="^(fr|en)$")


@router.post("/internal")
async def search_internal(
    request: Request,
    payload: SearchPayload,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Recherche en langage naturel sur tous les documents de l'organisation."""
    store = request.app.state.storage
    ai    = request.app.state.assistant

    # ── Récupère les documents de l'organisation ─────────────────────────────
    if store.supabase:
        resp = (
            store.supabase.table("documents")
            .select("id, filename, content_text, summary, created_at")
            .eq("organization_id", str(user.organization_id))
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        docs = resp.data or []
    else:
        docs = [
            d for d in store.documents.values()
            if str(d.get("organization_id") or "") == str(user.organization_id)
        ]

    if not docs:
        return {
            "success": False,
            "answer":  "Aucun document trouvé dans votre organisation. Téléversez des documents dans l'onglet Documents pour activer la recherche interne.",
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
    # Toujours inclure au moins 3 docs même sans correspondance exacte
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

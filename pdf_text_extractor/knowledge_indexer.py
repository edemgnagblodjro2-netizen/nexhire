"""Knowledge Center — chunking, embeddings, recherche vectorielle, synthèse IA."""
from __future__ import annotations

import hashlib
import json
import logging
import os

logger = logging.getLogger(__name__)

CHUNK_WORDS = 400
CHUNK_OVERLAP = 40


def chunk_text(text: str) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + CHUNK_WORDS])
        if chunk.strip():
            chunks.append(chunk)
        i += CHUNK_WORDS - CHUNK_OVERLAP
    return chunks


def _openai():
    from openai import OpenAI
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def embed_texts(texts: list[str]) -> list[list[float]]:
    resp = _openai().embeddings.create(model="text-embedding-3-small", input=texts)
    return [item.embedding for item in resp.data]


def _emb_str(emb: list[float]) -> str:
    return "[" + ",".join(str(x) for x in emb) + "]"


def index_document(
    org_id: str,
    title: str,
    source_type: str,
    content: str,
    source_url: str | None = None,
    connector_id: str | None = None,
    metadata: dict | None = None,
) -> int:
    """Chunk, embed et stocke un document. Retourne le nombre de chunks insérés (0 si déjà à jour)."""
    from db import get_db

    file_hash = hashlib.sha256(content.encode()).hexdigest()

    with get_db() as cur:
        # Supprime les chunks obsolètes (même doc, contenu différent)
        cur.execute(
            """DELETE FROM knowledge_documents
               WHERE organization_id = %s AND title = %s AND source_type = %s
                 AND file_hash != %s""",
            (org_id, title, source_type, file_hash),
        )
        # Déjà indexé avec ce contenu → rien à faire
        cur.execute(
            """SELECT 1 FROM knowledge_documents
               WHERE organization_id = %s AND title = %s AND source_type = %s AND file_hash = %s
               LIMIT 1""",
            (org_id, title, source_type, file_hash),
        )
        if cur.fetchone():
            return 0

    chunks = chunk_text(content)
    if not chunks:
        return 0

    # Embed par batch de 100 (limite OpenAI)
    all_embeddings: list[list[float]] = []
    for i in range(0, len(chunks), 100):
        all_embeddings.extend(embed_texts(chunks[i : i + 100]))

    with get_db() as cur:
        for idx, (chunk, emb) in enumerate(zip(chunks, all_embeddings)):
            cur.execute(
                """INSERT INTO knowledge_documents
                   (organization_id, title, source_type, source_url, connector_id,
                    content_chunk, chunk_index, embedding, metadata, file_hash)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s::jsonb, %s)""",
                (
                    org_id, title, source_type, source_url, connector_id,
                    chunk, idx, _emb_str(emb),
                    json.dumps(metadata or {}), file_hash,
                ),
            )

    logger.info("Indexed '%s' (%s) — %d chunks, org=%s", title, source_type, len(chunks), org_id)
    return len(chunks)


def search_knowledge(org_id: str, query: str, k: int = 5) -> list[dict]:
    """Recherche les k chunks les plus pertinents par similarité cosinus."""
    from db import get_db, rows

    query_emb = embed_texts([query])[0]
    emb_s = _emb_str(query_emb)

    with get_db() as cur:
        cur.execute(
            """SELECT title, source_type, source_url, content_chunk, metadata,
                      ROUND((1 - (embedding <=> %s::vector))::numeric, 4) AS similarity
               FROM knowledge_documents
               WHERE organization_id = %s
               ORDER BY embedding <=> %s::vector
               LIMIT %s""",
            (emb_s, org_id, emb_s, k),
        )
        return rows(cur)


def synthesize_answer(query: str, chunks: list[dict]) -> str:
    """Génère une réponse en langage naturel à partir des chunks récupérés."""
    if not chunks:
        return "Aucun document pertinent trouvé dans votre base de connaissances."

    context = "\n\n---\n\n".join(
        f"[{c['title']} — {c['source_type']}]\n{c['content_chunk']}" for c in chunks
    )

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    resp = _openai().chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un assistant d'entreprise expert. Réponds en français de manière "
                    "concise et structurée en t'appuyant uniquement sur les extraits de documents "
                    "fournis. Cite les titres de sources entre crochets quand tu t'y réfères. "
                    "Si la réponse n'est pas dans les documents, dis-le clairement."
                ),
            },
            {
                "role": "user",
                "content": f"Question : {query}\n\nDocuments pertinents :\n{context}",
            },
        ],
        max_tokens=800,
        temperature=0.2,
    )
    return resp.choices[0].message.content or ""


def index_m365_documents(org_id: str, connector_id: str) -> dict:
    """Indexe les documents SharePoint/OneDrive d'un connecteur M365."""
    from db import get_db, row as _row
    from connector_credentials import decrypt_credentials
    import httpx

    with get_db() as cur:
        cur.execute(
            "SELECT credentials_enc FROM connectors WHERE id = %s AND organization_id = %s LIMIT 1",
            (connector_id, org_id),
        )
        conn = _row(cur)
    if not conn:
        return {"error": "connector not found"}

    try:
        creds = decrypt_credentials(conn["credentials_enc"])
        access_token = creds.get("access_token") or creds.get("token")
    except Exception as exc:
        logger.error("Knowledge M365 decrypt error: %s", exc)
        return {"error": "credentials decrypt failed"}

    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    indexed = skipped = errors = 0

    # Liste les fichiers récents de OneDrive (100 max)
    try:
        resp = httpx.get(
            "https://graph.microsoft.com/v1.0/me/drive/root/children"
            "?$select=name,id,webUrl,file&$top=100",
            headers=headers,
            timeout=30,
        )
        items = resp.json().get("value", []) if resp.is_success else []
    except Exception as exc:
        logger.error("Knowledge M365 list error: %s", exc)
        items = []

    for item in items:
        if not item.get("file"):
            continue
        name: str = item.get("name", "")
        item_id: str = item.get("id", "")
        web_url: str = item.get("webUrl", "")

        if not name.lower().endswith((".pdf", ".txt", ".docx", ".md")):
            continue

        try:
            dl_resp = httpx.get(
                f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}/content",
                headers=headers,
                timeout=30,
                follow_redirects=True,
            )
            if not dl_resp.is_success:
                errors += 1
                continue

            content = ""
            if name.lower().endswith(".pdf"):
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(dl_resp.content))
                content = "\n".join(p.extract_text() or "" for p in reader.pages)
            else:
                content = dl_resp.text

            if not content.strip():
                skipped += 1
                continue

            n = index_document(
                org_id=org_id,
                title=name,
                source_type="onedrive",
                content=content,
                source_url=web_url,
                connector_id=connector_id,
                metadata={"item_id": item_id},
            )
            if n > 0:
                indexed += 1
            else:
                skipped += 1

        except Exception as exc:
            logger.error("Knowledge index file '%s': %s", name, exc)
            errors += 1

    return {"indexed": indexed, "skipped": skipped, "errors": errors}

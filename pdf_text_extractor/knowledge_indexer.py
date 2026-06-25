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


_SUPPORTED_EXTS = {".pdf", ".txt", ".md", ".docx"}
_MAX_FILE_BYTES  = 10 * 1024 * 1024  # 10 Mo


def _extract_text(filename: str, raw: bytes) -> str:
    """Extrait le texte brut d'un fichier selon son extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        import io
        from pypdf import PdfReader
        try:
            reader = PdfReader(io.BytesIO(raw))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            return ""
    if ext == ".docx":
        import io
        try:
            from docx import Document
            doc = Document(io.BytesIO(raw))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return raw.decode("utf-8", errors="replace")
    return raw.decode("utf-8", errors="replace")


def _index_drive_items(
    headers: dict,
    drive_id: str,
    items: list[dict],
    org_id: str,
    source_type: str,
    stats: dict,
    title_prefix: str = "",
) -> None:
    import httpx
    GRAPH = "https://graph.microsoft.com/v1.0"
    for item in items:
        if not item.get("file"):
            continue
        name: str = item.get("name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in _SUPPORTED_EXTS:
            stats["skipped"] += 1
            continue
        if item.get("size", 0) > _MAX_FILE_BYTES:
            stats["skipped"] += 1
            continue

        item_id: str = item.get("id", "")
        web_url: str = item.get("webUrl", "")
        title = f"{title_prefix} — {name}" if title_prefix else name

        try:
            dl = httpx.get(
                f"{GRAPH}/drives/{drive_id}/items/{item_id}/content",
                headers=headers, timeout=60, follow_redirects=True,
            )
            if not dl.is_success:
                stats["errors"] += 1
                continue
            content = _extract_text(name, dl.content)
            if not content.strip():
                stats["skipped"] += 1
                continue
            n = index_document(
                org_id=org_id, title=title, source_type=source_type,
                content=content, source_url=web_url,
                metadata={"item_id": item_id, "drive_id": drive_id},
            )
            stats["indexed" if n > 0 else "skipped"] += 1
        except Exception as exc:
            logger.error("Knowledge index '%s': %s", name, exc)
            stats["errors"] += 1


def index_m365_documents(org_id: str) -> dict:
    """Indexe toutes les bibliothèques SharePoint organisationnelles.
    OneDrive personnel (/me/drive) est exclu : il appartient au compte OAuth
    du owner et ne doit pas être visible par tous les membres de l'org.
    """
    try:
        from m365_collector import _auth_headers, _get, _get_all, GRAPH
    except Exception as exc:
        logger.error("Knowledge M365 import error: %s", exc)
        return {"error": "m365_collector non disponible"}

    try:
        headers = _auth_headers(org_id)
    except RuntimeError as exc:
        return {"error": str(exc)}

    stats: dict = {"indexed": 0, "skipped": 0, "errors": 0}

    # ── SharePoint — sites et bibliothèques de documents ─────────────────────
    try:
        sites = _get_all(
            headers,
            f"{GRAPH}/sites",
            {"search": "*", "$select": "id,displayName,webUrl", "$top": "50"},
        )
        logger.info("Knowledge SharePoint — %d sites trouvés", len(sites))
    except Exception as exc:
        logger.error("Knowledge SharePoint sites list error: %s", exc)
        sites = []

    for site in sites:
        site_id  = site.get("id", "")
        site_name = site.get("displayName", "SharePoint")
        try:
            drives = _get_all(
                headers,
                f"{GRAPH}/sites/{site_id}/drives",
                {"$select": "id,name,driveType"},
            )
            for drive in drives:
                if drive.get("driveType") not in ("documentLibrary", "business"):
                    continue
                drive_id = drive["id"]
                items = _get_all(
                    headers,
                    f"{GRAPH}/drives/{drive_id}/root/children",
                    {"$select": "name,id,webUrl,file,size", "$top": "200"},
                )
                _index_drive_items(
                    headers, drive_id, items, org_id, "sharepoint", stats,
                    title_prefix=site_name,
                )
        except Exception as exc:
            logger.error("Knowledge SharePoint site=%s error: %s", site_id, exc)
            stats["errors"] += 1

    logger.info(
        "Knowledge M365 sync org=%s — indexed=%d skipped=%d errors=%d",
        org_id, stats["indexed"], stats["skipped"], stats["errors"],
    )
    return stats

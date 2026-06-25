from __future__ import annotations

import io
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader

from auth import CurrentUser
from db import get_db, rows
from rbac import require_min_role, ROLE_RANK

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
logger = logging.getLogger(__name__)


def _get_allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    """None = admin/owner → pas de filtre. Liste = IDs autorisés (peut être vide)."""
    if ROLE_RANK.get(user.role, 0) >= 3 or getattr(user, "is_service_account", False):
        return None
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


@router.get("/search")
def search_knowledge(
    q: str = Query(..., min_length=1, max_length=500),
    k: int = Query(5, ge=1, le=20),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Recherche sémantique filtrée par département (admin/owner voient tout)."""
    allowed = _get_allowed_dept_ids(user)
    try:
        from knowledge_indexer import search_knowledge as _search, synthesize_answer
        chunks = _search(str(user.organization_id), q, k=k, allowed_dept_ids=allowed)
        answer = synthesize_answer(q, chunks)
    except Exception as exc:
        logger.error("knowledge search error: %s", exc)
        raise HTTPException(500, "Erreur lors de la recherche — vérifiez la clé OpenAI.")
    return {"answer": answer, "sources": chunks}


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Indexe un PDF ou fichier texte uploadé manuellement."""
    content_bytes = await file.read()
    filename = file.filename or "document"
    doc_title = (title or filename).strip() or filename

    content = ""
    if filename.lower().endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content_bytes))
            content = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as exc:
            logger.error("PDF parse error: %s", exc)
            raise HTTPException(400, "Impossible de lire le fichier PDF.")
    else:
        try:
            content = content_bytes.decode("utf-8", errors="replace")
        except Exception:
            raise HTTPException(400, "Format de fichier non supporté.")

    if not content.strip():
        raise HTTPException(400, "Le document est vide ou illisible.")

    try:
        from knowledge_indexer import index_document
        n = index_document(
            org_id=str(user.organization_id),
            title=doc_title,
            source_type="pdf_upload",
            content=content,
            metadata={"uploaded_by": str(user.id), "original_filename": filename},
        )
    except Exception as exc:
        logger.error("knowledge index error: %s", exc)
        raise HTTPException(500, "Erreur lors de l'indexation du document.")

    return {"status": "ok", "chunks": n, "title": doc_title}


@router.get("/documents")
def list_documents(
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Liste les documents indexés filtrés par département (admin/owner voient tout)."""
    allowed = _get_allowed_dept_ids(user)
    org_id = str(user.organization_id)

    if allowed is None:
        dept_clause = ""
        params: list = [org_id]
    elif not allowed:
        dept_clause = "AND department_id IS NULL"
        params = [org_id]
    else:
        dept_clause = "AND (department_id IS NULL OR department_id = ANY(%s::uuid[]))"
        params = [org_id, allowed]

    sql = f"""
        SELECT title, source_type, source_url, department_id,
               COUNT(*) AS chunk_count,
               MAX(synced_at) AS synced_at
        FROM knowledge_documents
        WHERE organization_id = %s
          {dept_clause}
        GROUP BY title, source_type, source_url, department_id
        ORDER BY MAX(synced_at) DESC
        LIMIT 500
    """
    with get_db() as cur:
        cur.execute(sql, params)
        return rows(cur)


@router.delete("/documents")
def delete_document(
    title: str = Query(...),
    source_type: str = Query(...),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Supprime tous les chunks d'un document (admin requis)."""
    with get_db() as cur:
        cur.execute(
            """DELETE FROM knowledge_documents
               WHERE organization_id = %s AND title = %s AND source_type = %s""",
            (str(user.organization_id), title, source_type),
        )
    return {"status": "ok"}


@router.post("/discover-sharepoint-sites")
def discover_sharepoint_sites(user: CurrentUser = Depends(require_min_role("admin"))):
    """Détecte les sites SharePoint disponibles et les enregistre pour le mappage manuel."""
    try:
        from knowledge_indexer import discover_m365_sites
        sites = discover_m365_sites(str(user.organization_id))
    except Exception as exc:
        logger.error("SharePoint discover error: %s", exc)
        raise HTTPException(500, "Erreur lors de la détection des sites SharePoint.")
    if isinstance(sites, dict) and "error" in sites:
        raise HTTPException(400, sites["error"])
    return {"sites": sites}


@router.get("/sharepoint-mappings")
def get_sharepoint_mappings(user: CurrentUser = Depends(require_min_role("admin"))):
    """Retourne les sites SharePoint avec leurs mappages de département."""
    org_id = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT m.site_id, m.site_name, m.dept_id, d.name AS dept_name
               FROM sharepoint_dept_mappings m
               LEFT JOIN departments d ON d.id = m.dept_id
               WHERE m.org_id = %s
               ORDER BY m.site_name""",
            (org_id,),
        )
        mappings = rows(cur)
        cur.execute(
            "SELECT id, name FROM departments WHERE organization_id = %s ORDER BY name",
            (org_id,),
        )
        depts = rows(cur)
    return {"mappings": mappings, "departments": depts}


class SiteMappingItem(BaseModel):
    site_id:  str
    dept_id:  str | None = None  # None = org-wide


@router.put("/sharepoint-mappings")
def save_sharepoint_mappings(
    payload: list[SiteMappingItem],
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Enregistre les mappages sites SharePoint → départements."""
    org_id = str(user.organization_id)
    with get_db() as cur:
        for item in payload:
            cur.execute(
                """UPDATE sharepoint_dept_mappings
                   SET dept_id = %s, updated_at = NOW()
                   WHERE org_id = %s AND site_id = %s""",
                (item.dept_id, org_id, item.site_id),
            )
    return {"ok": True, "updated": len(payload)}


@router.post("/sync-m365")
def sync_m365(user: CurrentUser = Depends(require_min_role("admin"))):
    """Indexe les bibliothèques SharePoint en utilisant les mappages manuels."""
    with get_db() as cur:
        cur.execute(
            "DELETE FROM knowledge_documents WHERE organization_id = %s AND source_type = 'onedrive'",
            (str(user.organization_id),),
        )
    try:
        from knowledge_indexer import index_m365_documents
        result = index_m365_documents(str(user.organization_id))
    except Exception as exc:
        logger.error("M365 knowledge sync error: %s", exc)
        raise HTTPException(500, "Erreur lors de la synchronisation M365.")
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result

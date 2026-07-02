from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from db import get_db, row
from rate_limiter import limiter

router = APIRouter(prefix="/api/org", tags=["org"])

_NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}


@router.get("/session/{session_id}")
@limiter.limit("60/minute")
def get_org_session(request: Request, session_id: str):
    """
    Données personnelles d'une organisation pour son workspace PME.
    Accessible via un lien depuis le rapport — aucune auth requise (session_id = jeton opaque).
    """
    with get_db() as cur:
        cur.execute(
            """
            SELECT
              s.id, s.company_name, s.sector, s.size_range,
              s.imai_score, s.niveau, s.completed_at,
              s.score_strategie, s.score_personnes, s.score_processus,
              s.score_technologies, s.score_gouvernance,
              p.slug          AS partner_slug,
              p.name          AS partner_name,
              p.logo_url,
              p.primary_color,
              p.hero_title,
              p.hero_subtitle,
              p.partner_type
            FROM diagnostic_sessions s
            JOIN partners p ON p.id = s.partner_id
            WHERE s.id = %s AND s.status = 'completed'
            LIMIT 1
            """,
            (session_id,),
        )
        sess = row(cur)

    if not sess:
        raise HTTPException(status_code=404, detail="Session introuvable ou non complétée.")

    return JSONResponse(
        content={
            "session_id": str(sess["id"]),
            "company_name": sess["company_name"] or "Votre organisation",
            "sector": sess["sector"],
            "size_range": sess["size_range"],
            "imai_score": float(sess["imai_score"] or 0),
            "niveau": sess["niveau"],
            "completed_at": sess["completed_at"].isoformat() if sess["completed_at"] else None,
            "dimensions": {
                "Stratégie": float(sess["score_strategie"] or 0),
                "Personnes": float(sess["score_personnes"] or 0),
                "Processus": float(sess["score_processus"] or 0),
                "Technologies": float(sess["score_technologies"] or 0),
                "Gouvernance": float(sess["score_gouvernance"] or 0),
            },
            "partner": {
                "slug": sess["partner_slug"],
                "name": sess["partner_name"],
                "logo_url": sess["logo_url"],
                "primary_color": sess["primary_color"] or "#7c3aed",
                "hero_title": sess["hero_title"],
                "hero_subtitle": sess["hero_subtitle"],
                "partner_type": sess["partner_type"] or "chamber",
            },
            "rapport_url": f"/rapport/{session_id}",
            "workspace_url": f"/workspace/{sess['partner_slug']}",
        },
        headers=_NO_CACHE,
    )

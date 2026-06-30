from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from auth import CurrentUser, get_current_user, get_optional_user
from db import get_db, row, rows
from rate_limiter import limiter

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

_NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}


def _get_partner(cur, slug: str) -> dict:
    cur.execute(
        """
        SELECT id, slug, name, description, logo_url,
               primary_color, secondary_color, favicon_url,
               hero_title, hero_subtitle,
               city, region, country, website, plan, partner_type, is_active
        FROM partners
        WHERE slug = %s
        LIMIT 1
        """,
        (slug,),
    )
    partner = row(cur)
    if not partner:
        raise HTTPException(status_code=404, detail="Workspace introuvable.")
    if not partner["is_active"]:
        raise HTTPException(status_code=403, detail="Ce workspace est actuellement désactivé.")
    return partner


def _substitute_slug(entry_path: str | None, slug: str) -> str | None:
    if not entry_path:
        return None
    return entry_path.replace("{slug}", slug)


# ── GET /api/workspace/{slug} ─────────────────────────────────────────────────
# Informations publiques du partenaire — utilisé par le shell pour initialiser le workspace.

@router.get("/{slug}")
@limiter.limit("60/minute")
def get_workspace(request: Request, slug: str, user: CurrentUser | None = Depends(get_optional_user)):
    with get_db() as cur:
        partner = _get_partner(cur, slug)

    viewer: dict | None = None
    if user and user.partner_id and str(user.partner_id) == str(partner["id"]):
        viewer = {
            "authenticated":   True,
            "user_id":         str(user.id),
            "email":           user.email,
            "organization_id": str(user.organization_id) if user.organization_id else None,
        }

    return JSONResponse(
        content={
            "slug":            partner["slug"],
            "name":            partner["name"],
            "description":     partner["description"],
            "logo_url":        partner["logo_url"],
            "primary_color":   partner["primary_color"],
            "secondary_color": partner["secondary_color"],
            "favicon_url":     partner["favicon_url"],
            "hero_title":      partner["hero_title"],
            "hero_subtitle":   partner["hero_subtitle"],
            "city":            partner["city"],
            "region":          partner["region"],
            "country":         partner["country"],
            "website":         partner["website"],
            "plan":            partner["plan"],
            "partner_type":    partner["partner_type"] or "chamber",
            "viewer":          viewer or {"authenticated": False},
        },
        headers=_NO_CACHE,
    )


# ── GET /api/workspace/{slug}/apps ────────────────────────────────────────────
# Catalogue complet des applications pour ce workspace.
# Retourne toutes les apps (installed + coming_soon + available).
# Le shell utilise catalog_status pour afficher les badges et désactiver les liens.
# Les apps "coming_soon" ont entry_path = null.

@router.get("/{slug}/apps")
@limiter.limit("60/minute")
def get_workspace_apps(request: Request, slug: str):
    with get_db() as cur:
        partner = _get_partner(cur, slug)
        cur.execute(
            """
            SELECT
              app_slug, app_name, app_description, icon,
              category, version, default_permissions, dependencies,
              entry_path, sort_order,
              is_enabled, app_config, installed_at,
              catalog_status
            FROM workspace_catalog
            WHERE partner_slug = %s
            ORDER BY sort_order, app_slug
            """,
            (slug,),
        )
        catalog = rows(cur)

    apps = []
    for app in catalog:
        is_coming = app["catalog_status"] in ("coming_soon", "available", "available_beta")
        apps.append({
            "slug":         app["app_slug"],
            "name":         app["app_name"],
            "description":  app["app_description"],
            "icon":         app["icon"],
            "category":     app["category"],
            "version":      app["version"],
            "catalog_status": app["catalog_status"],
            "is_installed": app["catalog_status"] == "installed",
            "entry_path":   None if is_coming else _substitute_slug(app["entry_path"], slug),
            "config":       app["app_config"] if app["app_config"] else {},
            "installed_at": app["installed_at"].isoformat() if app["installed_at"] else None,
        })

    return JSONResponse(
        content={
            "partner": {
                "slug":          partner["slug"],
                "name":          partner["name"],
                "primary_color": partner["primary_color"],
                "logo_url":      partner["logo_url"],
                "hero_title":    partner["hero_title"],
                "hero_subtitle": partner["hero_subtitle"],
            },
            "apps": apps,
        },
        headers=_NO_CACHE,
    )


# ── GET /api/workspace/{slug}/config ─────────────────────────────────────────
# Configuration de branding uniquement — utilisé pour appliquer le thème visuel.
# Réponse légère, mise en cache côté client possible (branding stable).

@router.get("/{slug}/config")
@limiter.limit("120/minute")
def get_workspace_config(request: Request, slug: str):
    with get_db() as cur:
        partner = _get_partner(cur, slug)
    return {
        "slug":            partner["slug"],
        "name":            partner["name"],
        "logo_url":        partner["logo_url"],
        "primary_color":   partner["primary_color"],
        "secondary_color": partner["secondary_color"],
        "favicon_url":     partner["favicon_url"],
        "hero_title":      partner["hero_title"],
        "hero_subtitle":   partner["hero_subtitle"],
    }


# ── GET /api/workspace/{slug}/admin ──────────────────────────────────────────
# Statistiques réservées au workspace_admin (owner + partner_id correspondant).

@router.get("/{slug}/admin")
@limiter.limit("30/minute")
def get_workspace_admin(request: Request, slug: str, user: CurrentUser = Depends(get_current_user)):
    with get_db() as cur:
        partner = _get_partner(cur, slug)
        partner_id = partner["id"]

        # Vérifier que l'utilisateur est bien workspace_admin de ce partenaire
        if str(getattr(user, "partner_id", None)) != str(partner_id):
            raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur de ce workspace.")

        # Stats globales
        cur.execute(
            """
            SELECT
              total_sessions, completed_sessions, imai_avg,
              nb_debutant, nb_intermediaire, nb_avance,
              gov_avg, str_avg, proc_avg, tech_avg, pers_avg
            FROM diagnostic_partner_stats
            WHERE partner_id = %s
            """,
            (partner_id,),
        )
        stats = row(cur) or {}

        # Apps installées
        cur.execute(
            """
            SELECT app_slug, is_enabled, config, installed_at
            FROM installed_apps
            WHERE partner_id = %s
            ORDER BY installed_at
            """,
            (partner_id,),
        )
        installed = rows(cur)

    return {
        "partner_id":  str(partner_id),
        "stats":       dict(stats),
        "installed_apps": [
            {
                "slug":         a["app_slug"],
                "is_enabled":   a["is_enabled"],
                "config":       a["config"],
                "installed_at": a["installed_at"].isoformat() if a["installed_at"] else None,
            }
            for a in installed
        ],
    }

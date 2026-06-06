"""Paramètres utilisateur — profil, mot de passe, SSO."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── Models ─────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)


# ── Profile ────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne le profil complet : infos utilisateur + organisation."""
    sb = service_client()

    # Utilisateur
    user_row = sb.table("users").select("full_name, email, role, created_at").eq("id", user.id).single().execute()
    u = user_row.data or {}

    # Organisation
    org: dict = {}
    if user.organization_id:
        org_row = sb.table("organizations").select("name, slug, created_at, org_type").eq("id", user.organization_id).single().execute()
        org = org_row.data or {}

    # SSO (vérifie si un connecteur SAML/OIDC est configuré)
    sso_enabled = False
    try:
        sso_res = sb.table("connectors").select("id").eq("organization_id", user.organization_id).eq("connector_type", "sso").eq("status", "connected").limit(1).execute()
        sso_enabled = bool(sso_res.data)
    except Exception:
        pass

    return {
        "id":                  user.id,
        "email":               u.get("email") or user.email,
        "full_name":           u.get("full_name") or "",
        "role":                u.get("role") or user.role,
        "member_since":        (u.get("created_at") or "")[:10],
        "organization_id":     user.organization_id,
        "organization_name":   org.get("name") or "",
        "organization_slug":   org.get("slug") or "",
        "org_type":            org.get("org_type") or "entreprise",
        "sso_enabled":         sso_enabled,
        "subscription_status": user.subscription_status,
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Met à jour le nom complet de l'utilisateur."""
    sb = service_client()
    sb.table("users").update({"full_name": payload.full_name}).eq("id", user.id).execute()
    return {"ok": True, "full_name": payload.full_name}


# ── Password ───────────────────────────────────────────────────────────────

@router.post("/password")
def change_password(
    payload: PasswordChange,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Change le mot de passe après vérification du mot de passe actuel."""
    sb = service_client()
    from supabase_client import anon_client

    # 1. Vérifie le mot de passe actuel en essayant de se connecter
    try:
        anon = anon_client()
        anon.auth.sign_in_with_password({"email": user.email, "password": payload.current_password})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect.",
        )

    # 2. Applique le nouveau mot de passe via l'API admin (service role)
    try:
        sb.auth.admin.update_user_by_id(user.id, {"password": payload.new_password})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Impossible de changer le mot de passe : {exc}") from exc

    return {"ok": True}

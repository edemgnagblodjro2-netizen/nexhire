"""Paramètres utilisateur — profil, mot de passe, SSO + formulaire contact public."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser
from rbac import require_min_role
from db import get_db, rows, row
import email_service

router        = APIRouter(prefix="/api/settings", tags=["settings"])
public_router = APIRouter(tags=["public"])


# ── Models ─────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)

class OrgUpdate(BaseModel):
    logo_url:    str | None = Field(None, max_length=2048)
    brand_color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)

class ContactRequest(BaseModel):
    name:    str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    email:   EmailStr
    message: str = Field("", max_length=2000)


# ── Contact public (no auth) ───────────────────────────────────────────────

@public_router.post("/api/contact")
def contact_form(payload: ContactRequest):
    html = f"""
    <h2 style="color:#818CF8">Nouveau contact EIP — NexHire</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif">
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Nom</td><td>{payload.name}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Organisation</td><td>{payload.company}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Email</td><td><a href="mailto:{payload.email}">{payload.email}</a></td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600;vertical-align:top">Message</td><td>{payload.message or "(aucun)"}</td></tr>
    </table>
    """
    email_service._send(
        "edemgnagblodjro2@gmail.com",
        f"EIP — Nouveau contact : {payload.name} ({payload.company})",
        html,
    )
    return {"status": "ok"}


# ── Profile ────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne le profil complet : infos utilisateur + organisation."""

    # Utilisateur
    with get_db() as cur:
        cur.execute(
            "SELECT full_name, email, role, created_at FROM users WHERE id = %s LIMIT 1",
            (user.id,),
        )
        u = row(cur) or {}

    # Organisation
    org: dict = {}
    if user.organization_id:
        with get_db() as cur:
            cur.execute(
                "SELECT name, slug, created_at, org_type, logo_url, brand_color, monthly_report_enabled FROM organizations WHERE id = %s LIMIT 1",
                (user.organization_id,),
            )
            org = row(cur) or {}

    # SSO (vérifie si un connecteur SAML/OIDC est configuré)
    sso_enabled = False
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT id FROM connectors
                   WHERE organization_id = %s AND connector_type LIKE 'sso_%' AND status = 'connected'
                   LIMIT 1""",
                (user.organization_id,),
            )
            sso_enabled = bool(row(cur))
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
        "logo_url":            org.get("logo_url") or "",
        "brand_color":         org.get("brand_color") or "#818CF8",
        "monthly_report_enabled": org.get("monthly_report_enabled", True),
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Met à jour le nom complet de l'utilisateur."""
    with get_db() as cur:
        cur.execute(
            "UPDATE users SET full_name = %s WHERE id = %s",
            (payload.full_name, user.id),
        )
    return {"ok": True, "full_name": payload.full_name}


# ── Org branding (admin/owner only) ───────────────────────────────────────

@router.patch("/org")
def update_org(
    payload: OrgUpdate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Met à jour le logo et la couleur de marque de l'organisation."""
    fields, values = [], []
    if payload.logo_url is not None:
        fields.append("logo_url = %s"); values.append(payload.logo_url or None)
    if payload.brand_color is not None:
        fields.append("brand_color = %s"); values.append(payload.brand_color)
    if not fields:
        return {"ok": True}
    values.append(user.organization_id)
    with get_db() as cur:
        cur.execute(f"UPDATE organizations SET {', '.join(fields)} WHERE id = %s", values)
    return {"ok": True}


# ── Rapport mensuel (admin/owner only) ───────────────────────────────────────

@router.patch("/monthly-report")
def toggle_monthly_report(
    payload: dict,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    enabled = bool(payload.get("enabled", True))
    with get_db() as cur:
        cur.execute(
            "UPDATE organizations SET monthly_report_enabled = %s WHERE id = %s",
            (enabled, user.organization_id),
        )
    return {"ok": True, "monthly_report_enabled": enabled}


# ── Password ───────────────────────────────────────────────────────────────

@router.post("/password")
def change_password(
    payload: PasswordChange,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Change le mot de passe après vérification du mot de passe actuel."""
    from supabase_client import anon_client, service_client

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
        sb = service_client()
        sb.auth.admin.update_user_by_id(user.id, {"password": payload.new_password})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Impossible de changer le mot de passe : {exc}") from exc

    return {"ok": True}

"""Paramètres utilisateur — profil, mot de passe, SSO + formulaire contact public."""
import os
from html import escape

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
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
    org_name:    str | None = Field(None, min_length=1, max_length=255)
    logo_url:    str | None = Field(None, max_length=2048)
    brand_color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    org_type:    str | None = Field(None, pattern=r"^(entreprise|entrepreneur|hopital|municipalite|universite)$")
    currency:    str | None = Field(None, pattern=r"^[A-Z]{3}$")

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)

class ContactRequest(BaseModel):
    name:    str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    email:   EmailStr
    message: str = Field("", max_length=2000)

class SupportTicket(BaseModel):
    category:    str = Field("other", max_length=50)
    subject:     str = Field(..., min_length=1, max_length=300)
    description: str = Field("", max_length=5000)


# ── Contact public (no auth) ───────────────────────────────────────────────

@public_router.post("/api/contact")
def contact_form(payload: ContactRequest):
    html = f"""
    <h2 style="color:#818CF8">Nouveau contact EIP — NexHire</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif">
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Nom</td><td>{escape(payload.name)}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Organisation</td><td>{escape(payload.company)}</td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600">Email</td><td><a href="mailto:{escape(payload.email)}">{escape(payload.email)}</a></td></tr>
      <tr><td style="padding:8px 16px 8px 0;color:#64748b;font-weight:600;vertical-align:top">Message</td><td>{escape(payload.message or "(aucun)")}</td></tr>
    </table>
    """
    email_service._send(
        os.environ.get("CONTACT_EMAIL", "support@nexhire.ca"),
        f"EIP — Nouveau contact : {escape(payload.name)} ({escape(payload.company)})",
        html,
    )
    return {"status": "ok"}


# ── Support ticket (authenticated) ────────────────────────────────────────

_CAT_LABELS = {
    "bug":       "Problème technique ou bug",
    "billing":   "Facturation et abonnement",
    "access":    "Accès, permissions ou authentification",
    "integration": "Intégrations et connecteurs",
    "migration": "Migration et import de données",
    "feature":   "Demande de fonctionnalité",
    "training":  "Formation et prise en main",
    "security":  "Sécurité et conformité",
    "other":     "Autre",
}

@router.post("/support")
def submit_support_ticket(
    payload: SupportTicket,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Envoie un ticket de support à support@nexhire.ca via Resend."""
    cat_label = _CAT_LABELS.get(payload.category, payload.category)
    sender    = user.email or "—"
    org_name  = "—"
    if user.organization_id:
        try:
            from db import get_db as _gdb, row as _row
            with _gdb() as _cur:
                _cur.execute("SELECT name FROM organizations WHERE id = %s LIMIT 1", (str(user.organization_id),))
                _org = _row(_cur)
            if _org:
                org_name = _org.get("name") or "—"
        except Exception:
            pass

    html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:22px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px">EIP</span>
      </span>
      <span style="color:#94a3b8;font-size:.82rem">Ticket support</span>
    </div>
    <div style="padding:28px 32px">
      <h2 style="margin:0 0 20px;color:#0f172a;font-size:1.05rem">{escape(payload.subject)}</h2>
      <table style="border-collapse:collapse;font-size:.88rem;width:100%;margin-bottom:20px">
        <tr><td style="padding:6px 16px 6px 0;color:#64748b;font-weight:600;white-space:nowrap">Catégorie</td>
            <td style="padding:6px 0"><span style="background:#eef2ff;color:#4338ca;padding:2px 10px;border-radius:99px;font-size:.82rem;font-weight:600">{escape(cat_label)}</span></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#64748b;font-weight:600">Expéditeur</td>
            <td style="padding:6px 0"><a href="mailto:{escape(sender)}" style="color:#6366f1">{escape(sender)}</a></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#64748b;font-weight:600">Organisation</td>
            <td style="padding:6px 0">{escape(org_name)}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#64748b;font-weight:600">Rôle</td>
            <td style="padding:6px 0">{escape(user.role or "user")}</td></tr>
      </table>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px">
        <p style="margin:0;color:#1e293b;font-size:.9rem;white-space:pre-wrap;line-height:1.6">{escape(payload.description or "(aucune description)")}</p>
      </div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:.78rem">Répondre directement à cet email pour contacter l'utilisateur.</p>
    </div>
  </div>
</body></html>"""

    ok = email_service._send(
        "support@nexhire.ca",
        f"[Support NexHire EIP] {escape(payload.subject)} — {escape(org_name)}",
        html,
    )
    if not ok:
        raise HTTPException(status_code=503, detail="Impossible d'envoyer le message. Réessayez ou écrivez directement à support@nexhire.ca.")
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
        "member_since":        str(u.get("created_at") or "")[:10],
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
    """Met à jour le nom, logo et couleur de marque de l'organisation."""
    fields, values = [], []
    if payload.org_name is not None:
        fields.append("name = %s"); values.append(payload.org_name.strip())
    if payload.logo_url is not None:
        fields.append("logo_url = %s"); values.append(payload.logo_url or None)
    if payload.brand_color is not None:
        fields.append("brand_color = %s"); values.append(payload.brand_color)
    if payload.org_type is not None:
        fields.append("org_type = %s"); values.append(payload.org_type)
    if payload.currency is not None:
        fields.append("currency = %s"); values.append(payload.currency)
    if not fields:
        return {"ok": True}
    values.append(user.organization_id)
    with get_db() as cur:
        cur.execute(f"UPDATE organizations SET {', '.join(fields)} WHERE id = %s", values)
    return {"ok": True}


# ── Logo upload (admin/owner only) ────────────────────────────────────────────

@router.post("/org/logo")
async def upload_org_logo(
    file: UploadFile,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Téléverse le logo dans Supabase Storage et sauvegarde l'URL publique en base."""
    import uuid as _uuid
    from supabase_client import service_client

    ALLOWED = {"image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg"}
    mime = (file.content_type or "").split(";")[0].strip()
    if mime not in ALLOWED:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez PNG, JPG ou SVG.")

    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse la limite de 2 Mo.")

    ext  = ALLOWED[mime]
    path = f"{user.organization_id}/{_uuid.uuid4()}.{ext}"

    try:
        sb = service_client()
        sb.storage.from_("org-logos").upload(path, data, {"content-type": mime, "upsert": "true"})
        public_url = sb.storage.from_("org-logos").get_public_url(path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Erreur lors du téléversement du logo.") from exc

    with get_db() as cur:
        cur.execute(
            "UPDATE organizations SET logo_url = %s WHERE id = %s",
            (public_url, user.organization_id),
        )

    return {"logo_url": public_url}


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
        raise HTTPException(status_code=500, detail="Impossible de changer le mot de passe — réessayez ou contactez le support.") from exc

    return {"ok": True}

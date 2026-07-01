import os
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, field_validator

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from rate_limiter import limiter
from supabase_client import anon_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _check_password_strength(v: str) -> str:
    errors = []
    if len(v) < 12:
        errors.append("au moins 12 caractères")
    if not re.search(r"[A-Z]", v):
        errors.append("une majuscule")
    if not re.search(r"[a-z]", v):
        errors.append("une minuscule")
    if not re.search(r"\d", v):
        errors.append("un chiffre")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", v):
        errors.append("un caractère spécial")
    if errors:
        raise ValueError(f"Mot de passe trop faible — requis : {', '.join(errors)}.")
    return v


class SignupPayload(BaseModel):
    organization_name: str = Field(default="Mon organisation", min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=12)
    phone: str = Field(min_length=7, max_length=30)
    invite_token: str | None = None
    partner_slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,80}$")
    org_type: str = Field(default="entreprise", pattern="^(entreprise|pme|entrepreneur|hopital|municipalite|universite)$")
    currency: str = Field(default="CAD", pattern="^[A-Z]{3}$")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _check_password_strength(v)


@router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, payload: SignupPayload, background: BackgroundTasks):
    """Inscription. Crée le compte Supabase ; un trigger DB crée ensuite
    automatiquement le tenant, l'utilisateur owner et l'essai de 14 jours
    (voir phase1_onboarding.sql). Les métadonnées portent le nom de l'org."""

    # partner_slug et invite_token sont mutuellement exclusifs en Phase 1
    if payload.partner_slug and payload.invite_token:
        raise HTTPException(status_code=400, detail="Impossible de combiner un lien partenaire et un jeton d'invitation.")

    # Valider le partenaire côté serveur avant d'appeler Supabase
    if payload.partner_slug:
        try:
            from db import get_db, row as _row
            with get_db() as cur:
                cur.execute(
                    "SELECT id FROM partners WHERE slug = %s AND is_active = true LIMIT 1",
                    (payload.partner_slug,),
                )
                if not _row(cur):
                    raise HTTPException(status_code=400, detail="PARTNER_INVALID")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="PARTNER_INVALID")

    # Bloquer l'inscription directe si l'email a une invitation en attente
    if not payload.invite_token:
        try:
            from db import get_db, row as _row
            with get_db() as cur:
                cur.execute(
                    "SELECT 1 FROM pending_invitations WHERE email = %s AND used_at IS NULL LIMIT 1",
                    (payload.email.lower(),),
                )
                if _row(cur):
                    raise HTTPException(
                        status_code=400,
                        detail="INVITE_PENDING",
                    )
        except HTTPException:
            raise
        except Exception:
            pass  # Ne pas bloquer si la vérification DB échoue

    try:
        sb = anon_client()
        meta: dict = {
            "org_name":  payload.organization_name,
            "full_name": payload.full_name,
            "org_type":  payload.org_type,
            "currency":  payload.currency,
        }
        meta["phone"] = payload.phone
        if payload.invite_token:
            meta["invite_token"] = payload.invite_token
        if payload.partner_slug:
            meta["partner_slug"] = payload.partner_slug

        portal_url    = os.environ.get("APP_URL", "https://myportal.nexhire.ca")
        redirect_path = f"/inscription?partenaire={payload.partner_slug}" if payload.partner_slug else "/inscription"
        email_redirect_to = f"{portal_url}{redirect_path}"

        res = sb.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": meta,
                    "email_redirect_to": email_redirect_to,
                },
            }
        )
    except Exception as exc:
        import sys
        raw = str(exc).lower()
        print(f"[auth] signup error ({type(exc).__name__}): {exc}", file=sys.stderr)
        if "already registered" in raw or "already exists" in raw or "user_already_exists" in raw:
            raise HTTPException(status_code=400, detail="Un compte existe déjà avec cette adresse courriel. Utilisez la connexion ou réinitialisez votre mot de passe.")
        if "password" in raw and ("weak" in raw or "short" in raw or "characters" in raw):
            raise HTTPException(status_code=400, detail="Le mot de passe ne respecte pas les exigences de sécurité Supabase.")
        if "rate" in raw or "too many" in raw:
            raise HTTPException(status_code=429, detail="Trop de tentatives — réessayez dans quelques minutes.")
        if "invalid" in raw and "email" in raw:
            raise HTTPException(status_code=400, detail="Adresse courriel invalide.")
        raise HTTPException(status_code=400, detail=f"Inscription échouée : {exc}") from exc

    if payload.invite_token:
        background.add_task(_notify_member_join, payload.invite_token, payload.email)
    else:
        background.add_task(_send_welcome, payload.email, payload.full_name, payload.organization_name, payload.partner_slug)

    # Si Supabase a retourné une session, la confirmation email est désactivée
    # → on peut connecter l'utilisateur immédiatement sans vérification.
    # Si session est None → confirmation requise, le compte est en attente.
    session = res.session
    access_token  = getattr(session, "access_token",  None) if session else None
    refresh_token = getattr(session, "refresh_token", None) if session else None

    return {
        "status":                "ok",
        "user_id":               getattr(res.user, "id", None),
        "confirmation_required": access_token is None,
        "access_token":          access_token,
        "refresh_token":         refresh_token,
    }


def _send_welcome(email: str, full_name: str, org_name: str, partner_slug: str | None = None) -> None:
    try:
        from email_service import send_welcome_email
        send_welcome_email(to_email=email, full_name=full_name, org_name=org_name, partner_slug=partner_slug)
    except Exception:
        pass


def _notify_member_join(invite_token: str, email: str) -> None:
    try:
        from db import get_db, row
        from routes_webhooks import send_webhook_notification
        with get_db() as cur:
            cur.execute(
                "SELECT org_id FROM pending_invitations WHERE token = %s LIMIT 1",
                (invite_token,),
            )
            inv = row(cur)
        if inv and inv.get("org_id"):
            send_webhook_notification(inv["org_id"], "member_join", {"email": email})
    except Exception:
        pass


class ForgotPasswordPayload(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordPayload):
    """Déclenche l'email de réinitialisation Supabase. Réponse identique quelle que soit l'adresse."""
    try:
        app_url = os.environ.get("APP_URL", "https://myportal.nexhire.ca")
        anon_client().auth.reset_password_for_email(payload.email, {"redirect_to": f"{app_url}/inscription"})
    except Exception:
        pass
    return {"status": "ok", "message": "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé."}


class UpdatePasswordPayload(BaseModel):
    access_token: str
    new_password: str = Field(min_length=12)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _check_password_strength(v)


class ExchangeCodePayload(BaseModel):
    code: str


@router.post("/exchange-recovery-code")
@limiter.limit("5/minute")
def exchange_recovery_code(request: Request, payload: ExchangeCodePayload):
    """Échange un code PKCE Supabase contre un access_token (flow PKCE recovery)."""
    try:
        resp = anon_client().auth.exchange_code_for_session({"auth_code": payload.code})
        if not resp or not resp.session:
            raise ValueError("session nulle")
        return {"access_token": resp.session.access_token}
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Code de récupération invalide ou expiré.") from exc


@router.post("/update-password")
@limiter.limit("5/minute")
def update_password(request: Request, payload: UpdatePasswordPayload):
    """Applique le nouveau mot de passe avec le token de récupération Supabase."""
    try:
        sb = anon_client()
        user_resp = sb.auth.get_user(payload.access_token)
        if not user_resp or not user_resp.user:
            raise ValueError("token invalide")
        from supabase_client import service_client
        service_client().auth.admin.update_user_by_id(
            str(user_resp.user.id),
            {"password": payload.new_password},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré.") from exc
    return {"status": "ok"}


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginPayload, background: BackgroundTasks):
    """Connexion. Retourne le JWT Supabase à passer en Authorization: Bearer."""
    ip = client_ip(request)
    try:
        sb = anon_client()
        res = sb.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
    except Exception as exc:
        background.add_task(log_audit, AuditEvent(
            action="auth_login",
            query=payload.email,
            success=False,
            ip_address=ip,
            http_status=401,
            error_detail=str(exc),
        ))
        raise HTTPException(status_code=401, detail="Identifiants invalides.") from exc

    if not res.session:
        background.add_task(log_audit, AuditEvent(
            action="auth_login",
            query=payload.email,
            success=False,
            ip_address=ip,
            http_status=401,
            error_detail="session nulle",
        ))
        raise HTTPException(status_code=401, detail="Authentification échouée.")

    uid = str(res.user.id)
    background.add_task(log_audit, AuditEvent(
        action="auth_login",
        query=payload.email,
        user_id=uid,
        success=True,
        ip_address=ip,
        http_status=200,
    ))

    # Détection impossible travel en arrière-plan
    try:
        org_id = str(res.user.user_metadata.get("organization_id") or "")
        if ip and org_id:
            background.add_task(
                _run_travel_check, uid, ip, org_id,
            )
    except Exception:
        pass

    return {
        "access_token":  res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "token_type":    "bearer",
        "user_id":       uid,
        "expires_in":    res.session.expires_in,
    }


def _run_travel_check(user_id: str, ip: str, org_id: str) -> None:
    try:
        from anomaly_detection import check_impossible_travel
        check_impossible_travel(user_id, ip, org_id)
    except Exception:
        pass


class RefreshPayload(BaseModel):
    refresh_token: str

@router.post("/refresh")
def refresh_token(payload: RefreshPayload):
    """Renouvelle l'access_token via le refresh_token Supabase."""
    try:
        sb = anon_client()
        res = sb.auth.refresh_session(payload.refresh_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Session expirée — reconnectez-vous.") from exc
    if not res.session:
        raise HTTPException(status_code=401, detail="Session expirée — reconnectez-vous.")
    return {
        "access_token":  res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "expires_in":    res.session.expires_in,
    }


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    import logging as _logging
    _log = _logging.getLogger(__name__)
    superadmin_emails = {e.strip().lower() for e in os.environ.get("SUPERADMIN_EMAILS", "").split(",") if e.strip()}
    if not superadmin_emails:
        _log.warning("SUPERADMIN_EMAILS non configuré — aucun super-administrateur actif.")

    dept_types:   list[str] = []
    logo_url:     str | None = None
    brand_color:  str | None = None
    org_name:     str | None = None
    partner_slug: str | None = None

    # Résoudre le slug du partenaire si l'utilisateur en est membre
    if user.partner_id:
        try:
            from db import get_db, row as _row
            with get_db() as cur:
                cur.execute(
                    "SELECT slug FROM partners WHERE id = %s LIMIT 1",
                    (user.partner_id,),
                )
                p = _row(cur)
                partner_slug = p["slug"] if p else None
        except Exception:
            pass

    if user.organization_id:
        try:
            from db import get_db, row as _row, rows
            with get_db() as cur:
                cur.execute(
                    """SELECT DISTINCT d.dept_type
                       FROM department_members dm
                       JOIN departments d ON d.id = dm.department_id
                       WHERE dm.user_id = %s AND d.dept_type IS NOT NULL""",
                    (user.id,),
                )
                dept_types = [r["dept_type"] for r in rows(cur)]
            with get_db() as cur:
                cur.execute(
                    "SELECT name, logo_url, brand_color FROM organizations WHERE id = %s LIMIT 1",
                    (user.organization_id,),
                )
                org = _row(cur) or {}
            org_name    = org.get("name")       or None
            logo_url    = org.get("logo_url")   or None
            brand_color = org.get("brand_color") or None
        except Exception:
            pass

    return {
        "id": user.id,
        "email": user.email,
        "organization_id":   user.organization_id,
        "organization_name": org_name,
        "role": user.role,
        "subscription_status": user.subscription_status,
        "subscription_plan":   user.subscription_plan,
        "is_superadmin": bool(user.email and user.email.lower() in superadmin_emails),
        "dept_types":  dept_types,
        "currency":    user.currency,
        "logo_url":    logo_url,
        "brand_color": brand_color,
        "partner_id":   user.partner_id,
        "partner_slug": partner_slug,
    }

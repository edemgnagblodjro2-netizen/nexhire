from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from supabase_client import anon_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupPayload(BaseModel):
    organization_name: str = Field(default="Mon organisation", min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    invite_token: str | None = None


@router.post("/signup")
def signup(payload: SignupPayload):
    """Inscription. Crée le compte Supabase ; un trigger DB crée ensuite
    automatiquement le tenant, l'utilisateur owner et l'essai de 14 jours
    (voir phase1_onboarding.sql). Les métadonnées portent le nom de l'org."""
    try:
        sb = anon_client()
        meta: dict = {
            "org_name":  payload.organization_name,
            "full_name": payload.full_name,
        }
        if payload.invite_token:
            meta["invite_token"] = payload.invite_token

        res = sb.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {"data": meta},
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"status": "ok", "user_id": getattr(res.user, "id", None)}


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


@router.post("/login")
def login(payload: LoginPayload, request: Request, background: BackgroundTasks):
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
        raise HTTPException(status_code=401, detail=str(exc)) from exc

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

    background.add_task(log_audit, AuditEvent(
        action="auth_login",
        query=payload.email,
        user_id=res.user.id,
        success=True,
        ip_address=ip,
        http_status=200,
    ))
    return {
        "access_token": res.session.access_token,
        "token_type": "bearer",
        "user_id": res.user.id,
        "expires_in": res.session.expires_in,
    }


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "organization_id": user.organization_id,
        "role": user.role,
        "subscription_status": user.subscription_status,
    }

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser, get_current_user
from supabase_client import anon_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupPayload(BaseModel):
    organization_name: str = Field(min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)


@router.post("/signup")
def signup(payload: SignupPayload):
    """Inscription. Crée le compte Supabase ; un trigger DB crée ensuite
    automatiquement le tenant, l'utilisateur owner et l'essai de 14 jours
    (voir phase1_onboarding.sql). Les métadonnées portent le nom de l'org."""
    try:
        sb = anon_client()
        res = sb.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "org_name": payload.organization_name,
                        "full_name": payload.full_name,
                    }
                },
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"status": "ok", "user_id": getattr(res.user, "id", None)}


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


@router.post("/login")
def login(payload: LoginPayload):
    """Connexion. Retourne le JWT Supabase à passer en Authorization: Bearer."""
    try:
        sb = anon_client()
        res = sb.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    if not res.session:
        raise HTTPException(status_code=401, detail="Authentification échouée.")

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

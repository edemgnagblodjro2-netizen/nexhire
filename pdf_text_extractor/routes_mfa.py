"""MFA TOTP — Microsoft Authenticator, Google Authenticator, Authy.

Niveau 1 — Authentification forte.

Flow activation :
  1. POST /api/mfa/enroll        → secret chiffré + otpauth:// URI (frontend génère QR)
  2. POST /api/mfa/verify-enroll → valider 1er code TOTP → factor marqué is_verified=True
  3. POST /api/mfa/challenge     → vérifier code TOTP lors de chaque login

Administration :
  GET  /api/mfa/status          → MFA activé ou non pour l'utilisateur courant
  DELETE /api/mfa/unenroll      → désactiver MFA (admin peut forcer pour un user)
  POST /api/mfa/require-org     → exiger MFA pour toute l'organisation (owner)
"""
from __future__ import annotations

import pyotp

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from crypto import decrypt, encrypt
from db import get_db, row
from rate_limiter import limiter
from rbac import require_min_role

router = APIRouter(prefix="/api/mfa", tags=["mfa"])


# ── Payloads ──────────────────────────────────────────────────────────────────

class VerifyPayload(BaseModel):
    code: str = Field(min_length=6, max_length=8, pattern=r"^\d{6,8}$")

class ChallengePayload(BaseModel):
    user_id: str
    code:    str = Field(min_length=6, max_length=8, pattern=r"^\d{6,8}$")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_factor(user_id: str) -> dict | None:
    with get_db() as cur:
        cur.execute(
            "SELECT * FROM mfa_factors WHERE user_id = %s AND factor_type = 'totp' LIMIT 1",
            (user_id,),
        )
        return row(cur)


def _verify_totp(encrypted_secret: str, code: str) -> bool:
    secret = decrypt(encrypted_secret)
    totp   = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def mfa_status(user: CurrentUser = Depends(get_current_user)):
    """Vérifie si le MFA est activé pour l'utilisateur courant."""
    factor = _get_factor(str(user.id))
    return {
        "mfa_enabled":  bool(factor and factor.get("is_verified")),
        "factor_type":  factor.get("factor_type") if factor else None,
        "enrolled_at":  str(factor.get("created_at")) if factor else None,
        "last_used_at": str(factor.get("last_used_at")) if factor else None,
    }


@router.post("/enroll")
def enroll_mfa(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """Démarre l'enrôlement TOTP. Retourne un URI otpauth:// à scanner."""
    existing = _get_factor(str(user.id))
    if existing and existing.get("is_verified"):
        raise HTTPException(status_code=409, detail="MFA déjà activé — désactivez d'abord.")

    secret  = pyotp.random_base32()
    totp    = pyotp.TOTP(secret)
    org_name = "NexHire"
    try:
        with get_db() as cur:
            cur.execute("SELECT name FROM organizations WHERE id = %s LIMIT 1",
                        (str(user.organization_id),))
            org_row = row(cur)
        if org_row:
            org_name = org_row["name"]
    except Exception:
        pass

    uri = totp.provisioning_uri(
        name=str(user.email),
        issuer_name=f"NexHire — {org_name}",
    )
    enc_secret = encrypt(secret)

    if existing:
        with get_db() as cur:
            cur.execute(
                "UPDATE mfa_factors SET encrypted_secret = %s, is_verified = FALSE, "
                "created_at = NOW() WHERE user_id = %s",
                (enc_secret, str(user.id)),
            )
    else:
        with get_db() as cur:
            cur.execute(
                "INSERT INTO mfa_factors (user_id, organization_id, encrypted_secret) "
                "VALUES (%s, %s, %s)",
                (str(user.id), str(user.organization_id), enc_secret),
            )

    return {
        "otpauth_uri": uri,
        "secret":      secret,
        "instructions": "Scannez l'URI avec Microsoft Authenticator, Google Authenticator ou Authy.",
    }


@router.post("/verify-enroll")
def verify_enroll(
    request: Request,
    payload: VerifyPayload,
    user: CurrentUser = Depends(get_current_user),
):
    """Valide le premier code TOTP pour confirmer l'enrôlement."""
    factor = _get_factor(str(user.id))
    if not factor:
        raise HTTPException(status_code=404, detail="Aucun enrôlement en cours — appelez /enroll d'abord.")
    if factor.get("is_verified"):
        raise HTTPException(status_code=409, detail="MFA déjà vérifié.")

    if not _verify_totp(factor["encrypted_secret"], payload.code):
        log_audit(AuditEvent(
            action="mfa_enroll_failed",
            user_id=str(user.id),
            organization_id=str(user.organization_id),
            ip_address=client_ip(request),
            success=False,
            http_status=401,
            error_detail="Code TOTP invalide lors de l'enrôlement",
        ))
        raise HTTPException(status_code=401, detail="Code invalide — vérifiez l'heure de votre appareil.")

    with get_db() as cur:
        cur.execute(
            "UPDATE mfa_factors SET is_verified = TRUE, last_used_at = NOW() WHERE user_id = %s",
            (str(user.id),),
        )

    log_audit(AuditEvent(
        action="mfa_enrolled",
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        ip_address=client_ip(request),
        success=True,
        http_status=200,
    ))
    return {"ok": True, "message": "MFA activé avec succès."}


@router.post("/challenge")
def mfa_challenge(
    request: Request,
    payload: ChallengePayload,
):
    """Vérifie le code TOTP lors du login (après mot de passe correct).

    Appelé par le frontend après authentification email/password réussie.
    Retourne 200 si le code est valide, 401 sinon.
    """
    factor = _get_factor(payload.user_id)
    if not factor or not factor.get("is_verified"):
        raise HTTPException(status_code=404, detail="MFA non activé pour cet utilisateur.")

    if not _verify_totp(factor["encrypted_secret"], payload.code):
        log_audit(AuditEvent(
            action="mfa_challenge_failed",
            user_id=payload.user_id,
            ip_address=client_ip(request),
            success=False,
            http_status=401,
            error_detail="Code TOTP invalide lors du challenge login",
        ))
        raise HTTPException(status_code=401, detail="Code MFA invalide.")

    with get_db() as cur:
        cur.execute(
            "UPDATE mfa_factors SET last_used_at = NOW() WHERE user_id = %s",
            (payload.user_id,),
        )

    log_audit(AuditEvent(
        action="mfa_challenge_success",
        user_id=payload.user_id,
        ip_address=client_ip(request),
        success=True,
        http_status=200,
    ))
    return {"ok": True, "mfa_verified": True}


@router.delete("/unenroll")
def unenroll_mfa(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """Désactive le MFA pour l'utilisateur courant."""
    with get_db() as cur:
        cur.execute(
            "DELETE FROM mfa_factors WHERE user_id = %s RETURNING id",
            (str(user.id),),
        )
        deleted = row(cur)

    if not deleted:
        raise HTTPException(status_code=404, detail="Aucun facteur MFA à supprimer.")

    log_audit(AuditEvent(
        action="mfa_unenrolled",
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        ip_address=client_ip(request),
        success=True,
        http_status=200,
    ))
    return {"ok": True, "message": "MFA désactivé."}


@router.post("/require-org")
def require_mfa_for_org(
    request: Request,
    enable: bool = True,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    """Active l'obligation de MFA pour toute l'organisation (owner uniquement)."""
    with get_db() as cur:
        cur.execute(
            "UPDATE organizations SET require_mfa = %s WHERE id = %s",
            (enable, str(user.organization_id)),
        )

    log_audit(AuditEvent(
        action="mfa_org_policy_changed",
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        ip_address=client_ip(request),
        success=True,
        http_status=200,
        metadata={"require_mfa": enable},
    ))
    return {"ok": True, "require_mfa": enable}

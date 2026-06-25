from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

import logging

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, status

from db import get_db, row as db_row, rows as db_rows

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_AUDIENCE = "authenticated"


def _hs256_fallback_allowed() -> bool:
    """HS256 uniquement autorisé en développement local (ALLOW_HS256_FALLBACK=true).
    En production ce flag n'est pas défini → fallback désactivé.
    """
    return os.getenv("ALLOW_HS256_FALLBACK", "false").lower() == "true"


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    """Client JWKS mis en cache — récupère les clés publiques Supabase (ES256)."""
    return PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True)


@dataclass
class CurrentUser:
    id: str
    email: str | None
    organization_id: str | None
    role: str
    subscription_status: str | None
    subscription_plan: str | None = None
    is_service_account: bool = False
    currency: str = "CAD"


# ── Vérification du jeton ──────────────────────────────────────────────────
# Supabase émet des tokens ES256 (ECDSA P-256) vérifiables via JWKS.
# Fallback HS256 désactivé en production — uniquement en dev local via
# ALLOW_HS256_FALLBACK=true et seulement si le JWKS est injoignable (réseau).
# Extension SSO (Entra ID, Okta…) : même mécanique — ajouter le JWKS de
# l'IdP et router selon le claim `iss`. Tout l'aval (get_current_user, RBAC)
# ne dépend que des claims normalisés {sub, email}.
def _verify_token(token: str) -> dict:
    # Tentative ES256/RS256 via JWKS (chemin principal Supabase).
    _network_error = None
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=JWT_AUDIENCE,
        )
    except jwt.exceptions.PyJWKClientConnectionError as exc:
        # Panne réseau uniquement → tentative HS256 en dev
        logger.warning("JWKS inaccessible (%s) — tentative fallback HS256", exc)
        _network_error = exc
    except jwt.exceptions.PyJWKClientError as exc:
        # Kid inconnu, JWKS corrompu, etc. → toujours 401, jamais HS256
        logger.warning("JWKS erreur clé : %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expiré.",
        )
    except jwt.PyJWTError as exc:
        logger.debug("JWT invalide : %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expiré.",
        ) from exc

    # Fallback HS256 — développement local uniquement (ALLOW_HS256_FALLBACK=true)
    if not _hs256_fallback_allowed():
        logger.error("JWKS inaccessible en production et ALLOW_HS256_FALLBACK désactivé.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service d'authentification temporairement indisponible.",
        )
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET non configuré.")
    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expiré.",
        ) from exc


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton d'authentification manquant.",
        )
    return authorization[len("Bearer ") :]


def _resolve_service_account(token: str) -> CurrentUser:
    import hashlib
    from datetime import datetime, timezone

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with get_db() as cur:
        cur.execute(
            "SELECT id, organization_id, role, is_active FROM service_accounts WHERE token_hash = %s LIMIT 1",
            (token_hash,),
        )
        sa = db_row(cur)
    if not sa or not sa.get("is_active"):
        raise HTTPException(status_code=401, detail="Service account invalide ou révoqué.")
    try:
        with get_db() as cur:
            cur.execute(
                "UPDATE service_accounts SET last_used_at = %s WHERE id = %s",
                (datetime.now(timezone.utc), sa["id"]),
            )
    except Exception:
        pass
    return CurrentUser(
        id=sa["id"],
        email=None,
        organization_id=sa["organization_id"],
        role=sa["role"],
        subscription_status="active",
        is_service_account=True,
    )


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    raw = _extract_bearer(authorization)
    if raw.startswith("svc_"):
        return _resolve_service_account(raw)
    claims = _verify_token(raw)
    sub = claims.get("sub")
    email = claims.get("email")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton incomplet.")

    with get_db() as cur:
        cur.execute("SELECT * FROM get_user_profile_by_id(%s)", (sub,))
        profile_rows = db_rows(cur)
    if not profile_rows:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil utilisateur introuvable.")
    profile = profile_rows[0]

    if profile.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez votre administrateur.",
        )

    org_status   = None
    org_currency = "CAD"
    if profile.get("organization_id"):
        try:
            with get_db() as cur:
                cur.execute("SELECT get_org_status(%s) AS status", (profile["organization_id"],))
                r = db_row(cur)
                org_status = r["status"] if r else None
        except Exception:
            pass
        org_plan = None
        try:
            with get_db() as cur:
                cur.execute(
                    "SELECT currency, subscription_plan FROM organizations WHERE id = %s LIMIT 1",
                    (profile["organization_id"],),
                )
                cur_row = db_row(cur)
                org_currency = (cur_row or {}).get("currency") or "CAD"
                org_plan     = (cur_row or {}).get("subscription_plan")
        except Exception:
            pass

    return CurrentUser(
        id=profile["id"],
        email=profile.get("email") or email,
        organization_id=profile.get("organization_id"),
        role=profile.get("role") or "user",
        subscription_status=org_status,
        subscription_plan=org_plan,
        currency=org_currency,
    )

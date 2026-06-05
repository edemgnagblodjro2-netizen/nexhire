from __future__ import annotations

import os
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, status

from supabase_client import service_client

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_AUDIENCE = "authenticated"


@dataclass
class CurrentUser:
    id: str
    email: str | None
    organization_id: str | None
    role: str
    subscription_status: str | None


# ── Vérification du jeton ──────────────────────────────────────────────────
# AUJOURD'HUI : Supabase Auth (HS256, secret du projet).
#
# EXTENSION SSO / V2 (Microsoft Entra ID) ou clés asymétriques Supabase :
# il suffira d'ajouter ici un vérificateur RS256 via JWKS et de choisir le
# vérificateur selon l'émetteur (claim `iss`). Tout l'aval (get_current_user,
# RBAC) ne dépend QUE des claims normalisés {sub, email} et reste inchangé.
def _verify_token(token: str) -> dict:
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


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """Dépendance FastAPI : identité vérifiée + profil applicatif (rôle, org)."""
    claims = _verify_token(_extract_bearer(authorization))
    sub = claims.get("sub")
    email = claims.get("email")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton incomplet.")

    sb = service_client()
    res = (
        sb.table("users")
        .select("id, email, organization_id, role")
        .eq("id", sub)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        # Future SSO : provisioning à la volée par email possible ici.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil utilisateur introuvable.")
    row = rows[0]

    org_status = None
    if row.get("organization_id"):
        org = (
            sb.table("organizations")
            .select("subscription_status")
            .eq("id", row["organization_id"])
            .limit(1)
            .execute()
        )
        if org.data:
            org_status = org.data[0].get("subscription_status")

    return CurrentUser(
        id=row["id"],
        email=row.get("email") or email,
        organization_id=row.get("organization_id"),
        role=row.get("role") or "user",
        subscription_status=org_status,
    )

"""Gestion des membres d'une organisation — invitations, rôles, activation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/members", tags=["members"])

ROLE_LABELS = {"user": "Utilisateur", "manager": "Manager", "admin": "Admin", "owner": "Owner"}


# ── Models ─────────────────────────────────────────────────────────────────

class InvitePayload(BaseModel):
    email:    EmailStr
    role:     str = Field("user", pattern="^(user|manager|admin)$")

class RoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(user|manager|admin)$")


# ── Helpers ────────────────────────────────────────────────────────────────

def _require_admin(user: CurrentUser):
    if user.role not in ("admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Action réservée aux administrateurs.")

def _same_org(user: CurrentUser, target_id: str) -> dict:
    """Retourne le target_user ou lève 404 s'il n'appartient pas à la même org."""
    sb = service_client()
    res = sb.table("users").select("*").eq("id", target_id).eq("organization_id", user.organization_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Membre introuvable.")
    return res.data


# ── List members ───────────────────────────────────────────────────────────

@router.get("")
def list_members(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne tous les membres de l'organisation (actifs et inactifs)."""
    sb = service_client()
    res = sb.table("users") \
        .select("id, email, full_name, role, is_active, created_at") \
        .eq("organization_id", user.organization_id) \
        .order("created_at") \
        .execute()
    members = res.data or []
    # Compter les requêtes du mois par user via audit_logs
    return {"members": members, "total": len(members)}


# ── Pending invitations ────────────────────────────────────────────────────

@router.get("/invitations")
def list_invitations(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne les invitations en attente pour l'organisation."""
    _require_admin(user)
    sb = service_client()
    from datetime import datetime, timezone
    try:
        res = sb.table("pending_invitations") \
            .select("id, email, role, expires_at, used_at, created_at") \
            .eq("org_id", user.organization_id) \
            .is_("used_at", "null") \
            .gte("expires_at", datetime.now(timezone.utc).isoformat()) \
            .order("created_at", desc=True) \
            .execute()
        return {"invitations": res.data or []}
    except Exception:
        return {"invitations": []}


# ── Invite ─────────────────────────────────────────────────────────────────

@router.post("/invite")
def invite_member(
    payload: InvitePayload,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Génère un token d'invitation et retourne l'URL à partager."""
    _require_admin(user)
    sb = service_client()

    # Vérifier que l'email n'est pas déjà membre actif
    existing = sb.table("users") \
        .select("id") \
        .eq("organization_id", user.organization_id) \
        .eq("email", str(payload.email)) \
        .execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Cet email est déjà membre de l'organisation.")

    # Annule toute invitation existante pour cet email dans cette org
    sb.table("pending_invitations") \
        .delete() \
        .eq("org_id", user.organization_id) \
        .eq("email", str(payload.email)) \
        .execute()

    # Crée la nouvelle invitation (token généré par la BD)
    res = sb.table("pending_invitations").insert({
        "org_id":     user.organization_id,
        "invited_by": user.id,
        "email":      str(payload.email),
        "role":       payload.role,
    }).execute()

    inv = res.data[0] if res.data else {}
    token = inv.get("token", "")

    return {
        "ok":         True,
        "token":      token,
        "email":      str(payload.email),
        "role":       payload.role,
        "expires_at": inv.get("expires_at"),
        "invite_url": f"?invite={token}",  # relatif — le frontend ajoute l'origine
    }


# ── Change role ────────────────────────────────────────────────────────────

@router.patch("/{member_id}/role")
def change_role(
    member_id: str,
    payload: RoleUpdate,
    user: CurrentUser = Depends(require_min_role("user")),
):
    _require_admin(user)
    target = _same_org(user, member_id)
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Impossible de modifier le rôle du owner.")
    sb = service_client()
    sb.table("users").update({"role": payload.role}).eq("id", member_id).execute()
    return {"ok": True, "role": payload.role}


# ── Toggle active ──────────────────────────────────────────────────────────

@router.patch("/{member_id}/active")
def toggle_active(
    member_id: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Active ou désactive un membre (bascule)."""
    _require_admin(user)
    target = _same_org(user, member_id)
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Impossible de désactiver le owner.")
    if member_id == user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous désactiver vous-même.")
    new_state = not target.get("is_active", True)
    sb = service_client()
    sb.table("users").update({"is_active": new_state}).eq("id", member_id).execute()
    return {"ok": True, "is_active": new_state}


# ── Remove member ──────────────────────────────────────────────────────────

@router.delete("/{member_id}")
def remove_member(
    member_id: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Retire un membre de l'organisation (ne supprime pas le compte auth)."""
    _require_admin(user)
    target = _same_org(user, member_id)
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Impossible de retirer le owner.")
    if member_id == user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous-même.")
    sb = service_client()
    # Dissocie l'user de l'org sans supprimer le compte auth
    sb.table("users").update({"organization_id": None, "role": "user", "is_active": False}).eq("id", member_id).execute()
    return {"ok": True}


# ── Validate invite token (public) ────────────────────────────────────────

@router.get("/invite/validate")
def validate_invite(token: str):
    """Vérifie qu'un token d'invitation est valide et retourne email + org."""
    from datetime import datetime, timezone
    sb = service_client()
    res = sb.table("pending_invitations") \
        .select("email, role, org_id, expires_at") \
        .eq("token", token) \
        .is_("used_at", "null") \
        .gte("expires_at", datetime.now(timezone.utc).isoformat()) \
        .single() \
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide ou expiré.")
    inv = res.data
    # Récupère le nom de l'org
    org = sb.table("organizations").select("name").eq("id", inv["org_id"]).single().execute()
    return {
        "email":  inv["email"],
        "role":   inv["role"],
        "org_id": inv["org_id"],
        "org_name": (org.data or {}).get("name", ""),
    }

"""Gestion des membres d'une organisation — invitations, rôles, activation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser
from rbac import require_min_role
from db import get_db, rows, row

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
    with get_db() as cur:
        cur.execute(
            "SELECT * FROM users WHERE id = %s AND organization_id = %s LIMIT 1",
            (target_id, user.organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Membre introuvable.")
    return result


# ── List members ───────────────────────────────────────────────────────────

@router.get("")
def list_members(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne tous les membres de l'organisation (actifs et inactifs)."""
    with get_db() as cur:
        cur.execute(
            """SELECT id, email, full_name, role, is_active, created_at
               FROM users
               WHERE organization_id = %s
               ORDER BY created_at""",
            (user.organization_id,),
        )
        members = rows(cur)
    # Compter les requêtes du mois par user via audit_logs
    return {"members": members, "total": len(members)}


# ── Pending invitations ────────────────────────────────────────────────────

@router.get("/invitations")
def list_invitations(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne les invitations en attente pour l'organisation."""
    _require_admin(user)
    from datetime import datetime, timezone
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as cur:
            cur.execute(
                """SELECT id, email, role, expires_at, used_at, created_at
                   FROM pending_invitations
                   WHERE org_id = %s
                     AND used_at IS NULL
                     AND expires_at >= %s
                   ORDER BY created_at DESC""",
                (user.organization_id, now_iso),
            )
            return {"invitations": rows(cur)}
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

    # Vérifier que l'email n'est pas déjà membre actif
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM users WHERE organization_id = %s AND email = %s LIMIT 1",
            (user.organization_id, str(payload.email)),
        )
        existing = rows(cur)
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà membre de l'organisation.")

    # Annule toute invitation existante pour cet email dans cette org
    with get_db() as cur:
        cur.execute(
            "DELETE FROM pending_invitations WHERE org_id = %s AND email = %s",
            (user.organization_id, str(payload.email)),
        )

    # Crée la nouvelle invitation (token généré par la BD)
    with get_db() as cur:
        cur.execute(
            """INSERT INTO pending_invitations (org_id, invited_by, email, role)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (user.organization_id, user.id, str(payload.email), payload.role),
        )
        inv = row(cur) or {}

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
    with get_db() as cur:
        cur.execute(
            "UPDATE users SET role = %s WHERE id = %s",
            (payload.role, member_id),
        )
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
    with get_db() as cur:
        cur.execute(
            "UPDATE users SET is_active = %s WHERE id = %s",
            (new_state, member_id),
        )
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
    # Dissocie l'user de l'org sans supprimer le compte auth
    with get_db() as cur:
        cur.execute(
            "UPDATE users SET organization_id = NULL, role = 'user', is_active = FALSE WHERE id = %s",
            (member_id,),
        )
    return {"ok": True}


# ── Validate invite token (public) ────────────────────────────────────────

@router.get("/invite/validate")
def validate_invite(token: str):
    """Vérifie qu'un token d'invitation est valide et retourne email + org."""
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as cur:
        cur.execute(
            """SELECT email, role, org_id, expires_at
               FROM pending_invitations
               WHERE token = %s
                 AND used_at IS NULL
                 AND expires_at >= %s
               LIMIT 1""",
            (token, now_iso),
        )
        inv = row(cur)
    if not inv:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide ou expiré.")
    # Récupère le nom de l'org
    with get_db() as cur:
        cur.execute(
            "SELECT name FROM organizations WHERE id = %s LIMIT 1",
            (inv["org_id"],),
        )
        org = row(cur) or {}
    return {
        "email":  inv["email"],
        "role":   inv["role"],
        "org_id": inv["org_id"],
        "org_name": org.get("name", ""),
    }

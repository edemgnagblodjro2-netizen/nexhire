"""Gestion des membres d'une organisation — invitations, rôles, activation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser
from rbac import require_min_role
from db import get_db, rows, row

router = APIRouter(prefix="/api/members", tags=["members"])

ROLE_LABELS = {"user": "Utilisateur", "manager": "Manager", "admin": "Admin", "owner": "Owner"}

HIERARCHY_TITLES = [
    "Direction Générale",
    "Vice-président / Directeur Exécutif",
    "Directeur de Département",
    "Gestionnaire / Chef d'équipe",
    "Superviseur",
    "Employé",
]


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


# ── Organigramme ───────────────────────────────────────────────────────────

@router.get("/orgchart")
def org_chart(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne la structure hiérarchique de l'organisation par département."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT d.id AS dept_id, d.name AS dept_name, d.dept_type,
                   dm.user_id, dm.title, dm.hierarchy_level,
                   u.full_name, u.email, u.role AS org_role, u.is_active
            FROM departments d
            LEFT JOIN department_members dm ON dm.department_id = d.id
            LEFT JOIN users u ON u.id = dm.user_id
            WHERE d.organization_id = %s
            ORDER BY d.name, COALESCE(dm.hierarchy_level, 6), u.full_name
            """,
            (user.organization_id,),
        )
        raw = rows(cur)

    depts: dict[str, dict] = {}
    for r in raw:
        did = r["dept_id"]
        if did not in depts:
            depts[did] = {"id": did, "name": r["dept_name"],
                          "dept_type": r["dept_type"], "members": []}
        if r["user_id"]:
            depts[did]["members"].append({
                "id":              r["user_id"],
                "full_name":       r["full_name"],
                "email":           r["email"],
                "title":           r["title"] or HIERARCHY_TITLES[5],
                "hierarchy_level": r["hierarchy_level"] or 6,
                "org_role":        r["org_role"],
                "is_active":       r["is_active"],
            })
    return list(depts.values())


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

    # Envoie l'email d'invitation (non-bloquant)
    try:
        from email_service import send_invite_email
        with get_db() as cur:
            cur.execute(
                "SELECT o.name AS org_name, u.full_name FROM organizations o, users u "
                "WHERE o.id = %s AND u.id = %s LIMIT 1",
                (user.organization_id, user.id),
            )
            meta = row(cur) or {}
        send_invite_email(
            to_email=str(payload.email),
            org_name=meta.get("org_name", "votre organisation"),
            role=payload.role,
            invite_token=token,
            invited_by_name=meta.get("full_name") or user.email or "Un administrateur",
        )
    except Exception:
        pass  # email non-bloquant

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
    if target["role"] == "owner" and user.role != "owner":
        raise HTTPException(status_code=403, detail="Seul un owner peut retirer un autre owner.")
    if member_id == user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous-même.")
    # Dissocie l'user de l'org sans supprimer le compte auth
    with get_db() as cur:
        cur.execute(
            "UPDATE users SET organization_id = NULL, role = 'user', is_active = FALSE WHERE id = %s",
            (member_id,),
        )
    return {"ok": True}


# ── Apply invite — appelé après le premier login d'un utilisateur invité ──

class ApplyInvitePayload(BaseModel):
    token: str

@router.post("/apply-invite")
def apply_invite(
    payload: ApplyInvitePayload,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Applique l'invitation : met à jour org_id + rôle de l'utilisateur connecté."""
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
            (payload.token, now_iso),
        )
        inv = row(cur)

    if not inv:
        raise HTTPException(status_code=404, detail="Invitation invalide ou expirée.")

    # Vérifie que l'email de l'invitation correspond à l'utilisateur connecté
    if inv["email"].lower() != (user.email or "").lower():
        raise HTTPException(status_code=403, detail="Cette invitation ne vous est pas destinée.")

    target_role = inv["role"] if inv["role"] in ("user", "manager", "admin") else "user"

    with get_db() as cur:
        # Met à jour l'utilisateur : org + rôle
        cur.execute(
            """UPDATE users
               SET organization_id = %s,
                   role = %s,
                   is_active = TRUE
               WHERE id = %s""",
            (inv["org_id"], target_role, user.id),
        )
        # Marque l'invitation comme utilisée
        cur.execute(
            "UPDATE pending_invitations SET used_at = NOW() WHERE token = %s",
            (payload.token,),
        )

    return {"ok": True, "role": target_role, "org_id": str(inv["org_id"])}


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

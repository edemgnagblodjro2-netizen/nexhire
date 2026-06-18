"""
Collecteur Entra ID (Azure Active Directory) — Sécurité des identités.

Peuple :
  security_postures  → MFA réel par utilisateur (per-user v1.0, pas le rapport beta)
                       + rôles admin → privileged_access
  identities         → principals de service (comptes de service / apps)
  identity_accounts  → source_connector = 'entra_id'

Permissions Graph requises (déjà dans le connecteur M365) :
  User.Read.All
  UserAuthenticationMethod.Read.All   — méthodes MFA par utilisateur
  RoleManagement.Read.Directory        — rôles d'admin + membres
  Application.Read.All                 — principals de service
  Directory.Read.All                   — groupes de sécurité
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime

import httpx

from db import get_db
from m365_collector import GRAPH, GRAPH_B, _auth_headers

log = logging.getLogger(__name__)

# Types MFA reconnus par Graph (tout sauf 'passwordAuthenticationMethod' = MFA)
_MFA_METHOD_MAP: dict[str, str] = {
    "microsoftAuthenticatorAuthenticationMethod": "authenticator_app",
    "softwareOathAuthenticationMethod":           "totp",
    "phoneAuthenticationMethod":                  "sms_voice",
    "fido2AuthenticationMethod":                  "fido2",
    "windowsHelloForBusinessAuthenticationMethod":"windows_hello",
    "emailAuthenticationMethod":                  "email_otp",
    "temporaryAccessPassAuthenticationMethod":     "tap",
}

# Rôles Entra ID considérés comme « accès privilégié »
_PRIVILEGED_ROLES = {
    "Global Administrator",
    "Privileged Role Administrator",
    "Security Administrator",
    "Conditional Access Administrator",
    "Authentication Administrator",
    "User Administrator",
    "Exchange Administrator",
    "SharePoint Administrator",
    "Intune Administrator",
    "Application Administrator",
    "Cloud Application Administrator",
    "Hybrid Identity Administrator",
}


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────────────────────────────────────

def collect_entra_id(org_id: str) -> dict:
    """
    Collecte les données Entra ID et met à jour security_postures + identities.
    Lève RuntimeError si le connecteur M365 n'est pas configuré.
    """
    headers = _auth_headers(org_id)  # lève RuntimeError si non connecté

    stats: dict = {
        "users_processed":    0,
        "mfa_enrolled":       0,
        "privileged_users":   0,
        "service_principals": 0,
        "groups_synced":      0,
        "groups_no_owner":    0,
        "group_members_synced": 0,
        "postures_updated":   0,
        "errors":             [],
    }

    # 1. Rôles admins → dict user_id → [role_name, ...]
    admin_roles = _fetch_admin_roles(headers, stats)

    # 2. Récupère les utilisateurs M365 déjà en DB (pour corréler l'identité)
    with get_db() as cur:
        cur.execute(
            """
            SELECT ia.external_id AS user_id, ia.identity_id,
                   ia.external_email AS upn
            FROM public.identity_accounts ia
            WHERE ia.organization_id = %s
              AND ia.source_connector = 'microsoft_365'
            """,
            (org_id,),
        )
        db_accounts = cur.fetchall()

    # 3. MFA par utilisateur + mise à jour security_postures
    for row in db_accounts:
        user_id     = row["user_id"]
        identity_id = row["identity_id"]
        upn         = row["upn"] or ""

        try:
            mfa_enabled, mfa_method = _fetch_mfa_per_user(headers, user_id)
            roles   = admin_roles.get(user_id, [])
            privileged = bool(roles)

            risk_factors = []
            risk_score   = 0

            if not mfa_enabled:
                risk_factors.append("no_mfa")
                risk_score += 40
            if privileged and not mfa_enabled:
                risk_factors.append("privileged_no_mfa")
                risk_score += 30
            for role in roles:
                risk_factors.append(f"role:{role}")

            _upsert_posture(
                org_id=org_id,
                identity_id=identity_id,
                mfa_enabled=mfa_enabled,
                mfa_method=mfa_method,
                privileged=privileged,
                risk_score=min(risk_score, 100),
                risk_factors=risk_factors,
                roles=roles,
            )
            stats["postures_updated"] += 1
            if mfa_enabled:
                stats["mfa_enrolled"] += 1
            if privileged:
                stats["privileged_users"] += 1

        except Exception as exc:
            log.warning("Erreur MFA pour %s : %s", upn, exc)
            stats["errors"].append({"upn": upn, "error": str(exc)})

        stats["users_processed"] += 1

    # 4. Principals de service (comptes de service / apps d'entreprise)
    _sync_service_principals(headers, org_id, stats)

    # 5. Groupes de sécurité avec détection des propriétaires
    _sync_security_groups(headers, org_id, stats)

    log.info("Entra ID sync done : %s", stats)
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# MFA per-user (Graph v1.0 — fonctionne sans Entra P1/P2)
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_mfa_per_user(headers: dict, user_id: str) -> tuple[bool, str]:
    """
    Retourne (mfa_enabled, method_label) pour un utilisateur donné.
    Utilise /users/{id}/authentication/methods (v1.0, pas le rapport beta).
    """
    url = f"{GRAPH}/users/{user_id}/authentication/methods"
    try:
        r = httpx.get(url, headers=headers, timeout=15)
        r.raise_for_status()
        methods = r.json().get("value", [])
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (403, 404):
            # Permissions insuffisantes ou utilisateur guest sans méthodes
            return False, "unknown"
        raise

    mfa_methods = []
    for m in methods:
        odata = m.get("@odata.type", "")
        short = odata.split(".")[-1] if "." in odata else odata
        if short in _MFA_METHOD_MAP:
            mfa_methods.append(_MFA_METHOD_MAP[short])

    if mfa_methods:
        return True, mfa_methods[0]
    return False, "none"


# ─────────────────────────────────────────────────────────────────────────────
# Rôles admin Entra
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_admin_roles(headers: dict, stats: dict) -> dict[str, list[str]]:
    """
    Retourne dict { user_id: [role_name, ...] } pour tous les rôles actifs.
    Requiert RoleManagement.Read.Directory.
    """
    result: dict[str, list[str]] = {}
    try:
        # Rôles actifs dans le tenant
        r = httpx.get(
            f"{GRAPH}/directoryRoles",
            headers=headers,
            params={"$select": "id,displayName"},
            timeout=20,
        )
        r.raise_for_status()
        roles = r.json().get("value", [])

        for role in roles:
            role_name = role.get("displayName", "")
            role_id   = role.get("id", "")
            if not role_id:
                continue

            # Membres de ce rôle
            try:
                rm = httpx.get(
                    f"{GRAPH}/directoryRoles/{role_id}/members",
                    headers=headers,
                    params={"$select": "id,userPrincipalName"},
                    timeout=15,
                )
                rm.raise_for_status()
                for member in rm.json().get("value", []):
                    uid = member.get("id")
                    if uid:
                        result.setdefault(uid, []).append(role_name)
            except Exception as exc:
                log.debug("Membres du rôle %s inaccessibles : %s", role_name, exc)

    except httpx.HTTPStatusError as exc:
        log.warning("Rôles Entra inaccessibles (%s) — privileged_access ignoré.", exc)
    except Exception as exc:
        log.warning("Erreur fetch admin roles : %s", exc)
        stats["errors"].append({"source": "admin_roles", "error": str(exc)})

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Principals de service → identités de type service_account
# ─────────────────────────────────────────────────────────────────────────────

def _sync_service_principals(headers: dict, org_id: str, stats: dict) -> None:
    """
    Récupère les principals de service (apps d'entreprise, managed identities)
    et les inscrit comme identités de type 'service_account'.
    """
    url = f"{GRAPH}/servicePrincipals"
    params = {
        "$select": "id,displayName,appId,servicePrincipalType,accountEnabled,"
                   "createdDateTime,appOwnerOrganizationId",
        "$filter": "servicePrincipalType eq 'Application' or servicePrincipalType eq 'ManagedIdentity'",
        "$top":    "100",
    }
    try:
        r = httpx.get(url, headers=headers, params=params, timeout=25)
        r.raise_for_status()
        principals = r.json().get("value", [])
    except httpx.HTTPStatusError as exc:
        log.warning("Service principals inaccessibles (%s).", exc)
        return
    except Exception as exc:
        log.warning("Erreur fetch service principals : %s", exc)
        stats["errors"].append({"source": "service_principals", "error": str(exc)})
        return

    for sp in principals:
        try:
            sp_id      = sp.get("id", "")
            name       = sp.get("displayName") or sp.get("appId", sp_id)
            sp_type    = sp.get("servicePrincipalType", "Application")
            enabled    = sp.get("accountEnabled", True)
            created    = sp.get("createdDateTime")
            # Exclure les apps Microsoft internes (appOwnerOrganizationId = MS tenant)
            owner_org  = sp.get("appOwnerOrganizationId", "")
            if owner_org == "f8cdef31-a31e-4b4a-93e4-5f571e91255a":
                # Microsoft tenant — apps internes, pas intéressant
                continue

            fake_email = f"sp:{sp_id}@entra.service"

            # Upsert identité service_account
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.identities
                      (organization_id, identity_type, canonical_email, full_name,
                       status, source_of_truth, created_at, updated_at)
                    VALUES (%s, 'service_account', %s, %s,
                            %s, 'entra_id', now(), now())
                    ON CONFLICT (organization_id, canonical_email) DO UPDATE SET
                      full_name       = EXCLUDED.full_name,
                      status          = EXCLUDED.status,
                      source_of_truth = EXCLUDED.source_of_truth,
                      updated_at      = now()
                    RETURNING id
                    """,
                    (org_id, fake_email, name,
                     "active" if enabled else "inactive"),
                )
                row = cur.fetchone()
                if not row:
                    cur.execute(
                        "SELECT id FROM public.identities WHERE organization_id=%s AND canonical_email=%s",
                        (org_id, fake_email),
                    )
                    row = cur.fetchone()
                identity_id = row["id"] if row else None

            if not identity_id:
                continue

            # Upsert account entra_id
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.identity_accounts
                      (organization_id, identity_id, source_connector, external_id,
                       external_email, display_name, status, synced_at,
                       raw_data)
                    VALUES (%s,%s,'entra_id',%s,%s,%s,%s,now(),%s::jsonb)
                    ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
                      display_name = EXCLUDED.display_name,
                      status       = EXCLUDED.status,
                      synced_at    = now(),
                      raw_data     = EXCLUDED.raw_data
                    """,
                    (org_id, identity_id, sp_id, fake_email, name,
                     "active" if enabled else "inactive",
                     json.dumps({
                         "sp_type": sp_type,
                         "appId":   sp.get("appId"),
                         "created": created,
                     })),
                )
            stats["service_principals"] += 1

        except Exception as exc:
            log.warning("Erreur SP %s : %s", sp.get("displayName"), exc)
            stats["errors"].append({"sp": sp.get("displayName"), "error": str(exc)})


# ─────────────────────────────────────────────────────────────────────────────
# Groupes de sécurité — avec détection des propriétaires
# ─────────────────────────────────────────────────────────────────────────────

def _sync_security_groups(headers: dict, org_id: str, stats: dict) -> None:
    """
    Récupère les groupes de sécurité Entra ID, détecte ceux sans propriétaire
    et les stocke dans identities (type='group') pour l'analyseur de risques.
    Limité aux 100 premiers groupes.
    """
    try:
        r = httpx.get(
            f"{GRAPH}/groups",
            headers=headers,
            params={
                "$filter": "securityEnabled eq true",
                "$select": "id,displayName,createdDateTime,groupTypes",
                "$top":    "100",
            },
            timeout=25,
        )
        r.raise_for_status()
        groups = r.json().get("value", [])
    except Exception as exc:
        log.warning("Groupes de sécurité inaccessibles : %s", exc)
        stats["errors"].append({"source": "security_groups", "error": str(exc)})
        return

    groups_no_owner = 0
    for group in groups:
        group_id   = group.get("id", "")
        group_name = group.get("displayName") or group_id
        created    = group.get("createdDateTime")

        if not group_id:
            continue

        # Vérifie s'il y a au moins un propriétaire
        has_owner = _group_has_owner(headers, group_id)

        fake_email = f"group:{group_id}@entra.group"

        # Upsert dans identities
        try:
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.identities
                      (organization_id, identity_type, canonical_email, full_name,
                       status, source_of_truth, created_at, updated_at)
                    VALUES (%s, 'group', %s, %s, 'active', 'entra_id', now(), now())
                    ON CONFLICT (organization_id, canonical_email) DO UPDATE SET
                      full_name       = EXCLUDED.full_name,
                      updated_at      = now()
                    RETURNING id
                    """,
                    (org_id, fake_email, group_name),
                )
                row = cur.fetchone()
                if not row:
                    cur.execute(
                        "SELECT id FROM public.identities WHERE organization_id=%s AND canonical_email=%s",
                        (org_id, fake_email),
                    )
                    row = cur.fetchone()
                identity_id = row["id"] if row else None

            if identity_id:
                with get_db() as cur:
                    cur.execute(
                        """
                        INSERT INTO public.identity_accounts
                          (organization_id, identity_id, source_connector, external_id,
                           external_email, display_name, status, synced_at, data)
                        VALUES (%s,%s,'entra_group',%s,%s,%s,'active',now(),%s::jsonb)
                        ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
                          display_name = EXCLUDED.display_name,
                          synced_at    = now(),
                          data         = EXCLUDED.data
                        """,
                        (org_id, identity_id, group_id, fake_email, group_name,
                         json.dumps({
                             "has_owner": has_owner,
                             "created":   created,
                             "group_types": group.get("groupTypes", []),
                         })),
                    )
                members_synced = _sync_group_members(headers, org_id, group_id, group_name)
                stats["group_members_synced"] += members_synced

            if not has_owner:
                groups_no_owner += 1

        except Exception as exc:
            log.warning("Erreur groupe %s : %s", group_name, exc)

    stats["groups_synced"]    = len(groups)
    stats["groups_no_owner"]  = groups_no_owner
    log.info("Groupes Entra : %d total, %d sans propriétaire", len(groups), groups_no_owner)


def _sync_group_members(headers: dict, org_id: str, group_id: str, group_name: str) -> int:
    """Récupère les membres d'un groupe et les stocke dans security_group_members."""
    try:
        r = httpx.get(
            f"{GRAPH}/groups/{group_id}/members",
            headers=headers,
            params={"$select": "id,displayName,userPrincipalName", "$top": "100"},
            timeout=20,
        )
        r.raise_for_status()
        members = r.json().get("value", [])
    except Exception as exc:
        log.warning("Membres groupe %s inaccessibles : %s", group_name, exc)
        return 0

    count = 0
    for m in members:
        member_id   = m.get("id", "")
        member_upn  = m.get("userPrincipalName") or ""
        member_name = m.get("displayName") or member_upn
        odata_type  = m.get("@odata.type", "")
        if "servicePrincipal" in odata_type:
            member_type = "servicePrincipal"
        elif "group" in odata_type.lower():
            member_type = "group"
        else:
            member_type = "user"
        if not member_id:
            continue
        try:
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.security_group_members
                      (organization_id, group_id, group_name, member_id,
                       member_upn, member_name, member_type, synced_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,now())
                    ON CONFLICT (organization_id, group_id, member_id) DO UPDATE SET
                      member_name = EXCLUDED.member_name,
                      member_upn  = EXCLUDED.member_upn,
                      synced_at   = now()
                    """,
                    (org_id, group_id, group_name, member_id,
                     member_upn, member_name, member_type),
                )
            count += 1
        except Exception as exc:
            log.warning("Erreur membre %s/%s : %s", group_name, member_id, exc)
    return count


def _group_has_owner(headers: dict, group_id: str) -> bool:
    """Vérifie si un groupe a au moins un propriétaire."""
    try:
        r = httpx.get(
            f"{GRAPH}/groups/{group_id}/owners",
            headers=headers,
            params={"$select": "id", "$top": "1"},
            timeout=10,
        )
        r.raise_for_status()
        return len(r.json().get("value", [])) > 0
    except Exception:
        return True  # En cas d'erreur, on suppose qu'il y a un propriétaire


# ─────────────────────────────────────────────────────────────────────────────
# Persistance security_postures
# ─────────────────────────────────────────────────────────────────────────────

def _upsert_posture(
    org_id: str,
    identity_id: str,
    mfa_enabled: bool,
    mfa_method: str,
    privileged: bool,
    risk_score: int,
    risk_factors: list[str],
    roles: list[str],
) -> None:
    extra = {"entra_roles": roles} if roles else {}
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.security_postures
              (organization_id, identity_id, mfa_enabled, mfa_method,
               privileged_access, risk_score, risk_factors, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, identity_id) DO UPDATE SET
              mfa_enabled       = EXCLUDED.mfa_enabled,
              mfa_method        = EXCLUDED.mfa_method,
              privileged_access = EXCLUDED.privileged_access,
              risk_score        = EXCLUDED.risk_score,
              risk_factors      = EXCLUDED.risk_factors,
              updated_at        = now()
            """,
            (org_id, identity_id, mfa_enabled, mfa_method,
             privileged, risk_score,
             json.dumps(risk_factors + ([f"roles:{r}" for r in roles] if roles else []))),
        )

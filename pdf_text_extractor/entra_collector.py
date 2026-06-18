"""
Collecteur Entra ID (Azure Active Directory) — Sécurité des identités.

Peuple :
  security_postures      → MFA réel par utilisateur + rôles admin → privileged_access
  identities             → principals de service + guests privilégiés
  identity_accounts      → source_connector = 'entra_id'
  entra_ca_policies      → Conditional Access Policies (état, cibles, MFA)
  entra_risky_users      → utilisateurs signalés par Identity Protection (P4)
  entra_signin_anomalies → pics d'échecs de connexion détectés sur 24h (P4)

Permissions Graph requises :
  User.Read.All
  UserAuthenticationMethod.Read.All        — méthodes MFA par utilisateur
  RoleManagement.Read.Directory            — rôles d'admin + membres
  Application.Read.All                     — principals de service
  Directory.Read.All                       — groupes de sécurité
  Policy.Read.All                          — Conditional Access Policies (P3)
  IdentityRiskyUser.Read.All               — risky users Identity Protection (P4, Entra P2)
  AuditLog.Read.All                        — sign-in logs (P4)
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
        "users_processed":      0,
        "mfa_enrolled":         0,
        "privileged_users":     0,
        "guest_users_flagged":  0,
        "service_principals":   0,
        "groups_synced":        0,
        "groups_no_owner":      0,
        "group_members_synced": 0,
        "ca_policies_synced":   0,
        "risky_users_synced":   0,
        "signin_anomalies":     0,
        "postures_updated":     0,
        "errors":               [],
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

    # 5. Groupes de sécurité avec détection des propriétaires (paginé)
    _sync_security_groups(headers, org_id, stats)

    # 6. Utilisateurs invités (guests) avec rôles privilégiés
    _sync_guest_users(headers, org_id, admin_roles, stats)

    # 7. Conditional Access Policies
    _sync_ca_policies(headers, org_id, stats)

    # 8. Risky users (Identity Protection — Entra P2, fallback gracieux)
    _sync_risky_users(headers, org_id, stats)

    # 9. Anomalies sign-in (AuditLog — pics d'échecs sur 24h)
    _sync_signin_anomalies(headers, org_id, stats)

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
    et les inscrit comme identités de type 'service_account'. Paginé.
    """
    url: str | None = f"{GRAPH}/servicePrincipals"
    params = {
        "$select": "id,displayName,appId,servicePrincipalType,accountEnabled,"
                   "createdDateTime,appOwnerOrganizationId",
        "$filter": "servicePrincipalType eq 'Application' or servicePrincipalType eq 'ManagedIdentity'",
        "$top":    "200",
    }
    principals: list[dict] = []
    try:
        while url:
            r = httpx.get(url, headers=headers, params=params, timeout=25)
            r.raise_for_status()
            body = r.json()
            principals.extend(body.get("value", []))
            url    = body.get("@odata.nextLink")
            params = {}  # nextLink contient déjà tous les params
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
                       data)
                    VALUES (%s,%s,'entra_id',%s,%s,%s,%s,now(),%s::jsonb)
                    ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
                      display_name = EXCLUDED.display_name,
                      status       = EXCLUDED.status,
                      synced_at    = now(),
                      data         = EXCLUDED.data
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
    Récupère tous les groupes de sécurité Entra ID (paginé), détecte ceux sans
    propriétaire et les stocke dans identities (type='group').
    """
    url: str | None = f"{GRAPH}/groups"
    params = {
        "$filter": "securityEnabled eq true",
        "$select": "id,displayName,createdDateTime,groupTypes",
        "$top":    "200",
    }
    groups: list[dict] = []
    try:
        while url:
            r = httpx.get(url, headers=headers, params=params, timeout=25)
            r.raise_for_status()
            body = r.json()
            groups.extend(body.get("value", []))
            url    = body.get("@odata.nextLink")
            params = {}
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


def _sync_risky_users(headers: dict, org_id: str, stats: dict) -> None:
    """
    Récupère les utilisateurs signalés comme risqués par Microsoft Identity Protection.
    Requiert IdentityRiskyUser.Read.All + licence Entra ID P2.
    Fallback gracieux si permission manquante ou pas de licence P2.
    """
    try:
        r = httpx.get(
            f"{GRAPH}/identityProtection/riskyUsers",
            headers=headers,
            params={
                "$filter": "riskState eq 'atRisk' or riskState eq 'confirmedCompromised'",
                "$select": "id,userPrincipalName,userDisplayName,riskState,"
                           "riskLevel,riskDetail,riskLastUpdatedDateTime",
                "$top": "200",
            },
            timeout=25,
        )
        r.raise_for_status()
        users = r.json().get("value", [])
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        if code in (403, 404):
            log.info("Risky users inaccessibles (code %d) — IdentityRiskyUser.Read.All ou licence Entra P2 manquante.", code)
            return
        log.warning("Risky users erreur HTTP %d.", code)
        return
    except Exception as exc:
        log.warning("Erreur fetch risky users : %s", exc)
        stats["errors"].append({"source": "risky_users", "error": str(exc)})
        return

    for u in users:
        user_id   = u.get("id", "")
        upn       = u.get("userPrincipalName", "")
        name      = u.get("userDisplayName", upn)
        state     = u.get("riskState", "atRisk")
        level     = u.get("riskLevel", "medium")
        detail    = u.get("riskDetail")
        updated   = u.get("riskLastUpdatedDateTime")

        if not user_id:
            continue

        try:
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.entra_risky_users
                      (organization_id, user_id, user_principal_name, display_name,
                       risk_state, risk_level, risk_detail, risk_last_updated, synced_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
                    ON CONFLICT (organization_id, user_id) DO UPDATE SET
                      user_principal_name = EXCLUDED.user_principal_name,
                      display_name        = EXCLUDED.display_name,
                      risk_state          = EXCLUDED.risk_state,
                      risk_level          = EXCLUDED.risk_level,
                      risk_detail         = EXCLUDED.risk_detail,
                      risk_last_updated   = EXCLUDED.risk_last_updated,
                      synced_at           = now()
                    """,
                    (org_id, user_id, upn, name, state, level, detail, updated),
                )
            stats["risky_users_synced"] += 1

            # Remonte le risk_score dans security_postures si le compte est dans la DB
            with get_db() as cur:
                cur.execute(
                    """
                    UPDATE public.security_postures sp
                    SET risk_score  = GREATEST(sp.risk_score, %s),
                        risk_factors = (
                          SELECT jsonb_agg(DISTINCT e)
                          FROM jsonb_array_elements_text(
                            COALESCE(sp.risk_factors,'[]'::jsonb) ||
                            '["risky_user","identity_protection"]'::jsonb
                          ) e
                        ),
                        updated_at = now()
                    FROM public.identity_accounts ia
                    WHERE ia.external_id       = %s
                      AND ia.source_connector  = 'microsoft_365'
                      AND ia.organization_id   = %s
                      AND sp.identity_id       = ia.identity_id
                      AND sp.organization_id   = %s
                    """,
                    (90 if level == "high" else 70, user_id, org_id, org_id),
                )
        except Exception as exc:
            log.warning("Erreur upsert risky user %s : %s", upn, exc)

    log.info("Risky users : %d synchronisés", stats["risky_users_synced"])


def _sync_signin_anomalies(headers: dict, org_id: str, stats: dict) -> None:
    """
    Analyse les sign-in logs des 24 dernières heures.
    Signale les utilisateurs avec > 10 échecs en 24h (spike d'authentification).
    Requiert AuditLog.Read.All.
    """
    from datetime import timezone, timedelta
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        r = httpx.get(
            f"{GRAPH}/auditLogs/signIns",
            headers=headers,
            params={
                "$filter": f"createdDateTime ge {since} and status/errorCode ne 0",
                "$select": "userId,userPrincipalName,userDisplayName,status,createdDateTime",
                "$top":    "500",
            },
            timeout=30,
        )
        r.raise_for_status()
        signins = r.json().get("value", [])
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        if code in (403, 404):
            log.info("Sign-in logs inaccessibles (code %d) — AuditLog.Read.All manquant.", code)
            return
        log.warning("Sign-in logs erreur HTTP %d.", code)
        return
    except Exception as exc:
        log.warning("Erreur fetch sign-in logs : %s", exc)
        stats["errors"].append({"source": "signin_anomalies", "error": str(exc)})
        return

    # Agrège les échecs par utilisateur
    from collections import defaultdict
    failures: dict[str, dict] = defaultdict(lambda: {"count": 0, "upn": "", "name": ""})
    for s in signins:
        uid = s.get("userId", "")
        if not uid:
            continue
        failures[uid]["count"] += 1
        failures[uid]["upn"]    = s.get("userPrincipalName", "")
        failures[uid]["name"]   = s.get("userDisplayName", "")

    threshold = 10
    for user_id, data in failures.items():
        if data["count"] < threshold:
            continue
        try:
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.entra_signin_anomalies
                      (organization_id, user_id, user_principal_name, display_name,
                       anomaly_type, failure_count, period_hours, detected_at, synced_at)
                    VALUES (%s,%s,%s,%s,'failed_logins_spike',%s,24,now(),now())
                    ON CONFLICT (organization_id, user_id, anomaly_type) DO UPDATE SET
                      user_principal_name = EXCLUDED.user_principal_name,
                      display_name        = EXCLUDED.display_name,
                      failure_count       = EXCLUDED.failure_count,
                      detected_at         = now(),
                      synced_at           = now()
                    """,
                    (org_id, user_id, data["upn"], data["name"], data["count"]),
                )
            stats["signin_anomalies"] += 1
        except Exception as exc:
            log.warning("Erreur signin anomaly %s : %s", data["upn"], exc)

    # Purge les anomalies datant de plus de 48h (résolues automatiquement)
    try:
        with get_db() as cur:
            cur.execute(
                """
                DELETE FROM public.entra_signin_anomalies
                WHERE organization_id = %s
                  AND detected_at < now() - INTERVAL '48 hours'
                """,
                (org_id,),
            )
    except Exception:
        pass

    log.info("Sign-in anomalies : %d pics détectés (seuil >%d en 24h)", stats["signin_anomalies"], threshold)


def _sync_guest_users(
    headers: dict, org_id: str, admin_roles: dict[str, list[str]], stats: dict
) -> None:
    """
    Récupère les utilisateurs invités (userType=Guest) et marque ceux qui ont
    des rôles admin dans security_postures (privileged_access=true + risk_factor 'guest').
    """
    url: str | None = f"{GRAPH}/users"
    params = {
        "$filter": "userType eq 'Guest'",
        "$select": "id,displayName,userPrincipalName,mail,accountEnabled",
        "$top":    "200",
    }
    guests: list[dict] = []
    try:
        while url:
            r = httpx.get(url, headers=headers, params=params, timeout=25)
            r.raise_for_status()
            body = r.json()
            guests.extend(body.get("value", []))
            url    = body.get("@odata.nextLink")
            params = {}
    except httpx.HTTPStatusError as exc:
        log.warning("Guests inaccessibles (%s).", exc)
        return
    except Exception as exc:
        log.warning("Erreur fetch guests : %s", exc)
        stats["errors"].append({"source": "guest_users", "error": str(exc)})
        return

    for g in guests:
        user_id = g.get("id", "")
        roles   = admin_roles.get(user_id, [])
        if not roles:
            continue  # guest sans rôle admin — pas de risque immédiat

        upn     = g.get("userPrincipalName") or g.get("mail") or f"guest:{user_id}"
        name    = g.get("displayName") or upn
        enabled = g.get("accountEnabled", True)

        try:
            with get_db() as cur:
                cur.execute(
                    """
                    SELECT ia.identity_id
                    FROM public.identity_accounts ia
                    WHERE ia.organization_id = %s
                      AND ia.source_connector = 'microsoft_365'
                      AND ia.external_id = %s
                    LIMIT 1
                    """,
                    (org_id, user_id),
                )
                row = cur.fetchone()

            if not row:
                continue

            identity_id = row["identity_id"]
            risk_factors = ["guest", "privileged_guest"] + [f"role:{r}" for r in roles]

            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.security_postures
                      (organization_id, identity_id, mfa_enabled, mfa_method,
                       privileged_access, risk_score, risk_factors, updated_at)
                    VALUES (%s,%s,false,'unknown',true,80,%s::jsonb,now())
                    ON CONFLICT (organization_id, identity_id) DO UPDATE SET
                      privileged_access = true,
                      risk_factors      = (
                        SELECT jsonb_agg(DISTINCT e)
                        FROM jsonb_array_elements_text(
                          COALESCE(security_postures.risk_factors,'[]'::jsonb) ||
                          EXCLUDED.risk_factors
                        ) e
                      ),
                      risk_score  = GREATEST(security_postures.risk_score, 80),
                      updated_at  = now()
                    """,
                    (org_id, identity_id, json.dumps(risk_factors)),
                )
            stats["guest_users_flagged"] += 1
            log.info("Guest privilégié détecté : %s (%s)", name, ", ".join(roles))

        except Exception as exc:
            log.warning("Erreur guest %s : %s", upn, exc)


def _sync_ca_policies(headers: dict, org_id: str, stats: dict) -> None:
    """
    Récupère les Conditional Access Policies et les stocke dans entra_ca_policies.
    Nécessite Policy.Read.All.
    """
    try:
        r = httpx.get(
            f"{GRAPH}/policies/conditionalAccessPolicies",
            headers=headers,
            params={"$select": "id,displayName,state,conditions,grantControls"},
            timeout=25,
        )
        r.raise_for_status()
        policies = r.json().get("value", [])
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 403:
            log.info("CA Policies inaccessibles — Policy.Read.All manquant.")
            return
        log.warning("CA Policies erreur HTTP %s.", exc.response.status_code)
        return
    except Exception as exc:
        log.warning("Erreur fetch CA policies : %s", exc)
        stats["errors"].append({"source": "ca_policies", "error": str(exc)})
        return

    for p in policies:
        policy_id    = p.get("id", "")
        display_name = p.get("displayName", "")
        state        = p.get("state", "disabled")
        conditions   = p.get("conditions") or {}
        grant        = p.get("grantControls") or {}

        if not policy_id:
            continue

        # Détecte si la policy cible "All users"
        users_incl = conditions.get("users", {}).get("includeUsers", [])
        targets_all = "All" in users_incl

        # Détecte si la policy requiert le MFA
        built_in = grant.get("builtInControls", [])
        requires_mfa = "mfa" in [c.lower() for c in built_in]

        try:
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.entra_ca_policies
                      (organization_id, policy_id, display_name, state,
                       targets_all_users, requires_mfa, conditions, grant_controls, synced_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,now())
                    ON CONFLICT (organization_id, policy_id) DO UPDATE SET
                      display_name      = EXCLUDED.display_name,
                      state             = EXCLUDED.state,
                      targets_all_users = EXCLUDED.targets_all_users,
                      requires_mfa      = EXCLUDED.requires_mfa,
                      conditions        = EXCLUDED.conditions,
                      grant_controls    = EXCLUDED.grant_controls,
                      synced_at         = now()
                    """,
                    (org_id, policy_id, display_name, state,
                     targets_all, requires_mfa,
                     json.dumps(conditions), json.dumps(grant)),
                )
            stats["ca_policies_synced"] += 1
        except Exception as exc:
            log.warning("Erreur upsert CA policy %s : %s", display_name, exc)

    log.info("CA Policies : %d synchronisées", stats["ca_policies_synced"])


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

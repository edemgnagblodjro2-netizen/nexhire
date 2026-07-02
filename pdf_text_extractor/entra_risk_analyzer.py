"""
Analyseur de risques Entra ID.
Lit les données security_postures + identity_accounts et génère risk_findings.

Règles :
  1. admin_no_mfa          — Admin Entra sans MFA → CRITIQUE
  2. privileged_inactive   — Admin inactif > 30 jours → ÉLEVÉ
  3. user_no_mfa           — Utilisateur actif sans MFA → MOYEN
  4. group_no_owner        — Groupe de sécurité sans propriétaire → MOYEN
  5. service_account_risk  — Compte de service à privilèges élevés → ÉLEVÉ
  6. guest_privileged      — Utilisateur invité avec rôle admin → CRITIQUE
  7. missing_ca_policy     — Aucune CA Policy MFA globale → CRITIQUE
  8. ca_policy_report_only — CA Policy MFA en mode rapport seulement → ÉLEVÉ
  9. risky_user_detected   — Utilisateur signalé par Identity Protection → CRITIQUE/ÉLEVÉ
 10. signin_anomaly        — Pic d'échecs de connexion sur 24h (>10) → ÉLEVÉ
"""

from __future__ import annotations

import json
import logging

from db import get_db, rows as db_rows

log = logging.getLogger(__name__)

_ENTRA_FINDING_TYPES = (
    "admin_no_mfa",
    "privileged_inactive",
    "user_no_mfa",
    "group_no_owner",
    "service_account_risk",
    "guest_privileged",
    "missing_ca_policy",
    "ca_policy_report_only",
    "risky_user_detected",
    "signin_anomaly",
)


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée
# ─────────────────────────────────────────────────────────────────────────────


def run_entra_risk_analyzer(org_id: str) -> dict:
    """Analyse la posture Entra ID et génère/met à jour les risk_findings."""
    _reset_entra_findings(org_id)

    findings: list[dict] = []
    findings += _rule_admin_no_mfa(org_id)
    findings += _rule_privileged_inactive(org_id)
    findings += _rule_user_no_mfa(org_id)
    findings += _rule_group_no_owner(org_id)
    findings += _rule_service_account_risk(org_id)
    findings += _rule_guest_privileged(org_id)
    findings += _rule_ca_policy_coverage(org_id)
    findings += _rule_risky_user(org_id)
    findings += _rule_signin_anomaly(org_id)

    by_severity: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        by_severity[f["severity"]] = by_severity.get(f["severity"], 0) + 1

    log.info("Entra risk analyzer : %d findings — %s", len(findings), by_severity)
    return {
        "findings_count": len(findings),
        "critical": by_severity["critical"],
        "high": by_severity["high"],
        "medium": by_severity["medium"],
        "findings": findings[:20],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Règle 1 — Administrateurs sans MFA (CRITIQUE)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_admin_no_mfa(org_id: str) -> list[dict]:
    """Tout compte avec privileged_access=true et mfa_enabled=false."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email,
                       sp.risk_factors
                FROM public.security_postures sp
                JOIN public.identities i ON i.id = sp.identity_id
                WHERE sp.organization_id = %s
                  AND sp.privileged_access = true
                  AND sp.mfa_enabled = false
                  AND i.identity_type NOT IN ('group','service_account')
                  AND i.status = 'active'
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("admin_no_mfa query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        factors = r.get("risk_factors") or []
        roles = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "Administrateur"
        name = r["full_name"] or r["canonical_email"]

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="admin_no_mfa",
            severity="critical",
            title=f"Admin sans MFA — {name}",
            description=(
                f"{name} ({role_lbl}) n'a pas de méthode MFA configurée. "
                f"Un mot de passe compromis donne un accès administrateur complet "
                f"à l'ensemble du tenant Microsoft 365."
            ),
            remediation=(
                f"Configurer immédiatement MFA pour {r['canonical_email']} "
                f"dans le portail Microsoft Entra ID ou via https://aka.ms/mfasetup. "
                f"Envisager une stratégie d'accès conditionnel forçant le MFA pour tous les admins."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "admin_no_mfa",
                "severity": "critical",
                "email": r["canonical_email"],
                "display_name": r["full_name"],
                "roles": roles,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 2 — Comptes à privilèges inactifs (ÉLEVÉ)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_privileged_inactive(org_id: str) -> list[dict]:
    """Admin avec days_inactive > 30 jours (données confirmées)."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email,
                       sp.risk_factors,
                       (ia.data->>'days_inactive')::int   AS days_inactive,
                       ia.data->>'data_source'            AS data_source
                FROM public.security_postures sp
                JOIN public.identities i        ON i.id = sp.identity_id
                JOIN public.identity_accounts ia ON ia.identity_id = i.id
                  AND ia.source_connector = 'microsoft_365'
                  AND ia.organization_id  = sp.organization_id
                WHERE sp.organization_id = %s
                  AND sp.privileged_access = true
                  AND (ia.data->>'days_inactive')::int > 30
                  AND COALESCE(ia.data->>'data_source', 'report') != 'created_date'
                  AND i.status = 'active'
                ORDER BY (ia.data->>'days_inactive')::int DESC
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("privileged_inactive query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        days = int(r.get("days_inactive") or 0)
        factors = r.get("risk_factors") or []
        roles = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "Administrateur"
        name = r["full_name"] or r["canonical_email"]

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="privileged_inactive",
            severity="high",
            title=f"Admin inactif {days}j — {name}",
            description=(
                f"{name} ({role_lbl}) est inactif depuis {days} jours "
                f"mais conserve ses droits d'administration. "
                f"Un compte admin dormant est une cible privilégiée."
            ),
            remediation=(
                f"Vérifier si {r['canonical_email']} est encore en poste. "
                f"Si inactif, désactiver le compte ou révoquer les rôles admin. "
                f"Sinon, forcer une reconnexion pour valider l'accès."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "privileged_inactive",
                "severity": "high",
                "email": r["canonical_email"],
                "display_name": r["full_name"],
                "days_inactive": days,
                "roles": roles,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 3 — Utilisateurs sans MFA (MOYEN)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_user_no_mfa(org_id: str) -> list[dict]:
    """Utilisateurs actifs (non-admin) sans MFA configuré."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email
                FROM public.security_postures sp
                JOIN public.identities i ON i.id = sp.identity_id
                WHERE sp.organization_id = %s
                  AND sp.privileged_access = false
                  AND sp.mfa_enabled = false
                  AND i.identity_type NOT IN ('group','service_account')
                  AND i.status = 'active'
                ORDER BY i.full_name
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("user_no_mfa query failed: %s", exc)
        return []

    # Un seul finding groupé si > 3 utilisateurs (évite le bruit)
    if not rows:
        return []

    findings = []
    if len(rows) <= 3:
        for r in rows:
            name = r["full_name"] or r["canonical_email"]
            _upsert_entra_finding(
                org_id=org_id,
                finding_type="user_no_mfa",
                severity="medium",
                title=f"Sans MFA — {name}",
                description=f"{name} n'a pas de méthode d'authentification forte configurée.",
                remediation=f"Demander à {r['canonical_email']} de configurer MFA sur https://aka.ms/mfasetup",
                cost_impact_monthly=0,
            )
            findings.append(
                {
                    "finding_type": "user_no_mfa",
                    "severity": "medium",
                    "email": r["canonical_email"],
                    "display_name": r["full_name"],
                }
            )
    else:
        # Finding groupé
        emails = ", ".join(r["canonical_email"] for r in rows[:5])
        suffix = f"… et {len(rows) - 5} autres" if len(rows) > 5 else ""
        _upsert_entra_finding(
            org_id=org_id,
            finding_type="user_no_mfa",
            severity="medium",
            title=f"{len(rows)} utilisateurs sans MFA configuré",
            description=(f"{len(rows)} comptes actifs n'ont pas de méthode MFA : " f"{emails}{suffix}."),
            remediation=(
                "Créer une stratégie d'accès conditionnel Entra ID qui exige le MFA "
                "pour tous les utilisateurs. Ou activer les Security Defaults Microsoft."
            ),
            cost_impact_monthly=0,
        )
        findings.append({"finding_type": "user_no_mfa", "severity": "medium", "count": len(rows)})
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 4 — Groupes de sécurité sans propriétaire (MOYEN)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_group_no_owner(org_id: str) -> list[dict]:
    """Groupes Entra ID stockés sans has_owner = true."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email
                FROM public.identities i
                JOIN public.identity_accounts ia ON ia.identity_id = i.id
                  AND ia.source_connector = 'entra_group'
                WHERE i.organization_id = %s
                  AND i.identity_type = 'group'
                  AND (ia.data->>'has_owner')::boolean = false
                ORDER BY i.full_name
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("group_no_owner query failed: %s", exc)
        return []

    if not rows:
        return []

    findings = []
    for r in rows:
        name = r["full_name"] or r["canonical_email"]
        _upsert_entra_finding(
            org_id=org_id,
            finding_type="group_no_owner",
            severity="medium",
            title=f"Groupe sans propriétaire — {name}",
            description=(
                f"Le groupe de sécurité « {name} » n'a aucun propriétaire désigné. "
                f"Sans propriétaire, les membres peuvent être ajoutés sans supervision."
            ),
            remediation=(
                f"Assigner un propriétaire au groupe « {name} » dans le portail Entra ID : "
                f"Groups → {name} → Owners → + Add owners."
            ),
            cost_impact_monthly=0,
        )
        findings.append({"finding_type": "group_no_owner", "severity": "medium", "group_name": name})
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 5 — Comptes de service à privilèges élevés (ÉLEVÉ)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_service_account_risk(org_id: str) -> list[dict]:
    """Service accounts avec privileged_access=true — risque de mouvement latéral."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email,
                       sp.mfa_enabled, sp.risk_factors,
                       (ia.data->>'days_inactive')::int AS days_inactive
                FROM public.security_postures sp
                JOIN public.identities i        ON i.id = sp.identity_id
                LEFT JOIN public.identity_accounts ia ON ia.identity_id = i.id
                  AND ia.source_connector = 'microsoft_365'
                  AND ia.organization_id  = sp.organization_id
                WHERE sp.organization_id = %s
                  AND i.identity_type = 'service_account'
                  AND sp.privileged_access = true
                  AND i.status = 'active'
                ORDER BY i.full_name
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("service_account_risk query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        name = r["full_name"] or r["canonical_email"]
        factors = r.get("risk_factors") or []
        roles = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "rôle privilégié"
        days = r.get("days_inactive")
        inactive_note = f" Il est inactif depuis {days} jours." if days and days > 30 else ""

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="service_account_risk",
            severity="high",
            title=f"Compte de service privilégié — {name}",
            description=(
                f"Le compte de service « {name} » détient {role_lbl}."
                f"{inactive_note} "
                f"Un compte de service compromis permet un mouvement latéral "
                f"sans déclencher d'alerte MFA."
            ),
            remediation=(
                f"Appliquer le principe du moindre privilège : retirer les rôles admin "
                f"non essentiels de {r['canonical_email']}. "
                f"Remplacer les credentials longs par des Managed Identities ou Workload Identity Federation. "
                f"Si inactif, désactiver immédiatement."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "service_account_risk",
                "severity": "high",
                "email": r["canonical_email"],
                "display_name": r["full_name"],
                "roles": roles,
                "days_inactive": days,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 6 — Utilisateurs invités avec rôle admin (CRITIQUE)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_guest_privileged(org_id: str) -> list[dict]:
    """Comptes guests (invités externes) qui ont privileged_access=true."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT i.full_name, i.canonical_email, sp.risk_factors
                FROM public.security_postures sp
                JOIN public.identities i ON i.id = sp.identity_id
                WHERE sp.organization_id = %s
                  AND sp.privileged_access = true
                  AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(sp.risk_factors) rf
                    WHERE rf = 'guest'
                  )
                  AND i.status = 'active'
                ORDER BY i.full_name
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("guest_privileged query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        factors = r.get("risk_factors") or []
        roles = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "rôle admin"
        name = r["full_name"] or r["canonical_email"]

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="guest_privileged",
            severity="critical",
            title=f"Invité avec accès admin — {name}",
            description=(
                f"L'utilisateur invité externe « {name} » détient {role_lbl}. "
                f"Un compte guest n'est pas soumis aux politiques de sécurité "
                f"de votre organisation (MFA, accès conditionnel, cycle de vie)."
            ),
            remediation=(
                f"Révoquer immédiatement les rôles admin de {r['canonical_email']}. "
                f"Si l'accès est nécessaire, créer un compte membre interne ou "
                f"utiliser Azure AD B2B avec accès conditionnel forcé."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "guest_privileged",
                "severity": "critical",
                "email": r["canonical_email"],
                "display_name": r["full_name"],
                "roles": roles,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 7 — Couverture Conditional Access (CRITIQUE / ÉLEVÉ)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_ca_policy_coverage(org_id: str) -> list[dict]:
    """
    Vérifie si une CA Policy active force le MFA pour tous les utilisateurs.
    - Aucune policy active → CRITIQUE (missing_ca_policy)
    - Policy existante mais en mode rapport seulement → ÉLEVÉ (ca_policy_report_only)
    """
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT state, targets_all_users, requires_mfa, display_name
                FROM public.entra_ca_policies
                WHERE organization_id = %s
                ORDER BY
                  CASE state WHEN 'enabled' THEN 1
                             WHEN 'enabledForReportingButNotEnforced' THEN 2
                             ELSE 3 END
                """,
                (org_id,),
            )
            policies = db_rows(cur)
    except Exception as exc:
        log.warning("ca_policy_coverage query failed: %s", exc)
        return []

    if not policies:
        return []

    # Cherche une policy active qui force le MFA pour tous
    has_global_mfa_enforced = any(
        p["state"] == "enabled" and p["requires_mfa"] and p["targets_all_users"] for p in policies
    )
    has_global_mfa_report_only = any(
        p["state"] == "enabledForReportingButNotEnforced" and p["requires_mfa"] and p["targets_all_users"]
        for p in policies
    )

    findings = []

    if not has_global_mfa_enforced and not has_global_mfa_report_only:
        _upsert_entra_finding(
            org_id=org_id,
            finding_type="missing_ca_policy",
            severity="critical",
            title="Aucune politique d'accès conditionnel MFA globale",
            description=(
                "Il n'existe aucune Conditional Access Policy active qui impose "
                "le MFA à l'ensemble des utilisateurs. Sans cette protection, "
                "un mot de passe compromis donne un accès direct à Microsoft 365."
            ),
            remediation=(
                "Créer une CA Policy dans Entra ID → Security → Conditional Access : "
                "Cible = All users, Cloud apps = All cloud apps, "
                "Grant = Require multifactor authentication. "
                "Commencer en mode Rapport pour valider l'impact avant d'activer."
            ),
            cost_impact_monthly=0,
        )
        findings.append({"finding_type": "missing_ca_policy", "severity": "critical"})

    elif has_global_mfa_report_only and not has_global_mfa_enforced:
        report_names = [
            p["display_name"]
            for p in policies
            if p["state"] == "enabledForReportingButNotEnforced" and p["requires_mfa"] and p["targets_all_users"]
        ]
        names_str = ", ".join(report_names[:3])
        _upsert_entra_finding(
            org_id=org_id,
            finding_type="ca_policy_report_only",
            severity="high",
            title="CA Policy MFA en mode rapport — non appliquée",
            description=(
                f"La politique « {names_str} » exige le MFA mais est en mode "
                f"« Rapport uniquement » — elle ne bloque pas les connexions sans MFA. "
                f"La protection est inactive en production."
            ),
            remediation=(
                f"Passer la politique « {names_str} » de "
                f"« Report-only » à « On » dans Entra ID → Conditional Access. "
                f"Vérifier d'abord que tous les admins ont le MFA configuré."
            ),
            cost_impact_monthly=0,
        )
        findings.append({"finding_type": "ca_policy_report_only", "severity": "high"})

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 9 — Utilisateurs signalés par Identity Protection (CRITIQUE / ÉLEVÉ)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_risky_user(org_id: str) -> list[dict]:
    """
    Utilisateurs dans entra_risky_users avec risk_state actif (atRisk / confirmedCompromised).
    CRITIQUE si risk_level=high ou confirmedCompromised, ÉLEVÉ si medium.
    """
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT user_principal_name, display_name, risk_state, risk_level,
                       risk_detail, risk_last_updated
                FROM public.entra_risky_users
                WHERE organization_id = %s
                  AND risk_state NOT IN ('dismissed','confirmedSafe','remediated','none')
                ORDER BY
                  CASE risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  risk_last_updated DESC NULLS LAST
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("risky_user query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        upn = r["user_principal_name"] or ""
        name = r["display_name"] or upn
        level = r["risk_level"]
        state = r["risk_state"]
        detail = r.get("risk_detail") or "risque détecté automatiquement"

        severity = "critical" if level == "high" or state == "confirmedCompromised" else "high"

        state_fr = {
            "atRisk": "À risque",
            "confirmedCompromised": "Compromis confirmé",
        }.get(state, state)

        level_fr = {"high": "élevé", "medium": "moyen"}.get(level, level)

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="risky_user_detected",
            severity=severity,
            title=f"Utilisateur risqué détecté — {name} ({level_fr})",
            description=(
                f"Microsoft Identity Protection a signalé « {name} » ({upn}) "
                f"avec un risque {level_fr} — état : {state_fr}. "
                f"Détail : {detail}."
            ),
            remediation=(
                f"1. Forcer immédiatement une réinitialisation de mot de passe pour {upn}. "
                f"2. Vérifier l'activité récente dans Entra ID → Users → {name} → Sign-in logs. "
                f"3. Si l'activité est légitime, marquer comme sécurisé dans Identity Protection. "
                f"4. Sinon, désactiver le compte et enquêter sur les accès récents."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "risky_user_detected",
                "severity": severity,
                "email": upn,
                "display_name": name,
                "risk_level": level,
                "risk_state": state,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Règle 10 — Pics d'échecs de connexion (ÉLEVÉ)
# ─────────────────────────────────────────────────────────────────────────────


def _rule_signin_anomaly(org_id: str) -> list[dict]:
    """
    Utilisateurs avec un spike d'échecs de connexion détecté sur 24h.
    Source : entra_signin_anomalies (peuplé par _sync_signin_anomalies).
    """
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT user_principal_name, display_name, failure_count,
                       anomaly_type, detected_at
                FROM public.entra_signin_anomalies
                WHERE organization_id = %s
                  AND detected_at > now() - INTERVAL '48 hours'
                ORDER BY failure_count DESC
                LIMIT 50
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("signin_anomaly query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        upn = r["user_principal_name"] or ""
        name = r["display_name"] or upn
        count = int(r["failure_count"])

        _upsert_entra_finding(
            org_id=org_id,
            finding_type="signin_anomaly",
            severity="high",
            title=f"Pic d'échecs de connexion — {name} ({count} en 24h)",
            description=(
                f"{count} tentatives de connexion échouées ont été détectées pour "
                f"« {name} » ({upn}) sur les 24 dernières heures. "
                f"Ce pic peut indiquer une attaque par force brute ou credential stuffing."
            ),
            remediation=(
                f"1. Vérifier si {upn} est victime d'une attaque externe ou a oublié son mot de passe. "
                f"2. Bloquer temporairement le compte si l'activité paraît malveillante. "
                f"3. Activer Smart Lockout dans Entra ID (Protection → Password protection). "
                f"4. Vérifier les IPs sources dans Sign-in logs et les bloquer si nécessaires."
            ),
            cost_impact_monthly=0,
        )
        findings.append(
            {
                "finding_type": "signin_anomaly",
                "severity": "high",
                "email": upn,
                "display_name": name,
                "failure_count": count,
            }
        )
    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _reset_entra_findings(org_id: str) -> None:
    """Résout les findings Entra calculés (non acknowledgés) avant recalcul."""
    with get_db() as cur:
        cur.execute(
            """
            UPDATE public.risk_findings
            SET resolved_at = now()
            WHERE organization_id = %s
              AND finding_type IN %s
              AND resolved_at IS NULL
              AND is_acknowledged = false
            """,
            (org_id, _ENTRA_FINDING_TYPES),
        )


def _upsert_entra_finding(
    org_id: str,
    finding_type: str,
    severity: str,
    title: str,
    description: str,
    remediation: str,
    cost_impact_monthly: float,
) -> None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.risk_findings
              (organization_id, finding_type, severity, title, description,
               cost_impact_monthly, remediation, detected_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,now())
            ON CONFLICT (organization_id, finding_type, title) DO UPDATE SET
              severity            = EXCLUDED.severity,
              description         = EXCLUDED.description,
              cost_impact_monthly = EXCLUDED.cost_impact_monthly,
              remediation         = EXCLUDED.remediation,
              detected_at         = now(),
              resolved_at         = NULL
            """,
            (org_id, finding_type, severity, title, description, cost_impact_monthly, remediation),
        )

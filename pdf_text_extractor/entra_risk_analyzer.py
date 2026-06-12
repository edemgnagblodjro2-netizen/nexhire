"""
Analyseur de risques Entra ID.
Lit les données security_postures + identity_accounts et génère risk_findings.

Règles :
  1. admin_no_mfa         — Admin Entra sans MFA → CRITIQUE
  2. privileged_inactive  — Admin inactif > 30 jours → ÉLEVÉ
  3. user_no_mfa          — Utilisateur actif sans MFA → MOYEN
  4. group_no_owner       — Groupe de sécurité sans propriétaire → MOYEN
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

    by_severity: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        by_severity[f["severity"]] = by_severity.get(f["severity"], 0) + 1

    log.info("Entra risk analyzer : %d findings — %s", len(findings), by_severity)
    return {
        "findings_count": len(findings),
        "critical": by_severity["critical"],
        "high":     by_severity["high"],
        "medium":   by_severity["medium"],
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
        roles   = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "Administrateur"
        name     = r["full_name"] or r["canonical_email"]

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
        findings.append({
            "finding_type": "admin_no_mfa",
            "severity":     "critical",
            "email":        r["canonical_email"],
            "display_name": r["full_name"],
            "roles":        roles,
        })
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
                       (ia.raw_data->>'days_inactive')::int   AS days_inactive,
                       ia.raw_data->>'data_source'            AS data_source
                FROM public.security_postures sp
                JOIN public.identities i        ON i.id = sp.identity_id
                JOIN public.identity_accounts ia ON ia.identity_id = i.id
                  AND ia.source_connector = 'microsoft_365'
                  AND ia.organization_id  = sp.organization_id
                WHERE sp.organization_id = %s
                  AND sp.privileged_access = true
                  AND (ia.raw_data->>'days_inactive')::int > 30
                  AND COALESCE(ia.raw_data->>'data_source', 'report') != 'created_date'
                  AND i.status = 'active'
                ORDER BY (ia.raw_data->>'days_inactive')::int DESC
                """,
                (org_id,),
            )
            rows = db_rows(cur)
    except Exception as exc:
        log.warning("privileged_inactive query failed: %s", exc)
        return []

    findings = []
    for r in rows:
        days  = int(r.get("days_inactive") or 0)
        factors = r.get("risk_factors") or []
        roles   = [f.replace("role:", "") for f in factors if f.startswith("role:")]
        role_lbl = ", ".join(roles) if roles else "Administrateur"
        name     = r["full_name"] or r["canonical_email"]

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
        findings.append({
            "finding_type": "privileged_inactive",
            "severity":     "high",
            "email":        r["canonical_email"],
            "display_name": r["full_name"],
            "days_inactive": days,
            "roles":         roles,
        })
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
                  AND sp.mfa_method != 'unknown'
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
            findings.append({"finding_type": "user_no_mfa", "severity": "medium",
                             "email": r["canonical_email"], "display_name": r["full_name"]})
    else:
        # Finding groupé
        emails = ", ".join(r["canonical_email"] for r in rows[:5])
        suffix = f"… et {len(rows) - 5} autres" if len(rows) > 5 else ""
        _upsert_entra_finding(
            org_id=org_id,
            finding_type="user_no_mfa",
            severity="medium",
            title=f"{len(rows)} utilisateurs sans MFA configuré",
            description=(
                f"{len(rows)} comptes actifs n'ont pas de méthode MFA : "
                f"{emails}{suffix}."
            ),
            remediation=(
                f"Créer une stratégie d'accès conditionnel Entra ID qui exige le MFA "
                f"pour tous les utilisateurs. Ou activer les Security Defaults Microsoft."
            ),
            cost_impact_monthly=0,
        )
        findings.append({"finding_type": "user_no_mfa", "severity": "medium",
                         "count": len(rows)})
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
                  AND (ia.raw_data->>'has_owner')::boolean = false
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
        findings.append({"finding_type": "group_no_owner", "severity": "medium",
                         "group_name": name})
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
            (org_id, finding_type, severity, title, description,
             cost_impact_monthly, remediation),
        )

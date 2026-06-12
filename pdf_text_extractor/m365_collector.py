"""
Collecteur Microsoft 365 / Entra ID — données réelles via Graph API.

Peuple :
  identities         → tous les membres du tenant
  identity_accounts  → compte M365 par identité
  license_pools      → licences achetées (SKUs) du tenant
  license_assignments→ qui a quelle licence
  license_usage      → activité réelle 30j par app (snapshot hebdomadaire)
  security_postures  → statut MFA par utilisateur

Permissions Graph App requises (à configurer dans Azure App Registration) :
  User.Read.All                              — lecture des utilisateurs
  Organization.Read.All                      — lecture des SKUs
  Reports.Read.All                           — rapports d'utilisation + MFA
  UserAuthenticationMethod.Read.All          — détails MFA (beta)
  AuditLog.Read.All                          — signInActivity (optionnel, Entra P1/P2)
"""
from __future__ import annotations

import csv
import io
import json
import logging
import time
from datetime import UTC, date, datetime, timedelta

import httpx

from db import get_db

log = logging.getLogger(__name__)

GRAPH   = "https://graph.microsoft.com/v1.0"
GRAPH_B = "https://graph.microsoft.com/beta"

# ── SKU GUID → Nom lisible ───────────────────────────────────────────────────
_SKU_MAP: dict[str, str] = {
    # Microsoft 365 E plans
    "18181a46-0d4e-45cd-891e-60aabd171b4e": "M365 E1",
    "6fd2c87f-b296-42f0-b197-1e91e994b900": "M365 E3",
    "c7df2760-2c81-4ef7-b578-5b5392b571df": "M365 E5",
    # Office 365
    "4b9405b0-7788-4568-add1-99614e613b69": "O365 E1",
    "19ec0d23-8335-4cbd-94ac-6050e30712fa": "O365 E3",
    "c2fe850d-fbbb-4858-b67d-bd0c6e746da3": "O365 E5",
    # Business
    "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46": "Business Basic",
    "f245ecc8-75af-4f8e-b61f-27d8114de5f3": "Business Standard",
    "05e9a617-0261-4cee-bb44-138d3ef5d965": "Business Premium",
    # Frontline
    "4a51bf65-409c-4a91-b845-1121b571cc9d": "F1",
    "66b55226-6b4f-492c-910c-a3b7a3c9d993": "F3",
    # Entra ID (Azure AD)
    "41781fb2-bc02-4b7c-bd55-b576c07bb09d": "Entra ID P1",
    "eec0eb4f-6444-4f95-aba0-50de8c8f08d7": "Entra ID P2",
    # Intune
    "c793db86-5237-494e-9b11-dcd4877c2c8c": "Intune",
    # Power BI
    "a403ebcc-fae0-4ca2-8c8c-7a907fd6c235": "Power BI Pro",
    "f8a1db68-be16-40ed-86d5-cb42ce701560": "Power BI Premium Per User",
    # Defender
    "111046dd-295b-4d6d-9724-d52ac90bd1f2": "Defender P1",
    "d17b27af-3f49-4822-99f9-56a661538792": "Defender P2",
    # Teams
    "57ff2da0-773e-42df-b2af-ffb7a2317929": "Teams Essentials",
    # Microsoft 365 Apps
    "c2273bd0-dff7-4215-9ef5-2c7bcfb06425": "M365 Apps for Business",
    "43de0ff5-c92c-492b-9116-175376d08c38": "M365 Apps for Enterprise",
    # Exchange only
    "efccb6f7-5641-4e0e-bd10-b4976e1bf68e": "Exchange Online P2",
}

# partNumber (ex: ENTERPRISEPACK) → nom lisible — fallback si GUID inconnu
_SKU_PARTNUM: dict[str, str] = {
    "ENTERPRISEPACK":           "M365 E3",
    "ENTERPRISEPREMIUM":        "M365 E5",
    "ENTERPRISEPACKWOW":        "O365 E3",
    "STANDARDPACK":             "O365 E1",
    "O365_BUSINESS_ESSENTIALS": "Business Basic",
    "O365_BUSINESS_PREMIUM":    "Business Standard",
    "SPB":                      "Business Premium",
    "DESKLESSPACK":             "F1",
    "DESKLESSWOFFPACK":         "F3",
    "AAD_PREMIUM":              "Entra ID P1",
    "AAD_PREMIUM_P2":           "Entra ID P2",
    "INTUNE_A":                 "Intune",
    "POWER_BI_PRO":             "Power BI Pro",
    "OFFICESUBSCRIPTION":       "M365 Apps for Enterprise",
    "O365_BUSINESS":            "M365 Apps for Business",
    "EXCHANGESTANDARD":         "Exchange Online P1",
    "EXCHANGEENTERPRISE":       "Exchange Online P2",
    "TEAMS_ESSENTIALS":         "Teams Essentials",
    "MCOEV":                    "Teams Phone",
}

# Coûts de référence CAD approximatifs (prix publics Microsoft 2025)
_SKU_COST: dict[str, float] = {
    "M365 E1":               12.50,
    "M365 E3":               28.40,
    "M365 E5":               57.20,
    "O365 E1":                9.40,
    "O365 E3":               22.50,
    "O365 E5":               38.00,
    "Business Basic":         7.20,
    "Business Standard":     15.10,
    "Business Premium":      26.80,
    "F1":                     2.70,
    "F3":                     9.40,
    "Entra ID P1":            7.40,
    "Entra ID P2":           11.60,
    "Intune":                 8.00,
    "Power BI Pro":          13.70,
    "Power BI Premium Per User": 21.60,
    "Defender P1":            3.50,
    "Defender P2":            7.20,
    "M365 Apps for Enterprise": 14.90,
    "M365 Apps for Business":   10.60,
    "Exchange Online P1":     4.70,
    "Exchange Online P2":     9.40,
    "Teams Essentials":        4.70,
}

# Poids score d'activité 0-100
_ACTIVITY_WEIGHTS = {
    "exchange":    25,
    "teams":       25,
    "sharepoint":  15,
    "onedrive":    10,
    "word":         8,
    "excel":        8,
    "powerpoint":   5,
    "onenote":      4,
}

# Colonnes CSV rapport → clés internes
_CSV_COLS = {
    "Exchange":        "exchange",
    "OneDrive":        "onedrive",
    "SharePoint":      "sharepoint",
    "Teams":           "teams",
    "Word":            "word",
    "Excel":           "excel",
    "PowerPoint":      "powerpoint",
    "OneNote":         "onenote",
    "Yammer":          "yammer",
    "Outlook Mac":     "outlook_mac",
    "Outlook Windows": "outlook_windows",
    "Outlook Mobile":  "outlook_mobile",
    "Outlook Web":     "outlook_web",
    "Skype For Business": "skype",
}


# ─────────────────────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────────────────────

def _auth_headers(org_id: str) -> dict:
    """Charge et rafraîchit les tokens M365, retourne les headers Graph."""
    from m365_service import _load_tokens, _refresh_if_needed
    tokens, cid = _load_tokens(org_id)
    if not tokens:
        raise RuntimeError(
            "Connecteur Microsoft 365 non configuré. "
            "Allez dans Connecteurs → Microsoft 365 et connectez via OAuth."
        )
    tokens = _refresh_if_needed(tokens, cid)
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ─────────────────────────────────────────────────────────────────────────────
# Graph API helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get(headers: dict, url: str, params: dict | None = None) -> dict:
    """GET Graph avec retry sur 429 (rate limit)."""
    for attempt in range(4):
        r = httpx.get(url, headers=headers, params=params, timeout=30)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 30))
            log.warning("Graph 429 — attente %ds", wait)
            time.sleep(min(wait, 60))
            continue
        if r.status_code == 403:
            raise PermissionError(f"Permission Graph insuffisante : {url}")
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"Graph API échec après retries : {url}")


def _get_all(headers: dict, url: str, params: dict | None = None) -> list[dict]:
    """GET paginé — suit @odata.nextLink jusqu'à la fin."""
    results: list[dict] = []
    next_url: str | None = url
    p = params
    while next_url:
        data = _get(headers, next_url, p)
        results.extend(data.get("value", []))
        next_url = data.get("@odata.nextLink")
        p = None  # nextLink contient déjà tous les params
    return results


def _get_csv(headers: dict, url: str) -> list[dict]:
    """GET rapport CSV Graph (usage reports) — retourne liste de dicts."""
    r = httpx.get(url, headers=headers, timeout=60, follow_redirects=True)
    if r.status_code == 204:   # pas de données disponibles encore
        return []
    if r.status_code == 403:
        raise PermissionError(f"Reports.Read.All requis pour : {url}")
    r.raise_for_status()
    # BOM UTF-8 possible
    content = r.content.decode("utf-8-sig", errors="replace")
    reader  = csv.DictReader(io.StringIO(content))
    return [dict(row) for row in reader]


# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────────────────────────────────────

def _sku_name(sku_id: str, part_number: str) -> str:
    return _SKU_MAP.get(sku_id) or _SKU_PARTNUM.get(part_number) or part_number


def _sku_cost(name: str) -> float:
    return _SKU_COST.get(name, 0.0)


def _score_and_tier(apps: dict, days_inactive: int, sku_name: str) -> tuple[int, str]:
    """Score d'activité 0-100 + tier réellement nécessaire."""
    if days_inactive > 90:
        return 0, "none"

    score = min(sum(w for k, w in _ACTIVITY_WEIGHTS.items() if apps.get(k)), 100)

    uses_advanced = apps.get("sharepoint") or apps.get("onedrive")
    uses_teams    = apps.get("teams") or apps.get("yammer")
    uses_email    = apps.get("exchange") or apps.get("outlook_web") or apps.get("outlook_windows")

    if "E5" in sku_name and score >= 70:
        tier = "enterprise"
    elif uses_advanced:
        tier = "advanced"
    elif uses_teams or uses_email:
        tier = "standard"
    elif score > 0:
        tier = "basic"
    else:
        tier = "none"

    return score, tier


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(s[:26], fmt).date()
        except ValueError:
            continue
    return None


def _week_start() -> str:
    """Lundi de la semaine courante — clé de période pour license_usage."""
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# Fetcheurs Graph
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_users(headers: dict) -> list[dict]:
    """
    Tous les utilisateurs du tenant (membres + invités).
    Tente d'inclure signInActivity (Entra ID P1/P2 requis) — ignoré si non disponible.
    """
    base_select = (
        "id,displayName,userPrincipalName,mail,department,jobTitle,"
        "accountEnabled,assignedLicenses,createdDateTime,userType,"
        "onPremisesSyncEnabled,onPremisesImmutableId"
    )
    # Tentative avec signInActivity (Entra P1/P2)
    try:
        users = _get_all(
            headers,
            f"{GRAPH}/users",
            {"$select": base_select + ",signInActivity", "$top": "999"},
        )
        log.info("signInActivity disponible (%d users)", len(users))
        return users
    except (PermissionError, httpx.HTTPStatusError):
        pass

    # Fallback sans signInActivity
    return _get_all(
        headers,
        f"{GRAPH}/users",
        {"$select": base_select, "$top": "999"},
    )


def _fetch_skus(headers: dict) -> list[dict]:
    """Licences souscrites (SKUs) du tenant."""
    return _get_all(headers, f"{GRAPH}/subscribedSkus")


def _fetch_usage_report(headers: dict) -> dict[str, dict]:
    """
    Rapport d'utilisation M365 Apps — 30 derniers jours.
    Retourne dict indexé par UPN (lowercase).
    """
    try:
        csv_rows = _get_csv(headers, f"{GRAPH}/reports/getM365AppUserDetail(period='D30')")
    except PermissionError:
        log.warning("Reports.Read.All absent — license_usage sera vide.")
        return {}

    result: dict[str, dict] = {}
    today = date.today()

    for row in csv_rows:
        upn = (row.get("User Principal Name") or "").lower().strip()
        if not upn:
            continue

        apps: dict[str, bool] = {}
        for csv_col, key in _CSV_COLS.items():
            val = (row.get(csv_col) or "").strip().lower()
            apps[key] = val in ("true", "yes", "1")

        last_str  = row.get("Last Activity Date", "").strip()
        last_date = _parse_date(last_str)
        days_inactive = (today - last_date).days if last_date else 999

        result[upn] = {
            "apps":          apps,
            "last_activity": last_str or None,
            "days_inactive": days_inactive,
        }
    return result


def _fetch_mfa_status(headers: dict) -> dict[str, dict]:
    """
    Statut MFA par utilisateur.
    Endpoint beta : /reports/authenticationMethods/userRegistrationDetails
    Requiert : Reports.Read.All ou UserAuthenticationMethod.Read.All
    """
    try:
        rows = _get_all(
            headers,
            f"{GRAPH_B}/reports/authenticationMethods/userRegistrationDetails",
            {"$top": "999"},
        )
    except (PermissionError, httpx.HTTPStatusError):
        log.warning("Permissions MFA insuffisantes — security_postures sera vide.")
        return {}

    result: dict[str, dict] = {}
    for r in rows:
        upn = (r.get("userPrincipalName") or "").lower().strip()
        if not upn:
            continue

        methods: list[str] = r.get("methodsRegistered") or []
        mfa_method = "none"
        if "microsoftAuthenticatorApp" in methods or "softwareOneTimePasscode" in methods:
            mfa_method = "app"
        elif "hardwareOath" in methods or "fido2" in methods:
            mfa_method = "hardware_key"
        elif "sms" in methods or "voice" in methods:
            mfa_method = "sms"
        elif "email" in methods:
            mfa_method = "email"

        result[upn] = {
            "mfa_registered":  r.get("isMfaRegistered", False),
            "mfa_capable":     r.get("isMfaCapable", False),
            "mfa_method":      mfa_method if r.get("isMfaRegistered") else "none",
            "is_privileged":   r.get("isAdmin", False),
            "methods":         methods,
        }
    return result


# ─────────────────────────────────────────────────────────────────────────────
# DB writers
# ─────────────────────────────────────────────────────────────────────────────

def _upsert_identity(org_id: str, canonical_email: str, full_name: str | None,
                     org_unit_name: str | None, job_title: str | None,
                     status: str, identity_type: str, metadata: dict) -> str | None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.identities
              (organization_id, canonical_email, full_name, org_unit_name,
               job_title, status, identity_type, source_of_truth, metadata, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'microsoft_365',%s::jsonb,now())
            ON CONFLICT (organization_id, canonical_email) DO UPDATE SET
              full_name     = COALESCE(EXCLUDED.full_name,     identities.full_name),
              org_unit_name = COALESCE(EXCLUDED.org_unit_name, identities.org_unit_name),
              job_title     = COALESCE(EXCLUDED.job_title,     identities.job_title),
              status        = CASE
                WHEN identities.source_of_truth = 'workday' THEN identities.status
                ELSE EXCLUDED.status END,
              identity_type = EXCLUDED.identity_type,
              metadata      = identities.metadata || EXCLUDED.metadata,
              updated_at    = now()
            RETURNING id
            """,
            (org_id, canonical_email, full_name, org_unit_name, job_title,
             status, identity_type, json.dumps(metadata)),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_account(org_id: str, identity_id: str | None, external_id: str,
                    external_email: str | None, display_name: str | None,
                    status: str, last_activity_at: str | None, data: dict) -> str | None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.identity_accounts
              (organization_id, identity_id, source_connector, external_id,
               external_email, display_name, status, last_activity_at, data, synced_at)
            VALUES (%s,%s,'microsoft_365',%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, source_connector, external_id) DO UPDATE SET
              identity_id      = COALESCE(EXCLUDED.identity_id, identity_accounts.identity_id),
              external_email   = EXCLUDED.external_email,
              display_name     = EXCLUDED.display_name,
              status           = EXCLUDED.status,
              last_activity_at = EXCLUDED.last_activity_at,
              data             = EXCLUDED.data,
              synced_at        = now()
            RETURNING id
            """,
            (org_id, identity_id, external_id, external_email, display_name,
             status, last_activity_at, json.dumps(data)),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_pool(org_id: str, sku_id: str, sku_name: str, part_number: str,
                 qty_total: int, qty_assigned: int, unit_cost: float) -> str | None:
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_pools
              (organization_id, connector_type, sku_name, sku_id,
               quantity_total, quantity_assigned, unit_cost_monthly, data, synced_at)
            VALUES (%s,'microsoft_365',%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, connector_type, sku_name) DO UPDATE SET
              sku_id            = EXCLUDED.sku_id,
              quantity_total    = EXCLUDED.quantity_total,
              quantity_assigned = EXCLUDED.quantity_assigned,
              unit_cost_monthly = EXCLUDED.unit_cost_monthly,
              synced_at         = now()
            RETURNING id
            """,
            (org_id, sku_name, sku_id, qty_total, qty_assigned, unit_cost,
             json.dumps({"part_number": part_number})),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_assignment(org_id: str, identity_id: str | None, account_id: str | None,
                        pool_id: str | None, sku_name: str) -> str | None:
    if not account_id:
        return None
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_assignments
              (organization_id, identity_id, account_id, pool_id, sku_name, connector_type)
            VALUES (%s,%s,%s,%s,%s,'microsoft_365')
            ON CONFLICT (organization_id, account_id, sku_name) DO UPDATE SET
              identity_id = COALESCE(EXCLUDED.identity_id, license_assignments.identity_id),
              pool_id     = COALESCE(EXCLUDED.pool_id, license_assignments.pool_id),
              is_active   = true,
              revoked_at  = NULL
            RETURNING id
            """,
            (org_id, identity_id, account_id, pool_id, sku_name),
        )
        r = cur.fetchone()
    return str(r["id"]) if r else None


def _upsert_usage(org_id: str, assignment_id: str, metrics: dict,
                  score: int, tier: str) -> None:
    period_start = _week_start()
    period_end   = date.today().isoformat()
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.license_usage
              (organization_id, assignment_id, period_start, period_end,
               metrics, activity_score, tier_needed)
            VALUES (%s,%s,%s,%s,%s::jsonb,%s,%s)
            ON CONFLICT (assignment_id, period_start) DO UPDATE SET
              period_end     = EXCLUDED.period_end,
              metrics        = EXCLUDED.metrics,
              activity_score = EXCLUDED.activity_score,
              tier_needed    = EXCLUDED.tier_needed
            """,
            (org_id, assignment_id, period_start, period_end,
             json.dumps(metrics), score, tier),
        )


def _upsert_posture(org_id: str, identity_id: str, mfa_enabled: bool,
                    mfa_method: str, privileged: bool, risk_factors: list) -> None:
    risk_score = 0
    if not mfa_enabled:
        risk_score += 40
    if privileged and not mfa_enabled:
        risk_score += 30
    if not privileged:
        pass

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.security_postures
              (organization_id, identity_id, mfa_enabled, mfa_method,
               privileged_access, risk_score, risk_factors, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,now())
            ON CONFLICT (organization_id, identity_id) DO UPDATE SET
              mfa_enabled      = EXCLUDED.mfa_enabled,
              mfa_method       = EXCLUDED.mfa_method,
              privileged_access = EXCLUDED.privileged_access,
              risk_score       = EXCLUDED.risk_score,
              risk_factors     = EXCLUDED.risk_factors,
              updated_at       = now()
            """,
            (org_id, identity_id, mfa_enabled, mfa_method,
             privileged, risk_score, json.dumps(risk_factors)),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrateur principal
# ─────────────────────────────────────────────────────────────────────────────

def collect_all_m365(org_id: str) -> dict:
    """
    Pipeline complet Microsoft 365 → modèle universel.
    Retourne un rapport de ce qui a été collecté.
    """
    headers = _auth_headers(org_id)  # lève RuntimeError si non connecté

    stats = {
        "users": 0, "pools": 0, "assignments": 0,
        "usage": 0, "mfa": 0, "errors": [],
    }

    # ── 1. SKUs (license_pools) ───────────────────────────────────────────────
    log.info("M365 sync — fetch SKUs")
    skus = _fetch_skus(headers)
    pool_map: dict[str, str | None] = {}   # sku_id → pool_id DB

    for sku in skus:
        sku_id   = sku.get("skuId", "")
        part_num = sku.get("skuPartNumber", "")
        name     = _sku_name(sku_id, part_num)
        prepaid  = sku.get("prepaidUnits", {})
        qty_total    = (prepaid.get("enabled") or 0) + (prepaid.get("suspended") or 0)
        qty_assigned = sku.get("consumedUnits") or 0
        cost     = _sku_cost(name)

        if qty_total == 0:
            continue   # SKU sans unités (essais expirés, etc.)

        pool_id = _upsert_pool(org_id, sku_id, name, part_num,
                               qty_total, qty_assigned, cost)
        pool_map[sku_id] = pool_id
        stats["pools"] += 1

    # ── 2. Rapport d'utilisation (usage_report) ───────────────────────────────
    log.info("M365 sync — fetch usage report")
    usage_data = _fetch_usage_report(headers)

    # ── 3. MFA status ─────────────────────────────────────────────────────────
    log.info("M365 sync — fetch MFA status")
    mfa_data = _fetch_mfa_status(headers)

    # ── 4. Utilisateurs ───────────────────────────────────────────────────────
    log.info("M365 sync — fetch users")
    users = _fetch_users(headers)

    for u in users:
        upn    = (u.get("userPrincipalName") or "").lower().strip()
        email  = (u.get("mail") or upn).lower().strip()
        if not email:
            continue

        # Détermine le type d'identité
        user_type     = u.get("userType", "Member")
        identity_type = "employee" if user_type == "Member" else "partner"

        # Statut du compte
        enabled      = u.get("accountEnabled", True)
        acct_status  = "active" if enabled else "inactive"
        ident_status = "active" if enabled else "inactive"

        # Dernière connexion (si signInActivity disponible)
        sign_in = u.get("signInActivity") or {}
        last_sign_in_str = sign_in.get("lastSignInDateTime")
        last_sign_in_date = _parse_date(last_sign_in_str)
        days_since_signin = (
            (date.today() - last_sign_in_date).days
            if last_sign_in_date else None
        )

        # 4a. Identité maître
        identity_id = _upsert_identity(
            org_id=org_id,
            canonical_email=email,
            full_name=u.get("displayName"),
            org_unit_name=u.get("department"),
            job_title=u.get("jobTitle"),
            status=ident_status,
            identity_type=identity_type,
            metadata={
                "m365_id":         u.get("id"),
                "user_type":       user_type,
                "on_prem_synced":  u.get("onPremisesSyncEnabled"),
                "created":         u.get("createdDateTime"),
            },
        )
        stats["users"] += 1

        # Dernière activité : depuis usage report ou signInActivity
        usage_row  = usage_data.get(upn) or usage_data.get(email)
        last_active = None
        days_inactive = 999
        apps: dict[str, bool] = {}

        if usage_row:
            days_inactive = usage_row["days_inactive"]
            last_active   = usage_row["last_activity"]
            apps          = usage_row["apps"]
        elif days_since_signin is not None:
            days_inactive = days_since_signin
            last_active   = last_sign_in_str

        # 4b. Compte M365
        account_id = _upsert_account(
            org_id=org_id,
            identity_id=identity_id,
            external_id=u.get("id", upn),
            external_email=email,
            display_name=u.get("displayName"),
            status=acct_status,
            last_activity_at=last_active,
            data={
                "department":      u.get("department"),
                "jobTitle":        u.get("jobTitle"),
                "userType":        user_type,
                "accountEnabled":  enabled,
                "days_inactive":   days_inactive,
                "on_prem_synced":  u.get("onPremisesSyncEnabled"),
            },
        )

        # 4c. Licences assignées à cet utilisateur
        assigned_skus = u.get("assignedLicenses") or []
        for lic in assigned_skus:
            sku_id   = lic.get("skuId", "")
            disabled = lic.get("disabledPlans") or []
            # Récupère le nom depuis pool_map ou SKU_MAP
            sku_name = _SKU_MAP.get(sku_id)
            if not sku_name:
                # Cherche dans la liste de SKUs déjà récupérée
                sku_name = next(
                    (_sku_name(s.get("skuId",""), s.get("skuPartNumber",""))
                     for s in skus if s.get("skuId") == sku_id),
                    sku_id,  # fallback = GUID brut
                )

            pool_id    = pool_map.get(sku_id)
            assign_id  = _upsert_assignment(
                org_id=org_id,
                identity_id=identity_id,
                account_id=account_id,
                pool_id=pool_id,
                sku_name=sku_name,
            )
            stats["assignments"] += 1

            # 4d. Usage (seulement pour les licences M365/O365 principales)
            if assign_id and any(k in sku_name for k in ("E1","E3","E5","Basic","Standard","Premium","F1","F3")):
                score, tier = _score_and_tier(apps, days_inactive, sku_name)
                _upsert_usage(
                    org_id=org_id,
                    assignment_id=assign_id,
                    metrics={
                        **apps,
                        "days_inactive":  days_inactive,
                        "last_activity":  last_active,
                        "sign_in_days":   days_since_signin,
                        "account_enabled": enabled,
                        "sku":            sku_name,
                    },
                    score=score,
                    tier=tier,
                )
                stats["usage"] += 1

        # 4e. Posture sécurité (MFA)
        if identity_id:
            mfa_info   = mfa_data.get(upn) or mfa_data.get(email) or {}
            mfa_enabled = mfa_info.get("mfa_registered", False)
            mfa_method  = mfa_info.get("mfa_method", "none")
            privileged  = mfa_info.get("is_privileged", False)
            factors     = []
            if not mfa_enabled:
                factors.append("no_mfa")
            if privileged and not mfa_enabled:
                factors.append("privileged_no_mfa")
            if days_inactive > 90:
                factors.append("inactive_90d")
            if not enabled:
                factors.append("account_disabled")

            if mfa_data:  # seulement si on a pu récupérer les données MFA
                _upsert_posture(
                    org_id=org_id,
                    identity_id=identity_id,
                    mfa_enabled=mfa_enabled,
                    mfa_method=mfa_method,
                    privileged=privileged,
                    risk_factors=factors,
                )
                stats["mfa"] += 1

    log.info("M365 sync terminé : %s", stats)
    return stats

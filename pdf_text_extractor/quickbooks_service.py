"""QuickBooks Online — vrais appels Intuit REST API v3.

Auth : OAuth 2.0 (tokens stockés chiffrés en base via connector_loader).
Données : factures, dépenses, clients, bilans, trésorerie.
"""

from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
_BASE_PROD = "https://quickbooks.api.intuit.com/v3/company"
_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com/v3/company"


def _base(creds: dict) -> str:
    return _BASE_SANDBOX if creds.get("sandbox") else _BASE_PROD


def _query(realm_id: str, creds: dict, sql: str) -> list[dict]:
    url = f"{_base(creds)}/{realm_id}/query"
    r = httpx.get(url, headers={**bearer(creds), "Accept": "application/json"}, params={"query": sql}, timeout=12)
    r.raise_for_status()
    data = r.json().get("QueryResponse", {})
    # Retourne la première liste trouvée (Invoice, Bill, Account…)
    for v in data.values():
        if isinstance(v, list):
            return v
    return []


def query_quickbooks(category: str, org_id: str, period: str = "current_month") -> dict:
    creds, cid = load_creds("quickbooks", org_id)
    if not creds:
        return {"error": "QuickBooks non connecté"}

    creds = refresh_oauth(creds, cid, _TOKEN_URL, "QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET")
    realm_id = creds.get("realm_id") or creds.get("realmId", "")
    if not realm_id:
        return {"error": "realm_id QuickBooks manquant dans les credentials"}

    try:
        if category == "invoices":
            rows = _query(
                realm_id,
                creds,
                "SELECT Id, DocNumber, CustomerRef, TotalAmt, Balance, DueDate, TxnDate "
                "FROM Invoice WHERE Balance > '0' ORDERBY DueDate DESC MAXRESULTS 20",
            )
            total = sum(float(r.get("TotalAmt", 0)) for r in rows)
            overdue = [r for r in rows if r.get("Balance", 0) > 0 and r.get("DueDate", "9") < "2099"]
            return {
                "factures_envoyées": len(rows),
                "montant_total": f"{total:,.0f} CAD",
                "en_attente_paiement": len(overdue),
                "details": [
                    {
                        "client": r.get("CustomerRef", {}).get("name"),
                        "montant": r.get("TotalAmt"),
                        "solde": r.get("Balance"),
                        "échéance": r.get("DueDate"),
                    }
                    for r in rows[:10]
                ],
            }

        if category == "expenses":
            rows = _query(
                realm_id,
                creds,
                "SELECT Id, TxnDate, TotalAmt, AccountRef, EntityRef " "FROM Bill ORDERBY TxnDate DESC MAXRESULTS 20",
            )
            total = sum(float(r.get("TotalAmt", 0)) for r in rows)
            return {
                "dépenses_total": f"{total:,.0f} CAD",
                "nombre_factures_fournisseurs": len(rows),
                "details": [
                    {
                        "fournisseur": r.get("EntityRef", {}).get("name"),
                        "montant": r.get("TotalAmt"),
                        "date": r.get("TxnDate"),
                    }
                    for r in rows[:10]
                ],
            }

        if category in ("balance_sheet", "bilan"):
            url = f"{_base(creds)}/{realm_id}/reports/BalanceSheet"
            r = httpx.get(
                url, headers={**bearer(creds), "Accept": "application/json"}, params={"minorversion": "65"}, timeout=15
            )
            r.raise_for_status()
            report = r.json()
            header = report.get("Header", {})
            return {
                "rapport": "Bilan",
                "période": header.get("DateMacro", period),
                "devise": header.get("Currency", "CAD"),
                "résumé": report.get("Rows", {}).get("Row", [])[:5],
            }

        if category in ("profit_loss", "compte_résultat"):
            url = f"{_base(creds)}/{realm_id}/reports/ProfitAndLoss"
            r = httpx.get(
                url, headers={**bearer(creds), "Accept": "application/json"}, params={"minorversion": "65"}, timeout=15
            )
            r.raise_for_status()
            report = r.json()
            return {
                "rapport": "Compte de résultat",
                "période": period,
                "résumé": report.get("Rows", {}).get("Row", [])[:8],
            }

        if category == "customers":
            rows = _query(
                realm_id,
                creds,
                "SELECT Id, DisplayName, Balance, PrimaryEmailAddr "
                "FROM Customer WHERE Active = true ORDERBY Balance DESC MAXRESULTS 10",
            )
            return {
                "clients_actifs": len(rows),
                "top_soldes": [
                    {
                        "client": r.get("DisplayName"),
                        "solde": r.get("Balance"),
                        "email": r.get("PrimaryEmailAddr", {}).get("Address"),
                    }
                    for r in rows
                ],
            }

        return {"error": f"Catégorie QuickBooks inconnue : {category}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"QuickBooks API HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": str(exc)}

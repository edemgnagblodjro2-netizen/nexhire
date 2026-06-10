"""Epicor Kinetic ERP — production, stocks, achats, finances via Epicor REST API v1.

Auth : Basic Auth (username:password) avec API Key optionnel en en-tête.
Instance auto-hébergée — URL propre par organisation. Aucune variable d'env requise.
"""
from __future__ import annotations

import base64
from datetime import date

import httpx
from connector_loader import load_creds


def _headers(username: str, password: str, api_key: str | None = None) -> dict:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    h = {
        "Authorization": f"Basic {token}",
        "Accept":        "application/json",
        "Content-Type":  "application/json",
    }
    if api_key:
        h["X-API-Key"] = api_key
    return h


def query_epicor(category: str, org_id: str, period: str = "current_month") -> dict:
    creds, _ = load_creds("epicor", org_id)
    if not creds:
        return {"error": "Epicor non connecté"}

    api_url    = creds.get("api_url", "").rstrip("/")
    username   = creds.get("username", "").strip()
    password   = creds.get("password", "").strip()
    company_id = creds.get("company_id", "").strip()
    api_key    = creds.get("api_key", "").strip() or None

    if not api_url or not username or not password or not company_id:
        return {"error": "Credentials Epicor incomplets — reconfigurer le connecteur (URL, utilisateur, mot de passe, Company ID)"}

    hdrs   = _headers(username, password, api_key)
    params = {"$company": company_id, "$top": 20}
    today  = date.today()
    first  = today.replace(day=1).isoformat()

    try:
        if category == "production_orders":
            r = httpx.get(f"{api_url}/Erp.BO.JobEntrySvc/JobHeads",
                          headers=hdrs,
                          params={**params,
                                  "$select": "JobNum,PartNum,JobDescription,JobComplete,DueDate,StartDate,QtyCompleted,ProdQty",
                                  "$filter": f"StartDate ge {first}"},
                          timeout=15)
            r.raise_for_status()
            jobs = r.json().get("value", [])
            completes = [j for j in jobs if j.get("JobComplete")]
            en_cours  = [j for j in jobs if not j.get("JobComplete")]
            today_str = today.isoformat()
            en_retard = [j for j in en_cours
                         if j.get("DueDate", "9999") < today_str]
            return {
                "ordres_total": len(jobs),
                "complétés":    len(completes),
                "en_cours":     len(en_cours),
                "en_retard":    len(en_retard),
                "retards": [
                    {"ordre": j.get("JobNum"), "article": j.get("PartNum"),
                     "description": j.get("JobDescription"), "échéance": j.get("DueDate")}
                    for j in en_retard[:5]
                ],
                "source": "epicor",
            }

        if category == "inventory":
            r = httpx.get(f"{api_url}/Erp.BO.PartSvc/Parts",
                          headers=hdrs,
                          params={**params,
                                  "$select": "PartNum,PartDescription,OnHandQty,MinStockQty,UnitPrice",
                                  "$filter": "InActive eq false"},
                          timeout=15)
            r.raise_for_status()
            parts = r.json().get("value", [])
            ruptures  = [p for p in parts if p.get("OnHandQty", 1) <= 0]
            sous_seuil = [p for p in parts
                          if 0 < p.get("OnHandQty", 0) < p.get("MinStockQty", 0)]
            valeur = sum(
                p.get("OnHandQty", 0) * p.get("UnitPrice", 0)
                for p in parts
            )
            return {
                "articles_total":  len(parts),
                "ruptures_stock":  len(ruptures),
                "sous_seuil":      len(sous_seuil),
                "valeur_totale":   f"{valeur:,.0f} CAD",
                "alertes": [
                    {"article": p.get("PartNum"), "nom": p.get("PartDescription"),
                     "stock": p.get("OnHandQty"), "min_requis": p.get("MinStockQty")}
                    for p in (ruptures + sous_seuil)[:5]
                ],
                "source": "epicor",
            }

        if category == "purchasing":
            r = httpx.get(f"{api_url}/Erp.BO.POSvc/POHeaders",
                          headers=hdrs,
                          params={**params,
                                  "$select": "PONum,VendorID,VendorName,OrderDate,DueDate,OpenOrder,TotalOrderAmt",
                                  "$filter": f"OpenOrder eq true and OrderDate ge {first}"},
                          timeout=15)
            r.raise_for_status()
            pos = r.json().get("value", [])
            total = sum(p.get("TotalOrderAmt", 0) for p in pos)
            today_str = today.isoformat()
            en_retard = [p for p in pos if p.get("DueDate", "9999") < today_str]
            return {
                "commandes_ouvertes":    len(pos),
                "en_retard_livraison":   len(en_retard),
                "total_engagé":          f"{total:,.0f} CAD",
                "commandes": [
                    {"no": p.get("PONum"), "fournisseur": p.get("VendorName"),
                     "montant": p.get("TotalOrderAmt"), "échéance": p.get("DueDate")}
                    for p in pos[:10]
                ],
                "source": "epicor",
            }

        if category == "financials":
            r = httpx.get(f"{api_url}/Erp.BO.GLJrnDtlSvc/GLJrnDtls",
                          headers=hdrs,
                          params={**params,
                                  "$select": "FiscalPeriod,FiscalYear,DebitAmount,CreditAmount,Description",
                                  "$filter": f"FiscalYear eq {today.year}"},
                          timeout=15)
            r.raise_for_status()
            entries = r.json().get("value", [])
            total_debit  = sum(e.get("DebitAmount", 0)  for e in entries)
            total_credit = sum(e.get("CreditAmount", 0) for e in entries)
            return {
                "écritures_total": len(entries),
                "total_débits":    f"{total_debit:,.0f} CAD",
                "total_crédits":   f"{total_credit:,.0f} CAD",
                "période":         f"{first} → {today.isoformat()}",
                "source":          "epicor",
            }

        return {"error": f"Catégorie Epicor inconnue : {category}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"Epicor HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": str(exc)}

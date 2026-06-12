"""Routes API — Transactions financières IT & Fournisseurs."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import ROLE_RANK, require_min_role

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


# ─────────────────────────────────────────────────────────────────────────────
# Modèles
# ─────────────────────────────────────────────────────────────────────────────

class TransactionPayload(BaseModel):
    transaction_date: str = Field(..., description="YYYY-MM-DD")
    amount:           float = Field(..., ge=0)
    currency:         str = "CAD"
    description:      str | None = None
    reference_number: str | None = None
    category:         str = "other"
    status:           str = "paid"
    vendor_name:      str | None = None
    vendor_id:        str | None = None
    department_id:    str | None = None
    contract_id:      str | None = None
    source:           str = "manual"


class VendorPayload(BaseModel):
    name:        str = Field(..., min_length=1)
    website:     str | None = None
    category:    str = "other"
    contract_id: str | None = None
    notes:       str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Transactions — CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
def list_transactions(
    year:      int | None = Query(None),
    month:     int | None = Query(None, ge=1, le=12),
    vendor_id: str | None = None,
    dept_id:   str | None = None,
    status:    str | None = None,
    flagged:   bool | None = None,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    """Liste les transactions, filtrables. Manager+."""
    params: list[Any] = [user.organization_id]
    where = "WHERE ft.organization_id = %s"

    if year:
        where += " AND EXTRACT(YEAR FROM ft.transaction_date) = %s"
        params.append(year)
    if month:
        where += " AND EXTRACT(MONTH FROM ft.transaction_date) = %s"
        params.append(month)
    if vendor_id:
        where += " AND ft.vendor_id = %s"
        params.append(vendor_id)
    if dept_id:
        where += " AND ft.department_id = %s"
        params.append(dept_id)
    if status:
        where += " AND ft.status = %s"
        params.append(status)
    if flagged is not None:
        where += " AND ft.is_flagged = %s"
        params.append(flagged)

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT
              ft.id, ft.transaction_date, ft.amount, ft.currency,
              ft.description, ft.reference_number, ft.category, ft.status,
              ft.source, ft.is_flagged, ft.flag_reason,
              ft.created_at,
              v.name   AS vendor_name,
              v.id     AS vendor_id,
              d.name   AS department_name,
              c.vendor AS contract_vendor
            FROM public.financial_transactions ft
            LEFT JOIN public.vendors     v ON v.id = ft.vendor_id
            LEFT JOIN public.departments d ON d.id = ft.department_id
            LEFT JOIN public.contracts   c ON c.id = ft.contract_id
            {where}
            ORDER BY ft.transaction_date DESC, ft.created_at DESC
            LIMIT 500
            """,
            params,
        )
        return rows(cur)


@router.get("/summary")
def transactions_summary(
    year: int | None = Query(None),
    user: CurrentUser = Depends(require_min_role("manager")),
):
    """KPIs financiers : total réel, top fournisseurs, burn rate mensuel, anomalies."""
    org = user.organization_id
    y_filter = f"AND EXTRACT(YEAR FROM transaction_date) = {year}" if year else ""

    with get_db() as cur:
        # Totaux globaux
        cur.execute(
            f"""
            SELECT
              COALESCE(SUM(amount) FILTER (WHERE status='paid'), 0)       AS total_paid,
              COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)    AS total_pending,
              COUNT(*) FILTER (WHERE status='paid')                       AS count_paid,
              COUNT(*) FILTER (WHERE is_flagged = true)                   AS flagged_count,
              COUNT(DISTINCT vendor_id)                                   AS vendor_count
            FROM public.financial_transactions
            WHERE organization_id = %s {y_filter}
            """,
            (org,),
        )
        totals = cur.fetchone()

        # Burn rate mensuel (12 derniers mois)
        cur.execute(
            """
            SELECT
              TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
              SUM(amount) FILTER (WHERE status='paid')                   AS paid
            FROM public.financial_transactions
            WHERE organization_id = %s
              AND transaction_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', transaction_date)
            ORDER BY DATE_TRUNC('month', transaction_date)
            """,
            (org,),
        )
        burn_rate = rows(cur)

        # Top 10 fournisseurs par dépense
        cur.execute(
            f"""
            SELECT
              COALESCE(v.name, 'Fournisseur inconnu') AS vendor_name,
              SUM(ft.amount) FILTER (WHERE ft.status='paid')  AS total,
              COUNT(*)                                         AS count
            FROM public.financial_transactions ft
            LEFT JOIN public.vendors v ON v.id = ft.vendor_id
            WHERE ft.organization_id = %s {y_filter}
            GROUP BY v.name
            ORDER BY total DESC NULLS LAST
            LIMIT 10
            """,
            (org,),
        )
        top_vendors = rows(cur)

        # Dépenses par catégorie
        cur.execute(
            f"""
            SELECT
              category,
              SUM(amount) FILTER (WHERE status='paid') AS total,
              COUNT(*) AS count
            FROM public.financial_transactions
            WHERE organization_id = %s {y_filter}
            GROUP BY category
            ORDER BY total DESC NULLS LAST
            """,
            (org,),
        )
        by_category = rows(cur)

    total_paid = float(totals["total_paid"] or 0)

    return {
        "total_paid":     round(total_paid, 2),
        "total_pending":  round(float(totals["total_pending"] or 0), 2),
        "count_paid":     int(totals["count_paid"] or 0),
        "flagged_count":  int(totals["flagged_count"] or 0),
        "vendor_count":   int(totals["vendor_count"] or 0),
        "burn_rate": [
            {"month": r["month"], "paid": round(float(r["paid"] or 0), 2)}
            for r in burn_rate
        ],
        "top_vendors": [
            {
                "vendor_name": r["vendor_name"],
                "total":       round(float(r["total"] or 0), 2),
                "count":       int(r["count"]),
                "share_pct":   round(float(r["total"] or 0) / total_paid * 100, 1) if total_paid else 0,
            }
            for r in top_vendors
        ],
        "by_category": [
            {
                "category": r["category"] or "other",
                "total":    round(float(r["total"] or 0), 2),
                "count":    int(r["count"]),
            }
            for r in by_category
        ],
    }


@router.post("")
def create_transaction(
    payload: TransactionPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    """Crée une transaction. Résout ou crée le fournisseur automatiquement."""
    org = user.organization_id
    vendor_id = _resolve_vendor(org, payload.vendor_name, payload.vendor_id, payload.category)

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.financial_transactions
              (organization_id, transaction_date, amount, currency, description,
               reference_number, category, status, vendor_id, department_id,
               contract_id, source)
            VALUES (%s,%s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s)
            RETURNING id
            """,
            (
                org,
                payload.transaction_date,
                payload.amount,
                payload.currency,
                payload.description,
                payload.reference_number,
                payload.category,
                payload.status,
                vendor_id,
                payload.department_id or None,
                payload.contract_id or None,
                payload.source,
            ),
        )
        new_id = cur.fetchone()["id"]

    _detect_anomalies(org, str(new_id))
    return {"id": str(new_id), "ok": True}


@router.put("/{txn_id}")
def update_transaction(
    txn_id: str,
    payload: TransactionPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    vendor_id = _resolve_vendor(org, payload.vendor_name, payload.vendor_id, payload.category)

    with get_db() as cur:
        cur.execute(
            """
            UPDATE public.financial_transactions SET
              transaction_date = %s, amount = %s, currency = %s,
              description = %s, reference_number = %s, category = %s,
              status = %s, vendor_id = %s, department_id = %s,
              contract_id = %s, source = %s, updated_at = now()
            WHERE id = %s AND organization_id = %s
            RETURNING id
            """,
            (
                payload.transaction_date, payload.amount, payload.currency,
                payload.description, payload.reference_number, payload.category,
                payload.status, vendor_id, payload.department_id or None,
                payload.contract_id or None, payload.source,
                txn_id, org,
            ),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Transaction introuvable.")

    _detect_anomalies(org, txn_id)
    return {"ok": True}


@router.delete("/{txn_id}")
def delete_transaction(
    txn_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    with get_db() as cur:
        cur.execute(
            "DELETE FROM public.financial_transactions WHERE id = %s AND organization_id = %s RETURNING id",
            (txn_id, user.organization_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Transaction introuvable.")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Fournisseurs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/vendors")
def list_vendors(user: CurrentUser = Depends(require_min_role("manager"))):
    with get_db() as cur:
        cur.execute(
            """
            SELECT v.*,
                   COALESCE(SUM(ft.amount) FILTER (WHERE ft.status='paid'), 0) AS total_spend,
                   COUNT(ft.id)                                                  AS txn_count
            FROM public.vendors v
            LEFT JOIN public.financial_transactions ft ON ft.vendor_id = v.id
            WHERE v.organization_id = %s
            GROUP BY v.id
            ORDER BY total_spend DESC
            """,
            (user.organization_id,),
        )
        return rows(cur)


@router.post("/vendors")
def create_vendor(
    payload: VendorPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.vendors
              (organization_id, name, website, category, contract_id, notes)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON CONFLICT (organization_id, name) DO UPDATE SET
              website = EXCLUDED.website, category = EXCLUDED.category,
              contract_id = EXCLUDED.contract_id, notes = EXCLUDED.notes
            RETURNING id
            """,
            (
                user.organization_id, payload.name, payload.website,
                payload.category, payload.contract_id or None, payload.notes,
            ),
        )
        return {"id": str(cur.fetchone()["id"]), "ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Import CSV
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Import CSV de transactions.

    En-têtes acceptés (insensible à la casse) :
    date, vendor/fournisseur, amount/montant, currency/devise,
    description, reference, category/categorie, status/statut
    """
    import csv
    import io as _io
    from datetime import date as _date

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Fichier CSV requis (.csv).")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Fichier trop volumineux (max 5 Mo).")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise HTTPException(400, "Encodage non supporté — utilisez UTF-8.")

    reader = csv.DictReader(_io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "Fichier CSV vide ou sans en-têtes.")

    VALID_CATEGORIES = {"software", "hardware", "cloud", "telecom", "services", "maintenance", "other"}
    VALID_STATUSES   = {"paid", "pending", "cancelled"}
    org = user.organization_id

    imported, skipped = 0, 0
    errors: list[dict] = []
    new_ids: list[str] = []

    for line_no, raw in enumerate(reader, start=2):
        row = {k.lower().strip().replace(" ", "_"): (v or "").strip() for k, v in raw.items() if k}

        # Date
        raw_date = row.get("date") or row.get("transaction_date") or ""
        try:
            txn_date = str(_date.fromisoformat(raw_date[:10]))
        except (ValueError, TypeError):
            errors.append({"row": line_no, "error": f"Date invalide : '{raw_date}'"})
            skipped += 1
            continue

        # Montant
        raw_amount = row.get("amount") or row.get("montant") or ""
        try:
            amount = float(raw_amount.replace(",", ".").replace("$", "").replace("\xa0", "").replace(" ", ""))
            if amount < 0:
                raise ValueError()
        except (ValueError, TypeError):
            errors.append({"row": line_no, "error": f"Montant invalide : '{raw_amount}'"})
            skipped += 1
            continue

        vendor_name = row.get("vendor") or row.get("fournisseur") or None
        currency    = (row.get("currency") or row.get("devise") or "CAD").upper()[:3]
        description = row.get("description") or None
        reference   = row.get("reference") or row.get("reference_number") or None
        raw_cat     = (row.get("category") or row.get("categorie") or "other").lower()
        category    = raw_cat if raw_cat in VALID_CATEGORIES else "other"
        raw_status  = (row.get("status") or row.get("statut") or "paid").lower()
        txn_status  = raw_status if raw_status in VALID_STATUSES else "paid"

        try:
            vendor_id = _resolve_vendor(org, vendor_name, None, category)
            with get_db() as cur:
                cur.execute(
                    """
                    INSERT INTO public.financial_transactions
                      (organization_id, transaction_date, amount, currency,
                       description, reference_number, category, status, vendor_id, source)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'csv')
                    RETURNING id
                    """,
                    (org, txn_date, amount, currency,
                     description, reference, category, txn_status, vendor_id),
                )
                result = cur.fetchone()
            if result:
                new_ids.append(str(result["id"]))
                imported += 1
        except Exception as exc:
            errors.append({"row": line_no, "error": str(exc)[:200]})
            skipped += 1

    for tid in new_ids:
        try:
            _detect_anomalies(org, tid)
        except Exception:
            pass

    return {
        "imported":   imported,
        "skipped":    skipped,
        "total_rows": imported + skipped,
        "errors":     errors[:50],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers privés
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_vendor(org_id: str, vendor_name: str | None, vendor_id: str | None, category: str) -> str | None:
    """Retourne l'UUID du fournisseur, en le créant si nécessaire."""
    if vendor_id:
        return vendor_id
    if not vendor_name or not vendor_name.strip():
        return None
    name = vendor_name.strip()
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO public.vendors (organization_id, name, category)
            VALUES (%s, %s, %s)
            ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (org_id, name, category),
        )
        return str(cur.fetchone()["id"])


def _detect_anomalies(org_id: str, txn_id: str) -> None:
    """Détecte les doublons potentiels et marque is_flagged si besoin."""
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT t.id, t.amount, t.transaction_date, t.vendor_id
                FROM public.financial_transactions t
                WHERE t.id = %s AND t.organization_id = %s
                """,
                (txn_id, org_id),
            )
            txn = cur.fetchone()
            if not txn:
                return

            # Doublon : même fournisseur, même montant, même mois
            cur.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM public.financial_transactions
                WHERE organization_id = %s
                  AND id != %s
                  AND vendor_id = %s
                  AND amount = %s
                  AND DATE_TRUNC('month', transaction_date) =
                      DATE_TRUNC('month', %s::date)
                  AND status != 'cancelled'
                """,
                (org_id, txn_id, txn["vendor_id"], txn["amount"], txn["transaction_date"]),
            )
            dup_count = cur.fetchone()["cnt"]

            if dup_count > 0:
                cur.execute(
                    """
                    UPDATE public.financial_transactions
                    SET is_flagged = true,
                        flag_reason = 'Doublon potentiel : même fournisseur, même montant ce mois-ci'
                    WHERE id = %s
                    """,
                    (txn_id,),
                )
    except Exception:
        pass

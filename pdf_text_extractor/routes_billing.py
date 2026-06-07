"""Stripe billing — checkout, portail client, webhooks abonnement."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/billing", tags=["billing"])

STRIPE_SECRET_KEY     = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY  = os.environ.get("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_ANNUAL   = os.environ.get("STRIPE_PRICE_ANNUAL", "")
APP_URL               = os.environ.get("APP_URL", "https://nexhire.ca")

STRIPE_API = "https://api.stripe.com/v1"


def _stripe(method: str, path: str, data: dict | None = None) -> dict:
    """Appel Stripe simple via httpx."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing non configuré (STRIPE_SECRET_KEY manquant).")
    headers = {"Authorization": f"Bearer {STRIPE_SECRET_KEY}"}
    with httpx.Client(timeout=15) as client:
        if method == "GET":
            resp = client.get(f"{STRIPE_API}{path}", headers=headers, params=data)
        elif method == "POST":
            resp = client.post(f"{STRIPE_API}{path}", headers=headers, data=data)
        elif method == "DELETE":
            resp = client.delete(f"{STRIPE_API}{path}", headers=headers)
        else:
            raise ValueError(f"Méthode inconnue: {method}")
    if resp.status_code >= 400:
        err = resp.json().get("error", {}).get("message", resp.text)
        raise HTTPException(status_code=resp.status_code, detail=f"Stripe: {err}")
    return resp.json()


def _get_or_create_customer(org_id: str, org_name: str, email: str) -> str:
    """Retourne ou crée le Stripe customer_id pour cette organisation."""
    with get_db() as cur:
        cur.execute("SELECT stripe_customer_id FROM organizations WHERE id = %s LIMIT 1", (org_id,))
        r = row(cur)

    if r and r.get("stripe_customer_id"):
        return r["stripe_customer_id"]

    customer = _stripe("POST", "/customers", {
        "email": email,
        "name": org_name,
        "metadata[org_id]": org_id,
    })
    cid = customer["id"]

    with get_db() as cur:
        cur.execute(
            "UPDATE organizations SET stripe_customer_id = %s WHERE id = %s",
            (cid, org_id),
        )
    return cid


# ── GET /api/billing/status ───────────────────────────────────────────────────

@router.get("/status")
def billing_status(user: CurrentUser = Depends(require_min_role("user"))):
    """Retourne l'état de l'abonnement de l'organisation."""
    with get_db() as cur:
        cur.execute(
            """SELECT subscription_status, subscription_plan, subscription_end,
                      stripe_customer_id
               FROM organizations WHERE id = %s LIMIT 1""",
            (user.organization_id,),
        )
        r = row(cur) or {}
    return {
        "status":      r.get("subscription_status", "trialing"),
        "plan":        r.get("subscription_plan", "trial"),
        "ends_at":     r.get("subscription_end"),
        "has_stripe":  bool(r.get("stripe_customer_id")),
        "stripe_configured": bool(STRIPE_SECRET_KEY),
    }


# ── POST /api/billing/checkout ────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(monthly|annual)$")

@router.post("/checkout")
def create_checkout(
    payload: CheckoutRequest,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    """Crée une session Stripe Checkout et retourne l'URL de paiement."""
    price_id = STRIPE_PRICE_MONTHLY if payload.plan == "monthly" else STRIPE_PRICE_ANNUAL
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Prix Stripe non configuré pour le plan {payload.plan}.")

    # Récupère les infos de l'organisation
    with get_db() as cur:
        cur.execute("SELECT name, slug FROM organizations WHERE id = %s LIMIT 1", (user.organization_id,))
        org = row(cur) or {}

    customer_id = _get_or_create_customer(
        org_id=user.organization_id,
        org_name=org.get("name", "Organisation"),
        email=user.email or "",
    )

    session = _stripe("POST", "/checkout/sessions", {
        "customer":              customer_id,
        "mode":                  "subscription",
        "payment_method_types[]": "card",
        "line_items[0][price]":  price_id,
        "line_items[0][quantity]": "1",
        "success_url":           f"{APP_URL}?billing=success&plan={payload.plan}",
        "cancel_url":            f"{APP_URL}?billing=cancelled",
        "metadata[org_id]":      user.organization_id,
        "metadata[plan]":        payload.plan,
        "allow_promotion_codes": "true",
    })
    return {"checkout_url": session["url"]}


# ── POST /api/billing/portal ──────────────────────────────────────────────────

@router.post("/portal")
def customer_portal(user: CurrentUser = Depends(require_min_role("owner"))):
    """Crée une session Stripe Customer Portal pour gérer l'abonnement."""
    with get_db() as cur:
        cur.execute("SELECT stripe_customer_id FROM organizations WHERE id = %s LIMIT 1", (user.organization_id,))
        r = row(cur)

    if not r or not r.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="Aucun abonnement Stripe trouvé. Souscrivez d'abord un plan.")

    session = _stripe("POST", "/billing_portal/sessions", {
        "customer":   r["stripe_customer_id"],
        "return_url": f"{APP_URL}#settings",
    })
    return {"portal_url": session["url"]}


# ── POST /api/billing/webhook ─────────────────────────────────────────────────

@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, background: BackgroundTasks):
    """Gère les événements Stripe (subscription.created / updated / deleted)."""
    payload     = await request.body()
    sig_header  = request.headers.get("stripe-signature", "")

    # Vérification signature Stripe
    if STRIPE_WEBHOOK_SECRET:
        try:
            _verify_stripe_signature(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Payload invalide.")

    event_type = event.get("type", "")
    obj        = event.get("data", {}).get("object", {})

    if event_type in ("customer.subscription.created", "customer.subscription.updated"):
        background.add_task(_handle_subscription_upsert, obj)
    elif event_type == "customer.subscription.deleted":
        background.add_task(_handle_subscription_cancelled, obj)

    return {"received": True}


def _verify_stripe_signature(payload: bytes, sig_header: str, secret: str) -> None:
    parts = {p.split("=")[0]: p.split("=")[1] for p in sig_header.split(",") if "=" in p}
    ts        = int(parts.get("t", 0))
    signatures = [v for k, v in parts.items() if k == "v1"]

    if abs(time.time() - ts) > 300:
        raise ValueError("Webhook trop ancien (replay protection).")

    signed    = f"{ts}.".encode() + payload
    expected  = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()  # type: ignore[attr-defined]
    if not any(hmac.compare_digest(expected, sig) for sig in signatures):
        raise ValueError("Signature Stripe invalide.")


def _handle_subscription_upsert(sub: dict) -> None:
    """Met à jour l'abonnement dans la BD selon le webhook Stripe."""
    from datetime import datetime, timezone

    customer_id = sub.get("customer", "")
    stripe_status = sub.get("status", "")
    period_end  = sub.get("current_period_end")
    items       = sub.get("items", {}).get("data", [])
    price_id    = items[0]["price"]["id"] if items else ""

    # Détermine le plan
    plan = "monthly"
    if price_id == STRIPE_PRICE_ANNUAL:
        plan = "annual"

    # Mappe le statut Stripe → statut NexHire
    status_map = {
        "active":            "active",
        "trialing":          "trialing",
        "past_due":          "past_due",
        "canceled":          "cancelled",
        "unpaid":            "past_due",
        "incomplete":        "trialing",
        "incomplete_expired": "cancelled",
    }
    nexhire_status = status_map.get(stripe_status, "trialing")

    end_dt = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat() if period_end else None

    try:
        with get_db() as cur:
            cur.execute(
                """UPDATE organizations SET
                       subscription_status = %s,
                       subscription_plan   = %s,
                       subscription_end    = %s
                   WHERE stripe_customer_id = %s""",
                (nexhire_status, plan, end_dt, customer_id),
            )
    except Exception:
        pass


def _handle_subscription_cancelled(sub: dict) -> None:
    """Marque l'abonnement comme annulé."""
    customer_id = sub.get("customer", "")
    try:
        with get_db() as cur:
            cur.execute(
                "UPDATE organizations SET subscription_status = 'cancelled' WHERE stripe_customer_id = %s",
                (customer_id,),
            )
        # Envoie un email de confirmation d'annulation si possible
        with get_db() as cur:
            cur.execute(
                "SELECT name, owner_email FROM organizations WHERE stripe_customer_id = %s LIMIT 1",
                (customer_id,),
            )
            org = row(cur) or {}
        if org.get("owner_email"):
            pass  # TODO: send cancellation email
    except Exception:
        pass

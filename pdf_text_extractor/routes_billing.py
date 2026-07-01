"""Stripe billing — checkout, portail client, webhooks abonnement."""

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
STRIPE_PRICE_STARTER       = os.environ.get("STRIPE_PRICE_STARTER", "")
STRIPE_PRICE_PROFESSIONAL  = os.environ.get("STRIPE_PRICE_PROFESSIONAL", "")
APP_URL               = os.environ.get("APP_URL", "https://myportal.nexhire.ca")

STRIPE_API = "https://api.stripe.com/v1"


def _stripe(method: str, path: str, data: dict | None = None) -> dict:
    """Appel Stripe simple via httpx."""
    key = os.environ.get("STRIPE_SECRET_KEY", "") or STRIPE_SECRET_KEY
    if not key:
        raise HTTPException(status_code=503, detail="Billing non configuré (STRIPE_SECRET_KEY manquant).")
    headers = {"Authorization": f"Bearer {key}"}
    try:
        with httpx.Client(timeout=15) as client:
            if method == "GET":
                resp = client.get(f"{STRIPE_API}{path}", headers=headers, params=data)
            elif method == "POST":
                resp = client.post(f"{STRIPE_API}{path}", headers=headers, data=data)
            elif method == "DELETE":
                resp = client.delete(f"{STRIPE_API}{path}", headers=headers)
            else:
                raise ValueError(f"Méthode inconnue: {method}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="Stripe temporairement inaccessible — réessayez dans quelques secondes.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Erreur réseau Stripe : {exc}")
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


# ── GET /api/billing/debug (admin only) ──────────────────────────────────────

@router.get("/debug")
def billing_debug(user: CurrentUser = Depends(require_min_role("admin"))):
    """Diagnostic — vérifie quelles variables Stripe sont présentes (sans révéler les valeurs)."""
    def _masked(val: str) -> str:
        return val[:8] + "****" if val and len(val) > 8 else ("(vide)" if not val else val)

    key      = os.environ.get("STRIPE_SECRET_KEY", "")
    starter      = os.environ.get("STRIPE_PRICE_STARTER", "")
    professional = os.environ.get("STRIPE_PRICE_PROFESSIONAL", "")
    webhook      = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    return {
        "STRIPE_SECRET_KEY":          {"set": bool(key),          "preview": _masked(key)},
        "STRIPE_PRICE_STARTER":       {"set": bool(starter),      "preview": _masked(starter)},
        "STRIPE_PRICE_PROFESSIONAL":  {"set": bool(professional),  "preview": _masked(professional)},
        "STRIPE_WEBHOOK_SECRET":      {"set": bool(webhook),       "preview": _masked(webhook)},
    }


# ── GET /api/billing/status ───────────────────────────────────────────────────

@router.get("/status")
def billing_status(user: CurrentUser = Depends(require_min_role("manager"))):
    """Retourne l'état de l'abonnement de l'organisation."""
    # Relecture dynamique pour prendre en compte les mises à jour d'env sans redémarrage
    live_key = os.environ.get("STRIPE_SECRET_KEY", "") or STRIPE_SECRET_KEY
    with get_db() as cur:
        cur.execute(
            """SELECT subscription_status, subscription_plan, subscription_end,
                      trial_ends_at, stripe_customer_id
               FROM organizations WHERE id = %s LIMIT 1""",
            (user.organization_id,),
        )
        r = row(cur) or {}
    return {
        "status":        r.get("subscription_status", "trialing"),
        "plan":          r.get("subscription_plan", "trial"),
        "ends_at":       r.get("subscription_end"),
        "trial_ends_at": r.get("trial_ends_at"),
        "has_stripe":    bool(r.get("stripe_customer_id")),
        "stripe_configured": bool(live_key),
        "price_starter_set":       bool(os.environ.get("STRIPE_PRICE_STARTER", "")       or STRIPE_PRICE_STARTER),
        "price_professional_set":  bool(os.environ.get("STRIPE_PRICE_PROFESSIONAL", "")  or STRIPE_PRICE_PROFESSIONAL),
    }


# ── POST /api/billing/checkout ────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(starter|professional)$")

@router.post("/checkout")
def create_checkout(
    payload: CheckoutRequest,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    """Crée une session Stripe Checkout et retourne l'URL de paiement."""
    live_starter       = os.environ.get("STRIPE_PRICE_STARTER", "")       or STRIPE_PRICE_STARTER
    live_professional  = os.environ.get("STRIPE_PRICE_PROFESSIONAL", "")  or STRIPE_PRICE_PROFESSIONAL
    price_id = live_starter if payload.plan == "starter" else live_professional
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

    # Vérification signature Stripe — refus strict si secret absent
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook non configuré — contactez l'administrateur.")
    try:
        _verify_stripe_signature(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Payload invalide.")

    event_id   = event.get("id", "")
    event_type = event.get("type", "")
    obj        = event.get("data", {}).get("object", {})

    # Idempotence — rejeter les événements déjà traités
    if event_id and not _mark_event_processed(event_id):
        return {"received": True, "skipped": "duplicate"}

    if event_type in ("customer.subscription.created", "customer.subscription.updated"):
        background.add_task(_handle_subscription_upsert, obj, event_id)
    elif event_type == "customer.subscription.deleted":
        background.add_task(_handle_subscription_cancelled, obj)

    return {"received": True}


def _mark_event_processed(event_id: str) -> bool:
    """Tente d'enregistrer l'event_id. Retourne True si nouveau, False si déjà traité.
    La table stripe_processed_events doit exister (phase_stripe_idempotency.sql)."""
    try:
        with get_db() as cur:
            cur.execute(
                "INSERT INTO stripe_processed_events (event_id) VALUES (%s) ON CONFLICT DO NOTHING",
                (event_id,),
            )
            return cur.rowcount > 0
    except Exception as exc:
        import sys
        print(f"[billing] _mark_event_processed error: {exc}", file=sys.stderr)
        return True  # En cas d'erreur DB, on laisse passer pour ne pas bloquer


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


def _handle_subscription_upsert(sub: dict, event_id: str = "") -> None:
    """Met à jour l'abonnement dans la BD selon le webhook Stripe."""
    import sys
    from datetime import datetime, timezone

    customer_id   = sub.get("customer", "")
    stripe_status = sub.get("status", "")
    period_end    = sub.get("current_period_end")
    items         = sub.get("items", {}).get("data", [])
    price_id      = items[0]["price"]["id"] if items else ""

    # Détermine le plan — log explicite si price_id inconnu
    live_starter      = os.environ.get("STRIPE_PRICE_STARTER", "")      or STRIPE_PRICE_STARTER
    live_professional = os.environ.get("STRIPE_PRICE_PROFESSIONAL", "") or STRIPE_PRICE_PROFESSIONAL

    if price_id == live_professional:
        plan = "professional"
    elif price_id == live_starter or not price_id:
        plan = "starter"
    else:
        print(
            f"[billing] WARN price_id inconnu '{price_id}' (event={event_id}) — défaut starter",
            file=sys.stderr,
        )
        plan = "starter"

    # Mappe le statut Stripe → statut NexHire
    status_map = {
        "active":             "active",
        "trialing":           "trialing",
        "past_due":           "past_due",
        "canceled":           "cancelled",
        "unpaid":             "past_due",
        "incomplete":         "trialing",
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
    except Exception as exc:
        print(f"[billing] ERREUR mise à jour abonnement (event={event_id}): {exc}", file=sys.stderr)
        return

    try:
        from routes_webhooks import send_webhook_notification
        from email_service import send_subscription_confirmation
        with get_db() as cur:
            cur.execute(
                "SELECT id, name, owner_email FROM organizations WHERE stripe_customer_id = %s LIMIT 1",
                (customer_id,),
            )
            org_row = row(cur)
        if org_row:
            send_webhook_notification(org_row["id"], "subscription", {
                "status": nexhire_status,
                "plan": plan,
            })
            if nexhire_status == "active" and org_row.get("owner_email"):
                amounts = {"starter": "99 $/mois", "professional": "299 $/mois"}
                send_subscription_confirmation(
                    to_email=org_row["owner_email"],
                    org_name=org_row.get("name", ""),
                    plan=plan,
                    amount=amounts.get(plan, ""),
                )
    except Exception as exc:
        print(f"[billing] WARN notification post-abonnement (event={event_id}): {exc}", file=sys.stderr)


def _handle_subscription_cancelled(sub: dict) -> None:
    """Marque l'abonnement comme annulé."""
    import sys
    customer_id = sub.get("customer", "")
    try:
        with get_db() as cur:
            cur.execute(
                "UPDATE organizations SET subscription_status = 'cancelled' WHERE stripe_customer_id = %s",
                (customer_id,),
            )
        with get_db() as cur:
            cur.execute(
                "SELECT id, name, owner_email FROM organizations WHERE stripe_customer_id = %s LIMIT 1",
                (customer_id,),
            )
            org = row(cur) or {}
        if org.get("owner_email"):
            from email_service import send_subscription_cancelled_email
            send_subscription_cancelled_email(
                to_email=org["owner_email"],
                org_name=org.get("name", ""),
            )
        if org.get("id"):
            from routes_webhooks import send_webhook_notification
            send_webhook_notification(org["id"], "subscription", {"status": "cancelled", "plan": ""})
    except Exception as exc:
        print(f"[billing] ERREUR annulation abonnement customer={customer_id}: {exc}", file=sys.stderr)

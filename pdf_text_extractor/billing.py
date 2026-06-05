from __future__ import annotations

import os

import stripe


PLAN_PRICE_ENV = {
    "monthly": "STRIPE_MONTHLY_PRICE_ID",
    "annual": "STRIPE_ANNUAL_PRICE_ID",
}


class BillingConfigurationError(Exception):
    """Raised when Stripe billing is not configured."""


def configured_plans() -> list[dict]:
    return [
        {
            "id": "monthly",
            "price": 99,
            "currency": "CAD",
            "interval": "month",
            "stripe_price_id_configured": bool(os.getenv("STRIPE_MONTHLY_PRICE_ID")),
        },
        {
            "id": "annual",
            "price": 990,
            "currency": "CAD",
            "interval": "year",
            "stripe_price_id_configured": bool(os.getenv("STRIPE_ANNUAL_PRICE_ID")),
        },
    ]


def create_checkout_session(
    *,
    plan: str,
    customer_email: str,
    success_url: str,
    cancel_url: str,
) -> dict:
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise BillingConfigurationError("STRIPE_SECRET_KEY est requis pour Stripe Checkout.")

    price_id = os.getenv(PLAN_PRICE_ENV[plan])
    if not price_id:
        raise BillingConfigurationError(f"{PLAN_PRICE_ENV[plan]} est requis pour le plan {plan}.")

    stripe.api_key = stripe_key
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=customer_email,
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={"trial_period_days": 14},
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"plan": plan, "product": "nexhire_enterprise_assistant"},
    )
    return {"id": session.id, "url": session.url}

"""Compteurs d'utilisation mensuels par organisation.

Chaque appel à `check_and_consume_query` :
  1. Vérifie que l'organisation n'a pas dépassé son quota mensuel.
  2. Si OK, incrémente le compteur atomiquement en base.
  3. Lève HTTP 429 si le quota est atteint.

Limite par statut d'abonnement :
  trial      → 100 requêtes / mois
  active     → 1 000 requêtes / mois
  enterprise → illimité
  (autre)    → 50 requêtes / mois (conservateur)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import HTTPException, status

from supabase_client import service_client

logger = logging.getLogger(__name__)

_PLAN_LIMITS: dict[str, int] = {
    "trialing": 100,  # Supabase émet "trialing", pas "trial"
    "active": 1_000,
    "enterprise": -1,  # illimité
}
_DEFAULT_LIMIT = 50


def _plan_limit(subscription_status: str | None) -> int:
    if subscription_status is None:
        return _DEFAULT_LIMIT
    return _PLAN_LIMITS.get(subscription_status, _DEFAULT_LIMIT)


def _current_period() -> str:
    return datetime.now(UTC).strftime("%Y-%m")


def check_and_consume_query(
    organization_id: str | None,
    subscription_status: str | None,
) -> None:
    """Vérifie le quota et incrémente. Lève HTTP 429 si dépassé.

    Ne bloque JAMAIS la requête pour une erreur DB (fail-open) — le service
    ne doit pas tomber si la table usage_counters est temporairement inaccessible.
    """
    if not organization_id:
        return

    limit = _plan_limit(subscription_status)
    period = _current_period()

    try:
        sb = service_client()
        res = sb.rpc(
            "check_and_increment_agent_query",
            {"p_org_id": organization_id, "p_period": period, "p_limit": limit},
        ).execute()
        data: dict = res.data or {}
    except Exception:
        logger.exception("Échec usage_counters — requête autorisée (fail-open)")
        return

    if not data.get("allowed", True):
        used = data.get("used", "?")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Quota mensuel atteint ({used}/{limit} requêtes d'agent). "
                "Contactez le support pour augmenter votre limite."
            ),
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Used": str(used),
                "X-RateLimit-Reset": f"{_current_period()}-01",
            },
        )

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from auth import CurrentUser, get_current_user

# Hiérarchie des rôles : owner > admin > manager > user.
ROLE_RANK: dict[str, int] = {"user": 1, "manager": 2, "admin": 3, "owner": 4}

# Statuts d'abonnement qui bloquent l'accès aux fonctionnalités payantes.
_BLOCKED_STATUSES = frozenset({"suspended", "canceled", "trial_expired"})


def require_active_subscription(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Bloque les organisations dont l'abonnement est suspendu ou annulé.
    À injecter sur tout endpoint qui consomme des ressources LLM ou connecteurs."""
    if user.subscription_status in _BLOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Accès suspendu — statut d'abonnement : {user.subscription_status}. "
                   "Contactez le support pour réactiver votre compte.",
        )
    return user


def require_min_role(minimum: str) -> Callable[..., CurrentUser]:
    """Exige AU MOINS ce rôle (un owner passe un require_min_role('admin'))."""
    min_rank = ROLE_RANK[minimum]

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if ROLE_RANK.get(user.role, 0) < min_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission insuffisante.",
            )
        return user

    return dependency


def require_roles(*allowed: str) -> Callable[..., CurrentUser]:
    """Exige l'un des rôles listés (correspondance exacte)."""
    allowed_set = set(allowed)

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission insuffisante.",
            )
        return user

    return dependency

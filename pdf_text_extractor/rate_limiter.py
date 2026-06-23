"""Instance partagée du rate limiter (slowapi).

Importée dans main.py (enregistrement) et dans les routes (décorateurs).
"""
from slowapi import Limiter
from starlette.requests import Request


def _safe_key(request: Request) -> str:
    """Retourne l'IP réelle même derrière Cloudflare/Render.

    slowapi's get_remote_address utilise request.client.host qui est None
    derrière un proxy Render/Cloudflare sans --proxy-headers uvicorn.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = request.client
    if client:
        return client.host
    return "unknown"


limiter = Limiter(key_func=_safe_key)

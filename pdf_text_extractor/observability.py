"""
Observabilité — Sprint 1 CivicAI Engineering Pack.

Fournit :
  - StructuredLoggingMiddleware   : log JSON par requête (request_id, user, org, durée, status)
  - GlobalRateLimitMiddleware     : 100 req/min par IP sur /api/* (sliding window in-memory)
  - get_request_ctx()             : dict des IDs courants (pour logs applicatifs)
  - set_request_user()            : injecter user_id/org_id depuis un Depends FastAPI
  - Compteurs Prometheus          : http_requests_total, http_request_duration_ms
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from collections import defaultdict
from contextvars import ContextVar
from typing import Callable

from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

# ── Prometheus (optionnel — graceful si non installé) ─────────────────────────
try:
    from prometheus_client import (
        Counter,
        Histogram,
        Gauge,
        generate_latest,
        CONTENT_TYPE_LATEST,
        REGISTRY,
    )

    _PROM_OK = True
    _REQ_COUNTER = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["method", "endpoint", "status_code"],
    )
    _REQ_LATENCY = Histogram(
        "http_request_duration_ms",
        "HTTP request latency in milliseconds",
        ["endpoint"],
        buckets=[5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    )
    _ACTIVE_REQ = Gauge("http_active_requests", "Number of active HTTP requests")
except ImportError:
    _PROM_OK = False
    _REQ_COUNTER = _REQ_LATENCY = _ACTIVE_REQ = None  # type: ignore

# ── Sentry (optionnel) ────────────────────────────────────────────────────────
try:
    import sentry_sdk as _sentry

    _SENTRY_OK = True
except ImportError:
    _SENTRY_OK = False

# ── Logger JSON ───────────────────────────────────────────────────────────────
_logger = logging.getLogger("agenthub.access")

# Enrichissement global de chaque log (injecté une fois au démarrage)
_APP_VERSION: str = "1.0.0"
_ENVIRONMENT: str = "production"
_SERVICE_NAME: str = "agenthub-platform"


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        payload = record.getMessage()
        try:
            data = json.loads(payload)
        except (json.JSONDecodeError, TypeError):
            data = {"message": payload}
        # Enrichissement systématique
        data.setdefault("service", _SERVICE_NAME)
        data.setdefault("version", _APP_VERSION)
        data.setdefault("environment", _ENVIRONMENT)
        data.setdefault("level", record.levelname)
        return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def configure_logging(
    level: int = logging.INFO,
    version: str = "1.0.0",
    environment: str = "production",
) -> None:
    """Configure le logger racine en JSON structuré et injecte version/env."""
    global _APP_VERSION, _ENVIRONMENT
    _APP_VERSION = version
    _ENVIRONMENT = environment

    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
    logging.getLogger("uvicorn.access").handlers.clear()  # évite le doublon uvicorn


# ── Context vars ──────────────────────────────────────────────────────────────
_request_id_cv: ContextVar[str] = ContextVar("request_id", default="")
_correlation_id_cv: ContextVar[str] = ContextVar("correlation_id", default="")
_trace_id_cv: ContextVar[str] = ContextVar("trace_id", default="")
_user_id_cv: ContextVar[str] = ContextVar("user_id", default="")
_org_id_cv: ContextVar[str] = ContextVar("org_id", default="")


def get_request_ctx() -> dict:
    """Retourne le contexte de la requête courante pour enrichir les logs applicatifs."""
    return {
        "request_id": _request_id_cv.get(),
        "correlation_id": _correlation_id_cv.get(),
        "trace_id": _trace_id_cv.get(),
        "user_id": _user_id_cv.get() or None,
        "organization_id": _org_id_cv.get() or None,
    }


def set_request_user(user_id: str, org_id: str = "") -> None:
    """Appelé depuis un Depends FastAPI pour injecter les IDs utilisateur dans le contexte."""
    if user_id:
        _user_id_cv.set(user_id)
    if org_id:
        _org_id_cv.set(org_id)


# ── JWT claim extraction (logging uniquement, sans vérification) ──────────────
def _peek_jwt(authorization: str) -> tuple[str, str]:
    """Décode le payload JWT sans vérifier la signature — usage logs uniquement."""
    if not authorization.startswith("Bearer "):
        return "", ""
    try:
        import base64

        parts = authorization[7:].split(".")
        if len(parts) < 2:
            return "", ""
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore"))
        user_id = data.get("sub", "")
        org_id = data.get("organization_id") or data.get("org_id") or data.get("org") or ""
        return user_id, org_id
    except Exception:
        return "", ""


# ── Structured Logging Middleware ─────────────────────────────────────────────
_SKIP_LOG_PATHS = frozenset({"/health", "/ready", "/metrics", "/sw.js", "/manifest.json"})
_SKIP_LOG_PREFIXES = ("/static/",)


class StructuredLoggingMiddleware:
    """Middleware ASGI pur — log JSON structuré pour chaque requête HTTP."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        if path in _SKIP_LOG_PATHS or any(path.startswith(p) for p in _SKIP_LOG_PREFIXES):
            await self.app(scope, receive, send)
            return

        # ── IDs de corrélation ────────────────────────────────────────────────
        headers: dict[bytes, bytes] = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode() or str(uuid.uuid4())
        correlation_id = headers.get(b"x-correlation-id", b"").decode() or request_id
        trace_id = headers.get(b"x-trace-id", b"").decode() or uuid.uuid4().hex

        tok_r = _request_id_cv.set(request_id)
        tok_c = _correlation_id_cv.set(correlation_id)
        tok_t = _trace_id_cv.set(trace_id)

        # ── Extraction JWT best-effort ────────────────────────────────────────
        auth = headers.get(b"authorization", b"").decode()
        user_id, org_id = _peek_jwt(auth)
        tok_u = _user_id_cv.set(user_id)
        tok_o = _org_id_cv.set(org_id)

        # ── Enrichissement Sentry scope ───────────────────────────────────────
        if _SENTRY_OK and user_id:
            try:
                _sentry.set_user({"id": user_id})
                with _sentry.new_scope() as scope:
                    scope.set_tag("request_id", request_id)
                    scope.set_tag("correlation_id", correlation_id)
                    if org_id:
                        scope.set_tag("organization_id", org_id)
            except Exception:
                pass

        method = scope.get("method", "")
        status_code = 0
        start = time.perf_counter()

        if _PROM_OK and _ACTIVE_REQ:
            _ACTIVE_REQ.inc()

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                # Injecter X-Request-ID et X-Correlation-ID dans la réponse
                resp_headers = list(message.get("headers", []))
                resp_headers.append((b"x-request-id", request_id.encode()))
                resp_headers.append((b"x-correlation-id", correlation_id.encode()))
                message = {**message, "headers": resp_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            if _PROM_OK and _ACTIVE_REQ:
                _ACTIVE_REQ.dec()

            final_user_id = _user_id_cv.get()
            final_org_id = _org_id_cv.get()

            endpoint = f"{method} {path}"

            log_record = {
                "request_id": request_id,
                "correlation_id": correlation_id,
                "trace_id": trace_id,
                "user_id": final_user_id or None,
                "organization_id": final_org_id or None,
                "endpoint": endpoint,
                "duration_ms": duration_ms,
                "status_code": status_code,
            }

            level = logging.WARNING if status_code >= 400 else logging.INFO
            _logger.log(level, json.dumps(log_record, ensure_ascii=False))

            # Prometheus
            if _PROM_OK and _REQ_COUNTER and _REQ_LATENCY:
                _REQ_COUNTER.labels(
                    method=method,
                    endpoint=path,
                    status_code=str(status_code),
                ).inc()
                _REQ_LATENCY.labels(endpoint=path).observe(duration_ms)

            # Réinitialiser context vars
            _request_id_cv.reset(tok_r)
            _correlation_id_cv.reset(tok_c)
            _trace_id_cv.reset(tok_t)
            _user_id_cv.reset(tok_u)
            _org_id_cv.reset(tok_o)


# ── Global Rate Limit Middleware ──────────────────────────────────────────────
class GlobalRateLimitMiddleware:
    """
    Sliding-window rate limiter en mémoire — 100 req/min par IP sur /api/*.

    Limites configurables à l'instanciation.
    Pour multi-instance → remplacer par Redis (Sprint 3).
    """

    def __init__(
        self,
        app: ASGIApp,
        limit: int = 100,
        window_seconds: int = 60,
        exclude_paths: frozenset = frozenset({"/health", "/ready", "/metrics"}),
    ) -> None:
        self.app = app
        self.limit = limit
        self.window = window_seconds
        self.exclude = exclude_paths
        self._windows: dict[str, list[float]] = defaultdict(list)

    def _get_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded:
            return forwarded.split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    async def _reject(self, send: Send) -> None:
        body = json.dumps(
            {"detail": "Trop de requêtes. Réessayez dans 60 secondes."},
            ensure_ascii=False,
        ).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", b"60"),
                    (b"x-ratelimit-limit", str(self.limit).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body, "more_body": False})

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        if not path.startswith("/api/") or path in self.exclude:
            await self.app(scope, receive, send)
            return

        ip = self._get_ip(scope)
        now = time.monotonic()
        cutoff = now - self.window

        bucket = self._windows[ip]
        # Purge des entrées expirées
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)

        if len(bucket) >= self.limit:
            await self._reject(send)
            return

        bucket.append(now)
        await self.app(scope, receive, send)


# ── Sentry init ───────────────────────────────────────────────────────────────
def init_sentry(dsn: str, environment: str = "production", release: str = "1.0.0") -> bool:
    if not _SENTRY_OK or not dsn:
        return False
    _sentry.init(
        dsn=dsn,
        environment=environment,
        release=f"agenthub@{release}",
        traces_sample_rate=0.1,  # 10 % des transactions tracées
        profiles_sample_rate=0.05,
        send_default_pii=False,
    )
    return True


# ── Health / Ready helpers ────────────────────────────────────────────────────
def check_db() -> tuple[bool, float]:
    """Vérifie la connectivité DB. Retourne (ok, latency_ms)."""
    try:
        from db import get_db

        t0 = time.perf_counter()
        with get_db() as cur:
            cur.execute("SELECT 1")
        return True, round((time.perf_counter() - t0) * 1000, 2)
    except Exception:
        return False, -1.0


def prometheus_response():
    """Génère la réponse /metrics au format Prometheus text."""
    if not _PROM_OK:
        return None, None
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST

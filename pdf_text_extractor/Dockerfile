# ── Build stage — installe les dépendances dans /install ─────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Runtime stage — image minimale ────────────────────────────────────────────
FROM python:3.12-slim

# Metadata
LABEL org.opencontainers.image.source="https://github.com/edemgnagblodjro2-netizen/nexhire"
LABEL org.opencontainers.image.title="AgentHub Platform"
LABEL org.opencontainers.image.vendor="CivicAI Inc."

# Dépendances runtime système (psycopg2, cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libffi8 \
    && rm -rf /var/lib/apt/lists/*

# Copier les dépendances Python depuis le builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Copier le code source
COPY . .

# Supprimer les fichiers inutiles en runtime
RUN find . -name "*.pyc" -delete && \
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Utilisateur non-root
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check natif Docker (utilise l'endpoint /health du Sprint 1)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c \
        "import urllib.request, sys; \
         r = urllib.request.urlopen('http://localhost:8000/health', timeout=8); \
         sys.exit(0 if r.status == 200 else 1)" \
    || exit 1

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

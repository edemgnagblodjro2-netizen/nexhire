"""Pool de connexions PostgreSQL directes (psycopg2).

Remplace le client REST supabase-py pour toutes les requêtes de données.
L'auth JWT reste assurée par Supabase (JWKS) — aucun changement côté login.

Variable d'env requise :
  DATABASE_URL  postgresql://postgres:[pwd]@db.[ref].supabase.co:5432/postgres
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from functools import lru_cache
from typing import Generator

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool


@lru_cache(maxsize=1)
def _pool() -> ThreadedConnectionPool:
    dsn = os.environ["DATABASE_URL"]
    if "sslmode" not in dsn and os.environ.get("ENVIRONMENT", "production") == "production":
        sep = "&" if "?" in dsn else "?"
        dsn += f"{sep}sslmode=require"
    return ThreadedConnectionPool(minconn=2, maxconn=10, dsn=dsn)


@contextmanager
def get_db() -> Generator:
    """Connexion PostgreSQL — RealDictCursor, commit auto, rollback sur erreur."""
    pool = _pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def rows(cur) -> list[dict]:
    """Retourne toutes les lignes en dict Python."""
    return [dict(r) for r in cur.fetchall()]


def row(cur) -> dict | None:
    """Retourne une ligne en dict ou None."""
    r = cur.fetchone()
    return dict(r) if r else None

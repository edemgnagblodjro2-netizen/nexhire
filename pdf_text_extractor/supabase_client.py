from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache
def service_client() -> Client:
    """Client backend de confiance (SERVICE ROLE) : contourne la RLS.
    À n'utiliser QUE côté serveur, jamais exposé au navigateur."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


@lru_cache
def anon_client() -> Client:
    """Client public (clé anon) : utilisé pour les flux d'auth (signup/login)."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)

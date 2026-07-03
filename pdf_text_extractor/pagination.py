"""
Pagination standardisée — Sprint 3B CivicAI Engineering Pack.

Usage dans un endpoint :

    from pagination import PageParams, paginated

    @router.get("")
    def list_items(page: PageParams = Depends(), user: CurrentUser = Depends(...)):
        with get_db() as cur:
            cur.execute(
                paginated(
                    "SELECT id, name FROM items WHERE org_id = %s",
                    order_by="name",
                ),
                [user.organization_id, page.limit, page.offset],
            )
            return page.response(rows(cur))

Stratégie COUNT : une seule requête avec fenêtre COUNT(*) OVER ().
Le total est lu sur la première ligne (_total) — zéro round-trip supplémentaire.
Si aucune ligne n'est retournée, total = 0.
"""

from __future__ import annotations

from fastapi import Query

# Valeurs max acceptées — protègent contre les requêtes abusives
_MAX_LIMIT = 200
_DEFAULT_LIMIT = 50


class PageParams:
    """Paramètres de pagination injectés via Depends().
    Compatible avec tous les endpoints (Query params : ?limit=50&offset=0)."""

    def __init__(
        self,
        limit: int = Query(default=_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT, description="Résultats par page (max 200)"),
        offset: int = Query(default=0, ge=0, description="Index de départ (0-based)"),
    ):
        self.limit = limit
        self.offset = offset

    def response(self, items: list) -> dict:
        """Construit l'enveloppe de réponse standard à partir des lignes retournées.

        Attend que chaque ligne contienne _total (injecté par paginated()).
        """
        total = int(items[0]["_total"]) if items else 0
        # Nettoyer la colonne interne avant de renvoyer au client
        clean = [{k: v for k, v in row.items() if k != "_total"} for row in items]
        return {
            "items": clean,
            "total": total,
            "limit": self.limit,
            "offset": self.offset,
            "has_more": (self.offset + len(clean)) < total,
        }


def paginated(base_sql: str, *, order_by: str, params_count: int = 0) -> str:
    """Enveloppe une requête SELECT avec COUNT(*) OVER () + LIMIT/OFFSET.

    Args:
        base_sql    : requête SELECT sans ORDER BY / LIMIT / OFFSET.
        order_by    : clause ORDER BY (sans le mot-clé), ex. "created_at DESC".
        params_count: ignoré — conservé pour compatibilité future.

    Returns:
        Requête SQL avec deux paramètres ajoutés en fin : %s LIMIT, %s OFFSET.

    Exemple :
        paginated("SELECT id, name FROM items WHERE org = %s", order_by="name")
        → "SELECT *, COUNT(*) OVER () AS _total
           FROM (SELECT id, name FROM items WHERE org = %s) _q
           ORDER BY name LIMIT %s OFFSET %s"
    """
    return f"""
        SELECT *, COUNT(*) OVER () AS _total
        FROM ({base_sql}) _q
        ORDER BY {order_by}
        LIMIT %s OFFSET %s
    """


def paginated_union(inner_sql: str, *, order_by: str) -> str:
    """Comme paginated() mais pour les requêtes UNION/sous-requêtes complexes.

    La syntaxe est identique — sépare sémantiquement les cas simples des UNION
    pour faciliter la lecture du code appelant.
    """
    return paginated(inner_sql, order_by=order_by)

"""Monday.com — boards, items et mises à jour via GraphQL API.

Auth : API Key dans l'en-tête Authorization.
Credentials stockés chiffrés par organisation. Aucune variable d'env requise.
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds

_GQL = "https://api.monday.com/v2"


def search_monday(query: str, org_id: str,
                  status: str = "all", board: str | None = None,
                  limit: int = 10) -> list[dict]:
    creds, _ = load_creds("monday", org_id)
    if not creds:
        return [{"error": "Monday.com non connecté"}]

    api_key = creds.get("api_key", "").strip()
    if not api_key:
        return [{"error": "API Key Monday.com manquante — reconfigurer le connecteur"}]

    headers = {
        "Authorization": api_key,
        "Content-Type":  "application/json",
        "API-Version":   "2024-01",
    }

    try:
        # Recherche via items_by_multiple_column_values ou items_page
        gql = """
        query ($query: String!, $limit: Int!) {
          items_by_multiple_column_values(
            board_id: null
            column_id: "name"
            column_values: [$query]
            limit: $limit
          ) {
            id name state
            board { name }
            column_values { text title }
            created_at
          }
        }
        """
        # Fallback: use search_items if available (monday API v2)
        gql_search = """
        query ($term: String!, $limit: Int!) {
          items_page(limit: $limit, queryParams: {rules: [{column_id: "name", compare_value: [$term]}]}) {
            items {
              id name state
              board { name }
              column_values { text title }
              created_at
            }
          }
        }
        """

        r = httpx.post(_GQL,
                       headers=headers,
                       json={"query": """
                           query ($limit: Int!) {
                             boards(limit: 5) {
                               id name
                               items_page(limit: $limit) {
                                 items {
                                   id name state created_at
                                   column_values { title text }
                                 }
                               }
                             }
                           }
                       """, "variables": {"limit": limit}},
                       timeout=12)
        r.raise_for_status()

        boards = r.json().get("data", {}).get("boards", [])
        results = []
        for b in boards:
            for item in b.get("items_page", {}).get("items", []):
                item_name = item.get("name", "")
                if query.lower() not in item_name.lower() and query != "*":
                    continue
                if status != "all":
                    item_state = item.get("state", "")
                    if status == "active" and item_state != "active":
                        continue
                    if status == "done" and item_state != "done":
                        continue
                results.append({
                    "id":       item.get("id"),
                    "titre":    item_name,
                    "statut":   item.get("state"),
                    "board":    b.get("name"),
                    "créé":     item.get("created_at"),
                    "source":   "monday",
                })
        return results[:limit]

    except httpx.HTTPStatusError as exc:
        return [{"error": f"Monday HTTP {exc.response.status_code}", "source": "monday"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "monday"}]

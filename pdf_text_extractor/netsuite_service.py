"""NetSuite ERP — financières, inventaire, transactions via REST API Token-Based Auth.

Auth : OAuth 1.0a TBA (consumer_key + consumer_secret + token_id + token_secret).
Credentials stockés chiffrés par organisation. Aucune variable d'env requise.
"""
from __future__ import annotations

import hashlib
import hmac
import time
import uuid
import urllib.parse

import httpx
from connector_loader import load_creds


def _oauth1_header(method: str, url: str, account_id: str,
                   consumer_key: str, consumer_secret: str,
                   token_id: str, token_secret: str) -> str:
    timestamp = str(int(time.time()))
    nonce     = uuid.uuid4().hex

    params = {
        "oauth_consumer_key":     consumer_key,
        "oauth_nonce":            nonce,
        "oauth_signature_method": "HMAC-SHA256",
        "oauth_timestamp":        timestamp,
        "oauth_token":            token_id,
        "oauth_version":          "1.0",
    }
    base_str = "&".join([
        method.upper(),
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote("&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(v)}"
                                    for k, v in sorted(params.items())), safe=""),
    ])
    signing_key = f"{urllib.parse.quote(consumer_secret)}&{urllib.parse.quote(token_secret)}"
    sig = hmac.new(signing_key.encode(), base_str.encode(), hashlib.sha256).digest()
    import base64
    params["oauth_signature"] = base64.b64encode(sig).decode()

    header = "OAuth realm=\"" + account_id + "\","
    header += ",".join(f'{k}="{urllib.parse.quote(str(v))}"' for k, v in params.items())
    return header


def query_netsuite(category: str, org_id: str, period: str = "current_month") -> dict:
    creds, _ = load_creds("netsuite", org_id)
    if not creds:
        return {"error": "NetSuite non connecté"}

    account_id      = creds.get("account_id", "").strip().upper()
    consumer_key    = creds.get("consumer_key", "").strip()
    consumer_secret = creds.get("consumer_secret", "").strip()
    token_id        = creds.get("token_id", "").strip()
    token_secret    = creds.get("token_secret", "").strip()

    if not all([account_id, consumer_key, consumer_secret, token_id, token_secret]):
        return {"error": "Credentials NetSuite incomplets — reconfigurer le connecteur"}

    base = f"https://{account_id.lower().replace('_', '-')}.suitetalk.api.netsuite.com/services/rest/record/v1"

    try:
        endpoint_map = {
            "financials":  "transaction",
            "inventory":   "inventoryitem",
            "vendors":     "vendor",
            "customers":   "customer",
        }
        record_type = endpoint_map.get(category, "transaction")
        url = f"{base}/{record_type}"

        auth_header = _oauth1_header("GET", url, account_id,
                                     consumer_key, consumer_secret, token_id, token_secret)
        r = httpx.get(url, headers={"Authorization": auth_header,
                                     "Accept": "application/json",
                                     "Prefer": "transient"},
                      params={"limit": 10},
                      timeout=15)
        r.raise_for_status()
        items = r.json().get("items", [])
        return {
            "type":   category,
            "total":  r.json().get("totalResults", len(items)),
            "items":  items[:10],
            "source": "netsuite",
        }

    except httpx.HTTPStatusError as exc:
        return {"error": f"NetSuite HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": str(exc)}

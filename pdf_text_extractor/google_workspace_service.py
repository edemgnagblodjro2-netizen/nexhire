"""Google Workspace — Gmail, Drive, Calendar via Google APIs.

Auth : OAuth 2.0. Tokens stockés chiffrés par organisation.
Env vars requises : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
"""
from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL   = "https://oauth2.googleapis.com/token"
_GMAIL_BASE  = "https://gmail.googleapis.com/gmail/v1/users/me"
_DRIVE_BASE  = "https://www.googleapis.com/drive/v3"
_CAL_BASE    = "https://www.googleapis.com/calendar/v3"


def search_google_workspace(query: str, org_id: str,
                             source: str = "all", limit: int = 5) -> list[dict]:
    creds, cid = load_creds("google_workspace", org_id)
    if not creds:
        return [{"error": "Google Workspace non connecté"}]
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")

    results: list[dict] = []

    # Gmail
    if source in ("all", "email") and len(results) < limit:
        try:
            r = httpx.get(f"{_GMAIL_BASE}/messages", headers=bearer(creds),
                          params={"q": query, "maxResults": limit}, timeout=10)
            r.raise_for_status()
            ids = [m["id"] for m in r.json().get("messages", [])]
            for mid in ids[:3]:
                det = httpx.get(f"{_GMAIL_BASE}/messages/{mid}", headers=bearer(creds),
                                params={"format": "metadata",
                                        "metadataHeaders": ["Subject", "From", "Date"]},
                                timeout=10)
                if det.status_code == 200:
                    headers = {h["name"]: h["value"]
                               for h in det.json().get("payload", {}).get("headers", [])}
                    results.append({"type": "email", "source": "gmail",
                                    "sujet": headers.get("Subject"),
                                    "de": headers.get("From"),
                                    "date": headers.get("Date")})
        except Exception:
            pass

    # Drive
    if source in ("all", "drive") and len(results) < limit:
        try:
            r = httpx.get(f"{_DRIVE_BASE}/files", headers=bearer(creds),
                          params={"q": f"fullText contains '{query}'",
                                  "pageSize": limit,
                                  "fields": "files(id,name,webViewLink,modifiedTime,owners)"},
                          timeout=10)
            r.raise_for_status()
            for f in r.json().get("files", []):
                results.append({"type": "fichier", "source": "drive",
                                 "nom": f.get("name"),
                                 "url": f.get("webViewLink"),
                                 "modifié": f.get("modifiedTime"),
                                 "par": (f.get("owners") or [{}])[0].get("displayName")})
        except Exception:
            pass

    # Calendar
    if source in ("all", "calendar") and len(results) < limit:
        try:
            r = httpx.get(f"{_CAL_BASE}/calendars/primary/events", headers=bearer(creds),
                          params={"q": query, "maxResults": 3,
                                  "orderBy": "updated",
                                  "fields": "items(id,summary,start,end,organizer)"},
                          timeout=10)
            r.raise_for_status()
            for e in r.json().get("items", []):
                results.append({"type": "evenement", "source": "google_calendar",
                                 "sujet": e.get("summary"),
                                 "début": (e.get("start") or {}).get("dateTime"),
                                 "organisateur": (e.get("organizer") or {}).get("email")})
        except Exception:
            pass

    return results[:limit]

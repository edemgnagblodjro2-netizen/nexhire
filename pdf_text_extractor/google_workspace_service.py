"""Google Workspace — Gmail, Drive, Calendar via Google APIs.

Auth : OAuth 2.0 avec refresh token (access_type=offline).
Env vars : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
Note : admin.directory.user.readonly requiert Google Workspace payant —
       les appels Admin SDK tombent en no-op sur un compte Gmail personnel.
"""
from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL  = "https://oauth2.googleapis.com/token"
_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
_DRIVE_BASE = "https://www.googleapis.com/drive/v3"
_CAL_BASE   = "https://www.googleapis.com/calendar/v3"


def _creds(org_id: str):
    creds, cid = load_creds("google_workspace", org_id)
    if not creds:
        return None
    return refresh_oauth(creds, cid, _TOKEN_URL, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")


def get_workspace_info(org_id: str) -> dict:
    """Profil Gmail + quota Drive — utilisé pour le ping."""
    creds = _creds(org_id)
    if not creds:
        return {"error": "Google Workspace non connecté"}
    try:
        r = httpx.get(f"{_GMAIL_BASE}/profile", headers=bearer(creds), timeout=10)
        if r.status_code != 200:
            return {"error": f"Gmail profile HTTP {r.status_code} — {r.text[:200]}"}
        profile = r.json()
        info = {
            "email":         profile.get("emailAddress"),
            "messages_total": profile.get("messagesTotal"),
            "threads_total":  profile.get("threadsTotal"),
        }
        # Drive quota — gracieux si scope absent
        try:
            rd = httpx.get(f"{_DRIVE_BASE}/about",
                           headers=bearer(creds),
                           params={"fields": "user,storageQuota"},
                           timeout=10)
            if rd.status_code == 200:
                about = rd.json()
                info["drive_user"]  = (about.get("user") or {}).get("displayName")
                quota = about.get("storageQuota") or {}
                info["drive_used_gb"]  = round(int(quota.get("usage", 0)) / 1e9, 2)
                info["drive_limit_gb"] = round(int(quota.get("limit", 0)) / 1e9, 2) or None
        except Exception:
            pass
        return info
    except Exception as exc:
        return {"error": str(exc)}


def search_google_workspace(query: str, org_id: str,
                             source: str = "all", limit: int = 5) -> list[dict]:
    creds = _creds(org_id)
    if not creds:
        return [{"error": "Google Workspace non connecté"}]

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
                    hdrs = {h["name"]: h["value"]
                            for h in det.json().get("payload", {}).get("headers", [])}
                    results.append({"type": "email", "source": "gmail",
                                    "sujet": hdrs.get("Subject"),
                                    "de":    hdrs.get("From"),
                                    "date":  hdrs.get("Date")})
        except Exception:
            pass

    # Drive — apostrophes échappées dans la query
    if source in ("all", "drive") and len(results) < limit:
        try:
            safe_q = query.replace("\\", "\\\\").replace("'", "\\'")
            r = httpx.get(f"{_DRIVE_BASE}/files", headers=bearer(creds),
                          params={"q": f"fullText contains '{safe_q}'",
                                  "pageSize": min(limit, 10),
                                  "fields": "files(id,name,webViewLink,modifiedTime,owners)"},
                          timeout=10)
            r.raise_for_status()
            for f in r.json().get("files", []):
                results.append({"type": "fichier", "source": "drive",
                                 "nom":     f.get("name"),
                                 "url":     f.get("webViewLink"),
                                 "modifié": f.get("modifiedTime"),
                                 "par":     (f.get("owners") or [{}])[0].get("displayName")})
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
                                 "sujet":        e.get("summary"),
                                 "début":        (e.get("start") or {}).get("dateTime"),
                                 "organisateur": (e.get("organizer") or {}).get("email")})
        except Exception:
            pass

    return results[:limit]

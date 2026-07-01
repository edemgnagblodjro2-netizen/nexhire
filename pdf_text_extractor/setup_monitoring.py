"""
Script de configuration UptimeRobot — MyPortal v1.0
Crée 3 monitors : health check, portal, inscriptions

Utilisation :
    python setup_monitoring.py <UPTIMEROBOT_API_KEY>

Obtenir la clé :
    1. uptimerobot.com → Login → My Settings
    2. Section "API Settings" → "Main API Key" → Show/Create
    3. Format : u123456-xxxxxxxxxxxxxxxxxxxxxxxx
"""
import sys
import json
import urllib.request
import urllib.parse

MONITORS = [
    {
        "friendly_name": "MyPortal — Health Check (API)",
        "url": "https://myportal.nexhire.ca/api/health",
        "type": 1,           # HTTP(s)
        "interval": 300,     # 5 minutes
        "keyword_type": 2,   # keyword must exist
        "keyword_value": '"status":"ok"',
    },
    {
        "friendly_name": "MyPortal — Portail web",
        "url": "https://myportal.nexhire.ca",
        "type": 1,
        "interval": 300,
    },
    {
        "friendly_name": "MyPortal — Inscription partenaire",
        "url": "https://myportal.nexhire.ca/inscription",
        "type": 1,
        "interval": 300,
    },
]

UPTIMEROBOT_API = "https://api.uptimerobot.com/v2"


def _post(endpoint: str, api_key: str, data: dict) -> dict:
    data["api_key"] = api_key
    data["format"] = "json"
    payload = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{UPTIMEROBOT_API}/{endpoint}",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def get_alert_contact(api_key: str) -> str | None:
    """Retourne le premier contact d'alerte email disponible."""
    result = _post("getAlertContacts", api_key, {})
    contacts = result.get("alert_contacts", [])
    for c in contacts:
        if c.get("type") == 2:  # email
            return str(c["id"])
    return None


def create_monitor(api_key: str, monitor: dict, alert_contact_id: str | None) -> dict:
    payload = {
        "friendly_name": monitor["friendly_name"],
        "url":           monitor["url"],
        "type":          monitor["type"],
        "interval":      monitor.get("interval", 300),
    }
    if "keyword_type" in monitor:
        payload["keyword_type"]  = monitor["keyword_type"]
        payload["keyword_value"] = monitor["keyword_value"]
    if alert_contact_id:
        payload["alert_contacts"] = alert_contact_id

    return _post("newMonitor", api_key, payload)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    api_key = sys.argv[1].strip()
    if not api_key.startswith("u") or len(api_key) < 10:
        print("❌ Clé API invalide. Format attendu : u123456-xxxxxxxxxxxxxxxxxxxxxxxx")
        sys.exit(1)

    print("🔍 Récupération du contact d'alerte email…")
    alert_id = get_alert_contact(api_key)
    if alert_id:
        print(f"   ✅ Contact d'alerte trouvé (id: {alert_id})")
    else:
        print("   ⚠️  Aucun contact email — monitors créés sans alerte")
        print("      → Ajouter support@nexhire.ca dans UptimeRobot → My Settings → Alert Contacts")

    print()
    created = []
    for mon in MONITORS:
        print(f"📡 Création : {mon['friendly_name']} …")
        result = create_monitor(api_key, mon, alert_id)
        if result.get("stat") == "ok":
            mid = result["monitor"]["id"]
            print(f"   ✅ Créé (id: {mid}) — {mon['url']}")
            created.append(mid)
        else:
            err = result.get("error", {})
            print(f"   ❌ Échec : {err.get('message', json.dumps(result))}")

    print()
    print(f"{'=' * 55}")
    print(f"✅ {len(created)}/{len(MONITORS)} monitors configurés")
    if created:
        print()
        print("👉 Dashboard : https://dashboard.uptimerobot.com/monitors")
        print("👉 Status page : https://stats.uptimerobot.com/")
        print()
        print("Prochaines étapes :")
        print("  1. Vérifier que les monitors passent en vert (1-2 min)")
        print("  2. Ajouter support@nexhire.ca comme contact d'alerte si absent")
        print("  3. Optionnel : créer une status page publique pour les clients")


if __name__ == "__main__":
    main()

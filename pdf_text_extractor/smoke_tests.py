"""
Smoke tests AgentHub — connecteurs.

Usage :
  python smoke_tests.py               # tous les tests
  python smoke_tests.py jira          # un connecteur
  python smoke_tests.py --real jira   # teste le vrai connecteur (credentials requis)

Niveaux testés :
  mock   — vérifie que le mock retourne des données valides (toujours exécutable)
  real   -- vérifie que le vrai connecteur retourne des données (requiert credentials)
"""
from __future__ import annotations

import os
import sys
import json
import time
import traceback
from pathlib import Path
from typing import Any

# Ajouter le répertoire courant au path Python
sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("FERNET_KEYS", "test")

# ── Couleurs terminal ─────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

PASS = f"{GREEN}✓ PASS{RESET}"
FAIL = f"{RED}✗ FAIL{RESET}"
SKIP = f"{YELLOW}⊘ SKIP{RESET}"


# ── Résultats ─────────────────────────────────────────────────────────────────

class SmokeResult:
    def __init__(self):
        self.results: list[dict] = []

    def add(self, connector: str, test: str, passed: bool, detail: str = "", skipped: bool = False):
        self.results.append({"connector": connector, "test": test, "passed": passed, "detail": detail, "skipped": skipped})

    def print_summary(self):
        passed  = sum(1 for r in self.results if r["passed"] and not r["skipped"])
        failed  = sum(1 for r in self.results if not r["passed"] and not r["skipped"])
        skipped = sum(1 for r in self.results if r["skipped"])
        total   = passed + failed

        print(f"\n{BOLD}{'═'*60}{RESET}")
        print(f"{BOLD}RÉSULTATS SMOKE TESTS{RESET}")
        print(f"{'═'*60}")
        print(f"  {GREEN}✓ PASS{RESET}  : {passed}/{total}")
        print(f"  {RED}✗ FAIL{RESET}  : {failed}/{total}")
        print(f"  {YELLOW}⊘ SKIP{RESET}  : {skipped}")
        print(f"{'─'*60}")

        if failed:
            print(f"\n{RED}{BOLD}ÉCHECS :{RESET}")
            for r in self.results:
                if not r["passed"] and not r["skipped"]:
                    print(f"  [{r['connector']}] {r['test']}")
                    print(f"    → {r['detail']}")

        return failed == 0

results = SmokeResult()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assert_not_empty(data: Any, field: str | None = None) -> bool:
    if data is None:
        return False
    if isinstance(data, (list, dict, str)) and len(data) == 0:
        return False
    if field and isinstance(data, dict):
        return data.get(field) is not None
    return True

def _assert_list_has_keys(data: Any, keys: list[str]) -> tuple[bool, str]:
    if not isinstance(data, list) or len(data) == 0:
        return False, f"attendu une liste non vide, reçu : {type(data).__name__}"
    first = data[0]
    missing = [k for k in keys if k not in first]
    if missing:
        return False, f"champs manquants : {missing}"
    return True, ""

def _assert_dict_has_keys(data: Any, keys: list[str]) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, f"attendu un dict, reçu : {type(data).__name__}"
    missing = [k for k in keys if k not in data]
    if missing:
        return False, f"champs manquants : {missing}"
    return True, ""

def run(connector: str, test_name: str, fn, *args, **kwargs):
    try:
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - t0
        label = f"{PASS} ({elapsed*1000:.0f}ms)"
        print(f"  {label}  {connector}/{test_name}")
        results.add(connector, test_name, True, f"{elapsed*1000:.0f}ms")
        return result
    except AssertionError as e:
        print(f"  {FAIL}  {connector}/{test_name} — {e}")
        results.add(connector, test_name, False, str(e))
        return None
    except Exception as e:
        print(f"  {FAIL}  {connector}/{test_name} — {type(e).__name__}: {e}")
        results.add(connector, test_name, False, traceback.format_exc(limit=2))
        return None

def skip(connector: str, test_name: str, reason: str):
    print(f"  {SKIP}  {connector}/{test_name} — {reason}")
    results.add(connector, test_name, True, reason, skipped=True)


# ── Tests mock — toujours exécutables ────────────────────────────────────────

def test_mock_dispatch():
    """Vérifie que _call_tool dispatche correctement vers les mocks."""
    from agent_service import _call_tool

    # Sans org_id → toujours mock
    for tool, args, check_key in [
        ("search_jira",       {"query": "test"},          None),
        ("search_servicenow", {"query": "test"},          None),
        ("query_sap",         {"category": "budget"},     "budget_annuel"),
        ("query_workday",     {"category": "headcount"},  "effectif_total"),
        ("query_quickbooks",  {"category": "invoices"},   "factures_envoyées"),
        ("query_intune",      {"category": "devices"},    "total"),
        ("query_aws",         {"category": "costs"},      "coût_total"),
    ]:
        def _test(t=tool, a=args, ck=check_key):
            data, is_sim = _call_tool(t, a, org_id=None)
            assert is_sim is True, f"attendu is_simulated=True sans org_id"
            assert data is not None, "mock retourne None"
            if ck and isinstance(data, dict):
                assert ck in data, f"clé '{ck}' absente du mock"
        run("dispatch", tool, _test)


def test_mock_servicenow():
    from agent_service import _mock_servicenow
    def _t():
        data = _mock_servicenow("test")
        ok, msg = _assert_list_has_keys(data, ["id", "titre", "priorité", "statut"])
        assert ok, msg
    run("servicenow", "mock_schema", _t)

def test_mock_jira():
    from agent_service import _mock_jira
    def _t():
        data = _mock_jira("test")
        ok, msg = _assert_list_has_keys(data, ["id", "titre", "statut"])
        assert ok, msg
    run("jira", "mock_schema", _t)

def test_mock_sap():
    from agent_service import _mock_sap
    for cat in ["expenses", "budget", "invoices"]:
        def _t(c=cat):
            data = _mock_sap(c)
            assert isinstance(data, dict) and len(data) > 0, f"mock SAP/{c} vide"
        run("sap", f"mock_{cat}", _t)

def test_mock_workday():
    from agent_service import _mock_workday
    for cat in ["headcount", "leave", "performance"]:
        def _t(c=cat):
            data = _mock_workday(c)
            assert isinstance(data, dict), f"mock Workday/{c} n'est pas un dict"
        run("workday", f"mock_{cat}", _t)

def test_mock_quickbooks():
    from agent_service import _mock_quickbooks
    for cat in ["invoices", "expenses", "balance_sheet"]:
        def _t(c=cat):
            data = _mock_quickbooks(c)
            assert isinstance(data, dict), f"mock QuickBooks/{c} vide"
        run("quickbooks", f"mock_{cat}", _t)

def test_mock_intune():
    from agent_service import _mock_intune
    def _t():
        data = _mock_intune("devices")
        ok, msg = _assert_dict_has_keys(data, ["total", "non_conformes"])
        assert ok, msg
    run("intune", "mock_devices", _t)

def test_mock_m365():
    from agent_service import _mock_microsoft_365
    def _t():
        data = _mock_microsoft_365("contrats")
        ok, msg = _assert_list_has_keys(data, ["type", "objet"])
        assert ok, msg
    run("microsoft_365", "mock_schema", _t)

def test_mock_aws():
    from agent_service import _mock_aws
    def _t():
        data = _mock_aws("costs")
        ok, msg = _assert_dict_has_keys(data, ["coût_total", "top_services"])
        assert ok, msg
    run("aws", "mock_costs", _t)

def test_mock_crowdstrike():
    from agent_service import _mock_crowdstrike
    def _t():
        data = _mock_crowdstrike("détection")
        ok, msg = _assert_list_has_keys(data, ["id", "sévérité", "statut"])
        assert ok, msg
    run("crowdstrike", "mock_schema", _t)

def test_mock_hubspot():
    from agent_service import _mock_hubspot
    def _t():
        data = _mock_hubspot("deals")
        ok, msg = _assert_list_has_keys(data, ["type", "nom", "valeur"])
        assert ok, msg
    run("hubspot", "mock_schema", _t)

def test_mock_slack():
    from agent_service import _mock_slack
    def _t():
        data = _mock_slack("rapport")
        ok, msg = _assert_list_has_keys(data, ["canal", "auteur", "message"])
        assert ok, msg
        assert len(data) >= 1, "mock retourne une liste vide"
    run("slack", "mock_schema", _t)

def test_trust_manifest():
    """Vérifie que connector_trust.py couvre tous les connecteurs de VALID_TYPES."""
    from routes_connectors import VALID_TYPES
    from connector_trust import CONNECTOR_TRUST
    def _t():
        missing = VALID_TYPES - set(CONNECTOR_TRUST.keys())
        extra   = set(CONNECTOR_TRUST.keys()) - VALID_TYPES
        assert not missing, f"connecteurs dans VALID_TYPES mais absents du manifeste : {missing}"
        assert not extra,   f"connecteurs dans le manifeste mais absents de VALID_TYPES : {extra}"
    run("trust_manifest", "coverage", _t)

def test_call_tool_none_fallback():
    """Vérifie que _call_tool tombe sur le mock quand le service réel retourne None."""
    from agent_service import _call_tool
    def _t():
        # Avec un org_id fictif, le service réel ne trouvera pas de credentials → None
        # Le fix doit faire tomber sur le mock (is_simulated=True)
        data, is_sim = _call_tool("query_sap", {"category": "budget"}, org_id="00000000-0000-0000-0000-000000000000")
        assert data is not None, "_call_tool retourne None — le mock n'a pas pris le relais"
        assert is_sim is True, f"attendu is_simulated=True pour org sans connecteur, reçu False (données : {data})"
    run("call_tool", "none_fallback_to_mock", _t)


# ── Tests réels (--real) — requièrent des credentials ────────────────────────

def test_real_intune(org_id: str):
    """Requiert : M365 Developer Program configuré avec tenant_id, client_id, client_secret dans Supabase."""
    from intune_service import query_intune
    def _t():
        data = query_intune(category="devices", org_id=org_id)
        assert data is not None, "query_intune retourne None — connecteur non configuré ?"
        ok, msg = _assert_dict_has_keys(data, ["source", "total"])
        assert ok, msg
        assert data["source"] == "Intune", f"source inattendue : {data.get('source')}"
        assert isinstance(data["total"], int), "total doit être un entier"
        assert data["total"] >= 0, "total négatif"
    run("intune", "real_devices", _t)

def test_real_jira(org_id: str):
    """Requiert : Atlassian Free configuré avec client_id, client_secret dans Supabase."""
    from jira_service import search_jira
    def _t():
        data = search_jira(query="", org_id=org_id, status="all", limit=5)
        assert data is not None, "search_jira retourne None — connecteur non configuré ?"
        assert isinstance(data, list), f"attendu une liste, reçu {type(data).__name__}"
        if len(data) > 0:
            ok, msg = _assert_list_has_keys(data, ["key", "summary", "status"])
            assert ok, msg
        # Accepte liste vide si le workspace Jira est vide
    run("jira", "real_search", _t)

def test_real_quickbooks(org_id: str):
    """Requiert : Intuit Developer Sandbox configuré dans Supabase."""
    from quickbooks_service import query_quickbooks
    def _t():
        data = query_quickbooks(category="invoices", org_id=org_id)
        assert data is not None, "query_quickbooks retourne None — connecteur non configuré ?"
        assert isinstance(data, dict), f"attendu un dict, reçu {type(data).__name__}"
        assert data.get("source") == "QuickBooks", f"source inattendue : {data.get('source')}"
    run("quickbooks", "real_invoices", _t)

def test_real_m365(org_id: str):
    """Requiert : M365 connecteur configuré dans Supabase."""
    from m365_service import search_microsoft_365
    def _t():
        data = search_microsoft_365(query="rapport", org_id=org_id, limit=3)
        assert data is not None, "search_microsoft_365 retourne None"
        assert isinstance(data, list), f"attendu une liste, reçu {type(data).__name__}"
    run("microsoft_365", "real_search", _t)

def test_real_slack(org_id: str):
    """Requiert : Slack OAuth v2 connecté (bot token + user token search:read)."""
    from slack_service import get_workspace_info, list_channels, search_slack

    def _t_workspace():
        info = get_workspace_info(org_id)
        assert not info.get("error"), f"auth.test échoué : {info.get('error')}"
        assert info.get("team"), "team manquant dans auth.test"
        assert info.get("team_id"), "team_id manquant"
    run("slack", "real_workspace_info", _t_workspace)

    def _t_channels():
        channels = list_channels(org_id, limit=10)
        assert isinstance(channels, list), f"attendu une liste, reçu {type(channels).__name__}"
        assert len(channels) >= 1, "aucun canal public retourné"
        ok, msg = _assert_list_has_keys(channels, ["id", "name", "members"])
        assert ok, msg
    run("slack", "real_list_channels", _t_channels)

    def _t_search():
        results = search_slack(query="", org_id=org_id, limit=3)
        assert isinstance(results, list), f"attendu une liste, reçu {type(results).__name__}"
        # Accepte liste vide si workspace sans messages (pas d'erreur = OK)
        if results and isinstance(results[0], dict):
            assert "error" not in results[0], f"search_slack retourne une erreur : {results[0].get('error')}"
    run("slack", "real_search_messages", _t_search)


# ── Entrypoint ────────────────────────────────────────────────────────────────

def run_all_mocks(filter_connector: str | None = None):
    print(f"\n{BOLD}{BLUE}{'═'*60}{RESET}")
    print(f"{BOLD}{BLUE}  SMOKE TESTS — MODE MOCK{RESET}")
    print(f"{BOLD}{BLUE}{'═'*60}{RESET}\n")

    suites = [
        test_mock_dispatch,
        test_mock_servicenow,
        test_mock_jira,
        test_mock_sap,
        test_mock_workday,
        test_mock_quickbooks,
        test_mock_intune,
        test_mock_m365,
        test_mock_aws,
        test_mock_crowdstrike,
        test_mock_hubspot,
        test_mock_slack,
        test_trust_manifest,
        test_call_tool_none_fallback,
    ]

    for suite in suites:
        if filter_connector and filter_connector not in suite.__name__:
            continue
        suite()

def run_real(connector: str, org_id: str):
    print(f"\n{BOLD}{BLUE}{'═'*60}{RESET}")
    print(f"{BOLD}{BLUE}  SMOKE TESTS — MODE RÉEL : {connector.upper()}{RESET}")
    print(f"{BOLD}{BLUE}{'═'*60}{RESET}\n")

    real_tests = {
        "intune":      lambda: test_real_intune(org_id),
        "jira":        lambda: test_real_jira(org_id),
        "quickbooks":  lambda: test_real_quickbooks(org_id),
        "microsoft_365": lambda: test_real_m365(org_id),
        "slack":         lambda: test_real_slack(org_id),
    }

    fn = real_tests.get(connector)
    if fn:
        fn()
    else:
        skip(connector, "real", f"Pas de test réel défini pour '{connector}'")


if __name__ == "__main__":
    args = sys.argv[1:]
    real_mode = "--real" in args
    args = [a for a in args if a != "--real"]

    filter_name = args[0] if args and not args[0].startswith("--") else None
    org_id      = args[1] if len(args) > 1 else os.getenv("TEST_ORG_ID", "")

    if real_mode:
        if not filter_name:
            print(f"{RED}Usage : python smoke_tests.py --real <connector> [org_id]{RESET}")
            sys.exit(1)
        if not org_id:
            print(f"{RED}org_id requis pour les tests réels (argument ou TEST_ORG_ID){RESET}")
            sys.exit(1)
        run_real(filter_name, org_id)
    else:
        run_all_mocks(filter_name)

    ok = results.print_summary()
    sys.exit(0 if ok else 1)

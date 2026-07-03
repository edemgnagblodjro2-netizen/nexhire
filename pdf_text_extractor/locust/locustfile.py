"""
Locust — AgentHub RC1 Load Test
Parcours utilisateur : Login → Dashboard → Audit → Members → Knowledge → Reports → Logout

Usage :
    pip install locust
    locust -f locust/locustfile.py --host https://myportal.nexhire.ca

    # Mode headless (CI / 48h observation) :
    locust -f locust/locustfile.py \
           --host https://myportal.nexhire.ca \
           --users 10 \
           --spawn-rate 2 \
           --run-time 48h \
           --headless \
           --csv locust/results

Variables d'env (optionnelles) :
    TEST_EMAIL     email d'un compte de test existant
    TEST_PASSWORD  mot de passe correspondant
"""

import os
import random
import logging

from locust import HttpUser, SequentialTaskSet, between, events, task

logger = logging.getLogger(__name__)

# ── Comptes de test ───────────────────────────────────────────────────────────
# Définir plusieurs comptes pour éviter les conflits de session simultanée.
# Chaque VU pioche aléatoirement dans la liste.
_TEST_ACCOUNTS = [
    {
        "email": os.environ.get("TEST_EMAIL", "testuser1@civicai.ca"),
        "password": os.environ.get("TEST_PASSWORD", "TestPassword123!"),
    },
    # Ajouter d'autres comptes si disponibles
    # {"email": "testuser2@civicai.ca", "password": "TestPassword123!"},
]


class AgentHubJourney(SequentialTaskSet):
    """Parcours complet d'un utilisateur AgentHub."""

    token: str = ""
    org_id: str = ""

    def on_start(self):
        """Authentification au démarrage de chaque VU."""
        account = random.choice(_TEST_ACCOUNTS)
        with self.client.post(
            "/api/auth/login",
            json={"email": account["email"], "password": account["password"]},
            catch_response=True,
            name="POST /api/auth/login",
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token", "")
                self.org_id = data.get("organization_id", "")
                resp.success()
            else:
                resp.failure(f"Login failed: {resp.status_code} — {resp.text[:200]}")
                self.token = ""

    def _auth(self) -> dict:
        """Headers d'authentification."""
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task
    def step_me(self):
        """GET /api/auth/me — profil utilisateur."""
        self.client.get("/api/auth/me", headers=self._auth(), name="GET /api/auth/me")

    @task
    def step_dashboard(self):
        """GET /api/dashboard/executive — tableau de bord principal."""
        self.client.get(
            "/api/dashboard/executive",
            headers=self._auth(),
            name="GET /api/dashboard/executive",
        )

    @task
    def step_audit(self):
        """GET /api/audit — logs d'audit paginés."""
        self.client.get(
            "/api/audit?limit=50&offset=0",
            headers=self._auth(),
            name="GET /api/audit",
        )

    @task
    def step_members(self):
        """GET /api/members — liste des membres paginée."""
        self.client.get(
            "/api/members?limit=50&offset=0",
            headers=self._auth(),
            name="GET /api/members",
        )

    @task
    def step_knowledge(self):
        """GET /api/knowledge/documents — documents indexés."""
        self.client.get(
            "/api/knowledge/documents?limit=50&offset=0",
            headers=self._auth(),
            name="GET /api/knowledge/documents",
        )

    @task
    def step_analytics(self):
        """GET /api/analytics — métriques analytiques."""
        self.client.get(
            "/api/analytics",
            headers=self._auth(),
            name="GET /api/analytics",
        )

    @task
    def step_connectors(self):
        """GET /api/connectors — liste des connecteurs."""
        self.client.get(
            "/api/connectors",
            headers=self._auth(),
            name="GET /api/connectors",
        )

    @task
    def step_done(self):
        """Fin du parcours — retour au début (re-login)."""
        self.interrupt()


class AgentHubUser(HttpUser):
    """Utilisateur virtuel AgentHub — parcours complet séquentiel."""

    tasks = [AgentHubJourney]
    # Temps d'attente entre les étapes : simule un vrai utilisateur qui lit
    wait_time = between(2, 5)
    # Toutes les requêtes vers HTTPS
    network_timeout = 30.0
    connection_timeout = 10.0


# ── Hooks de reporting ────────────────────────────────────────────────────────
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    logger.info("AgentHub load test started — target: %s", environment.host)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    logger.info(
        "AgentHub load test finished — "
        "total requests: %d | failures: %d | avg response: %.0fms",
        stats.total.num_requests,
        stats.total.num_failures,
        stats.total.avg_response_time,
    )

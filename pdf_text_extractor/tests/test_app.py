from __future__ import annotations

import io
from types import SimpleNamespace

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

import billing
from main import create_app
from storage import DocumentStore


class FakeAssistant:
    model = "fake-model"
    calls: list[dict] = []

    def __init__(self):
        self.calls = []

    def summarize(
        self,
        document_text: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
    ) -> str:
        assert "Bonjour depuis un PDF de test" in document_text
        self.calls.append(
            {
                "type": "summary",
                "assistant_mode": assistant_mode,
                "language": language,
            }
        )
        return "Resume fake: document de test."

    def answer_question(
        self,
        document_text: str,
        question: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
        connector_context: list[str] | None = None,
    ) -> str:
        assert "Bonjour depuis un PDF de test" in document_text
        self.calls.append(
            {
                "type": "chat",
                "assistant_mode": assistant_mode,
                "language": language,
                "connector_context": connector_context or [],
            }
        )
        return f"Reponse fake [{assistant_mode}/{language}]: {question}"


def _build_pdf_with_text(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def _client() -> tuple[TestClient, DocumentStore, FakeAssistant]:
    store = DocumentStore()
    assistant = FakeAssistant()
    return TestClient(create_app(storage=store, assistant=assistant)), store, assistant


def _upload_pdf(client: TestClient, text: str = "Bonjour depuis un PDF de test") -> dict:
    response = client.post(
        "/api/documents",
        files={"file": ("exemple.pdf", _build_pdf_with_text(text), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()


def test_upload_pdf_extracts_text():
    client, _, _ = _client()
    payload = _upload_pdf(client)

    assert payload["filename"] == "exemple.pdf"
    assert payload["character_count"] > 0
    assert "Bonjour depuis un PDF de test" in payload["text_preview"]


def test_billing_plans_include_trial_and_prices():
    client, _, _ = _client()

    response = client.get("/api/billing/plans")

    assert response.status_code == 200
    payload = response.json()
    assert payload["trial_days"] == 14
    assert payload["plans"][0]["id"] == "monthly"
    assert payload["plans"][0]["price"] == 99
    assert payload["plans"][1]["id"] == "annual"
    assert payload["plans"][1]["price"] == 990


def test_billing_checkout_requires_stripe_configuration(monkeypatch):
    client, _, _ = _client()
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)

    response = client.post(
        "/api/billing/checkout",
        json={"plan": "monthly", "customer_email": "buyer@example.com"},
    )

    assert response.status_code == 503
    assert "STRIPE_SECRET_KEY" in response.json()["detail"]


def test_billing_checkout_creates_stripe_session(monkeypatch):
    client, _, _ = _client()
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setenv("STRIPE_MONTHLY_PRICE_ID", "price_monthly")

    def fake_create(**kwargs):
        assert kwargs["mode"] == "subscription"
        assert kwargs["line_items"] == [{"price": "price_monthly", "quantity": 1}]
        assert kwargs["subscription_data"] == {"trial_period_days": 14}
        return SimpleNamespace(id="cs_test_123", url="https://checkout.stripe.test/session")

    monkeypatch.setattr(billing.stripe.checkout.Session, "create", fake_create)

    response = client.post(
        "/api/billing/checkout",
        json={"plan": "monthly", "customer_email": "buyer@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "cs_test_123",
        "url": "https://checkout.stripe.test/session",
    }


def test_readiness_reports_missing_production_configuration(monkeypatch):
    client, _, _ = _client()
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("CONNECTOR_TOKEN_ENCRYPTION_KEY", raising=False)

    response = client.get("/api/readiness")

    assert response.status_code == 200
    assert response.json()["stripe"] is False
    assert response.json()["token_encryption_key"] is False


def test_register_and_login_account():
    client, _, _ = _client()
    account = {
        "name": "Marie Tremblay",
        "email": "marie@example.com",
        "password": "password123",
        "account_type": "business",
        "plan": "annual",
    }

    register_response = client.post("/api/auth/register", json=account)
    login_response = client.post(
        "/api/auth/login",
        json={"email": account["email"], "password": account["password"]},
    )

    assert register_response.status_code == 200
    assert register_response.json()["trial_days"] == 14
    assert register_response.json()["plan_label"] == "990 $/annee"
    assert login_response.status_code == 200
    assert login_response.json()["email"] == account["email"]


def test_connector_hub_lists_and_connects_in_priority_order():
    client, _, _ = _client()

    list_response = client.get("/api/connectors")
    connect_response = client.post("/api/connectors/microsoft_365/connect")
    updated_response = client.get("/api/connectors")

    assert list_response.status_code == 200
    connectors = list_response.json()
    assert [connector["id"] for connector in connectors] == [
        "microsoft_365",
        "servicenow",
        "jira",
        "salesforce",
        "workday",
        "sap",
    ]
    assert connectors[0]["phase"] == 1
    assert connectors[0]["status"] == "planned"
    assert connect_response.status_code == 200
    assert connect_response.json()["status"] == "connected"
    assert connect_response.json()["actions"]
    assert updated_response.json()[0]["status"] == "connected"


def test_connector_oauth_callback_creates_connection_token_and_audit_logs():
    client, store, _ = _client()

    start_response = client.post(
        "/api/connectors/microsoft_365/oauth/start",
        json={"organization_id": "city-abc", "user_id": "ayaovi"},
    )
    callback_response = client.post(
        "/api/connectors/oauth/callback",
        json={
            "connector_id": "microsoft_365",
            "code": "oauth-code",
            "state": start_response.json()["state"],
            "organization_id": "city-abc",
            "user_id": "ayaovi",
        },
    )
    connections_response = client.get("/api/connections?organization_id=city-abc")
    audit_response = client.get("/api/audit-logs?organization_id=city-abc")

    assert start_response.status_code == 200
    assert "login.microsoftonline.com" in start_response.json()["authorization_url"]
    assert callback_response.status_code == 200
    assert callback_response.json()["status"] == "active"
    assert connections_response.json()[0]["connector_id"] == "microsoft_365"
    token = store.connector_tokens["city-abc:microsoft_365"]
    assert token["access_token_ciphertext"] != "access:oauth-code"
    assert token["refresh_token_ciphertext"] != "refresh:oauth-code"
    assert [log["action"] for log in audit_response.json()] == [
        "oauth_start",
        "connector_connected",
    ]


def test_search_data_abstraction_writes_audit_log():
    client, _, _ = _client()

    response = client.post(
        "/api/connectors/search",
        json={
            "source": "jira",
            "query": "projets en retard",
            "organization_id": "city-abc",
            "user_id": "ayaovi",
            "role": "it",
        },
    )
    audit_response = client.get("/api/audit-logs?organization_id=city-abc")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "jira"
    assert payload["source_name"] == "Jira"
    assert payload["results"][0]["title"] == "Jira: resultat de demonstration"
    assert audit_response.json()[0]["action"] == "search_data"
    assert audit_response.json()[0]["query"] == "projets en retard"


def test_search_data_enforces_role_permissions():
    client, _, _ = _client()

    response = client.post(
        "/api/connectors/search",
        json={
            "source": "sap",
            "query": "depenses du mois",
            "organization_id": "city-abc",
            "user_id": "employee-1",
            "role": "employee",
        },
    )
    audit_response = client.get("/api/audit-logs?organization_id=city-abc")

    assert response.status_code == 403
    assert audit_response.json()[0]["action"] == "search_denied"


def test_summary_uses_assistant_and_updates_document():
    client, store, assistant = _client()
    document = _upload_pdf(client)

    response = client.post(
        f"/api/documents/{document['id']}/summary",
        json={"assistant_mode": "municipal", "language": "fr"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "document_id": document["id"],
        "summary": "Resume fake: document de test.",
    }
    assert store.get_document(document["id"])["summary"] == "Resume fake: document de test."
    assert assistant.calls[-1] == {
        "type": "summary",
        "assistant_mode": "municipal",
        "language": "fr",
    }


def test_chat_returns_answer_and_conversation_id():
    client, store, assistant = _client()
    document = _upload_pdf(client)

    response = client.post(
        f"/api/documents/{document['id']}/chat",
        json={
            "question": "Screen this resume",
            "assistant_mode": "recruiting",
            "language": "en",
            "connector_ids": ["microsoft_365", "jira"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == document["id"]
    assert payload["question"] == "Screen this resume"
    assert payload["answer"] == "Reponse fake [recruiting/en]: Screen this resume"
    assert payload["conversation_id"]
    assert store.conversations[-1]["assistant_mode"] == "recruiting"
    assert store.conversations[-1]["language"] == "en"
    assert store.conversations[-1]["connector_ids"] == ["microsoft_365", "jira"]
    assert assistant.calls[-1] == {
        "type": "chat",
        "assistant_mode": "recruiting",
        "language": "en",
        "connector_context": ["Microsoft 365", "Jira"],
    }


def test_rejects_non_pdf_upload():
    client, _, _ = _client()

    response = client.post(
        "/api/documents",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Seuls les fichiers PDF sont acceptes."

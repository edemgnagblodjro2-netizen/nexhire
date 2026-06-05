from __future__ import annotations

import io

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

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
    ) -> str:
        assert "Bonjour depuis un PDF de test" in document_text
        self.calls.append(
            {
                "type": "chat",
                "assistant_mode": assistant_mode,
                "language": language,
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
    assert assistant.calls[-1] == {
        "type": "chat",
        "assistant_mode": "recruiting",
        "language": "en",
    }


def test_rejects_non_pdf_upload():
    client, _, _ = _client()

    response = client.post(
        "/api/documents",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Seuls les fichiers PDF sont acceptes."

from __future__ import annotations

import io

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from main import create_app
from storage import DocumentStore


class FakeAssistant:
    model = "fake-model"

    def summarize(self, document_text: str) -> str:
        assert "Bonjour depuis un PDF de test" in document_text
        return "Resume fake: document de test."

    def answer_question(self, document_text: str, question: str) -> str:
        assert "Bonjour depuis un PDF de test" in document_text
        return f"Reponse fake: {question}"


def _build_pdf_with_text(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def _client() -> TestClient:
    return TestClient(
        create_app(storage=DocumentStore(), assistant=FakeAssistant())
    )


def _upload_pdf(client: TestClient, text: str = "Bonjour depuis un PDF de test") -> dict:
    response = client.post(
        "/api/documents",
        files={"file": ("exemple.pdf", _build_pdf_with_text(text), "application/pdf")},
    )
    assert response.status_code == 201
    return response.json()


def test_upload_pdf_extracts_text():
    client = _client()
    payload = _upload_pdf(client)

    assert payload["filename"] == "exemple.pdf"
    assert payload["character_count"] > 0
    assert "Bonjour depuis un PDF de test" in payload["text_preview"]


def test_summary_uses_assistant_and_updates_document():
    client = _client()
    document = _upload_pdf(client)

    response = client.post(f"/api/documents/{document['id']}/summary")

    assert response.status_code == 200
    assert response.json() == {
        "document_id": document["id"],
        "summary": "Resume fake: document de test.",
    }


def test_chat_returns_answer_and_conversation_id():
    client = _client()
    document = _upload_pdf(client)

    response = client.post(
        f"/api/documents/{document['id']}/chat",
        json={"question": "Que contient ce document ?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == document["id"]
    assert payload["question"] == "Que contient ce document ?"
    assert payload["answer"] == "Reponse fake: Que contient ce document ?"
    assert payload["conversation_id"]


def test_rejects_non_pdf_upload():
    client = _client()

    response = client.post(
        "/api/documents",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Seuls les fichiers PDF sont acceptes."

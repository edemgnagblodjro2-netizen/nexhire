from __future__ import annotations

import io

from reportlab.pdfgen import canvas

from app import create_app


def _build_pdf_with_text(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def test_upload_pdf_extracts_text():
    app = create_app()
    app.config.update(TESTING=True)

    client = app.test_client()
    sample_text = "Bonjour depuis un PDF de test"
    response = client.post(
        "/",
        data={
            "pdf_file": (
                io.BytesIO(_build_pdf_with_text(sample_text)),
                "exemple.pdf",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert sample_text.encode() in response.data
    assert b"exemple.pdf" in response.data


def test_rejects_non_pdf_upload():
    app = create_app()
    app.config.update(TESTING=True)

    response = app.test_client().post(
        "/",
        data={"pdf_file": (io.BytesIO(b"hello"), "notes.txt")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert b"Seuls les fichiers PDF sont acceptes." in response.data


def test_requires_file_selection():
    app = create_app()
    app.config.update(TESTING=True)

    response = app.test_client().post(
        "/",
        data={},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert b"Veuillez choisir un fichier PDF" in response.data

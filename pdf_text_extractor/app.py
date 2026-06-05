from __future__ import annotations

import io
from pathlib import Path

from flask import Flask, render_template, request
from pypdf import PdfReader
from pypdf.errors import PdfReadError


ALLOWED_EXTENSIONS = {".pdf"}
MAX_UPLOAD_BYTES = 16 * 1024 * 1024


class PdfExtractionError(Exception):
    """Raised when an uploaded PDF cannot be read."""


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.post("/")
    def upload_pdf():
        uploaded_file = request.files.get("pdf_file")

        if uploaded_file is None or uploaded_file.filename == "":
            return render_template(
                "index.html",
                error="Veuillez choisir un fichier PDF avant de televerser.",
            )

        if not _is_allowed_pdf(uploaded_file.filename):
            return render_template(
                "index.html",
                error="Seuls les fichiers PDF sont acceptes.",
            )

        try:
            extracted_text = extract_text_from_pdf(uploaded_file.stream)
        except PdfExtractionError:
            return render_template(
                "index.html",
                error="Le fichier PDF n'a pas pu etre lu. Verifiez qu'il est valide.",
            )

        if not extracted_text.strip():
            return render_template(
                "index.html",
                filename=uploaded_file.filename,
                warning=(
                    "Aucun texte extractible n'a ete trouve. "
                    "Le PDF contient peut-etre seulement des images scannees."
                ),
                extracted_text="",
            )

        return render_template(
            "index.html",
            filename=uploaded_file.filename,
            extracted_text=extracted_text,
        )

    return app


def extract_text_from_pdf(file_stream: io.BufferedIOBase) -> str:
    try:
        reader = PdfReader(file_stream)

        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception as exc:  # pypdf raises several encryption-specific types.
                raise PdfExtractionError from exc

        pages = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, OSError, ValueError) as exc:
        raise PdfExtractionError from exc

    return "\n\n".join(page_text.strip() for page_text in pages if page_text.strip())


def _is_allowed_pdf(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)

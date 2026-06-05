from __future__ import annotations

import io
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError


ALLOWED_EXTENSIONS = {".pdf"}
MAX_UPLOAD_BYTES = 16 * 1024 * 1024


class PdfExtractionError(Exception):
    """Raised when an uploaded PDF cannot be read."""


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


def is_allowed_pdf(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

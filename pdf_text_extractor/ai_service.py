from __future__ import annotations

import os
import re
from dataclasses import dataclass

from openai import OpenAI


class AIConfigurationError(Exception):
    """Raised when the assistant cannot call OpenAI."""


def _is_enabled(value: str | None) -> bool:
    return value is not None and value.lower() in {"1", "true", "yes", "on"}


@dataclass
class AssistantService:
    api_key: str | None
    model: str = "gpt-4o-mini"
    dev_mode: bool = False

    @classmethod
    def from_env(cls) -> "AssistantService":
        return cls(
            api_key=os.getenv("OPENAI_API_KEY"),
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            dev_mode=_is_enabled(os.getenv("PDF_ASSISTANT_DEV_MODE")),
        )

    def summarize(self, document_text: str) -> str:
        if self.dev_mode:
            return self._local_summary(document_text)

        prompt = (
            "Resume ce document pour un dirigeant d'organisation. "
            "Structure la reponse en: points cles, risques ou echeances, actions recommandees."
        )
        return self._ask_openai(prompt, document_text)

    def answer_question(self, document_text: str, question: str) -> str:
        if self.dev_mode:
            return self._local_answer(document_text, question)

        prompt = (
            "Tu es l'assistant IA central d'une organisation. Reponds uniquement a partir "
            "du contenu fourni. Si l'information est absente, dis-le clairement et propose "
            "la prochaine verification utile.\n\n"
            f"Question: {question}"
        )
        return self._ask_openai(prompt, document_text)

    def _ask_openai(self, instruction: str, document_text: str) -> str:
        if not self.api_key:
            raise AIConfigurationError(
                "OPENAI_API_KEY est requis pour utiliser le resume et le chat IA."
            )

        client = OpenAI(api_key=self.api_key)
        response = client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Tu es un assistant IA d'entreprise. Tes reponses sont "
                        "concises, verifiables et utiles pour l'action."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{instruction}\n\nContenu du document:\n{_trim(document_text)}",
                },
            ],
        )

        output_text = getattr(response, "output_text", None)
        if output_text:
            return output_text.strip()

        return str(response).strip()

    def _local_summary(self, document_text: str) -> str:
        sentences = _sentences(document_text)
        selected = sentences[:3] or [_trim(document_text, limit=500)]
        return "Mode local: " + " ".join(selected).strip()

    def _local_answer(self, document_text: str, question: str) -> str:
        terms = {
            term
            for term in re.findall(r"[a-zA-Z0-9_'-]{4,}", question.lower())
            if term not in {"quel", "quelle", "quels", "quelles", "dans", "pour"}
        }
        lines = [line.strip() for line in document_text.splitlines() if line.strip()]
        matches = [
            line
            for line in lines
            if not terms or any(term in line.lower() for term in terms)
        ]
        evidence = matches[:3] or lines[:3]

        if not evidence:
            return "Mode local: aucun contenu texte n'est disponible dans ce PDF."

        return "Mode local: " + " ".join(evidence)


def _trim(text: str, limit: int = 16000) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[Contenu tronque pour rester dans la limite du modele.]"


def _sentences(text: str) -> list[str]:
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if sentence.strip()
    ]

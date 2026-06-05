from __future__ import annotations

import os
import re
import unicodedata
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

    def summarize(
        self,
        document_text: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
    ) -> str:
        if self.dev_mode:
            return self._local_summary(document_text, language=language)

        prompt = (
            f"{_mode_instruction(assistant_mode)}\n"
            f"Reponds en {_language_name(language)}.\n"
            "Resume ce document pour un dirigeant. Structure la reponse en: "
            "points cles, risques ou echeances, actions recommandees."
        )
        return self._ask_openai(prompt, document_text)

    def answer_question(
        self,
        document_text: str,
        question: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
        connector_context: list[str] | None = None,
    ) -> str:
        if self.dev_mode:
            return self._local_answer(
                document_text,
                question,
                language=language,
                connector_context=connector_context or [],
            )

        prompt = (
            f"{_mode_instruction(assistant_mode)}\n"
            f"Reponds en {_language_name(language)}. "
            f"Connecteurs selectionnes par l'utilisateur: {_connector_context(connector_context)}. "
            "Dans une integration complete, appelle ces connecteurs pour recuperer les donnees "
            "au lieu de supposer leur contenu. "
            "Reponds uniquement a partir du contenu fourni. Si l'information est absente, "
            "dis-le clairement et propose la prochaine verification utile.\n\n"
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

    def _local_summary(self, document_text: str, *, language: str) -> str:
        sentences = _sentences(document_text)
        selected = sentences[:3] or [_trim(document_text, limit=500)]
        prefix = "Local mode: " if language == "en" else "Mode local: "
        return prefix + " ".join(selected).strip()

    def _local_answer(
        self,
        document_text: str,
        question: str,
        *,
        language: str,
        connector_context: list[str],
    ) -> str:
        terms = {
            term
            for term in re.findall(r"[a-zA-Z0-9_'-]{4,}", _normalize(question))
            if term
            not in {
                "quel",
                "quelle",
                "quels",
                "quelles",
                "dans",
                "pour",
                "what",
                "where",
                "which",
                "show",
                "give",
            }
        }
        lines = [line.strip() for line in document_text.splitlines() if line.strip()]
        matches = [
            line
            for line in lines
            if not terms or any(term in _normalize(line) for term in terms)
        ]
        evidence = matches[:3] or lines[:3]

        if not evidence:
            if language == "en":
                return "Local mode: no extractable text is available in this PDF."
            return "Mode local: aucun contenu texte n'est disponible dans ce PDF."

        prefix = "Local mode: " if language == "en" else "Mode local: "
        connector_note = ""
        if connector_context:
            if language == "en":
                connector_note = f" Connectors selected: {', '.join(connector_context)}."
            else:
                connector_note = f" Connecteurs selectionnes: {', '.join(connector_context)}."
        return prefix + " ".join(evidence) + connector_note


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


def _mode_instruction(assistant_mode: str) -> str:
    instructions = {
        "enterprise": (
            "Tu es NexHire Enterprise Assistant, un employe virtuel intelligent qui aide "
            "les organisations a lire les courriels, analyser les documents, generer des "
            "rapports, suivre les tickets et produire des tableaux de bord."
        ),
        "municipal": (
            "Tu es NexHire Enterprise Assistant pour municipalites et organismes. Tu aides "
            "a gerer les demandes citoyennes, rechercher dans les reglements, rediger des "
            "rapports, repondre aux courriels et generer des statistiques."
        ),
        "recruiting": (
            "Tu es NexHire AI Recruiter Pro, un agent IA bilingue francais/anglais pour les "
            "PME canadiennes. Tu analyses les CV, qualifies les candidats, proposes des "
            "questions d'entrevue et aides les equipes RH."
        ),
    }
    return instructions.get(assistant_mode, instructions["enterprise"])


def _language_name(language: str) -> str:
    return "anglais" if language == "en" else "francais"


def _connector_context(connector_context: list[str] | None) -> str:
    if not connector_context:
        return "aucun"
    return ", ".join(connector_context)


def _normalize(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore")
    return ascii_value.decode("ascii").lower().replace("'", " ")

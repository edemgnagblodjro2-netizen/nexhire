from __future__ import annotations

import os
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


class AIConfigurationError(Exception):
    """Raised when the LLM backend is not configured."""


# ── Backend protocol ──────────────────────────────────────────────────────────

@runtime_checkable
class LLMBackend(Protocol):
    model: str

    def complete(self, system: str, user: str) -> str:
        ...


# ── OpenAI backend (also covers any OpenAI-compatible endpoint) ───────────────

@dataclass
class OpenAIBackend:
    """Standard OpenAI API.

    Set LLM_PROVIDER=openai (default).
    For private / self-hosted models that expose an OpenAI-compatible API,
    set LLM_PROVIDER=openai_compatible and provide OPENAI_API_BASE.
    """
    api_key: str
    model: str
    base_url: str | None = None   # None → api.openai.com

    def complete(self, system: str, user: str) -> str:
        from openai import OpenAI  # lazy import keeps startup fast when unused
        client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content.strip()


# ── Azure OpenAI backend ──────────────────────────────────────────────────────

@dataclass
class AzureOpenAIBackend:
    """Azure OpenAI Service.

    Set LLM_PROVIDER=azure and provide:
      AZURE_OPENAI_ENDPOINT  — https://<resource>.openai.azure.com/
      AZURE_OPENAI_KEY       — API key
      AZURE_OPENAI_DEPLOYMENT — deployment name (used as model)
      AZURE_OPENAI_API_VERSION (optional, default 2024-02-15-preview)
    """
    api_key: str
    endpoint: str
    deployment: str
    api_version: str = "2024-02-15-preview"

    @property
    def model(self) -> str:
        return self.deployment

    def complete(self, system: str, user: str) -> str:
        from openai import AzureOpenAI
        client = AzureOpenAI(
            api_key=self.api_key,
            azure_endpoint=self.endpoint,
            api_version=self.api_version,
        )
        response = client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content.strip()


# ── Factory ───────────────────────────────────────────────────────────────────

def _build_backend() -> LLMBackend | None:
    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider == "azure":
        key = os.getenv("AZURE_OPENAI_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        if not (key and endpoint and deployment):
            return None
        return AzureOpenAIBackend(
            api_key=key,
            endpoint=endpoint,
            deployment=deployment,
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        )

    # openai (default) or openai_compatible
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAIBackend(
        api_key=api_key,
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        base_url=os.getenv("OPENAI_API_BASE") or None,  # None keeps default
    )


# ── AssistantService ──────────────────────────────────────────────────────────

def _is_enabled(value: str | None) -> bool:
    return value is not None and value.lower() in {"1", "true", "yes", "on"}


@dataclass
class AssistantService:
    backend: LLMBackend | None
    dev_mode: bool = False
    _model_cache: str = field(init=False, repr=False, default="")

    @property
    def model(self) -> str:
        return self.backend.model if self.backend else "local"

    @classmethod
    def from_env(cls) -> "AssistantService":
        return cls(
            backend=_build_backend(),
            dev_mode=_is_enabled(os.getenv("PDF_ASSISTANT_DEV_MODE")),
        )

    def summarize(
        self,
        document_text: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
    ) -> str:
        if self.dev_mode or self.backend is None:
            return self._local_summary(document_text, language=language)

        system = (
            "Tu es un assistant IA d'entreprise. Tes réponses sont "
            "concises, vérifiables et utiles pour l'action."
        )
        user = (
            f"{_mode_instruction(assistant_mode)}\n"
            f"Réponds en {_language_name(language)}.\n"
            "Résume ce document pour un dirigeant. Structure la réponse en : "
            "points clés, risques ou échéances, actions recommandées.\n\n"
            f"Contenu du document :\n{_trim(document_text)}"
        )
        return self.backend.complete(system, user)

    def answer_question(
        self,
        document_text: str,
        question: str,
        *,
        assistant_mode: str = "enterprise",
        language: str = "fr",
    ) -> str:
        if self.dev_mode or self.backend is None:
            return self._local_answer(document_text, question, language=language)

        system = (
            "Tu es un assistant IA d'entreprise. Tes réponses sont "
            "concises, vérifiables et utiles pour l'action."
        )
        user = (
            f"{_mode_instruction(assistant_mode)}\n"
            f"Réponds en {_language_name(language)}. "
            "Réponds uniquement à partir du contenu fourni. Si l'information est absente, "
            "dis-le clairement et propose la prochaine vérification utile.\n\n"
            f"Question : {question}\n\n"
            f"Contenu du document :\n{_trim(document_text)}"
        )
        return self.backend.complete(system, user)

    def _local_summary(self, document_text: str, *, language: str) -> str:
        sentences = _sentences(document_text)
        selected = sentences[:3] or [_trim(document_text, limit=500)]
        prefix = "Local mode: " if language == "en" else "Mode local : "
        return prefix + " ".join(selected).strip()

    def _local_answer(self, document_text: str, question: str, *, language: str) -> str:
        terms = {
            term
            for term in re.findall(r"[a-zA-Z0-9_'-]{4,}", _normalize(question))
            if term not in {"quel", "quelle", "quels", "quelles", "dans", "pour",
                            "what", "where", "which", "show", "give"}
        }
        lines = [line.strip() for line in document_text.splitlines() if line.strip()]
        matches = [
            line for line in lines
            if not terms or any(term in _normalize(line) for term in terms)
        ]
        evidence = matches[:3] or lines[:3]

        if not evidence:
            return ("Local mode: no extractable text." if language == "en"
                    else "Mode local : aucun contenu texte disponible.")

        prefix = "Local mode: " if language == "en" else "Mode local : "
        return prefix + " ".join(evidence)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _trim(text: str, limit: int = 16000) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[Contenu tronqué pour rester dans la limite du modèle.]"


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _mode_instruction(assistant_mode: str) -> str:
    instructions = {
        "enterprise": (
            "Tu es NexHire Enterprise Assistant, un employé virtuel intelligent pour "
            "les organisations privées. Tu analyses données, emails, contrats, tickets "
            "et tableaux de bord pour aider la prise de décision opérationnelle."
        ),
        "municipal": (
            "Tu es NexHire Assistant Municipal, spécialisé pour les villes, municipalités "
            "et organismes publics canadiens. Tu aides à gérer les demandes citoyennes, "
            "rechercher dans les règlements, rédiger des rapports municipaux, suivre les "
            "appels d'offres publics et produire des statistiques de service."
        ),
        "recruiting": (
            "Tu es NexHire AI Recruiter Pro, un agent IA bilingue français/anglais "
            "spécialisé en recrutement pour les PME canadiennes. Tu analyses les CV, "
            "qualifies les candidats, proposes des questions d'entrevue comportementales, "
            "rédiges des offres d'emploi et aides les équipes RH dans tout le cycle "
            "d'embauche — de la publication de poste à l'onboarding."
        ),
    }
    return instructions.get(assistant_mode, instructions["enterprise"])


def _language_name(language: str) -> str:
    return "anglais" if language == "en" else "français"


def _normalize(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore")
    return ascii_value.decode("ascii").lower().replace("'", " ")

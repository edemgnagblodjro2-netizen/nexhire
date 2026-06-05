# Assistant IA documentaire

Application Python/FastAPI qui permet de televerser un PDF, d'en extraire le
texte, de generer un resume avec OpenAI et de poser des questions sur le
document. L'objectif est de servir de base a un assistant IA unique pour les
donnees et les processus d'une organisation.

## Installation

```bash
cd pdf_text_extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuration

Pour utiliser OpenAI en production:

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"
```

Pour connecter Supabase:

```bash
export SUPABASE_URL="https://PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
```

Executez `supabase_schema.sql` dans Supabase SQL Editor pour creer les tables
`organizations`, `users`, `documents` et `conversations`.

Sans variables Supabase, l'application utilise un stockage memoire local. Pour
tester sans cle OpenAI:

```bash
export PDF_ASSISTANT_DEV_MODE=1
```

## Lancer l'API et le portail

```bash
uvicorn main:app --reload
```

Ouvrez ensuite <http://127.0.0.1:8000>, choisissez un fichier `.pdf`, generez
un resume, puis posez vos questions dans le chat.

## Endpoints principaux

- `POST /api/documents`: televerse un PDF et stocke le texte extrait.
- `POST /api/documents/{document_id}/summary`: genere et conserve le resume.
- `POST /api/documents/{document_id}/chat`: repond a une question et conserve
  l'historique dans `conversations`.
- `GET /api/health`: verifie que l'API repond.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Note: les PDF composes uniquement d'images scannees peuvent ne pas contenir de
texte extractible sans OCR.

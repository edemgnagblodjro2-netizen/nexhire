# NexHire Enterprise Assistant

Application Python/FastAPI bilingue qui sert de base a un assistant IA unique
pour les donnees, documents et processus d'une organisation canadienne.

Le portail couvre deux offres coherentes avec NexHire:

- **NexHire Enterprise Assistant**: assistant IA pour municipalites, organismes,
  PME, universites, hopitaux et grandes entreprises.
- **NexHire AI Recruiter Pro**: recruteur IA bilingue francais/anglais pour les
  PME canadiennes.

Le prototype actuel televerse un PDF, extrait le texte, genere un resume avec
OpenAI et permet de poser des questions sur le document. Le schema Supabase
prepare aussi les sources futures: Microsoft 365, Salesforce, ServiceNow, Jira,
SAP et Workday.

Le portail web inclut aussi:

- une entete professionnelle avec branding NexHire;
- un slider de 3 bannieres visuelles locales;
- un footer avec les informations CivicAI/NexHire;
- deux plans de paiement: `99 $/mois` et `990 $/annee`;
- un essai gratuit de 14 jours apres inscription;
- des formulaires inscription/connexion pour `business`, `individual` et
  `organization`.

## CivicAI Enterprise Connector Hub

Les connecteurs sont exposes comme de vrais boutons et endpoints de prototype.
L'agent ne doit pas inventer les donnees: il recoit les connecteurs selectionnes
et, dans une integration complete, les appelle pour recuperer les donnees avant
de repondre.

Ordre de deploiement recommande:

1. `microsoft_365`: Outlook, SharePoint, Teams et fichiers.
2. `servicenow`: incidents, tickets TI et SLA.
3. `jira`: projets, epics, sprints et retards.
4. `salesforce`: comptes, opportunites et pipeline commercial.
5. `workday`: donnees RH et talents.
6. `sap`: ERP, achats, finances et contrats.

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

Ouvrez ensuite <http://127.0.0.1:8000>, choisissez un mode d'assistant, une
langue, un fichier `.pdf`, puis generez un resume et posez vos questions dans le
chat.

## Modes d'assistant

- `enterprise`: rapports, courriels, tickets, tableaux de bord, politiques RH,
  achats, depenses et operations.
- `municipal`: demandes citoyennes, reglements, rapports municipaux, courriels,
  tickets et statistiques.
- `recruiting`: analyse de CV, matching avance, prequalification, questions
  d'entrevue, classement des candidatures et assistant RH conversationnel.

Chaque requete de resume ou de chat accepte aussi `language` avec `fr` ou `en`.

## Endpoints principaux

- `POST /api/documents`: televerse un PDF et stocke le texte extrait.
- `POST /api/documents/{document_id}/summary`: genere et conserve le resume.
- `POST /api/documents/{document_id}/chat`: repond a une question et conserve
  l'historique dans `conversations`.
- `GET /api/billing/plans`: retourne les plans `monthly` et `annual`.
- `POST /api/auth/register`: cree un compte prototype avec essai de 14 jours.
- `POST /api/auth/login`: connecte un compte cree localement.
- `GET /api/connectors`: retourne les connecteurs et leur phase.
- `POST /api/connectors/{connector_id}/connect`: connecte un systeme au chat.
- `GET /api/health`: verifie que l'API repond.

Exemple chat:

```json
{
  "assistant_mode": "recruiting",
  "language": "en",
  "connector_ids": ["microsoft_365", "jira"],
  "question": "Screen this candidate and suggest interview questions."
}
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Note: les PDF composes uniquement d'images scannees peuvent ne pas contenir de
texte extractible sans OCR.

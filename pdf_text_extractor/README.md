# Extracteur de texte PDF

Petite application Python/Flask qui permet de televerser un fichier PDF et
d'afficher le texte qui peut en etre extrait.

## Installation

```bash
cd pdf_text_extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Lancer l'application

```bash
flask --app app run --debug
```

Ouvrez ensuite <http://127.0.0.1:5000>, choisissez un fichier `.pdf`, puis
cliquez sur **Televerser et extraire**.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Note: les PDF composes uniquement d'images scannees peuvent ne pas contenir de
texte extractible sans OCR.

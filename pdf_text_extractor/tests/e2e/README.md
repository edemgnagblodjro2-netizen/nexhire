# Suite E2E Playwright — AgentHub Platform

Suite QA comportementale. Chaque test produit une **preuve observable** (DOM, texte rendu, navigations).

## Installation

```bash
pip install -r requirements-dev.txt
playwright install chromium
```

## Lancer la suite complète

```bash
# Contre localhost (démarrer le serveur d'abord)
NEXHIRE_BASE_URL=http://localhost:8000 pytest tests/e2e/ -v

# Contre staging
NEXHIRE_BASE_URL=https://myportal.nexhire.ca pytest tests/e2e/ -v

# Avec authentification (modules nécessitant un compte connecté)
NEXHIRE_BASE_URL=https://myportal.nexhire.ca \
NEXHIRE_TEST_TOKEN=eyJ... \
pytest tests/e2e/ -v

# Avec email + password
NEXHIRE_BASE_URL=https://myportal.nexhire.ca \
NEXHIRE_TEST_EMAIL=admin@org.ca \
NEXHIRE_TEST_PASSWORD=motdepasse \
pytest tests/e2e/ -v
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `NEXHIRE_BASE_URL` | `http://localhost:8000` | URL de base de l'application |
| `NEXHIRE_TEST_SLUG` | `demo` | Slug du workspace de test |
| `NEXHIRE_TEST_TOKEN` | _(vide)_ | JWT pré-émis (prioritaire) |
| `NEXHIRE_TEST_EMAIL` | _(vide)_ | Email pour login via formulaire |
| `NEXHIRE_TEST_PASSWORD` | _(vide)_ | Mot de passe correspondant |

## Fichiers de tests

| Fichier | Ce qu'il teste | Verdict attendu |
|---|---|---|
| `test_01_login_i18n.py` | Page connexion FR→EN (data-i18n) | PASSE ✓ |
| `test_02_workspace_i18n.py` | Workspace FR→EN (preuves de NON FONCTIONNEL) | ÉCHOUE ✗ (attendu) |
| `test_03_workspace_nav.py` | Clic sur tous les menus, search, panels | PASSE si les modules chargent |
| `test_04_workspace_forms.py` | Formulaires, boutons, champs par module | PASSE si UI rendue |
| `test_05_workspace_settings.py` | Module Settings en profondeur | PASSE si module monté |

## Interprétation des résultats

- `test_02_workspace_i18n.py` contient des tests **`xfail(strict=True)`** :
  - S'ils **ÉCHOUENT** (`XFAIL`) → comportement attendu, bug confirmé
  - S'ils **PASSENT** (`XPASS`) → la traduction a été corrigée, marquer comme succès
  - Le test `test_VERDICT_workspace_i18n_is_non_functional` échouera avec la liste complète des chaînes FR restantes

## Lancer un seul fichier

```bash
pytest tests/e2e/test_02_workspace_i18n.py -v --headed  # mode visuel
pytest tests/e2e/test_01_login_i18n.py -v -k "TestFrToEnToggle"
```

## Options Playwright utiles

```bash
# Mode headed (voir le navigateur)
pytest tests/e2e/ --headed

# Ralentir les actions (debug visuel)
pytest tests/e2e/ --headed --slowmo=500

# Prendre des screenshots à chaque échec
pytest tests/e2e/ --screenshot=on-failure --output=test-results/

# Générer un rapport HTML
pytest tests/e2e/ --html=report.html --self-contained-html

# Navigateur Firefox
pytest tests/e2e/ --browser=firefox
```

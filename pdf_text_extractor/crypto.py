from __future__ import annotations

import os

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

# ──────────────────────────────────────────────────────────────────────────
# Chiffrement des secrets (tokens OAuth des connecteurs, etc.)
#
# FERNET_KEYS : une ou plusieurs clés Fernet séparées par des virgules.
#   - La PREMIÈRE clé sert au chiffrement.
#   - TOUTES les clés servent au déchiffrement (permet la rotation sans coupure).
#
# Générer une clé :
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
#
# ── Plan de rotation (documenté) ──────────────────────────────────────────
#   1. Générer une nouvelle clé K2.
#   2. Déployer FERNET_KEYS="K2,K1" (K2 chiffre désormais, K1 déchiffre encore).
#   3. Rechiffrer progressivement les valeurs existantes avec rotate() (tâche
#      de fond sur la table connectors).
#   4. Une fois tout rechiffré, retirer K1 : FERNET_KEYS="K2".
# Aucune information sensible n'est jamais stockée en clair.
# ──────────────────────────────────────────────────────────────────────────

_fernet: MultiFernet | None = None


def _instance() -> MultiFernet:
    global _fernet
    if _fernet is None:
        raw = os.getenv("FERNET_KEYS") or os.getenv("FERNET_KEY")
        if not raw:
            raise RuntimeError("FERNET_KEYS manquant : aucune clé de chiffrement configurée.")
        keys = [Fernet(part.strip().encode()) for part in raw.split(",") if part.strip()]
        if not keys:
            raise RuntimeError("FERNET_KEYS vide.")
        _fernet = MultiFernet(keys)
    return _fernet


def encrypt(plaintext: str) -> str:
    """Chiffre une chaîne avec la clé primaire ; renvoie un token texte."""
    return _instance().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    """Déchiffre un token produit par encrypt() (essaie toutes les clés)."""
    try:
        return _instance().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Déchiffrement impossible (clé invalide ou donnée corrompue).") from exc


def rotate(token: str) -> str:
    """Rechiffre un token avec la clé primaire (à utiliser lors d'une rotation)."""
    return _instance().rotate(token.encode()).decode()

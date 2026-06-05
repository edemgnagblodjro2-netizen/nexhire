from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets

from cryptography.fernet import Fernet


_DEV_FERNET_KEY = base64.urlsafe_b64encode(
    hashlib.sha256(b"civicai-dev-token-encryption-key").digest()
)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt, expected = encoded.split("$", 2)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return hmac.compare_digest(digest.hex(), expected)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def token_encryption_ready() -> bool:
    return bool(os.getenv("CONNECTOR_TOKEN_ENCRYPTION_KEY"))


def _fernet() -> Fernet:
    key = os.getenv("CONNECTOR_TOKEN_ENCRYPTION_KEY")
    if key:
        return Fernet(key.encode("utf-8"))
    return Fernet(_DEV_FERNET_KEY)

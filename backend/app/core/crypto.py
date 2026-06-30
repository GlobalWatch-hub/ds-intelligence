"""Password hashing + reversible secret encryption for platform accounts.

Two distinct primitives, deliberately:

  * Platform login passwords -> PBKDF2-HMAC-SHA256 (stdlib, one-way). We only
    ever need to VERIFY them, so a salted hash is correct and adds no dependency.

  * CRM credentials (CrediDesk password) -> Fernet symmetric encryption. These
    must be DECRYPTED later to mint a CRM JWT (phase 2), so a hash won't do. The
    key comes from APP_CRYPTO_KEY (a urlsafe-base64 32-byte Fernet key); without
    it, encrypt/decrypt fail closed rather than storing secrets in clear text.

Generate a key once with:  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

import hashlib
import hmac
import os

from ..config import settings

_PBKDF2_ROUNDS = 200_000
_SALT_BYTES = 16


def hash_password(password: str) -> tuple[str, str]:
    """Return (hash_hex, salt_hex) for a fresh random salt."""
    salt = os.urandom(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return digest.hex(), salt.hex()


def verify_password(password: str, hash_hex: str | None, salt_hex: str | None) -> bool:
    """Constant-time check of a candidate password against a stored hash+salt."""
    if not hash_hex or not salt_hex:
        return False
    try:
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return hmac.compare_digest(digest.hex(), hash_hex)


def _fernet():
    """Lazily build the Fernet box; raises a clear error if no key is set."""
    key = settings.APP_CRYPTO_KEY
    if not key:
        raise RuntimeError(
            "APP_CRYPTO_KEY não configurada — impossível cifrar/decifrar credenciais CRM."
        )
    from cryptography.fernet import Fernet

    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret (e.g. CRM password) to a urlsafe token string."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    """Decrypt a token produced by encrypt_secret back to plaintext."""
    return _fernet().decrypt(token.encode()).decode()

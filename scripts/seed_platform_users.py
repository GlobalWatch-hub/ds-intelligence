"""Seed ds.platform_users with Bruno Sousa (bs) and Jorge Gonçalves (jg).

One-time bootstrap so the new DB-backed login (migration 009) keeps the existing
accounts working. Idempotent and non-destructive: it never overwrites a password
or CRM credential that is already set (e.g. later edited via the Configurações
UI). It only fills blanks.

Sources:
  * platform password  <- APP_USERS JSON in .env  (preserves current logins)
  * Bruno's CRM creds   <- DS_CRM_USERNAME / DS_CRM_PASSWORD in .env (encrypted)
  * Jorge's CRM creds   <- left empty until the client provides them

Prereq: migration 009_platform_users.sql applied; APP_CRYPTO_KEY set.
Run:  python scripts/seed_platform_users.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

from app.core.crypto import encrypt_secret, hash_password  # noqa: E402
from app.db import supabase  # noqa: E402

# username -> display profile. Emails match the loja's CRM addresses.
USERS = {
    "bs": {"nome": "Bruno Sousa", "email": "brunosousa@dsicredito.pt"},
    "jg": {"nome": "Jorge Gonçalves", "email": "jorgegoncalves@dsicredito.pt"},
}


def _app_passwords() -> dict[str, str]:
    raw = os.environ.get("APP_USERS", "")
    try:
        data = json.loads(raw) if raw else {}
        return {str(k): str(v) for k, v in data.items() if v} if isinstance(data, dict) else {}
    except (ValueError, TypeError):
        return {}


def main():
    sb = supabase()
    app_pw = _app_passwords()
    crm_user = os.environ.get("DS_CRM_USERNAME")
    crm_pass = os.environ.get("DS_CRM_PASSWORD")

    for username, profile in USERS.items():
        existing = (
            sb.table("platform_users")
            .select("id, password_hash, crm_password_enc")
            .eq("username", username)
            .limit(1)
            .execute()
            .data
            or [None]
        )[0]

        row: dict = {"username": username, "nome": profile["nome"], "email": profile["email"], "role": "gestor"}

        # Platform password: only set when we have one AND it isn't already set.
        if username in app_pw and not (existing and existing.get("password_hash")):
            h, salt = hash_password(app_pw[username])
            row["password_hash"] = h
            row["password_salt"] = salt

        # CRM creds: only Bruno, only when env has them and none stored yet.
        if username == "bs" and crm_user and crm_pass and not (existing and existing.get("crm_password_enc")):
            row["crm_username"] = crm_user
            row["crm_password_enc"] = encrypt_secret(crm_pass)

        if existing:
            sb.table("platform_users").update(row).eq("id", existing["id"]).execute()
            print(f"[seed] updated {username} ({profile['nome']})")
        else:
            sb.table("platform_users").insert(row).execute()
            print(f"[seed] inserted {username} ({profile['nome']})")

    if not app_pw:
        print("[seed] WARN: APP_USERS vazio — utilizadores ficam sem password até a definires na UI.")
    print("[done] platform_users semeado")


if __name__ == "__main__":
    main()

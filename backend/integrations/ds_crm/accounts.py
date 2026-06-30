"""Enumerate the CRM accounts to ingest, from ds.platform_users.

Each active platform user that has CRM credentials becomes one ingest account:
its CrediDesk password is decrypted (Fernet, APP_CRYPTO_KEY) in memory only.

Falls back to the shared env account (DS_CRM_USERNAME/PASSWORD, tagged 'bs') when
the table is empty/unreachable or no user has creds — keeps single-account
ingestion working exactly as before phase 2.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from app.core.crypto import decrypt_secret
from app.db import supabase


@dataclass
class CrmAccount:
    username: str          # platform_users.username — becomes source_account on each row
    crm_email: str
    crm_password: str


def list_crm_accounts() -> list[CrmAccount]:
    accounts: list[CrmAccount] = []
    try:
        rows = (
            supabase()
            .table("platform_users")
            .select("username, crm_username, crm_password_enc, is_active")
            .eq("is_active", True)
            .execute()
            .data
            or []
        )
    except Exception as e:  # table missing / project unreachable
        print(f"[accounts] platform_users unavailable ({type(e).__name__}); falling back to env account")
        rows = []

    for r in rows:
        enc = r.get("crm_password_enc")
        crm_email = r.get("crm_username")
        if not enc or not crm_email:
            continue
        try:
            pw = decrypt_secret(enc)
        except Exception as e:
            print(f"[accounts] skip {r.get('username')}: cannot decrypt CRM password ({type(e).__name__})")
            continue
        accounts.append(CrmAccount(username=r["username"], crm_email=crm_email, crm_password=pw))

    if not accounts:
        env_user = os.environ.get("DS_CRM_USERNAME")
        env_pass = os.environ.get("DS_CRM_PASSWORD")
        if env_user and env_pass:
            print("[accounts] no DB CRM accounts — using shared env account as 'bs'")
            accounts.append(CrmAccount(username="bs", crm_email=env_user, crm_password=env_pass))

    return accounts

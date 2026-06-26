"""Centralised settings loaded from env (.env via python-dotenv in main.py)."""
from __future__ import annotations
import os


class Settings:
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")

    META_WA_VERIFY_TOKEN: str = os.environ.get("META_WA_VERIFY_TOKEN", "")
    META_WA_PHONE_NUMBER_ID: str = os.environ.get("META_WA_PHONE_NUMBER_ID", "")
    META_WA_ACCESS_TOKEN: str = os.environ.get("META_WA_ACCESS_TOKEN", "")
    META_WA_APP_SECRET: str = os.environ.get("META_WA_APP_SECRET", "")
    DEMO_RECIPIENTS: str = os.environ.get("DEMO_RECIPIENTS", "")

    # In-app login (item 1). Set in .env on deploy; empty APP_PASSWORD +
    # APP_USERS means login is unconfigured and fails closed (nobody can
    # authenticate) rather than open. Never hardcode credentials here.
    #  - APP_USER / APP_PASSWORD: the primary shared credential.
    #  - APP_USERS: extra accounts as a JSON object, e.g. test logins —
    #      APP_USERS={"amin":"<senha>"}  (merged with the primary one).
    APP_USER: str = os.environ.get("APP_USER", "ds")
    APP_PASSWORD: str = os.environ.get("APP_PASSWORD", "")
    APP_USERS: str = os.environ.get("APP_USERS", "")
    APP_SESSION_SECRET: str = os.environ.get("APP_SESSION_SECRET", "")
    # Session cookie Secure flag. True in production (HTTPS); set COOKIE_SECURE=false
    # to allow login over plain HTTP (e.g. testing by IP before a domain + SSL).
    COOKIE_SECURE: bool = os.environ.get("COOKIE_SECURE", "true").strip().lower() != "false"

    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
    LOJA_NAME: str = os.environ.get("LOJA_NAME", "DS Crédito Ramada – Jardim da Amoreira")
    BRAND_RED: str = os.environ.get("BRAND_RED", "#E30613")

    CHAT_MODEL: str = "claude-sonnet-4-6"
    NEWSLETTER_MODEL: str = "claude-sonnet-4-6"


settings = Settings()

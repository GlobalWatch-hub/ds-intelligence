"""Per-user read scoping for the CRM mirror (phase 2).

The logged-in platform user only sees the processos/leads that THEIR CrediDesk
account ingested — i.e. rows tagged `source_account = <username>` (see migration
010 + the ingest loop). This mirrors real CRM visibility, which no single account
covers for the whole loja.

`account_filter(request)` returns the `source_account` value to filter by, or
None meaning "see everything":
  * platform_users gestor      -> own username (their account's scope)
  * platform_users admin/coord -> None (loja-wide)
  * env-only logins (ds/amin)  -> None (admin, loja-wide)

clientes_real is NOT scoped (loja-wide by product design) — callers simply don't
ask for a filter on it.
"""
from __future__ import annotations

from fastapi import Request

from ..routers.auth import COOKIE_NAME, token_user

# Roles that see every account's data (no source_account filter).
_SEE_ALL_ROLES = {"admin", "coordenador"}


def current_username(request: Request) -> str | None:
    return token_user(request.cookies.get(COOKIE_NAME))


def account_filter(request: Request) -> str | None:
    """source_account to filter processos/leads by, or None to see all.

    The session gate in main.py guarantees a valid token before any router runs,
    so an unknown username here means an admin/test login (not in platform_users)
    → loja-wide access.
    """
    username = current_username(request)
    if not username:
        return None
    try:
        from ..db import supabase

        row = (
            supabase()
            .table("platform_users")
            .select("username, role, is_active")
            .eq("username", username)
            .eq("is_active", True)
            .limit(1)
            .execute()
            .data
            or [None]
        )[0]
    except Exception:
        row = None
    if not row:
        return None  # ds/amin or any non-DB login → see all
    if (row.get("role") or "gestor") in _SEE_ALL_ROLES:
        return None
    return username

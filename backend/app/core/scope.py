"""Per-profile read scoping for the CRM mirror (role hierarchy).

The logged-in platform user sees processos/leads according to their profile:
  * diretor_loja          → the whole loja (no filter)
  * diretor_comercial     → own + team = what their CRM account ingests
                            (source_accounts @> {username})
  * comercial             → only their own (manager_crm_id == theirs)
  * env-only logins (ds/amin, not in platform_users) → loja-wide

`user_scope(request)` returns None (loja-wide) or a filter descriptor;
`apply_scope(query, scope)` applies it to a Supabase query. clientes_real is
never scoped (loja-wide by product design) — callers just don't pass a scope.
"""
from __future__ import annotations

from fastapi import Request

from ..routers.auth import COOKIE_NAME, token_user


def current_username(request: Request) -> str | None:
    return token_user(request.cookies.get(COOKIE_NAME))


def _user_row(username: str) -> dict | None:
    try:
        from ..db import supabase

        return (
            supabase()
            .table("platform_users")
            .select("username, nome, role, manager_crm_id, is_active")
            .eq("username", username)
            .eq("is_active", True)
            .limit(1)
            .execute()
            .data
            or [None]
        )[0]
    except Exception:
        return None


def user_scope(request: Request) -> dict | None:
    """None = loja-wide; else {'kind': 'source_account'|'manager_crm_id', 'value': ...}.

    The session gate (main.py) guarantees a valid token before any router runs, so
    an unknown username here means an admin/test login (not in platform_users).
    """
    username = current_username(request)
    if not username:
        return None
    row = _user_row(username)
    if not row:
        return None  # ds/amin etc → loja-wide
    role = row.get("role") or "comercial"
    if role == "diretor_loja":
        return None
    if role == "diretor_comercial":
        return {"kind": "source_account", "value": username}
    # comercial → own processos only; unmapped (no manager_crm_id) sees nothing (-1)
    mid = row.get("manager_crm_id")
    return {"kind": "manager_crm_id", "value": mid if mid is not None else -1}


def scope_label(request: Request) -> str:
    """Human label (pt) of the logged-in user's CRM data scope, to show wherever
    CRM figures appear: 'Loja toda' / 'Equipa de X' / 'Carteira de X'."""
    username = current_username(request)
    if not username:
        return "Loja toda"
    row = _user_row(username)
    if not row:
        return "Loja toda"
    role = row.get("role") or "comercial"
    nome = row.get("nome") or username
    if role == "diretor_loja":
        return "Loja toda"
    if role == "diretor_comercial":
        return f"Equipa de {nome}"
    return f"Carteira de {nome}"


def apply_scope(query, scope: dict | None):
    """Apply a user_scope descriptor to a Supabase query builder."""
    if scope is None:
        return query
    if scope["kind"] == "source_account":
        return query.contains("source_accounts", [scope["value"]])
    if scope["kind"] == "manager_crm_id":
        return query.eq("manager_crm_id", scope["value"])
    return query

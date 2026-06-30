"""Settings / Utilizadores — manage platform accounts and per-user CRM creds.

All routes sit behind the global session gate (see main.py middleware). Two
trust tiers:

  * "Conta" data (nome, telefone, email, palavra-passe) — any authenticated
    session may read/edit (phase-1 simplification; the data views aren't yet
    scoped per user).

  * "Definições" / CRM credentials — gated additionally by the global service
    PIN (APP_SERVICE_PIN), sent in the `X-Service-Pin` header and checked in
    constant time on EVERY read/write. The CRM password is stored encrypted and
    never returned in clear text; reads only reveal whether one is set.
"""
from __future__ import annotations

import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..core.crypto import encrypt_secret, hash_password
from ..db import supabase

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_pin(pin: str | None) -> None:
    """Raise 403 unless the supplied service PIN matches APP_SERVICE_PIN."""
    if not settings.APP_SERVICE_PIN or not pin or not hmac.compare_digest(pin, settings.APP_SERVICE_PIN):
        raise HTTPException(403, "PIN de serviço inválido.")


def _get_user_or_404(sb, user_id: int, columns: str) -> dict:
    res = sb.table("platform_users").select(columns).eq("id", user_id).limit(1).execute()
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(404, "Utilizador não encontrado.")
    return row


@router.get("/users")
def list_users():
    """List platform users for the Utilizadores screen — no secrets."""
    sb = supabase()
    rows = (
        sb.table("platform_users")
        .select("id, username, nome, role, is_active")
        .order("id")
        .execute()
        .data
        or []
    )
    return {"users": rows}


@router.get("/users/{user_id}/account")
def get_account(user_id: int):
    sb = supabase()
    return _get_user_or_404(sb, user_id, "id, username, nome, telefone, email, role")


class AccountIn(BaseModel):
    username: str | None = None  # editable login handle (must stay unique)
    nome: str | None = None
    telefone: str | None = None
    email: str | None = None
    password: str | None = None  # optional — only re-hashed when non-empty


@router.put("/users/{user_id}/account")
def update_account(user_id: int, body: AccountIn):
    sb = supabase()
    _get_user_or_404(sb, user_id, "id")
    patch: dict = {
        "nome": body.nome,
        "telefone": body.telefone,
        "email": body.email,
        "updated_at": _now(),
    }
    # Username is editable but must remain unique. Changing it means the user logs
    # in with the new handle; their processo/lead scope re-tags on the next ingest
    # (source_accounts is keyed on username).
    if body.username:
        new_username = body.username.strip()
        if new_username:
            clash = (
                sb.table("platform_users")
                .select("id")
                .eq("username", new_username)
                .neq("id", user_id)
                .limit(1)
                .execute()
                .data
            )
            if clash:
                raise HTTPException(409, "Esse nome de utilizador já existe.")
            patch["username"] = new_username
    if body.password:
        h, salt = hash_password(body.password)
        patch["password_hash"] = h
        patch["password_salt"] = salt
    sb.table("platform_users").update(patch).eq("id", user_id).execute()
    return {"ok": True}


class PinIn(BaseModel):
    pin: str


@router.post("/service/unlock")
def service_unlock(body: PinIn):
    """Verify the service PIN so the UI can reveal the Definições tab. The PIN is
    re-checked server-side on every CRM read/write regardless."""
    _require_pin(body.pin)
    return {"ok": True}


@router.get("/users/{user_id}/crm")
def get_crm(user_id: int, x_service_pin: str | None = Header(None)):
    _require_pin(x_service_pin)
    sb = supabase()
    row = _get_user_or_404(sb, user_id, "id, crm_username, crm_password_enc, acesso_loja_toda")
    return {
        "crm_username": row.get("crm_username"),
        "crm_password_set": bool(row.get("crm_password_enc")),
        "acesso_loja_toda": bool(row.get("acesso_loja_toda")),
    }


class CrmIn(BaseModel):
    crm_username: str | None = None
    crm_password: str | None = None  # optional — only re-encrypted when non-empty


@router.put("/users/{user_id}/crm")
def update_crm(user_id: int, body: CrmIn, x_service_pin: str | None = Header(None)):
    _require_pin(x_service_pin)
    sb = supabase()
    _get_user_or_404(sb, user_id, "id")
    patch: dict = {"crm_username": body.crm_username, "updated_at": _now()}
    if body.crm_password:
        patch["crm_password_enc"] = encrypt_secret(body.crm_password)
    sb.table("platform_users").update(patch).eq("id", user_id).execute()
    return {"ok": True}


class LojaTodaIn(BaseModel):
    acesso_loja_toda: bool


@router.put("/users/{user_id}/loja-toda")
def update_loja_toda(user_id: int, body: LojaTodaIn, x_service_pin: str | None = Header(None)):
    """Service-gated: toggle whether this user sees the whole loja (loja-wide) or
    only their own CRM account's scope. Read by core.scope.account_filter."""
    _require_pin(x_service_pin)
    sb = supabase()
    _get_user_or_404(sb, user_id, "id")
    sb.table("platform_users").update(
        {"acesso_loja_toda": body.acesso_loja_toda, "updated_at": _now()}
    ).eq("id", user_id).execute()
    return {"ok": True}

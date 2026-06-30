"""Settings — user management (CRUD) by profile + loja config.

Profiles (platform_users.role):
  diretor_loja      — manages any diretor_comercial / comercial in the loja; sees
                      the whole loja's data.
  diretor_comercial — manages only their own team (comerciais with manager_id ==
                      them); sees own + team (their CRM account's view).
  comercial         — no user management; sees only their own processos.

The old service-PIN model is gone: access is governed entirely by the acting
user's profile. All routes sit behind the global session gate (main.py).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..core.crypto import encrypt_secret, hash_password
from ..core.names import fix_name
from ..core.scope import apply_scope, user_scope
from ..db import supabase
from .auth import COOKIE_NAME, token_user

router = APIRouter()

VALID_ROLES = {"diretor_loja", "diretor_comercial", "comercial"}
MANAGEABLE_ROLES = {"diretor_comercial", "comercial"}  # diretor_loja never manages another diretor_loja


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---- acting user + permissions ------------------------------------------
def _acting_user(request: Request) -> dict:
    """The logged-in user as {id, username, role, manager_id}. Env-only admin
    logins (ds/amin, no platform_users row) act as diretor_loja."""
    username = token_user(request.cookies.get(COOKIE_NAME))
    row = None
    if username:
        try:
            row = (
                supabase()
                .table("platform_users")
                .select("id, username, role, manager_id, is_active")
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
        return {"id": None, "username": username, "role": "diretor_loja", "manager_id": None}
    return row


def _can_manage(acting: dict, target: dict) -> bool:
    """Whether `acting` may edit/delete `target`."""
    if acting["role"] == "diretor_loja":
        return (target.get("role") or "comercial") in MANAGEABLE_ROLES
    if acting["role"] == "diretor_comercial":
        return target.get("role") == "comercial" and target.get("manager_id") == acting["id"]
    return False


def _can_create(acting: dict, role: str) -> bool:
    if acting["role"] == "diretor_loja":
        return role in MANAGEABLE_ROLES
    if acting["role"] == "diretor_comercial":
        return role == "comercial"
    return False


def _get_user_or_404(sb, user_id: int, columns: str) -> dict:
    res = sb.table("platform_users").select(columns).eq("id", user_id).limit(1).execute()
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(404, "Utilizador não encontrado.")
    return row


def _username_taken(sb, username: str, exclude_id: int | None = None) -> bool:
    q = sb.table("platform_users").select("id").eq("username", username)
    if exclude_id is not None:
        q = q.neq("id", exclude_id)
    return bool(q.limit(1).execute().data)


# ---- list / read ---------------------------------------------------------
@router.get("/users")
def list_users(request: Request):
    """Users the acting profile may see: diretor_loja → all; diretor_comercial →
    self + team; comercial → self."""
    acting = _acting_user(request)
    sb = supabase()
    q = sb.table("platform_users").select("id, username, nome, role, manager_id, is_active").order("id")
    if acting["role"] == "diretor_comercial":
        q = q.or_(f"id.eq.{acting['id']},manager_id.eq.{acting['id']}")
    elif acting["role"] != "diretor_loja":
        q = q.eq("id", acting["id"])
    return {"users": q.execute().data or [], "acting": {"id": acting["id"], "role": acting["role"]}}


def _shape_user(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "username": row.get("username"),
        "nome": row.get("nome"),
        "telefone": row.get("telefone"),
        "email": row.get("email"),
        "role": row.get("role"),
        "manager_id": row.get("manager_id"),
        "manager_crm_id": row.get("manager_crm_id"),
        "crm_username": row.get("crm_username"),
        "crm_password_set": bool(row.get("crm_password_enc")),
    }


@router.get("/users/{user_id}")
def get_user(user_id: int, request: Request):
    acting = _acting_user(request)
    sb = supabase()
    target = _get_user_or_404(
        sb, user_id,
        "id, username, nome, telefone, email, role, manager_id, manager_crm_id, crm_username, crm_password_enc",
    )
    if not (acting["id"] == target["id"] or _can_manage(acting, target)):
        raise HTTPException(403, "Sem permissão para ver este utilizador.")
    return _shape_user(target)


# ---- create / update / delete -------------------------------------------
class UserIn(BaseModel):
    username: str | None = None
    password: str | None = None
    nome: str | None = None
    telefone: str | None = None
    email: str | None = None
    role: str | None = None
    manager_id: int | None = None
    manager_crm_id: int | None = None
    crm_username: str | None = None
    crm_password: str | None = None


@router.post("/users")
def create_user(body: UserIn, request: Request):
    acting = _acting_user(request)
    sb = supabase()
    role = body.role or "comercial"
    manager_id = body.manager_id
    # A diretor_comercial can only spawn comerciais on their own team.
    if acting["role"] == "diretor_comercial":
        role = "comercial"
        manager_id = acting["id"]
    if role not in VALID_ROLES or not _can_create(acting, role):
        raise HTTPException(403, "Sem permissão para criar este perfil.")
    username = (body.username or "").strip()
    if not username or not body.password:
        raise HTTPException(400, "Utilizador e palavra-passe são obrigatórios.")
    if _username_taken(sb, username):
        raise HTTPException(409, "Esse nome de utilizador já existe.")
    h, salt = hash_password(body.password)
    row: dict = {
        "username": username,
        "nome": body.nome,
        "telefone": body.telefone,
        "email": body.email,
        "role": role,
        "manager_id": manager_id,
        "manager_crm_id": body.manager_crm_id,
        "password_hash": h,
        "password_salt": salt,
        "crm_username": body.crm_username,
        "is_active": True,
    }
    if body.crm_password:
        row["crm_password_enc"] = encrypt_secret(body.crm_password)
    res = sb.table("platform_users").insert(row).execute()
    return {"ok": True, "id": (res.data or [{}])[0].get("id")}


@router.put("/users/{user_id}")
def update_user(user_id: int, body: UserIn, request: Request):
    acting = _acting_user(request)
    sb = supabase()
    target = _get_user_or_404(sb, user_id, "id, role, manager_id")
    is_self = acting["id"] == target["id"]
    can_manage = _can_manage(acting, target)
    if not (is_self or can_manage):
        raise HTTPException(403, "Sem permissão para alterar este utilizador.")

    patch: dict = {"updated_at": _now()}
    for field in ("nome", "telefone", "email"):
        val = getattr(body, field)
        if val is not None:
            patch[field] = val
    if body.username:
        new_username = body.username.strip()
        if new_username and _username_taken(sb, new_username, exclude_id=user_id):
            raise HTTPException(409, "Esse nome de utilizador já existe.")
        if new_username:
            patch["username"] = new_username
    if body.password:
        h, salt = hash_password(body.password)
        patch["password_hash"] = h
        patch["password_salt"] = salt
    # CRM creds — self or a manager.
    if body.crm_username is not None:
        patch["crm_username"] = body.crm_username
    if body.crm_password:
        patch["crm_password_enc"] = encrypt_secret(body.crm_password)
    # Structural fields (role / team / CRM identity) only when managing (not self-only).
    if can_manage:
        if body.role and body.role != target.get("role"):
            if body.role not in VALID_ROLES or not _can_create(acting, body.role):
                raise HTTPException(403, "Sem permissão para atribuir esse perfil.")
            patch["role"] = body.role
        if body.manager_id is not None:
            patch["manager_id"] = body.manager_id
        if body.manager_crm_id is not None:
            patch["manager_crm_id"] = body.manager_crm_id

    sb.table("platform_users").update(patch).eq("id", user_id).execute()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, request: Request):
    acting = _acting_user(request)
    sb = supabase()
    target = _get_user_or_404(sb, user_id, "id, role, manager_id")
    if acting["id"] == target["id"]:
        raise HTTPException(400, "Não pode apagar a própria conta.")
    if not _can_manage(acting, target):
        raise HTTPException(403, "Sem permissão para apagar este utilizador.")
    # Orphan any reports (e.g. deleting a diretor_comercial): null their team link.
    sb.table("platform_users").update({"manager_id": None}).eq("manager_id", user_id).execute()
    sb.table("platform_users").delete().eq("id", user_id).execute()
    return {"ok": True}


# ---- managers dropdown (for mapping a comercial to a CRM gestor) ----------
@router.get("/managers")
def list_managers(request: Request):
    """Distinct CRM gestores visible to the acting user — for the manager_crm_id
    dropdown when creating/editing a comercial."""
    sb = supabase()
    q = apply_scope(sb.table("processos_real").select("manager_crm_id, manager_name"), user_scope(request))
    rows = q.execute().data or []
    seen: dict[int, str | None] = {}
    for r in rows:
        mid = r.get("manager_crm_id")
        if mid is None:
            continue
        seen.setdefault(mid, fix_name(r.get("manager_name")))
    managers = sorted(
        ({"crm_id": mid, "nome": nome} for mid, nome in seen.items()),
        key=lambda m: (m["nome"] or ""),
    )
    return {"managers": managers}


# ---- loja config ---------------------------------------------------------
@router.get("/loja")
def get_loja():
    sb = supabase()
    row = (sb.table("loja_config").select("numero, nome").eq("id", 1).limit(1).execute().data or [{}])[0]
    return {"numero": row.get("numero"), "nome": row.get("nome")}


class LojaIn(BaseModel):
    numero: str | None = None
    nome: str | None = None


@router.put("/loja")
def put_loja(body: LojaIn, request: Request):
    acting = _acting_user(request)
    if acting["role"] != "diretor_loja":
        raise HTTPException(403, "Só o Diretor de Loja pode alterar a loja.")
    sb = supabase()
    sb.table("loja_config").update(
        {"numero": body.numero, "nome": body.nome, "updated_at": _now()}
    ).eq("id", 1).execute()
    return {"ok": True}

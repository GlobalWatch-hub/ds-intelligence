"""Shared-credential in-app login (item 1).

Replaces the nginx HTTP basic-auth popup with a login screen inside the
platform. A single shared credential (APP_USER / APP_PASSWORD) is checked; on
success we set a signed, httpOnly session cookie. Per-user accounts and roles
(Coordenador vs Gestor) are a later step — they need the loja-coordinator login
the DS will provide.

The session token is a stdlib HMAC over the issued-at timestamp: no external
deps, self-contained, verified with a constant-time comparison and a max age.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from ..config import settings

router = APIRouter()

COOKIE_NAME = "ds_session"
MAX_AGE = 7 * 24 * 3600  # 7 days

# Display name per login account (shown in the header pill). Unknown usernames
# fall back to the username itself.
DISPLAY_NAMES = {
    "ds": "DS Crédito",
    "amin": "Amin Martins",
    "bs": "Bruno Sousa",
    "jg": "Jorge Gonçalves",
}


def _users() -> dict[str, str]:
    """All accepted username→password pairs: the primary shared credential plus
    any extra accounts (e.g. test logins) declared in APP_USERS as JSON."""
    users: dict[str, str] = {}
    if settings.APP_USERS:
        try:
            data = json.loads(settings.APP_USERS)
            if isinstance(data, dict):
                users.update({str(k): str(v) for k, v in data.items() if v})
        except (ValueError, TypeError):
            pass
    if settings.APP_PASSWORD:
        users.setdefault(settings.APP_USER, settings.APP_PASSWORD)
    return users


def _sign(payload: str) -> str:
    sig = hmac.new(settings.APP_SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")


def make_token(username: str) -> str:
    iat = int(time.time())
    payload = f"{iat}.{username}"
    return f"{payload}.{_sign(payload)}"


def token_user(token: str | None) -> str | None:
    """Return the username if the cookie is well-formed, correctly signed and
    unexpired; else None (also when the server has no session secret)."""
    if not token or not settings.APP_SESSION_SECRET:
        return None
    try:
        iat_str, username, sig = token.split(".", 2)
        iat = int(iat_str)
    except (ValueError, AttributeError):
        return None
    if not hmac.compare_digest(sig, _sign(f"{iat}.{username}")):
        return None
    if not (0 <= (int(time.time()) - iat) <= MAX_AGE):
        return None
    return username


def valid_token(token: str | None) -> bool:
    """Fails closed when the server has no session secret or the cookie is
    invalid/expired. Used by the API session gate."""
    return token_user(token) is not None


class LoginIn(BaseModel):
    username: str | None = None
    password: str


@router.post("/login")
def login(body: LoginIn, response: Response):
    users = _users()
    if not (users and settings.APP_SESSION_SECRET):
        raise HTTPException(503, "Login não configurado no servidor.")
    uname = (body.username or settings.APP_USER).strip()
    expected = users.get(uname)
    if not expected or not hmac.compare_digest(body.password or "", expected):
        raise HTTPException(401, "Credenciais inválidas.")
    response.set_cookie(
        COOKIE_NAME,
        make_token(uname),
        max_age=MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = token_user(request.cookies.get(COOKIE_NAME))
    if not user:
        return {"authenticated": False}
    return {"authenticated": True, "username": user, "nome": DISPLAY_NAMES.get(user, user)}

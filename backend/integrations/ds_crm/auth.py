"""Headless CrediDesk login that mints a fresh JWT.

The Nuxt SPA at crm.dsicredito.pt receives an AES-encrypted `cdko` blob from
/userlogin and decrypts it client-side to mint the Bearer JWT used for all
subsequent appapi.credidesk.com calls. Reversing the JS would be tighter but
running the SPA in headless Chromium and capturing the first outgoing
Authorization header is robust and ~3-5s wall-clock.

Usage:
    from integrations.ds_crm.auth import mint_jwt
    jwt = mint_jwt(email, password)   # raises RuntimeError on failure
"""
from __future__ import annotations

import os
import threading
import time
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

LOGIN_URL = "https://crm.dsicredito.pt/login/"
API_HOST = "appapi.credidesk.com"


def mint_jwt(email: str, password: str, *, headless: bool = True, timeout_ms: int = 45000) -> str:
    """Drive headless Chromium through the CrediDesk login flow, return the JWT.

    Raises RuntimeError with a descriptive message if any step fails.
    """
    captured: dict[str, str] = {}
    done = threading.Event()

    def on_request(req):
        if done.is_set():
            return
        if API_HOST not in req.url:
            return
        auth = req.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            captured["jwt"] = auth.split(" ", 1)[1].strip()
            done.set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
            ),
        )
        page = ctx.new_page()
        page.on("request", on_request)

        try:
            page.goto(LOGIN_URL, wait_until="load", timeout=timeout_ms)
            page.wait_for_selector('input[type="email"]', timeout=10000)
            page.locator('input[type="email"]').fill(email, timeout=10000)
            password_input = page.locator('input#password')
            password_input.fill(password, timeout=10000)
            password_input.press("Enter", timeout=10000)
        except PlaywrightTimeout as e:
            browser.close()
            raise RuntimeError(f"Login form interaction timed out: {e}") from e

        deadline = time.time() + timeout_ms / 1000
        while not done.is_set() and time.time() < deadline:
            try:
                page.wait_for_event("request", timeout=2000)
            except PlaywrightTimeout:
                if "/login" not in page.url:
                    page.evaluate("() => { try { window.fetch('/api/v1/users/notifications'); } catch(e){} }")

        browser.close()

    jwt = captured.get("jwt")
    if not jwt:
        raise RuntimeError(
            "Did not capture a Bearer JWT within timeout. "
            "Likely causes: wrong credentials, locked account, or SPA layout changed."
        )
    return jwt


def persist_jwt(jwt: str, env_path: Path) -> None:
    """Write DS_CRM_JWT=<jwt> into .env, replacing any existing line."""
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    replaced = False
    for i, line in enumerate(lines):
        if line.startswith("DS_CRM_JWT="):
            lines[i] = f"DS_CRM_JWT={jwt}"
            replaced = True
            break
    if not replaced:
        lines.append(f"DS_CRM_JWT={jwt}")
    env_path.write_text("\n".join(lines) + "\n")
    os.environ["DS_CRM_JWT"] = jwt


if __name__ == "__main__":
    from dotenv import load_dotenv

    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path)
    email = os.environ["DS_CRM_USERNAME"]
    password = os.environ["DS_CRM_PASSWORD"]
    print(f"[auth] minting JWT for {email}...")
    t0 = time.time()
    jwt = mint_jwt(email, password)
    print(f"[auth] got JWT in {time.time()-t0:.1f}s ({len(jwt)} chars)")
    persist_jwt(jwt, env_path)
    print(f"[auth] wrote DS_CRM_JWT to {env_path}")

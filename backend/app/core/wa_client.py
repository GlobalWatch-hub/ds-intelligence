"""Meta WhatsApp Cloud API helpers (send + signature verification).

Test number caps at 5 verified recipients. DEMO_RECIPIENTS env var holds the
E.164 phones we can actually send to.
"""
from __future__ import annotations
import hashlib
import hmac

import httpx

from ..config import settings


def verify_webhook_signature(body_bytes: bytes, signature_header: str) -> bool:
    if not signature_header or not settings.META_WA_APP_SECRET:
        return False
    if not signature_header.startswith("sha256="):
        return False
    received = signature_header.split("=", 1)[1]
    expected = hmac.new(
        settings.META_WA_APP_SECRET.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(received, expected)


def is_demo_recipient(to_e164: str) -> bool:
    allowed = [p.strip() for p in settings.DEMO_RECIPIENTS.split(",") if p.strip()]
    return to_e164 in allowed


async def send_text(to_e164: str, body: str) -> dict:
    """Send a free-form text via WhatsApp Cloud API. Returns Meta's JSON response."""
    if not settings.META_WA_PHONE_NUMBER_ID or not settings.META_WA_ACCESS_TOKEN:
        # safe stub for local dev — log what we would have sent
        return {"stub": True, "to": to_e164, "body": body}

    url = f"https://graph.facebook.com/v21.0/{settings.META_WA_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_WA_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_e164,
        "type": "text",
        "text": {"body": body, "preview_url": True},
    }
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(url, headers=headers, json=payload)
        if r.status_code >= 400:
            return {"meta_error": True, "status": r.status_code, "body": r.json() if r.headers.get("content-type","").startswith("application/json") else r.text}
        return r.json()

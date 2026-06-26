"""Ad-hoc WhatsApp send endpoint (demo / smoke test)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.wa_client import send_text, is_demo_recipient
from ..db import supabase

router = APIRouter()


class SendBody(BaseModel):
    to_e164: str
    body: str
    cliente_id: str | None = None


@router.post("/send")
async def send(body: SendBody):
    if not is_demo_recipient(body.to_e164):
        raise HTTPException(403, "Número não está na lista de destinatários verificados (DEMO_RECIPIENTS).")
    resp = await send_text(body.to_e164, body.body)
    supabase().table("mensagens").insert({
        "cliente_id": body.cliente_id,
        "to_e164": body.to_e164,
        "canal": "whatsapp",
        "corpo": body.body,
        "status": "sent",
        "meta_wa_message_id": (resp.get("messages") or [{}])[0].get("id"),
    }).execute()
    return {"ok": True, "wa_response": resp}

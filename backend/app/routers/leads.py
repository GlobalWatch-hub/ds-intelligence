"""Lead capture — minimal POST /api/leads that fires the RGPD + doc-checklist
follow-up in mock-mode. Becomes the production lead-creation endpoint once
the CRM API is wired.
"""
from __future__ import annotations

import uuid as _uuid

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.names import fix_name
from ..db import supabase

router = APIRouter()


def _is_uuid(s) -> bool:
    try:
        _uuid.UUID(str(s))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


class LeadIn(BaseModel):
    nome: str
    telefone: str | None = None
    email: str | None = None
    nif: str | None = None
    produto: str | None = None
    consultor_id: str | None = None
    notas: str | None = None


@router.post("/create")
def create_lead(body: LeadIn):
    sb = supabase()
    row = sb.table("leads").insert({
        "nome": body.nome,
        "telefone": body.telefone,
        "email": body.email,
        "nif": body.nif,
        "produto": body.produto,
        "consultor_id": body.consultor_id,
        "origem": "formulario",
        "status": "novo",
        "notas": body.notas,
    }).execute().data[0]

    # Mock-fire RGPD + doc-checklist trigger entries so the timeline shows up
    # immediately in the UI. In production this is where the email goes out.
    sb.table("triggers_fired").insert({
        "trigger_type": "rgpd_send",
        "canal": "email",
        "mensagem": f"RGPD + checklist documental enviado para {body.email or '(sem email)'}.",
        "status": "agendado",
    }).execute()

    return {"lead": row}


@router.get("/list")
def list_leads(limit: int = 50):
    sb = supabase()
    rows = sb.table("leads").select("*").order("created_at", desc=True).limit(limit).execute().data or []
    # consultor_id is inconsistent: older (seed) leads store a gestores.id UUID,
    # newer leads store the gestor name directly. Resolve both to a display name
    # so the table never shows a raw UUID (item 11).
    gestores = sb.table("gestores").select("id, nome").execute().data or []
    id_to_name = {g["id"]: g["nome"] for g in gestores}
    for r in rows:
        cid = r.get("consultor_id")
        if not cid:
            r["consultor_nome"] = None
        elif _is_uuid(cid):
            r["consultor_nome"] = fix_name(id_to_name.get(cid))  # None if orphan UUID
        else:
            r["consultor_nome"] = fix_name(cid)  # already a name
    return {"leads": rows}


@router.get("/consultores")
def list_consultores():
    """Distinct gestores/consultores known to the loja (from the CRM mirror),
    for assigning a lead. Read-only — names come from leads_real + processos_real."""
    sb = supabase()
    names: set[str] = set()
    for t in ("leads_real", "processos_real"):
        rows = sb.table(t).select("manager_name").execute().data or []
        for r in rows:
            n = fix_name(r.get("manager_name"))
            if n:
                names.add(n)
    return {"consultores": sorted(names)}

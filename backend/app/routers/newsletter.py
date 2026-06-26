"""Newsletter composer.

The demo flow:
  1. Sílvia/Jorge pick a tema (or type one) →
  2. Claude generates a 1-page PT-PT newsletter (markdown) in ~10-15s →
  3. Endpoint returns markdown + an HTML preview (frontend renders) →
  4. Operator hits "Enviar" → WhatsApp link blast to a list (demo: verified recipients).

PDF generation via WeasyPrint is wired but optional for v1 — the WhatsApp
message itself contains a short teaser + a "ler na íntegra" link to the
HTML page. PDFs can be added in v2 if Sílvia asks.
"""
from __future__ import annotations
import io
import os
from datetime import date

import anthropic
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..config import settings
from ..core.wa_client import send_text, is_demo_recipient
from ..db import supabase

router = APIRouter()


SYSTEM_PROMPT = """You are the editorial writer for DS Crédito Ramada, a Portuguese credit and
insurance brokerage. Your job is to produce short, friendly, accurate financial-literacy
newsletters that build trust with retail clients.

OUTPUT RULES (non-negotiable):
- Language: Portuguese (Portugal). NEVER Brazilian — no "você", no diminutives like "olhinho",
  "casinha", "listinha". Use "o seu / a sua", "vossa".
- Length: ~250-400 words, fits one A4 page when rendered.
- Tone: warm, professional, no jargon. Explain concepts as if to a thoughtful non-expert.
- Format: markdown. Start with `# {title}`, one-line subtitle, then 3-4 short sections with `##` subheadings.
- End with a one-line invitation to contact the loja — do NOT invent phone numbers or emails.
- NO disclaimer text. NO "como sempre dizemos". NO references to specific products or rates.
- NO emojis except in the title line (max one).
- Do NOT fabricate statistics, regulatory changes, or news events. Stay evergreen unless the
  user gives you a specific datapoint.

You will receive a `tema` (theme) from the user. Produce the newsletter and nothing else."""


class GenerateBody(BaseModel):
    tema: str
    titulo_hint: str | None = None


@router.post("/generate")
def generate_newsletter(body: GenerateBody):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    user_prompt = f"Tema: {body.tema}"
    if body.titulo_hint:
        user_prompt += f"\n\nSugestão de título: {body.titulo_hint}"

    resp = client.messages.create(
        model=settings.NEWSLETTER_MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    md = "".join(b.text for b in resp.content if hasattr(b, "text"))

    # extract title from first line `# ...`
    first_line = md.strip().split("\n", 1)[0]
    titulo = first_line.lstrip("# ").strip() if first_line.startswith("#") else (body.titulo_hint or body.tema)

    row = supabase().table("newsletters").insert({
        "titulo": titulo,
        "tema": body.tema,
        "conteudo_md": md,
    }).execute().data[0]

    return {
        "id": row["id"],
        "titulo": titulo,
        "tema": body.tema,
        "conteudo_md": md,
        "created_at": row["created_at"],
    }


@router.get("/list")
def list_newsletters():
    rows = supabase().table("newsletters").select(
        "id, titulo, tema, enviado_em, destinatarios_count, created_at"
    ).order("created_at", desc=True).limit(20).execute().data
    return {"newsletters": rows}


@router.get("/audience")
def newsletter_audience():
    """Opt-in audience summary for the composer — who may lawfully receive a blast.

    Gate: clientes_real.authorized_contact is true (CrediDesk marketing-contact
    consent). Reported honestly so the operator sees the opt-in rate and how many
    are deliverable right now under the Meta demo-number cap.

    NOTE: declared BEFORE /{newsletter_id} on purpose — FastAPI matches routes in
    declaration order, so the static path must come first or "audience" is parsed
    as a newsletter id (uuid) and 500s.
    """
    sb = supabase()
    total = sb.table("clientes_real").select("crm_id", count="exact").limit(1).execute().count or 0
    synced = (
        sb.table("clientes_real").select("crm_id", count="exact")
        .not_.is_("consent_synced_at", "null").limit(1).execute().count or 0
    )
    opted_in = (
        sb.table("clientes_real").select("crm_id", count="exact")
        .eq("authorized_contact", True).limit(1).execute().count or 0
    )
    contactable = _opted_in_recipients(sb)
    deliverable_now = [r for r in contactable if is_demo_recipient(r["e164"])]
    return {
        "total_clientes": total,
        "consent_synced": synced,          # how many rows have had consent pulled
        "opted_in": opted_in,              # authorized_contact = true
        "opted_in_with_phone": len(contactable),
        "deliverable_now": len(deliverable_now),   # opted-in AND a Meta-verified number
        "note": (
            "Envios reais só para números verificados na app Meta (demo). "
            "Com número de produção Meta, alcançam-se todos os opted-in com telefone."
        ),
    }


@router.get("/{newsletter_id}")
def get_newsletter(newsletter_id: str):
    rows = supabase().table("newsletters").select("*").eq("id", newsletter_id).execute().data
    if not rows:
        raise HTTPException(404, "Newsletter não encontrada")
    return rows[0]


REFORMAT_SYSTEM = """You are the editorial assistant for DS Crédito Ramada – Jardim da Amoreira.
The operator has uploaded a draft document. Your job is to reformat the operator's
content into the DS newsletter house style — same constraints as a fresh newsletter:

- Language: Portuguese (Portugal). Strip any Brazilian markers ("você", BR diminutives like "casinha/listinha").
- Length: ~250-400 words, fits one A4 page.
- Format: markdown. `# Title` on first line, optional `*subtitle*`, then 3-4 `## section headings`.
- End with a one-line invitation to contact the loja. NEVER invent specific phone numbers or emails.
- NO disclaimers, NO emojis except possibly one in the title.
- PRESERVE the operator's intended message, key facts, and named numbers. Do NOT add new factual claims.
- If the source is too short to fill one page, keep it short rather than padding.

Output the markdown and nothing else."""


class ReformatBody(BaseModel):
    titulo_hint: str | None = None
    raw_text: str


@router.post("/upload")
async def upload_newsletter(file: UploadFile = File(...), titulo_hint: str | None = None):
    """Accept a .txt / .md file (and best-effort .docx), reformat into DS house style."""
    raw_bytes = await file.read()
    fname = (file.filename or "").lower()

    if fname.endswith((".txt", ".md", ".markdown")):
        text = raw_bytes.decode("utf-8", errors="replace")
    elif fname.endswith(".docx"):
        # best-effort docx parse — python-docx may not be installed; fall back to literal bytes
        try:
            from docx import Document  # type: ignore
            doc = Document(io.BytesIO(raw_bytes))
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            raise HTTPException(400, "Para ficheiros .docx instale python-docx no servidor, ou cole o texto em .txt/.md.")
    else:
        # try utf-8 anyway; many tools save .doc as utf-8 plain text
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(400, f"Formato {fname.rsplit('.',1)[-1] if '.' in fname else 'desconhecido'} não suportado. Use .txt, .md ou .docx.")

    return _reformat_to_newsletter(text, titulo_hint=titulo_hint)


@router.post("/reformat")
def reformat_newsletter(body: ReformatBody):
    """Paste raw text → reformat. Same code path as /upload, just no file involved."""
    return _reformat_to_newsletter(body.raw_text, titulo_hint=body.titulo_hint)


def _reformat_to_newsletter(text: str, titulo_hint: str | None = None) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")
    if not text.strip():
        raise HTTPException(400, "Conteúdo vazio.")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    user_prompt = "Conteúdo original a reformatar:\n\n" + text
    if titulo_hint:
        user_prompt += f"\n\nSugestão de título: {titulo_hint}"

    resp = client.messages.create(
        model=settings.NEWSLETTER_MODEL,
        max_tokens=1800,
        system=REFORMAT_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )
    md = "".join(b.text for b in resp.content if hasattr(b, "text"))
    first_line = md.strip().split("\n", 1)[0]
    titulo = first_line.lstrip("# ").strip() if first_line.startswith("#") else (titulo_hint or "Newsletter")

    row = supabase().table("newsletters").insert({
        "titulo": titulo,
        "tema": "(upload reformatado pela IA)",
        "conteudo_md": md,
    }).execute().data[0]

    return {
        "id": row["id"],
        "titulo": titulo,
        "tema": row["tema"],
        "conteudo_md": md,
        "created_at": row["created_at"],
    }


class EditBody(BaseModel):
    conteudo_md: str


@router.post("/{newsletter_id}/edit")
def edit_newsletter(newsletter_id: str, body: EditBody):
    row = supabase().table("newsletters").update({"conteudo_md": body.conteudo_md}).eq(
        "id", newsletter_id
    ).execute().data
    if not row:
        raise HTTPException(404, "Newsletter não encontrada")
    return row[0]


def _normalise_pt_phone(raw: str | None) -> str | None:
    """Best-effort E.164 for Portuguese CRM phone strings. None if unusable."""
    if not raw:
        return None
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    if not digits:
        return None
    if digits.startswith("351") and len(digits) == 12:
        return "+" + digits
    if len(digits) == 9 and digits[0] in "29":       # PT mobile/landline
        return "+351" + digits
    if raw.strip().startswith("+"):
        return "+" + digits
    return None


def _opted_in_recipients(sb) -> list[dict]:
    """Mirrored customers who authorised marketing contact AND have a usable phone."""
    out: list[dict] = []
    page = 0
    PAGE = 1000
    while True:
        res = (
            sb.table("clientes_real")
            .select("crm_id, name, telephone, authorized_contact_on")
            .eq("authorized_contact", True)
            .range(page * PAGE, page * PAGE + PAGE - 1)
            .execute()
        )
        batch = res.data or []
        for r in batch:
            e164 = _normalise_pt_phone(r.get("telephone"))
            if e164:
                out.append({"crm_id": r["crm_id"], "name": r.get("name"), "e164": e164})
        if len(batch) < PAGE:
            break
        page += 1
    return out


class SendBody(BaseModel):
    newsletter_id: str
    public_url: str | None = None   # frontend gives a link to the rendered HTML page
    recipients_e164: list[str] | None = None   # if None → fan out to DEMO_RECIPIENTS
    audience: str | None = None     # "opted_in" → target consenting clientes_real (gated)


@router.post("/send")
async def send_newsletter(body: SendBody):
    sb = supabase()
    nr = sb.table("newsletters").select("*").eq("id", body.newsletter_id).execute().data
    if not nr:
        raise HTTPException(404, "Newsletter não encontrada")
    nl = nr[0]

    opted_in_target = 0
    if body.audience == "opted_in":
        # Gate on CrediDesk marketing-contact consent. The opted-in list is the
        # lawful target universe; under the Meta demo cap only verified numbers
        # actually deliver, so we report the full target and deliver the subset.
        contactable = _opted_in_recipients(sb)
        opted_in_target = len(contactable)
        recipients = [r["e164"] for r in contactable if is_demo_recipient(r["e164"])]
        if not recipients:
            raise HTTPException(
                400,
                f"{opted_in_target} clientes opted-in, mas nenhum tem número verificado na Meta "
                "(demo). Em produção, o envio alcança todos os opted-in com telefone.",
            )
    elif body.recipients_e164 is None:
        recipients = [r.strip() for r in (settings.DEMO_RECIPIENTS or "").split(",") if r.strip()]
    else:
        recipients = [r for r in body.recipients_e164 if is_demo_recipient(r)]

    if not recipients:
        raise HTTPException(400, "Sem destinatários verificados — adicione números ao DEMO_RECIPIENTS")

    link = body.public_url or f"https://dscredito.synertia-gw.ai/newsletter/{nl['id']}"
    body_text = (
        f"📬 Newsletter da {settings.LOJA_NAME}\n\n"
        f"{nl['titulo']}\n\n"
        f"Leia na íntegra: {link}"
    )

    results = []
    for to in recipients:
        try:
            r = await send_text(to, body_text)
            results.append({"to": to, "ok": True, "wa": r})
            sb.table("mensagens").insert({
                "to_e164": to,
                "canal": "whatsapp",
                "corpo": body_text,
                "status": "sent",
            }).execute()
        except Exception as e:
            results.append({"to": to, "ok": False, "error": str(e)})

    sb.table("newsletters").update({
        "enviado_em": date.today().isoformat(),
        "destinatarios_count": sum(1 for r in results if r["ok"]),
    }).eq("id", body.newsletter_id).execute()

    return {
        "sent": sum(1 for r in results if r["ok"]),
        "opted_in_target": opted_in_target,   # full lawful audience (0 if not an opted_in send)
        "results": results,
    }

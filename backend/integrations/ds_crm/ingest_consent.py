"""Enrich ds.clientes_real with marketing-contact consent from CrediDesk.

Consent is NOT on the /customers/list row — it only appears on the customer
DETAIL endpoint (/customers/{id}). So this worker walks the mirrored customers
and pulls each detail to populate the consent columns added in migration 007.

Opt-in signal (validated 1 Jun 2026 against Bruno's loja):
    authorized_contact = True  AND  authorized_contact_on is not null
    (opted-out rows have authorizedContact=False, authorizedOptionId=0, on=None)
`consentAuthorizedActive` is a secondary CRM toggle and is stored for reference
only — it is NOT the opt-in gate.

Modes:
    (default)      enrich only rows missing consent (consent_synced_at is null)
    --all          re-pull consent for every mirrored customer
    --stale-days N  also re-pull rows whose consent_synced_at is older than N days

Idempotent. Each run logged in ds.crm_sync_runs (source='credidesk_consent').
Prereq: migration 007_consent.sql applied.
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # add backend/ to path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.db import supabase  # noqa: E402
from integrations.ds_crm.client import CredidekClient  # noqa: E402

# Gentle pace for ~1.1k sequential detail calls against a live production CRM.
DETAIL_DELAY_S = 0.2


def extract_consent(detail: dict) -> dict:
    """Pull the consent fields out of a /customers/{id} response."""
    cust = detail.get("customer") or detail.get("data") or detail
    if isinstance(cust, list):
        cust = cust[0] if cust else {}
    option_id = cust.get("authorizedOptionId")
    return {
        "authorized_contact": bool(cust.get("authorizedContact")),
        "authorized_contact_on": cust.get("authorizedContactOn"),
        "consent_option_id": int(option_id) if option_id not in (None, "") else None,
        "consent_active": cust.get("consentAuthorizedActive"),
        "consent_synced_at": datetime.now(timezone.utc).isoformat(),
    }


def select_crm_ids(sb, *, mode_all: bool, stale_days: int | None) -> list[int]:
    """Which mirrored customers need a consent pull this run."""
    rows = []
    page = 0
    PAGE = 1000
    while True:
        q = sb.table("clientes_real").select("crm_id, consent_synced_at")
        res = q.range(page * PAGE, page * PAGE + PAGE - 1).execute()
        batch = res.data or []
        rows.extend(batch)
        if len(batch) < PAGE:
            break
        page += 1

    if mode_all:
        return [r["crm_id"] for r in rows]

    cutoff = None
    if stale_days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=stale_days)

    todo = []
    for r in rows:
        synced = r.get("consent_synced_at")
        if not synced:
            todo.append(r["crm_id"])
        elif cutoff is not None:
            try:
                if datetime.fromisoformat(synced.replace("Z", "+00:00")) < cutoff:
                    todo.append(r["crm_id"])
            except Exception:
                todo.append(r["crm_id"])
    return todo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="re-pull consent for every customer")
    ap.add_argument("--stale-days", type=int, default=None,
                    help="also re-pull rows synced more than N days ago")
    args = ap.parse_args()

    sb = supabase()
    crm_ids = select_crm_ids(sb, mode_all=args.all, stale_days=args.stale_days)
    print(f"[consent] {len(crm_ids)} customers to enrich "
          f"(mode={'all' if args.all else 'missing'}"
          f"{f', stale>{args.stale_days}d' if args.stale_days else ''})")
    if not crm_ids:
        print("[consent] nothing to do.")
        return

    run = sb.table("crm_sync_runs").insert({
        "source": "credidesk_consent",
        "rows_fetched": 0,
        "rows_upserted": 0,
    }).execute()
    run_id = run.data[0]["id"]

    client = CredidekClient()
    fetched = 0
    updated = 0
    opted_in = 0
    try:
        for i, crm_id in enumerate(crm_ids, 1):
            try:
                detail = client._get(f"/customers/{crm_id}")
            except Exception as e:
                print(f"[consent] {crm_id}: detail failed ({type(e).__name__}: {e}) — skipping")
                continue
            fetched += 1
            consent = extract_consent(detail)
            if consent["authorized_contact"]:
                opted_in += 1
            sb.table("clientes_real").update(consent).eq("crm_id", crm_id).execute()
            updated += 1
            if i % 100 == 0:
                print(f"[consent] {i}/{len(crm_ids)} processed — {opted_in} opted-in so far")
            time.sleep(DETAIL_DELAY_S)

        sb.table("crm_sync_runs").update({
            "rows_fetched": fetched,
            "rows_upserted": updated,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()
        print(f"\n[done] enriched {updated} customers, {opted_in} opted-in "
              f"({100*opted_in/updated:.0f}%)" if updated else "\n[done] nothing updated")
    except Exception as e:
        sb.table("crm_sync_runs").update({
            "rows_fetched": fetched,
            "rows_upserted": updated,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "error": f"{type(e).__name__}: {e}"[:1000],
        }).eq("id", run_id).execute()
        raise


if __name__ == "__main__":
    main()

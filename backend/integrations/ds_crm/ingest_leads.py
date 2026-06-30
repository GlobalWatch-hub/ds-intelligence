"""Fetch all leads from CrediDesk and upsert into ds.leads_real.

Idempotent — re-runs overwrite by crm_id. Logged in ds.crm_sync_runs.

Prereq: migration 006_leads_real.sql applied in Supabase.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.db import supabase  # noqa: E402
from integrations.ds_crm.accounts import list_crm_accounts  # noqa: E402
from integrations.ds_crm.client import CredidekClient  # noqa: E402


def normalise(row: dict) -> dict:
    return {
        "crm_id": row["id"],
        "reference": row.get("reference"),
        "name": row.get("name"),
        "email": row.get("email"),
        "telephone": row.get("telephone"),
        "age": row.get("age"),
        "address": row.get("address"),
        "country": row.get("country"),
        "credit_type_id": row.get("creditTypeId"),
        "type_name": row.get("typeName"),
        "type_full_name": row.get("typeFullName"),
        "financing_amount": row.get("financingAmount"),
        "duration_months": row.get("durationMonths"),
        "duration_years": row.get("durationYears"),
        "manager_crm_id": row.get("managerId"),
        "manager_name": row.get("managerName"),
        "state_id": row.get("stateId"),
        "state_name": row.get("stateName"),
        "sub_state_id": row.get("subStateId"),
        "sub_state_name": row.get("subStateName"),
        "origin_id": row.get("originId"),
        "origin_name": row.get("originName"),
        "origin_desc": row.get("originDesc"),
        "proponents_number": row.get("proponentsNumber"),
        "archived": bool(row.get("archived")),
        "no_scheduled_tasks": row.get("noScheduledTasks"),
        "created_on_crm": row.get("createdon"),
        "updated_on_crm": row.get("updatedon") or row.get("updatedOn"),
        "raw": row,
    }


def main():
    sb = supabase()
    run = sb.table("crm_sync_runs").insert({
        "source": "credidesk_leads",
        "rows_fetched": 0,
        "rows_upserted": 0,
    }).execute()
    run_id = run.data[0]["id"]

    accounts = list_crm_accounts()
    print(f"[ingest] {len(accounts)} conta(s) CRM: {[a.username for a in accounts]}")
    total_fetched = 0
    total_upserted = 0
    BATCH_SIZE = 100

    # Two-pass merge — a lead can be visible to more than one account; collect the
    # set of accounts per crm_id, then upsert once with source_accounts = that set.
    merged: dict[int, dict] = {}
    seen_by: dict[int, set[str]] = {}

    try:
        for acct in accounts:
            print(f"[ingest] --- conta {acct.username} ({acct.crm_email}) ---")
            client = CredidekClient(email=acct.crm_email, password=acct.crm_password)
            for row in client.iter_leads(page_size=50, state_id=0):
                total_fetched += 1
                norm = normalise(row)
                cid = norm["crm_id"]
                merged[cid] = norm
                seen_by.setdefault(cid, set()).add(acct.username)

        batch: list[dict] = []
        for cid, norm in merged.items():
            norm["source_accounts"] = sorted(seen_by[cid])
            batch.append(norm)
            if len(batch) >= BATCH_SIZE:
                sb.table("leads_real").upsert(batch, on_conflict="crm_id").execute()
                total_upserted += len(batch)
                print(f"[ingest] upserted batch — total {total_upserted}")
                batch.clear()
        if batch:
            sb.table("leads_real").upsert(batch, on_conflict="crm_id").execute()
            total_upserted += len(batch)
            print(f"[ingest] upserted final batch — total {total_upserted}")

        sb.table("crm_sync_runs").update({
            "rows_fetched": total_fetched,
            "rows_upserted": total_upserted,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()
        print(f"\n[done] fetched {total_fetched} leads, {len(merged)} distintos, upserted {total_upserted}")
    except Exception as e:
        sb.table("crm_sync_runs").update({
            "rows_fetched": total_fetched,
            "rows_upserted": total_upserted,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "error": f"{type(e).__name__}: {e}"[:1000],
        }).eq("id", run_id).execute()
        raise


if __name__ == "__main__":
    main()

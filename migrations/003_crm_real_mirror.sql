-- 003_crm_real_mirror.sql
-- RECONSTRUCTED 2026-06-22 from integrations/ds_crm/ingest_customers.py.
-- The original 003 was applied directly in the prod SQL editor and never
-- committed to the repo; this rebuilds it from the ingest payload + router usage.
--
-- crm_sync_runs : audit log written by every ingest worker (one row per run).
-- clientes_real : live mirror of CrediDesk customers, keyed on crm_id (upsert).
-- CRM date/datetime fields are stored as text to avoid cast failures on ingest
-- (the routers parse them in Python); the full CRM row is kept in raw jsonb.

set search_path to ds, public;

create table if not exists crm_sync_runs (
  id            bigint generated always as identity primary key,
  source        text not null,              -- credidesk_customers / _processos / _leads / _consent
  rows_fetched  integer not null default 0,
  rows_upserted integer not null default 0,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

create index if not exists crm_sync_runs_started_idx on crm_sync_runs(started_at desc);

create table if not exists clientes_real (
  crm_id          bigint primary key,       -- CrediDesk customer id (upsert conflict key)
  name            text,
  email           text,
  telephone       text,
  tax_number      text,
  age             integer,
  date_of_birth   text,
  country_id      integer,
  identity_card   text,
  created_on_crm  text,
  raw             jsonb,
  synced_at       timestamptz not null default now()
);

-- 006_leads_real.sql
-- RECONSTRUCTED 2026-06-22 from integrations/ds_crm/ingest_leads.py +
-- router usage (chat.py, dashboard.py). Original 006 was applied directly in the
-- prod SQL editor and never committed.
--
-- leads_real : live mirror of CrediDesk leads (potential customers), keyed on crm_id.
-- financing_amount numeric; id/state/origin/duration fields integer; archived
-- boolean; CRM dates text; passthrough/unknown fields text; full row in raw jsonb.

set search_path to ds, public;

create table if not exists leads_real (
  crm_id             bigint primary key,           -- CrediDesk lead id (upsert conflict key)
  reference          text,
  name               text,
  email              text,
  telephone          text,
  age                integer,
  address            text,
  country            text,
  credit_type_id     integer,
  type_name          text,
  type_full_name     text,
  financing_amount   numeric(14,2),
  duration_months    integer,
  duration_years     integer,
  manager_crm_id     bigint,
  manager_name       text,
  state_id           integer,
  state_name         text,
  sub_state_id       integer,
  sub_state_name     text,
  origin_id          integer,
  origin_name        text,
  origin_desc        text,
  proponents_number  integer,
  archived           boolean,
  no_scheduled_tasks text,                          -- CRM passthrough, not consumed by routers
  created_on_crm     text,
  updated_on_crm     text,
  raw                jsonb,
  synced_at          timestamptz not null default now()
);

create index if not exists leads_real_state_idx on leads_real(state_id);

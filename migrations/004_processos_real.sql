-- 004_processos_real.sql
-- RECONSTRUCTED 2026-06-22 from integrations/ds_crm/ingest_processos.py +
-- the columns consumed by routers (dashboard.py, recap.py, triggers.py, chat.py).
-- Original 004 was applied directly in the prod SQL editor and never committed.
--
-- processos_real : live mirror of CrediDesk credit processes, keyed on crm_id.
-- Money fields are numeric (summed in recap/chat); docs_* are integer counts;
-- archived is boolean; CRM dates are text; full CRM row kept in raw jsonb.

set search_path to ds, public;

create table if not exists processos_real (
  crm_id                    bigint primary key,    -- CrediDesk process id (upsert conflict key)
  reference                 text,
  customer_crm_id           bigint,
  customer_name             text,
  customer_tax_number       text,
  customer_email            text,
  customer_telephone        text,
  manager_crm_id            bigint,
  manager_name              text,
  state_id                  integer,
  state_name                text,
  type_name                 text,
  property_mortgage         text,                  -- CRM passthrough, not consumed by routers
  archived                  boolean,
  financing_amount          numeric(14,2),
  commission_amount         numeric(14,2),
  docs_mandatory            integer,
  docs_uploaded             integer,
  docs_validated            integer,
  notifications_not_treated integer,
  created_on_crm            text,
  updated_on_crm            text,
  raw                       jsonb,
  synced_at                 timestamptz not null default now()
);

create index if not exists processos_real_state_idx    on processos_real(state_id);
create index if not exists processos_real_archived_idx on processos_real(archived);

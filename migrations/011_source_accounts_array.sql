-- 011_source_accounts_array.sql
-- NEW 2026-06-30. Fixes overlap in per-user CRM scoping.
--
-- 010 used a single `source_account` text column, but a processo/lead can be
-- visible to MORE THAN ONE platform account (e.g. a lead Bruno owns also shows
-- in Jorge's team view). With a single column + upsert-on-crm_id, the last
-- ingesting account wins and the row disappears for the others.
--
-- Switch to `source_accounts text[]` = the SET of accounts that can see the row.
-- Read scoping filters with `source_accounts @> array[<username>]` (PostgREST
-- `cs`), so every account sees its full visible set even when rows overlap. The
-- ingest loop rebuilds this set each run (two-pass merge).
--
-- `source_account` (010) is left in place but no longer read — vestigial.

set search_path to ds, public;

alter table processos_real add column if not exists source_accounts text[];
alter table leads_real     add column if not exists source_accounts text[];

-- Seed the array from whatever single tag exists, so nothing is unscoped before
-- the first phase-2 re-ingest overwrites it with the correct merged set.
update processos_real
   set source_accounts = array[source_account]
 where source_accounts is null and source_account is not null;
update leads_real
   set source_accounts = array[source_account]
 where source_accounts is null and source_account is not null;

create index if not exists processos_real_source_accounts_idx on processos_real using gin (source_accounts);
create index if not exists leads_real_source_accounts_idx     on leads_real     using gin (source_accounts);

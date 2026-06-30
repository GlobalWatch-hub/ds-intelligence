-- 010_source_account.sql
-- NEW 2026-06-30 (phase 2 of the per-user CRM scoping — see platform_users / 009).
--
-- Tags each mirrored processo/lead with the PLATFORM USER whose CRM account
-- fetched it (source_account = platform_users.username). This is how per-user
-- visibility is reproduced: when a gestor logs in, the read routers filter
-- processos/leads to `source_account = <their username>`, which is exactly the
-- set their CrediDesk account can see (Bruno → his own; Jorge → his team). No
-- single account mirrors the whole loja, so manager_crm_id alone can't express
-- this — the ingesting account is the source of truth.
--
-- clientes_real is deliberately NOT scoped: the customer list is loja-wide by
-- product design ("clientes = loja inteira"), so no source_account there.
--
-- Backfill: every existing row was ingested by Bruno's account → 'bs'.

set search_path to ds, public;

alter table processos_real add column if not exists source_account text;
alter table leads_real     add column if not exists source_account text;

update processos_real set source_account = 'bs' where source_account is null;
update leads_real     set source_account = 'bs' where source_account is null;

create index if not exists processos_real_source_idx on processos_real(source_account);
create index if not exists leads_real_source_idx     on leads_real(source_account);

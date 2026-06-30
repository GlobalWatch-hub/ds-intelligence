-- 013_perfis_loja.sql
-- NEW 2026-06-30. Role hierarchy + user management + loja config.
--
-- Replaces the "Acesso Loja Toda" toggle + service-PIN model with three profiles:
--   diretor_loja      → sees the whole loja (no filter)
--   diretor_comercial → sees own + team = what their CRM account ingests
--                       (source_accounts @> {username})
--   comercial         → sees only own = manager_crm_id == theirs
--
-- manager_id = reports_to (team), used for CRUD permissions (a diretor_comercial
-- manages users whose manager_id is them). acesso_loja_toda (012) is now vestigial
-- — the profile decides loja-wide access.
--
-- loja_config: single-row store for the loja number + name (name shows in the header).

set search_path to ds, public;

alter table platform_users add column if not exists manager_id bigint;

-- Existing accounts (bs, jg) become Diretores de Loja.
update platform_users set role = 'diretor_loja' where username in ('bs', 'jg');
-- Any leftover legacy role default → comercial (safe baseline).
update platform_users set role = 'comercial' where role is null or role = 'gestor';

create table if not exists loja_config (
  id         smallint primary key default 1,
  numero     text,
  nome       text,
  updated_at timestamptz not null default now(),
  constraint loja_config_singleton check (id = 1)
);

insert into loja_config (id, numero, nome)
values (1, null, 'DS Crédito Ramada')
on conflict (id) do nothing;

grant all on table loja_config to anon, authenticated, service_role;

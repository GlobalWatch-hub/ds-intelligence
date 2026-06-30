-- 012_acesso_loja_toda.sql
-- NEW 2026-06-30. Per-user "Acesso Loja Toda" flag, toggled in the service-access
-- (PIN-gated) tab. When true, the read routers drop the per-account filter for
-- that user → they see the whole loja's processos/leads instead of only their own
-- CrediDesk scope. Equivalent to the admin/coordenador role, but as an explicit
-- per-user switch managed from the UI.

set search_path to ds, public;

alter table platform_users add column if not exists acesso_loja_toda boolean not null default false;

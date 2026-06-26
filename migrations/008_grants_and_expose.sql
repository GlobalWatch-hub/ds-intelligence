-- 008_grants_and_expose.sql
-- NEW 2026-06-22. Co-hosting the dscredito `ds` schema in the GlobalWatch
-- "Plataforma de Chamadas" Supabase project (which already runs another app in
-- public). Grants the API roles access to ds.* and exposes ds to PostgREST.

-- Privileges for the API roles on everything in ds (current + future objects).
grant usage on schema ds to anon, authenticated, service_role;
grant all on all tables    in schema ds to anon, authenticated, service_role;
grant all on all sequences in schema ds to anon, authenticated, service_role;
alter default privileges in schema ds grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema ds grant all on sequences to anon, authenticated, service_role;

-- Expose ds to the REST API (PostgREST). Best-effort via the authenticator GUC +
-- a config reload. NOTE: on Supabase this can be reset by a platform config push,
-- so ALSO add `ds` in Dashboard -> Settings -> API -> Exposed schemas to persist it.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ds';
notify pgrst, 'reload config';

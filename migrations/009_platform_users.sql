-- 009_platform_users.sql
-- NEW 2026-06-30. Per-user platform accounts (Bruno Sousa, Jorge Gonçalves …)
-- replacing the shared APP_USERS env login as the source of truth.
--
-- platform_users : one row per login. Platform password is a salted PBKDF2 hash
-- (never reversible). The CRM password is stored ENCRYPTED (crm_password_enc,
-- Fernet) because it must be decrypted to mint a CRM JWT in phase 2 — it is the
-- per-user CrediDesk credential. The CRM tab in the UI is gated behind a global
-- service PIN; nothing here is ever returned to the client in clear text.
--
-- manager_crm_id is a phase-2 hook: it will scope each user's processo/lead views
-- to what their CRM account can see. Unused for now (left null).

set search_path to ds, public;

create table if not exists platform_users (
  id               bigint generated always as identity primary key,
  username         text not null unique,        -- login handle (e.g. 'bs', 'jg')
  nome             text,                         -- display name ("Bruno Sousa")
  telefone         text,
  email            text,
  role             text not null default 'gestor',
  password_hash    text,                         -- PBKDF2-HMAC-SHA256, hex
  password_salt    text,                         -- per-user salt, hex
  crm_username     text,                         -- CrediDesk login
  crm_password_enc text,                         -- Fernet-encrypted CrediDesk password
  manager_crm_id   bigint,                       -- phase-2 scoping hook (nullable)
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists platform_users_username_idx on platform_users(username);

-- Grants mirror 008_grants_and_expose.sql so PostgREST/service_role can use it.
grant all on table platform_users to anon, authenticated, service_role;

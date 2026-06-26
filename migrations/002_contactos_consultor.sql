-- Welcome blast feature — Amin's 5 May + 21 May follow-up: each consultant uploads
-- their personal contact list when they join the loja; platform fires a welcome
-- blast and supports periodic broadcasts with {{nome_consultor}}/{{nome_cliente}}
-- placeholders.

set search_path to ds, public;

create table if not exists contactos_consultor (
  id              uuid primary key default gen_random_uuid(),
  consultor_id    uuid not null references gestores(id) on delete cascade,
  nome_cliente    text not null,
  telefone        text not null,                       -- E.164
  email           text,
  notas           text,
  created_at      timestamptz not null default now()
);

create index if not exists contactos_consultor_consultor_idx on contactos_consultor(consultor_id);

create table if not exists broadcasts (
  id              uuid primary key default gen_random_uuid(),
  consultor_id    uuid not null references gestores(id) on delete cascade,
  tipo            text not null,                       -- 'welcome' / 'custom'
  template        text not null,                       -- the message with {{vars}}
  enviado_em      timestamptz,
  destinatarios_count integer default 0,
  enviados_ok     integer default 0,
  enviados_falha  integer default 0,
  created_at      timestamptz not null default now()
);

grant usage on schema ds to anon, authenticated, service_role;
grant all on contactos_consultor to anon, authenticated, service_role;
grant all on broadcasts to anon, authenticated, service_role;

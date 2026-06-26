-- DS Intelligence v1 — Supabase schema
-- Pilot loja: DS Crédito Ramada – Jardim da Amoreira
--
-- Mirrors the structure of the DS CRM (crédito + seguros) so that once
-- Sílvia approves API access we swap mock data for live rows without
-- touching the platform.
--
-- Hosted alongside Clara_Production (voicebots) under a dedicated `ds`
-- schema so DS code never touches voicebot tables and vice-versa.

create extension if not exists "pgcrypto";

create schema if not exists ds;
set search_path to ds, public;

-- =========================================================================
-- gestores  (loja staff who own clients/processes)
-- =========================================================================
create table if not exists gestores (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  email           text not null unique,
  telefone        text,
  cargo           text,                    -- 'gestor_credito' / 'gestor_seguros' / 'admin'
  loja            text not null default 'DS Crédito Ramada – Jardim da Amoreira',
  ativo           boolean not null default true,
  data_entrada    date,                    -- used by welcome-blast trigger
  created_at      timestamptz not null default now()
);

-- =========================================================================
-- clientes  (the 1092 in CRM — mock seed = 60-80 representative rows)
-- =========================================================================
create table if not exists clientes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  nif             text unique,
  email           text,
  telefone        text,                    -- E.164 preferred (+351...)
  data_nascimento date,
  morada          text,
  concelho        text,
  consultor_id    uuid references gestores(id),
  origem          text,                    -- 'referencia' / 'cold_call' / 'walk_in' / 'campanha'
  status          text not null default 'ativo',   -- 'ativo' / 'dormente' / 'perdido'
  notas           text,
  created_at      timestamptz not null default now()
);

create index if not exists clientes_consultor_idx on clientes(consultor_id);
create index if not exists clientes_nif_idx       on clientes(nif);

-- =========================================================================
-- processos  (credit applications / mortgage refinancing / consumer credit)
-- =========================================================================
create table if not exists processos (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references clientes(id) on delete cascade,
  consultor_id        uuid references gestores(id),
  tipo                text not null,                 -- 'credito_habitacao' / 'credito_pessoal' / 'credito_auto' / 'consolidado'
  status              text not null default 'em_recolha',
                                                       -- 'em_recolha' (a juntar docs)
                                                       -- 'em_analise' (banco a avaliar)
                                                       -- 'aprovado'
                                                       -- 'escriturado'
                                                       -- 'cancelado'
  valor_credito       numeric(12,2),
  taxa_tipo           text,                            -- 'fixa' / 'variavel' / 'mista'
  taxa_fixa_ate       date,                            -- if mista — fixed-period end date (drives "renegociar antes" trigger)
  data_escritura      date,                            -- drives +3m / +6m / +12m anniversary triggers
  rgpd_enviado        boolean not null default false,
  rgpd_assinado       boolean not null default false,
  documentos_em_falta text[] not null default '{}',    -- ['recibo_vencimento','irs','comprovativo_morada',...]
  ultima_atividade    timestamptz,                     -- updated on any follow-up event
  created_at          timestamptz not null default now()
);

create index if not exists processos_status_idx     on processos(status);
create index if not exists processos_escritura_idx  on processos(data_escritura);
create index if not exists processos_taxa_fim_idx   on processos(taxa_fixa_ate);

-- =========================================================================
-- apolices  (seguros — auto / vida / habitacao / saude)
-- =========================================================================
create table if not exists apolices (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes(id) on delete cascade,
  consultor_id      uuid references gestores(id),
  ramo              text not null,                   -- 'auto' / 'vida' / 'habitacao' / 'saude' / 'multirriscos'
  numero            text,
  seguradora        text,
  premio_anual      numeric(10,2),
  data_inicio       date,
  data_vencimento   date,                            -- drives "60d antes" trigger
  status            text not null default 'ativa',   -- 'ativa' / 'pendente_renovacao' / 'cancelada'
  ultima_atividade  timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists apolices_vencimento_idx on apolices(data_vencimento);
create index if not exists apolices_status_idx     on apolices(status);

-- =========================================================================
-- leads  (cold prospects — pre-cliente; created by the cold-call / form flow)
-- =========================================================================
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  telefone        text,
  email           text,
  nif             text,
  produto         text,                             -- 'credito_habitacao' / 'credito_pessoal' / 'seguro_auto' / ...
  origem          text not null default 'formulario',
  consultor_id    uuid references gestores(id),
  status          text not null default 'novo',     -- 'novo' / 'contactado' / 'qualificado' / 'convertido' / 'perdido'
  ultima_acao     timestamptz,
  notas           text,
  created_at      timestamptz not null default now()
);

create index if not exists leads_status_idx on leads(status);

-- =========================================================================
-- triggers_fired  (audit log — what comm has the platform already sent?)
-- =========================================================================
create table if not exists triggers_fired (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references clientes(id) on delete cascade,
  processo_id     uuid references processos(id) on delete cascade,
  apolice_id      uuid references apolices(id) on delete cascade,
  trigger_type    text not null,                   -- 'aniversario' / 'escritura_3m' / 'escritura_6m' / 'escritura_12m'
                                                     -- / 'apolice_60d' / 'taxa_fixa_90d' / 'doc_followup_24h'
                                                     -- / 'doc_followup_48h' / 'doc_followup_72h' / 'welcome_blast'
                                                     -- / 'newsletter'
  canal           text not null default 'whatsapp',
  fired_at        timestamptz not null default now(),
  mensagem        text,
  meta_wa_message_id text,
  status          text not null default 'enviado'  -- 'agendado' / 'enviado' / 'falhou'
);

create index if not exists triggers_fired_cliente_idx on triggers_fired(cliente_id, trigger_type);

-- =========================================================================
-- newsletters
-- =========================================================================
create table if not exists newsletters (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  tema            text,                             -- 'literacia_financeira' / 'taxa_juro' / 'seguros' / ...
  conteudo_md     text,                             -- markdown source generated by Claude
  pdf_url         text,                             -- once rendered + uploaded
  enviado_em      timestamptz,
  destinatarios_count integer default 0,
  created_at      timestamptz not null default now()
);

-- =========================================================================
-- mensagens  (raw outbound WhatsApp log — distinct from triggers_fired
-- so that ad-hoc sends, newsletter blasts, and gestor-typed messages all
-- land in one timeline)
-- =========================================================================
create table if not exists mensagens (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references clientes(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  to_e164         text not null,
  canal           text not null default 'whatsapp',
  corpo           text not null,
  meta_wa_message_id text,
  trigger_id      uuid references triggers_fired(id) on delete set null,
  sent_at         timestamptz not null default now(),
  status          text not null default 'sent'
);

create index if not exists mensagens_cliente_idx on mensagens(cliente_id);

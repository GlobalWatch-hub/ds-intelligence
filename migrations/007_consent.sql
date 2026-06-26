-- 007_consent.sql
-- Marketing / contact consent for the newsletter opt-in gate.
--
-- DISCOVERY (1 Jun 2026): CrediDesk stores marketing-contact consent as
-- STRUCTURED fields on the customer DETAIL endpoint (/customers/{id}), not as
-- a signed-PDF that needs OCR. The reliable opt-in signal is `authorizedContact`
-- (bool) together with `authorizedContactOn` (date) and a non-zero
-- `authorizedOptionId` (the consent-record FK). `consentAuthorizedActive` is a
-- secondary CRM toggle and is NOT the opt-in — do not gate on it.
--
-- These columns are populated by integrations/ds_crm/ingest_consent.py, which
-- pulls the customer detail per crm_id (the list endpoint does not carry them).

set search_path to ds, public;

alter table clientes_real
  add column if not exists authorized_contact     boolean,        -- marketing/contact opt-in
  add column if not exists authorized_contact_on  timestamptz,    -- when consent was given
  add column if not exists consent_option_id      bigint,         -- CrediDesk consent-record FK (0 = none)
  add column if not exists consent_active          int,           -- secondary CRM toggle (informational)
  add column if not exists consent_synced_at      timestamptz;    -- last time we refreshed consent for this row

-- Fast lookup of the opted-in audience for the newsletter composer.
create index if not exists clientes_real_optin_idx
  on clientes_real(authorized_contact)
  where authorized_contact is true;

# DS Intelligence — Operations Runbook (handover)

Handover doc for Rui. The platform is **live and autonomous** as of 2 June 2026.
Everything below is the steady-state operation: what runs by itself, what is
manual, and how to fix it when something breaks.

> Scope reminder: this mirrors **Bruno Sousa's** CrediDesk account only (agency
> 839, DS Crédito Ramada – Jardim da Amoreira). Bruno's login sees his own
> ~187 processos + ~420 leads, but the full **1.1k loja clientes**. Cross-gestor
> pipeline needs a loja-coordinator login that DS has not yet provided (Bruno
> chases on his return, 8 June). Two dashboard cards (**apólices**, **taxa fixa**)
> are tagged "Aguarda integração" on purpose — see §7.

---

## 1. Infrastructure at a glance

> ⚠️ **Infra atual (verificada 2026-06-30)** — a migração para o box novo + projeto
> Supabase novo deixou esta tabela desatualizada; valores corretos abaixo.

| Thing | Value |
|---|---|
| Platform URL | https://dscredito.synertia-gw.ai |
| EC2 | `i-09791c4600bef70ea`, eu-west-1, **108.130.14.101**, user `ubuntu` |
| SSH | `ssh -i ~/.ssh/dscredito-key.pem ubuntu@108.130.14.101` |
| Backend | FastAPI em `~/ds-engine/backend`, venv `~/ds-engine/backend/venv`, systemd `ds-intelligence.service` |
| Frontend | Next.js, systemd `ds-intelligence-frontend.service` |
| Staging | `~/ds-engine-staging` (branch `staging`); ver memória/`deploy-staging.sh` |
| DB | Supabase ref **`bsxnzxroxcjtgtvqozgo`**, schema `ds` (ligação DDL: `cred/ddl.txt`, gitignored) |
| Deploy | git-based: push a `origin/main`, depois `ssh … 'cd ~/ds-engine && ./deploy.sh'` |

**Deploy rápido (runbook):**
1. `git push origin main`.
2. Novas env vars → acrescentar **à mão** em `~/ds-engine/backend/.env` no box (o deploy nunca lhes toca).
3. `ssh -i ~/.ssh/dscredito-key.pem ubuntu@108.130.14.101 'cd ~/ds-engine && ./deploy.sh'`.
4. Migrações (se houver): `DB_URL="$(cat cred/ddl.txt)" python scripts/apply_migrations.py` (local, contra a prod; idempotente).
| Web server | nginx + Let's Encrypt; proxies only `/api/*` → FastAPI (note: `/health` is not exposed publicly) |
| LLM | dedicated DS Anthropic key (`ANTHROPIC_API_KEY` in `.env`) |
| WhatsApp | dedicated DS Meta app (System User token, no expiry) |

All secrets live in `~/ds-engine/backend/.env` on the box (gitignored). The same
`.env` powers both the API and the sync workers.

---

## 2. What runs automatically (cron on the EC2 box, user `ubuntu`)

Installed 2 June 2026. `crontab -l` to view. Times are **UTC** (02:00 UTC =
03:00 Europe/Lisbon in summer). Logs append to `~/ds-sync.log`.

| When (UTC) | Job |
|---|---|
| 02:00 daily | `ingest_customers.py` — refresh `ds.clientes_real` (~1.1k, ~30s) |
| 02:20 daily | `ingest_processos.py` — refresh `ds.processos_real` (~187) |
| 02:40 daily | `ingest_leads.py` — refresh `ds.leads_real` (~420) |
| 03:00 Monday | `ingest_consent.py --stale-days 7` — refresh marketing-consent on `clientes_real` |

Each worker self-mints a fresh CrediDesk JWT via **headless Chromium**
(`integrations/ds_crm/auth.py` drives the login form), so there is no manual
token rotation. Chromium is installed in `~/.cache/ms-playwright`.

**Everything else is operator-triggered** (a human clicks in the UI): trigger
sends, newsletter sends, broadcasts, the weekly recap. Nothing fires WhatsApp on
a schedule. If DS later wants the recap auto-emailed Fri/Mon, that's a v1.1
decision — don't wire it without their sign-off.

---

## 3. Manual re-sync (run any time, e.g. before a demo)

```bash
ssh -i ~/.ssh/ds-intelligence-key.pem ubuntu@52.48.160.156
cd ~/ds-engine/backend
venv/bin/python integrations/ds_crm/ingest_customers.py
venv/bin/python integrations/ds_crm/ingest_processos.py
venv/bin/python integrations/ds_crm/ingest_leads.py
venv/bin/python integrations/ds_crm/ingest_consent.py            # missing rows only
venv/bin/python integrations/ds_crm/ingest_consent.py --all      # full re-pull (~4 min)
```

Safe to run repeatedly — all upserts are idempotent (keyed on `crm_id`).
**Read-only against CrediDesk.** Never add POST/PUT to these workers — we hold
Bruno's personal credentials as a service-account equivalent; a destructive call
would hit the live business CRM. Rate is already gentle (0.2s between detail
calls). On a CrediDesk auth failure, do **not** retry in a loop — account lockout
behaviour is unknown. Investigate the creds instead.

---

## 4. Weekly coordinator recap

Operator-triggered HTML page, defaults to the **last completed calendar week**.

- UI: open `https://dscredito.synertia-gw.ai/recap` (week navigator ← / atual / →)
- It reads `ds.processos_real` live — no separate generation step.
- Review the 4 KPI cards + Ganhos/Anulados tables, then share manually.
- Auto-email is **not** enabled (see §2).

---

## 5. Newsletter & the consent gate

The composer (`/newsletter`) generates/edits a post, then sends as a WhatsApp
link. Sends can target the **opted-in audience only**:

- `GET /api/newsletter/audience` returns the honest split:
  `total_clientes / consent_synced / opted_in / opted_in_with_phone / deliverable_now`.
- Opt-in source is **structured CrediDesk data**, not OCR: `clientes_real.authorized_contact`
  (populated by `ingest_consent.py`). `consent_active` is a secondary CRM toggle
  and is NOT the gate — do not filter on it.
- A send with `audience="opted_in"` only goes to `authorized_contact = true`.
- During the demo phase only **Meta-verified numbers** actually deliver
  (`deliverable_now`); the rest are reported as the addressable target. With a
  production Meta number all opted-in-with-phone become reachable.

---

## 6. Adding a Meta-verified recipient (demo)

Until DS has a production WhatsApp number, real sends only reach numbers verified
in the DS Meta app. To add one for a demo:

1. Meta WhatsApp Manager → DS app → add + verify the E.164 number (one-time code).
2. Add it to `DEMO_RECIPIENTS` (comma-separated) in `~/ds-engine/backend/.env`.
3. `sudo systemctl restart ds-intelligence`.

Unverified numbers are auto-redirected in the UI so an operator never sees a
silent send failure during a demo.

---

## 7. The two "Aguarda integração" cards — what they are

- **Apólices (60d)** — DS Seguros runs on a **separate system** (not CrediDesk;
  CrediDesk's SPA has no apólices surface). This is a commercial scope
  conversation between Karim and DS, not a tech task. Card stays tagged.
- **Taxa fixa (90d)** — `/creditprocesses/{id}` exposes spread/euribor/effort
  rate but **no fixed-rate-period END date**, so the card can't be closed from
  the known endpoint. Open investigation: find another field/endpoint or confirm
  it's absent. Do not promise this card as done.

---

## 8. When a sync fails — triage

1. **Check the audit table** — every worker logs a row to `ds.crm_sync_runs`
   (`source` = `credidesk_customers` / `_processos` / `_leads` / `_consent`).
   A failed run has a non-null `error` column with the exception text.
   ```bash
   curl -s "$SUPABASE_URL/rest/v1/crm_sync_runs?select=*&order=started_at.desc&limit=5" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Accept-Profile: ds"
   ```
2. **Check the cron log:** `tail -50 ~/ds-sync.log`.
3. **Service health:** `systemctl status ds-intelligence` / `journalctl -u ds-intelligence --since "10 min ago"`.
4. **CrediDesk JWT mint broke** (the most likely failure — they change the login
   form / Vue re-render): run `venv/bin/python integrations/ds_crm/ingest_customers.py`
   by hand and read the traceback. Auth logic is in `integrations/ds_crm/auth.py`
   (`mint_jwt`); it fills the form and Enter-submits, then scrapes the first
   `Authorization: Bearer` request to `appapi.credidesk.com`.
5. **Chromium missing after a box rebuild:** `venv/bin/python -m playwright install --with-deps chromium`.

---

## 9. Code map

```
backend/integrations/ds_crm/
  auth.py            headless-Chromium JWT mint (self-refresh, 401-retry)
  client.py          CredidekClient — _get/_post, iter_customers/processos/leads
  ingest_customers.py   → ds.clientes_real
  ingest_processos.py   → ds.processos_real
  ingest_leads.py       → ds.leads_real
  ingest_consent.py     → consent columns on ds.clientes_real  (needs migration 007)
backend/app/routers/   dashboard.py triggers.py chat.py recap.py newsletter.py broadcasts.py ...
migrations/            top-level at ~/ds-engine/migrations (NOT backend/migrations, which does
                       not exist). Files present: 001_schema, 002_contactos_consultor, 007_consent
                       (003–006 referenced historically but not on disk). 007 = consent columns;
                       applied in Clara_Production SQL editor.
```

DDL note: there are no Clara_Production management creds on the laptop, only the
service_role key (data-plane, no DDL). Migrations are applied by pasting the SQL
into the Supabase SQL editor for project `gpjcgkyvezgdunytkueu`.

---

## 10. API surface reference (CrediDesk)

Base `https://appapi.credidesk.com/api/v1`, auth `https://authapi.credidesk.com/api/v1`.
`/customers/list` (POST, paginated) is loja-wide; `/creditprocesses/list` and the
leads endpoint are scoped to the logged-in manager. `/customers/{id}` carries the
consent fields. Full table in `reference_ds_crm_credidesk` (Karim's notes).

---

## 11. In-app login (item 1) — deploy steps

The platform now authenticates itself with an in-app login screen instead of the
nginx HTTP basic-auth popup. This needs THREE production actions — do them in
this order, **only on an explicit "deploy" OK** (nginx + `.env` touch prod).

**a) Set the secrets in `.env`** (`~/ds-engine/backend/.env`):

```
APP_USER=ds
APP_PASSWORD=<APP_PASSWORD>                # the shared credential the team types
APP_USERS={"amin":"<senha-de-teste-do-amin>"}   # extra accounts (JSON); test logins
APP_SESSION_SECRET=<random 32+ bytes>   # e.g.  python3 -c "import secrets;print(secrets.token_urlsafe(48))"
```

`APP_USERS` is a JSON object of `username: password` merged with the primary
credential — use it for test logins (e.g. **amin**) without sharing the main one.
Add more later, e.g. `{"amin":"...","baptiste":"..."}`. Empty `APP_PASSWORD`+`APP_USERS`
or empty `APP_SESSION_SECRET` ⇒ login fails closed (nobody can log in) — so these
MUST be set before the nginx step, or the platform locks everyone out.

**Per-user accounts (migration 009).** Login now reads `ds.platform_users` first
and only falls back to `APP_USERS`/`APP_PASSWORD` for the `ds`/`amin` admin logins.
Bootstrap the per-user accounts (Bruno `bs`, Jorge `jg`) on deploy:

```
# 1) add to .env: a Fernet key (encrypts CRM passwords) + the service PIN
APP_CRYPTO_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
APP_SERVICE_PIN=28021904
# 2) apply migration 009 then seed (reads APP_USERS for platform pw, DS_CRM_* for Bruno's CRM creds)
python3 scripts/apply_migrations.py <host> <port> <user> <password>
python3 scripts/seed_platform_users.py
```

The seed is idempotent and never overwrites a password/CRM credential already set
via the **Configurações → Utilizadores** UI. The CRM-credentials tab ("Definições")
is gated by `APP_SERVICE_PIN`; CRM passwords are stored Fernet-encrypted and never
returned to the client in clear text.

**Per-user CRM scoping (migrations 010 + 011, phase 2).** Each processo/lead row is
tagged with `source_accounts text[]` = the set of platform accounts whose CrediDesk
login can see it (a row can be visible to several — e.g. shared leads). The read
routers filter `source_accounts @> {<username>}` so each gestor sees exactly their
CRM scope; `ds`/`amin` (not in platform_users) and role `admin`/`coordenador` see
loja-wide. `clientes_real` stays loja-wide (not scoped). The ingest scripts
(`ingest_processos.py`, `ingest_leads.py`) now loop over every active CRM account in
`platform_users` (two-pass merge) and mint each account's JWT in memory — they never
touch the shared `DS_CRM_JWT`.

IMPORTANT: `APP_CRYPTO_KEY` MUST be identical on every host that runs ingestion
(box + anywhere else), otherwise the stored CRM passwords can't be decrypted. Set it
once and copy the same value. After deploy, run `apply_migrations.py` (010+011) then
the two ingest scripts so `source_accounts` is populated.

**b) Deploy code + restart services** (scp the changed files, then):

```
sudo systemctl restart ds-intelligence            # backend: auth router + session middleware
cd ~/ds-engine/frontend && npm run build && sudo systemctl restart ds-intelligence-frontend
```

Smoke-test while basic-auth is still up (so it's safe):
`curl -u ds:<APP_PASSWORD> https://dscredito.synertia-gw.ai/api/dashboard/kpis` → 401 (no session cookie yet → middleware works).

**c) Remove the nginx basic-auth** (the popup), so the in-app screen is reached.
Edit `/etc/nginx/sites-available/ds-intelligence` and comment OUT the two
server-level lines:

```
#   auth_basic           "DS Intelligence";
#   auth_basic_user_file /etc/nginx/.htpasswd-ds;
```

Then `sudo nginx -t && sudo systemctl reload nginx`.

Verify: open https://dscredito.synertia-gw.ai → redirected to `/login` (no browser popup);
log in with `ds` / `<APP_PASSWORD>` → lands on the welcome page; "Sair" returns to login.

**Rollback:** un-comment the two nginx lines + `reload nginx` (the popup is back,
`.htpasswd-ds` was never removed). The app middleware is harmless behind basic-auth.

Notes:
- `/api/whatsapp` stays session-gated (it was already behind basic-auth; enabling
  inbound Meta callbacks publicly is a separate task with signature checks).
- Cookie `ds_session` is httpOnly + Secure + SameSite=Lax, signed (HMAC over the
  issued-at timestamp), 7-day max age; the Next middleware gates pages on its
  presence, the FastAPI middleware validates its signature on every `/api/*`.
- Per-user accounts / Coordenador-vs-Gestor roles are a later step (need the
  loja-coordinator login).

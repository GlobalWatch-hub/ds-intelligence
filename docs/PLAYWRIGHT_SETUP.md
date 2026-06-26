# Configurar o Playwright — DS Intelligence

> Para que serve: o Playwright corre um **Chromium headless** que faz login no
> CrediDesk (`crm.dsicredito.pt`) e captura o JWT (Bearer token) usado para ler
> dados da API. Sem Playwright instalado, os workers de ingestão
> (`ingest_customers.py`, `ingest_processos.py`, `ingest_leads.py`,
> `ingest_consent.py`) **não conseguem autenticar** e falham logo no arranque.
>
> Quem faz o trabalho: `backend/integrations/ds_crm/auth.py` → `mint_jwt()`.

---

## 1. Como o Playwright entra no fluxo

1. O worker arranca e instancia `CredidekClient` (`client.py`).
2. Se não houver `DS_CRM_JWT` no `.env`, ou estiver a < 5 min de expirar, chama
   `mint_jwt(email, password)`.
3. `mint_jwt` abre o **Chromium headless via Playwright**, preenche o formulário
   de login real e fica à escuta dos pedidos de rede.
4. Captura o primeiro header `Authorization: Bearer …` que sai para
   `appapi.credidesk.com` e grava-o em `DS_CRM_JWT` no `.env`.
5. A partir daí o resto das chamadas é feito com `requests` — o browser fecha.

Demora ~3-5s por login. Acontece automaticamente; não há rotação manual de token.

---

## 2. Pré-requisitos

| Requisito | Detalhe |
|---|---|
| Python | 3.10+ (o mesmo venv do backend) |
| Pacote pip | `playwright` (ver nota abaixo — **não está** no `requirements.txt`) |
| Browser | Chromium descarregado pelo próprio Playwright |
| Dependências de SO | bibliotecas de sistema do Chromium (`--with-deps` no Linux) |
| Variáveis `.env` | `DS_CRM_USERNAME`, `DS_CRM_PASSWORD` (e `DS_CRM_JWT`, preenchida sozinha) |

> **Nota importante:** o `playwright` foi instalado manualmente na box e **não
> consta** em `backend/requirements.txt`. Se reconstruíres o ambiente só com
> `pip install -r requirements.txt`, o Playwright **não fica instalado** e a
> ingestão falha. Instala-o sempre à parte (passo 3) ou adiciona-o ao
> `requirements.txt`.

---

## 3. Instalação

### 3.1. No servidor de produção (EC2 Ubuntu, `52.48.160.156`)

```bash
ssh -i ~/.ssh/ds-intelligence-key.pem ubuntu@52.48.160.156
cd ~/ds-engine/backend
source venv/bin/activate

# 1) pacote Python
pip install playwright

# 2) browser + dependências de sistema (precisa de sudo para as libs do SO)
python -m playwright install --with-deps chromium
```

O Chromium fica em `~/.cache/ms-playwright`. O `--with-deps` instala as
bibliotecas de SO que o Chromium precisa (fonts, libnss, etc.) — sem isso o
browser arranca mas crasha.

### 3.2. Localmente (Windows, para testar)

```powershell
cd C:\Users\ruiba\globalw\dscredito\backend
# ativar o venv local, depois:
pip install playwright
python -m playwright install chromium
```

No Windows **não** se usa `--with-deps` (é só para Linux). O Chromium fica em
`%USERPROFILE%\AppData\Local\ms-playwright`.

---

## 4. Verificar que ficou bem

```bash
# da pasta backend/, com o venv ativo e o .env presente
python -m playwright --version
python integrations/ds_crm/auth.py
```

Esperado:

```
[auth] minting JWT for bruno...@...
[auth] got JWT in 3.8s (XXXX chars)
[auth] wrote DS_CRM_JWT to .../.env
```

Se vires isto, o Playwright está operacional e o `.env` ficou com um
`DS_CRM_JWT` fresco.

---

## 5. Configuração relevante no código

Em `auth.py` (não é preciso mexer, mas é bom saber onde mexer se algo mudar):

| Parâmetro | Valor atual | Quando ajustar |
|---|---|---|
| `LOGIN_URL` | `https://crm.dsicredito.pt/login/` | só se o CRM mudar de URL |
| `API_HOST` | `appapi.credidesk.com` | só se a API mudar de host |
| `headless` | `True` | põe `False` para **ver o browser** ao depurar localmente |
| `timeout_ms` | `45000` | aumenta se a rede/box estiver lenta |
| seletores | `input[type="email"]`, `input#password` | se o layout do login mudar (ver §6) |

Depurar com browser visível, localmente:

```python
from integrations.ds_crm.auth import mint_jwt
jwt = mint_jwt("email", "password", headless=False)  # abre uma janela Chromium
```

---

## 6. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `ModuleNotFoundError: playwright` | pacote não instalado no venv | `pip install playwright` (§3) |
| `Executable doesn't exist … ms-playwright` | browser não descarregado / box reconstruída | `python -m playwright install --with-deps chromium` |
| Chromium arranca e crasha logo | faltam libs de SO no Linux | re-correr com `--with-deps` |
| `Did not capture a Bearer JWT within timeout` | credenciais erradas, conta bloqueada, **ou o layout do login mudou** | confirmar `DS_CRM_USERNAME`/`PASSWORD`; correr com `headless=False` e ver onde para; ajustar os seletores em `auth.py` |
| `Login form interaction timed out` | seletor `input[type="email"]` / `input#password` já não existe | inspecionar o login atual e atualizar os seletores |
| Funciona local mas falha na box | venv/box sem Chromium após rebuild | reinstalar Chromium na box (§3.1) |

Logs da ingestão automática na box: `tail -50 ~/ds-sync.log`.

---

## 7. Resumo de uma linha

> `pip install playwright && python -m playwright install --with-deps chromium`
> — depois `auth.py` trata do resto sozinho a cada corrida de ingestão.

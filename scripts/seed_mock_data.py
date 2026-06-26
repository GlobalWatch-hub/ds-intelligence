"""Generate ~80 mock clientes/processos/apolices for the DS Crédito Ramada pilot demo.

Dates are tuned so the dashboard pops on demo day:
  - 4-6 aniversários within the next 7 days
  - 5-7 escrituras with +3m / +6m / +12m anniversaries this week + next
  - 8-12 apólices vencendo in next 60 days
  - 5-7 taxa-fixa-a-terminar in next 90 days
  - 4-6 processos with documentos em falta há >7 dias
  - 6-8 leads dormentes há >30 dias

Run AFTER migrations/001_schema.sql is applied to Supabase. Idempotent:
truncates the 5 mock tables before re-seeding. Uses SUPABASE_URL +
SUPABASE_SERVICE_ROLE_KEY from .env.
"""
from __future__ import annotations
import os
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client
from supabase.client import ClientOptions

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# DS lives in its own Postgres schema inside Clara_Production
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options=ClientOptions(schema="ds"))

# ---------------------------------------------------------------- gestores
GESTORES = [
    {"nome": "Sílvia Pereira", "email": "silviapereira@dsicredito.pt",  "cargo": "admin",            "data_entrada": "2023-09-01"},
    {"nome": "Jorge Gonçalves", "email": "jorgegoncalves@dsicredito.pt", "cargo": "gestor_credito",   "data_entrada": "2024-02-15"},
    {"nome": "Bruno Sousa",     "email": "brunosousa@dsicredito.pt",     "cargo": "gestor_credito",   "data_entrada": "2024-05-10"},
    {"nome": "Amídio Ferreira", "email": "amidio@dsicredito.pt",         "cargo": "gestor_seguros",   "data_entrada": "2025-11-04"},
    {"nome": "Catarina Lopes",  "email": "catarina@dsicredito.pt",       "cargo": "gestor_credito",   "data_entrada": "2026-05-12"},  # recently joined → welcome blast candidate
]

# ---------------------------------------------------------------- name pools
PRIMEIROS_NOMES = [
    "Maria", "João", "Ana", "Pedro", "Sofia", "Tiago", "Inês", "Rui",
    "Catarina", "Miguel", "Beatriz", "André", "Joana", "Ricardo", "Patrícia",
    "Bruno", "Carla", "Luís", "Mariana", "Filipe", "Helena", "Carlos",
    "Margarida", "Diogo", "Susana", "Nuno", "Teresa", "Vasco", "Cláudia",
    "Hugo", "Raquel", "Manuel", "Cristina", "Paulo", "Sara",
]
APELIDOS = [
    "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues",
    "Martins", "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes",
    "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira",
    "Moreira", "Correia", "Mendes", "Nunes", "Soares",
]
CONCELHOS = ["Odivelas", "Loures", "Lisboa", "Sintra", "Amadora", "Oeiras", "Cascais"]
SEGURADORAS = ["Fidelidade", "Tranquilidade", "Ageas", "Allianz", "Lusitania", "Mapfre", "Generali"]
BANCOS = ["Santander", "Millennium BCP", "Novobanco", "BPI", "CGD", "Bankinter"]


def rand_nif() -> str:
    # synthetic 9-digit; not checksum-valid (we're seeded mock, not prod data)
    return str(random.randint(200_000_000, 299_999_999))


def rand_phone() -> str:
    # PT mobile 9xxxxxxxx
    return "+3519" + str(random.randint(10_000_000, 39_999_999))


def rand_nome() -> str:
    return f"{random.choice(PRIMEIROS_NOMES)} {random.choice(APELIDOS)} {random.choice(APELIDOS)}"


def days_ago(d: int) -> date:
    return date.today() - timedelta(days=d)


def days_from_now(d: int) -> date:
    return date.today() + timedelta(days=d)


def truncate():
    """Clear in dep-order so FKs don't complain."""
    for t in ("mensagens", "triggers_fired", "newsletters", "leads", "apolices", "processos", "contactos_consultor", "clientes", "gestores"):
        sb.table(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()


def seed_gestores() -> dict[str, str]:
    truncate()
    res = sb.table("gestores").insert(GESTORES).execute().data
    return {g["email"]: g["id"] for g in res}


def main():
    print("· clearing existing seed …")
    g_by_email = seed_gestores()
    print(f"· {len(g_by_email)} gestores inserted")

    silvia = g_by_email["silviapereira@dsicredito.pt"]
    jorge  = g_by_email["jorgegoncalves@dsicredito.pt"]
    bruno  = g_by_email["brunosousa@dsicredito.pt"]
    amidio = g_by_email["amidio@dsicredito.pt"]
    catarina = g_by_email["catarina@dsicredito.pt"]
    consultores = [jorge, bruno, catarina]
    consultores_seguros = [amidio, silvia]

    # ---------------- clientes ----------------
    clientes_rows = []
    today = date.today()
    for i in range(80):
        if i < 5:
            # synthesise a DoB whose month+day lands in the next 7 days
            target = today + timedelta(days=random.randint(1, 7))
            year = today.year - random.randint(28, 65)
            try:
                dn = date(year, target.month, target.day)
            except ValueError:
                # leap-day edge — shift to Feb 28
                dn = date(year, target.month, 28)
        else:
            dn = date(random.randint(1955, 1995), random.randint(1, 12), random.randint(1, 28))

        # majority active, some dormente (drives "leads/clientes parados" KPI)
        status = "dormente" if i >= 72 else "ativo"

        clientes_rows.append({
            "nome": rand_nome(),
            "nif": rand_nif(),
            "email": f"cliente{i+1:03d}@example.pt",
            "telefone": rand_phone(),
            "data_nascimento": dn.isoformat(),
            "morada": f"Rua {random.choice(APELIDOS)} {random.randint(1,300)}",
            "concelho": random.choice(CONCELHOS),
            "consultor_id": random.choice(consultores),
            "origem": random.choice(["referencia", "walk_in", "campanha", "cold_call"]),
            "status": status,
        })

    cli_ins = sb.table("clientes").insert(clientes_rows).execute().data
    cli_ids = [c["id"] for c in cli_ins]
    print(f"· {len(cli_ins)} clientes inserted (5 aniversários nos próximos 7d)")

    # ---------------- processos ----------------
    # 60 clientes têm crédito de habitação; 12 desses estão "em_recolha" (docs em falta),
    # restantes "escriturado" com escritura em datas que despoletam triggers
    procs_rows = []
    doc_options = ["recibo_vencimento", "irs_2024", "comprovativo_morada", "extrato_bancario", "declaracao_iban"]

    for idx in range(60):
        cid = cli_ids[idx]
        if idx < 12:
            # docs em falta — 6 estão atrasados há >7 dias (KPI), 6 são recentes
            atraso = random.randint(8, 20) if idx < 6 else random.randint(0, 5)
            procs_rows.append({
                "cliente_id": cid,
                "consultor_id": random.choice(consultores),
                "tipo": "credito_habitacao",
                "status": "em_recolha",
                "valor_credito": round(random.uniform(120_000, 350_000), 2),
                "taxa_tipo": random.choice(["fixa", "variavel", "mista"]),
                "rgpd_enviado": True,
                "rgpd_assinado": idx >= 2,
                "documentos_em_falta": random.sample(doc_options, k=random.randint(1, 3)),
                "ultima_atividade": (datetime.now() - timedelta(days=atraso)).isoformat(),
            })
        else:
            # escriturado — distribute escritura dates to feed the triggers
            slot = (idx - 12) % 12
            if slot == 0:        # escritura há ~3 meses (esta semana)
                ds = days_ago(90 + random.randint(-3, 3))
            elif slot == 1:      # escritura há ~6 meses
                ds = days_ago(180 + random.randint(-3, 3))
            elif slot == 2:      # escritura há ~12 meses
                ds = days_ago(365 + random.randint(-3, 3))
            else:
                ds = days_ago(random.randint(30, 1500))

            taxa_tipo = random.choice(["fixa", "variavel", "mista"])
            taxa_fim = None
            if taxa_tipo == "mista" and slot in (3, 4, 5):
                # 6 mortgages with fixed period ending in next 90 days (drives "renegociar antes" trigger)
                taxa_fim = days_from_now(random.randint(20, 85)).isoformat()
            elif taxa_tipo == "mista":
                taxa_fim = days_from_now(random.randint(100, 800)).isoformat()

            procs_rows.append({
                "cliente_id": cid,
                "consultor_id": random.choice(consultores),
                "tipo": "credito_habitacao",
                "status": "escriturado",
                "valor_credito": round(random.uniform(120_000, 400_000), 2),
                "taxa_tipo": taxa_tipo,
                "taxa_fixa_ate": taxa_fim,
                "data_escritura": ds.isoformat(),
                "rgpd_enviado": True,
                "rgpd_assinado": True,
                "documentos_em_falta": [],
                "ultima_atividade": (datetime.now() - timedelta(days=random.randint(30, 200))).isoformat(),
            })

    sb.table("processos").insert(procs_rows).execute()
    print(f"· {len(procs_rows)} processos inserted "
          f"(12 em_recolha incl. 6 atrasos>7d / 48 escriturados com triggers calibrados)")

    # ---------------- apolices ----------------
    # 50 clientes têm pelo menos uma apólice; calibrar 10 vencendo nos próximos 60d
    apol_rows = []
    for idx in range(50):
        cid = cli_ids[idx + 10]  # offset para não colidir 1:1 com processos
        if idx < 10:
            # vence nos próximos 60 dias
            dv = days_from_now(random.randint(5, 58))
        elif idx < 18:
            # já venceu (pendente_renovacao)
            dv = days_ago(random.randint(1, 20))
        else:
            dv = days_from_now(random.randint(80, 700))

        status = "pendente_renovacao" if 10 <= idx < 18 else "ativa"
        apol_rows.append({
            "cliente_id": cid,
            "consultor_id": random.choice(consultores_seguros),
            "ramo": random.choice(["auto", "vida", "habitacao", "saude", "multirriscos"]),
            "numero": f"AP{random.randint(10_000_000, 99_999_999)}",
            "seguradora": random.choice(SEGURADORAS),
            "premio_anual": round(random.uniform(180, 1400), 2),
            "data_inicio": days_ago(random.randint(180, 1500)).isoformat(),
            "data_vencimento": dv.isoformat(),
            "status": status,
        })
    sb.table("apolices").insert(apol_rows).execute()
    print(f"· {len(apol_rows)} apólices inserted (10 vencendo próximos 60d / 8 pendentes_renovacao)")

    # ---------------- leads ----------------
    leads_rows = []
    for idx in range(15):
        if idx < 7:
            # leads dormentes há >30 dias (KPI)
            ts = datetime.now() - timedelta(days=random.randint(35, 90))
            status = "contactado"
        elif idx < 11:
            ts = datetime.now() - timedelta(days=random.randint(2, 10))
            status = "qualificado"
        else:
            ts = datetime.now() - timedelta(days=random.randint(0, 2))
            status = "novo"

        leads_rows.append({
            "nome": rand_nome(),
            "telefone": rand_phone(),
            "email": f"lead{idx+1:02d}@example.pt",
            "produto": random.choice(["credito_habitacao", "credito_pessoal", "seguro_auto", "credito_auto"]),
            "origem": random.choice(["site", "referencia", "cold_call"]),
            "consultor_id": random.choice(consultores),
            "status": status,
            "ultima_acao": ts.isoformat(),
            "notas": "Lead criada via mock-seed para demo DS Intelligence v1.",
        })
    sb.table("leads").insert(leads_rows).execute()
    print(f"· {len(leads_rows)} leads inserted (7 dormentes>30d)")

    # ---------------- contactos_consultor ----------------
    # Cada consultor traz a sua rede de contactos ao entrar na loja. Estes
    # alimentam a página de Contactos e o blast de boas-vindas. Catarina
    # (entrada recente) leva a maior rede — é a candidata óbvia ao welcome blast.
    contactos_rows = []
    rede_por_consultor = {jorge: 11, bruno: 9, catarina: 16, amidio: 7, silvia: 5}
    for cid, n in rede_por_consultor.items():
        for _ in range(n):
            contactos_rows.append({
                "consultor_id": cid,
                "nome_cliente": rand_nome(),
                "telefone": rand_phone(),
            })
    sb.table("contactos_consultor").insert(contactos_rows).execute()
    print(f"· {len(contactos_rows)} contactos_consultor inserted "
          f"(Catarina 16 — candidata a welcome blast)")

    print("\n✓ seed complete — refresh https://dscredito.synertia-gw.ai/")


if __name__ == "__main__":
    main()

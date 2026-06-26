"""Apply the ds-schema migrations to the new Supabase project via the Supavisor
session pooler. Idempotent (every DDL is `if not exists` / `add column if not
exists`). Connection params are read from argv to keep the password out of the
file. Run order matters: 007 alters clientes_real (created in 003)."""
from __future__ import annotations

import sys
from pathlib import Path

import psycopg

ORDER = [
    "001_schema.sql",
    "002_contactos_consultor.sql",
    "003_crm_real_mirror.sql",
    "004_processos_real.sql",
    "006_leads_real.sql",
    "007_consent.sql",
    "008_grants_and_expose.sql",
]

MIG_DIR = Path(__file__).resolve().parents[1] / "migrations"


def split_statements(sql: str):
    """Strip line comments first (a `--` comment may contain a ';'), then split on
    ';'. Our migrations have no dollar-quoted blocks or string-literal semicolons,
    so this is safe. Skip blank chunks."""
    no_comments = "\n".join(ln.split("--", 1)[0] for ln in sql.splitlines())
    for chunk in no_comments.split(";"):
        if chunk.strip():
            yield chunk.strip() + ";"


def main():
    host, port, user, password = sys.argv[1:5]
    conn = psycopg.connect(
        host=host, port=int(port), dbname="postgres",
        user=user, password=password, connect_timeout=15, autocommit=True,
    )
    cur = conn.cursor()
    for fname in ORDER:
        path = MIG_DIR / fname
        sql = path.read_text(encoding="utf-8")
        print(f"\n=== {fname} ===")
        for stmt in split_statements(sql):
            label = " ".join(stmt.split())[:70]
            try:
                cur.execute(stmt)
                print(f"  ok  {label}")
            except Exception as e:
                tolerate = fname == "008_grants_and_expose.sql" and (
                    "authenticator" in stmt or "pgrst" in stmt
                )
                if tolerate:
                    print(f"  WARN (tolerated) {label} -> {type(e).__name__}: {str(e)[:80]}")
                else:
                    print(f"  FAIL {label} -> {type(e).__name__}: {str(e)[:160]}")
                    conn.close()
                    sys.exit(1)

    print("\n=== verificacao: tabelas no schema ds ===")
    cur.execute(
        "select table_name from information_schema.tables "
        "where table_schema='ds' order by table_name"
    )
    for (t,) in cur.fetchall():
        print("  ds." + t)
    conn.close()
    print("\n[done] migracoes aplicadas")


if __name__ == "__main__":
    main()

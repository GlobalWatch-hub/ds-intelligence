'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.nome) setNome(d.nome); })
      .catch(() => {});
  }, []);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — bounce to login regardless */
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-full border border-white/15 bg-white/10 pl-3 pr-1 py-0.5">
      <span className="text-xs text-white/80 font-medium truncate">{nome ?? 'Utilizador'}</span>
      <button
        onClick={logout}
        className="rounded-full bg-white/15 border border-white/15 px-2 py-0.5 text-[11px] text-white/75 hover:text-white hover:bg-white/25"
      >
        Sair
      </button>
    </div>
  );
}

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
    <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 pl-3 pr-1 py-1">
      <span className="text-sm text-ink-700 font-medium">{nome ?? 'Utilizador'}</span>
      <button
        onClick={logout}
        className="rounded-full bg-white border border-ink-200 px-2.5 py-0.5 text-xs text-ink-500 hover:text-ds-600 hover:border-ds-300"
      >
        Sair
      </button>
    </div>
  );
}

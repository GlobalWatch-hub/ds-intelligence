'use client';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';

function LoginInner() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setErr(res.status === 401 ? 'Credenciais inválidas.' : 'Não foi possível entrar. Tente novamente.');
        setBusy(false);
        return;
      }
      // Land on the welcome screen after login.
      router.replace('/');
      router.refresh();
    } catch {
      setErr('Erro de ligação ao servidor.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[78vh] flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <img src="/ds-logo.svg" alt="DS Crédito" className="h-14 w-14 mb-3" />
          <h1 className="text-xl font-semibold text-ink-900">DS Matrix</h1>
          <p className="text-sm text-ink-400 mt-1">Introduza as suas credenciais de acesso.</p>
        </div>

        <div className="space-y-3">
          {/* Utilizador — icon-prefixed field */}
          <div className="flex items-stretch rounded-xl border border-white/70 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ds-300">
            <span className="flex items-center px-3 border-r border-ink-200/60 text-ink-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Utilizador"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>
          {/* Palavra-passe — icon-prefixed field */}
          <div className="flex items-stretch rounded-xl border border-white/70 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ds-300">
            <span className="flex items-center px-3 border-r border-ink-200/60 text-ink-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Palavra-passe"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>
        </div>

        {err && <p className="text-sm text-ds-700">{err}</p>}

        <button type="submit" disabled={busy || !password} className="btn-primary w-full justify-center py-2.5">
          {busy ? 'A entrar …' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-ink-400">A carregar …</p>}>
      <LoginInner />
    </Suspense>
  );
}

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
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center text-center">
          <img src="/ds-logo.svg" alt="DS Crédito" className="h-14 w-14 mb-3" />
          <h1 className="text-xl font-semibold text-ink-900">DS Intelligence</h1>
          <p className="text-sm text-ink-400 mt-1">Introduza as suas credenciais de acesso.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-ink-400 mb-1">Utilizador</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ds-300"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-400 mb-1">Palavra-passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ds-300"
            />
          </div>
        </div>

        {err && <p className="text-sm text-ds-700">{err}</p>}

        <button type="submit" disabled={busy || !password} className="btn-primary w-full">
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

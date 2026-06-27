'use client';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SynertiaLoginShell, SynertiaField, IconUser, IconLock } from '@globalwatch-hub/synertia-ui';

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
      router.replace('/');
      router.refresh();
    } catch {
      setErr('Erro de ligação ao servidor.');
      setBusy(false);
    }
  }

  return (
    <SynertiaLoginShell clientLogoSrc="/ds-logo.svg" productName="DS Matrix" accent="#a91b60">
      <form onSubmit={submit} className="space-y-3">
        <SynertiaField
          icon={<IconUser />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="Utilizador"
        />
        <SynertiaField
          icon={<IconLock />}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Palavra-passe"
        />
        {err && <p className="text-sm text-ds-700">{err}</p>}
        <button type="submit" disabled={busy || !password} className="btn-primary w-full justify-center py-2.5">
          {busy ? 'A entrar …' : 'Entrar'}
        </button>
      </form>
    </SynertiaLoginShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-ink-400">A carregar …</p>}>
      <LoginInner />
    </Suspense>
  );
}

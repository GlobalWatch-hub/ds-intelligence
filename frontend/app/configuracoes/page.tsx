'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '../../lib/api';

type User = { id: number; username: string; nome: string | null; role: string; is_active: boolean };
type Account = { id: number; username: string; nome: string | null; telefone: string | null; email: string | null; role: string };

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
      />
    </label>
  );
}

// ---- Conta tab -----------------------------------------------------------
function ContaTab({ userId }: { userId: number }) {
  const { data } = useSWR<Account>(`/api/settings/users/${userId}/account`, api);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', password: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm({ nome: data.nome ?? '', telefone: data.telefone ?? '', email: data.email ?? '', password: '' });
  }, [data]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/settings/users/${userId}/account`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: form.nome,
          telefone: form.telefone,
          email: form.email,
          password: form.password || null,
        }),
      });
      setMsg('✓ Conta atualizada.');
      setForm((f) => ({ ...f, password: '' }));
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-sm text-ink-400">A carregar …</p>;
  return (
    <div className="max-w-md space-y-4">
      <Field label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <Field label="Telemóvel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
      <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Field
        label="Palavra-passe (deixar vazio para manter)"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'A guardar …' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-ink-500">{msg}</span>}
      </div>
    </div>
  );
}

// ---- Definições tab (CRM creds, PIN-gated) -------------------------------
function DefinicoesTab({ userId, pin, setPin }: { userId: number; pin: string | null; setPin: (p: string | null) => void }) {
  const [pinInput, setPinInput] = useState('');
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  async function unlock() {
    setUnlocking(true);
    setPinErr(null);
    try {
      await api('/api/settings/service/unlock', { method: 'POST', body: JSON.stringify({ pin: pinInput }) });
      setPin(pinInput);
    } catch {
      setPinErr('PIN de serviço inválido.');
    } finally {
      setUnlocking(false);
    }
  }

  if (!pin) {
    return (
      <div className="max-w-sm space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Acesso de serviço. Esta secção contém as credenciais de acesso ao CRM e só
          abre com o PIN de serviço.
        </div>
        <Field
          label="PIN de serviço"
          type="password"
          inputMode="numeric"
          placeholder="••••••"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && unlock()}
        />
        {pinErr && <p className="text-sm text-ds-700">{pinErr}</p>}
        <button onClick={unlock} disabled={unlocking || !pinInput} className="btn-primary">
          {unlocking ? 'A validar …' : 'Desbloquear'}
        </button>
      </div>
    );
  }
  return <CrmForm userId={userId} pin={pin} onLock={() => setPin(null)} />;
}

function CrmForm({ userId, pin, onLock }: { userId: number; pin: string; onLock: () => void }) {
  const headers = { 'X-Service-Pin': pin };
  const { data, mutate } = useSWR<{ crm_username: string | null; crm_password_set: boolean }>(
    [`/api/settings/users/${userId}/crm`, pin],
    ([path]) => api(path as string, { headers }),
  );
  const [crmUser, setCrmUser] = useState('');
  const [crmPass, setCrmPass] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setCrmUser(data.crm_username ?? '');
  }, [data]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/settings/users/${userId}/crm`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ crm_username: crmUser, crm_password: crmPass || null }),
      });
      setMsg('✓ Credenciais CRM guardadas.');
      setCrmPass('');
      mutate();
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-sm text-ink-400">A carregar …</p>;
  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <span className="chip">Acesso de serviço ativo</span>
        <button onClick={onLock} className="text-xs text-ink-400 hover:text-ink-600">
          Bloquear
        </button>
      </div>
      <Field label="Utilizador CRM (email)" value={crmUser} onChange={(e) => setCrmUser(e.target.value)} autoComplete="off" />
      <Field
        label={`Palavra-passe CRM ${data.crm_password_set ? '(definida — deixar vazio para manter)' : '(não definida)'}`}
        type="password"
        autoComplete="new-password"
        placeholder={data.crm_password_set ? '••••••••' : 'Introduzir palavra-passe'}
        value={crmPass}
        onChange={(e) => setCrmPass(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'A guardar …' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-ink-500">{msg}</span>}
      </div>
    </div>
  );
}

// ---- Page ----------------------------------------------------------------
export default function ConfiguracoesPage() {
  const { data } = useSWR<{ users: User[] }>('/api/settings/users', api);
  const users = data?.users ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'conta' | 'definicoes'>('conta');
  // Service PIN is global; once validated we keep it for any user in this session.
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    if (selected === null && users.length) setSelected(users[0].id);
  }, [users, selected]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-400">Utilizadores da plataforma e credenciais de acesso.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Utilizadores */}
        <nav className="space-y-1">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Utilizadores</p>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                selected === u.id ? 'bg-ink-100 font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700">
                {(u.nome ?? u.username).split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <span className="truncate">{u.nome ?? u.username}</span>
            </button>
          ))}
          {!users.length && <p className="px-3 text-sm text-ink-400">Sem utilizadores.</p>}
        </nav>

        {/* Detalhe */}
        <section className="card">
          {selected === null ? (
            <p className="text-sm text-ink-400">Selecione um utilizador.</p>
          ) : (
            <>
              <div className="mb-5 flex gap-2 border-b border-ink-100">
                {(['conta', 'definicoes'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                      tab === t
                        ? 'border-[color:var(--accent)] font-medium text-ink-900'
                        : 'border-transparent text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t === 'conta' ? 'Conta' : 'Definições'}
                  </button>
                ))}
              </div>
              {tab === 'conta' ? (
                <ContaTab userId={selected} />
              ) : (
                <DefinicoesTab userId={selected} pin={pin} setPin={setPin} />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

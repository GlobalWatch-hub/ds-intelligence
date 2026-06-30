'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '../../lib/api';

type Role = 'diretor_loja' | 'diretor_comercial' | 'comercial';
type UserRow = { id: number; username: string; nome: string | null; role: Role; manager_id: number | null; is_active: boolean };
type Acting = { id: number | null; role: Role };
type UsersResp = { users: UserRow[]; acting: Acting };
type Manager = { crm_id: number; nome: string | null };
type UserFull = {
  id: number; username: string; nome: string | null; telefone: string | null; email: string | null;
  role: Role; manager_id: number | null; manager_crm_id: number | null;
  crm_username: string | null; crm_password_set: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  diretor_loja: 'Diretor de Loja',
  diretor_comercial: 'Diretor Comercial',
  comercial: 'Comercial',
};

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

function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      <select
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
      >
        {children}
      </select>
    </label>
  );
}

// ---- User create/edit form ----------------------------------------------
function UserForm({
  mode, userId, acting, users, managers, onSaved, onCancel,
}: {
  mode: 'create' | 'edit';
  userId: number | null;
  acting: Acting;
  users: UserRow[];
  managers: Manager[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: full } = useSWR<UserFull>(mode === 'edit' && userId ? `/api/settings/users/${userId}` : null, api);
  const lojaDir = acting.role === 'diretor_loja';
  const [f, setF] = useState({
    username: '', password: '', nome: '', telefone: '', email: '',
    role: (lojaDir ? 'comercial' : 'comercial') as Role,
    manager_id: '' as string, manager_crm_id: '' as string,
    crm_username: '', crm_password: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && full) {
      setF({
        username: full.username ?? '', password: '', nome: full.nome ?? '', telefone: full.telefone ?? '', email: full.email ?? '',
        role: full.role, manager_id: full.manager_id?.toString() ?? '', manager_crm_id: full.manager_crm_id?.toString() ?? '',
        crm_username: full.crm_username ?? '', crm_password: '',
      });
    }
  }, [mode, full]);

  const diretores = users.filter((u) => u.role === 'diretor_comercial');
  const roleOptions: Role[] = lojaDir ? ['diretor_comercial', 'comercial'] : ['comercial'];
  const lockedRole = mode === 'edit' && full?.role === 'diretor_loja'; // não se reestrutura um Diretor de Loja
  const isComercial = f.role === 'comercial';
  const isDiretorComercial = f.role === 'diretor_comercial';

  async function save() {
    setBusy(true); setMsg(null);
    const body: any = {
      username: f.username, nome: f.nome, telefone: f.telefone, email: f.email,
      role: f.role,
      manager_id: f.manager_id ? Number(f.manager_id) : null,
      manager_crm_id: isComercial && f.manager_crm_id ? Number(f.manager_crm_id) : null,
      crm_username: isDiretorComercial ? f.crm_username : null,
    };
    if (f.password) body.password = f.password;
    if (isDiretorComercial && f.crm_password) body.crm_password = f.crm_password;
    try {
      if (mode === 'create') {
        if (!f.password) { setMsg('Palavra-passe obrigatória.'); setBusy(false); return; }
        await api('/api/settings/users', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await api(`/api/settings/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setMsg('✓ Guardado.');
      onSaved();
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally { setBusy(false); }
  }

  if (mode === 'edit' && !full) return <p className="text-sm text-ink-400">A carregar …</p>;

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-sm font-semibold text-ink-900">{mode === 'create' ? 'Novo utilizador' : 'Editar utilizador'}</h3>
      <Field label="Utilizador (username de acesso)" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" />
      <Field label={mode === 'create' ? 'Palavra-passe' : 'Palavra-passe (vazio = manter)'} type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Field label="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <Field label="Telemóvel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />

      {lojaDir && !lockedRole ? (
        <Select label="Perfil" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      ) : (
        <p className="text-xs text-ink-500">Perfil: <span className="font-medium">{ROLE_LABEL[f.role]}</span></p>
      )}

      {isComercial && (
        <>
          <Select label="Gestor no CRM (define os processos que vê)" value={f.manager_crm_id} onChange={(e) => setF({ ...f, manager_crm_id: e.target.value })}>
            <option value="">— selecionar —</option>
            {managers.map((m) => <option key={m.crm_id} value={m.crm_id}>{m.nome ?? m.crm_id}</option>)}
          </Select>
          {lojaDir && (
            <Select label="Diretor Comercial (equipa)" value={f.manager_id} onChange={(e) => setF({ ...f, manager_id: e.target.value })}>
              <option value="">— sem equipa —</option>
              {diretores.map((d) => <option key={d.id} value={d.id}>{d.nome ?? d.username}</option>)}
            </Select>
          )}
        </>
      )}

      {isDiretorComercial && (
        <div className="space-y-3 rounded-lg border border-ink-200 bg-ink-50/50 p-3">
          <p className="text-xs font-medium text-ink-600">Credenciais CRM (para ingerir a equipa deste diretor)</p>
          <Field label="Utilizador CRM (email)" value={f.crm_username} onChange={(e) => setF({ ...f, crm_username: e.target.value })} autoComplete="off" />
          <Field label={full?.crm_password_set ? 'Palavra-passe CRM (definida — vazio = manter)' : 'Palavra-passe CRM'} type="password" autoComplete="new-password" value={f.crm_password} onChange={(e) => setF({ ...f, crm_password: e.target.value })} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'A guardar …' : 'Guardar'}</button>
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
        {msg && <span className="text-sm text-ink-500">{msg}</span>}
      </div>
    </div>
  );
}

// ---- Sincronizar CRM (Diretor de Loja) -----------------------------------
type SyncRun = { finished_at: string | null; rows_upserted: number | null; error: string | null } | null;
function SyncBar() {
  const { data, mutate } = useSWR<{ processos: SyncRun; leads: SyncRun; running: boolean }>(
    '/api/settings/sync/status', api, { refreshInterval: (d) => (d?.running ? 4000 : 0) },
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const running = !!data?.running;

  async function run() {
    setBusy(true); setMsg(null);
    try {
      await api('/api/settings/sync', { method: 'POST' });
      setMsg('Sincronização iniciada — pode demorar 1–2 min.');
      setTimeout(mutate, 1500);
    } catch (e: any) {
      setMsg(/409/.test(e.message) ? 'Já existe uma sincronização em curso.' : `Erro: ${e.message}`);
    } finally { setBusy(false); }
  }

  const p = data?.processos, l = data?.leads;
  const last = !running && p?.finished_at
    ? `Última sincronização: ${p?.rows_upserted ?? '—'} processos / ${l?.rows_upserted ?? '—'} leads`
    : null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2">
      <button onClick={run} disabled={busy || running} className="btn-primary">
        {running ? 'A sincronizar …' : 'Sincronizar CRM'}
      </button>
      <span className="text-xs text-ink-500">
        {running ? 'Em curso …' : last ?? 'Corre a ingestão para etiquetar os dados de um novo Diretor Comercial.'}
        {p?.error && <span className="text-ds-700"> · último erro registado</span>}
      </span>
      {msg && <span className="text-xs text-ink-400">{msg}</span>}
    </div>
  );
}

// ---- Utilizadores tab ----------------------------------------------------
function UtilizadoresTab() {
  const { data, mutate } = useSWR<UsersResp>('/api/settings/users', api);
  const { data: mgrs } = useSWR<{ managers: Manager[] }>('/api/settings/managers', api);
  const [sel, setSel] = useState<number | 'new' | null>(null);
  const users = data?.users ?? [];
  const acting = data?.acting;
  const managers = mgrs?.managers ?? [];

  const canCreate = acting && (acting.role === 'diretor_loja' || acting.role === 'diretor_comercial');
  const selUser = typeof sel === 'number' ? users.find((u) => u.id === sel) : undefined;
  const canDelete = !!(acting && selUser && selUser.id !== acting.id &&
    (acting.role === 'diretor_loja' ? selUser.role !== 'diretor_loja' : selUser.manager_id === acting.id));

  async function del() {
    if (!selUser) return;
    if (!confirm(`Apagar o utilizador "${selUser.nome ?? selUser.username}"?`)) return;
    try {
      await api(`/api/settings/users/${selUser.id}`, { method: 'DELETE' });
      setSel(null); mutate();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div>
      {acting?.role === 'diretor_loja' && <SyncBar />}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <nav className="space-y-1">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Utilizadores</span>
          {canCreate && (
            <button onClick={() => setSel('new')} className="rounded-md bg-[color:var(--accent)] px-2 py-0.5 text-xs font-medium text-white">+ Adicionar</button>
          )}
        </div>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSel(u.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${sel === u.id ? 'bg-ink-100 font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-50'}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700">
              {(u.nome ?? u.username).split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{u.nome ?? u.username}</span>
              <span className="block truncate text-[11px] text-ink-400">{ROLE_LABEL[u.role]}</span>
            </span>
          </button>
        ))}
        {!users.length && <p className="px-3 text-sm text-ink-400">Sem utilizadores.</p>}
      </nav>

      <section className="card">
        {sel === null && <p className="text-sm text-ink-400">Selecione um utilizador ou adicione um novo.</p>}
        {sel === 'new' && acting && (
          <UserForm mode="create" userId={null} acting={acting} users={users} managers={managers}
            onSaved={() => { setSel(null); mutate(); }} onCancel={() => setSel(null)} />
        )}
        {typeof sel === 'number' && acting && (
          <div className="space-y-4">
            <UserForm mode="edit" userId={sel} acting={acting} users={users} managers={managers}
              onSaved={() => mutate()} onCancel={() => setSel(null)} />
            {canDelete && (
              <div className="border-t border-ink-100 pt-4">
                <button onClick={del} className="rounded-lg border border-ds-200 px-3 py-1.5 text-sm text-ds-700 hover:bg-ds-50">Apagar utilizador</button>
              </div>
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

// ---- Loja tab ------------------------------------------------------------
function LojaTab({ actingRole }: { actingRole: Role | undefined }) {
  const { data, mutate } = useSWR<{ numero: string | null; nome: string | null }>('/api/settings/loja', api);
  const [f, setF] = useState({ numero: '', nome: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canEdit = actingRole === 'diretor_loja';

  useEffect(() => { if (data) setF({ numero: data.numero ?? '', nome: data.nome ?? '' }); }, [data]);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api('/api/settings/loja', { method: 'PUT', body: JSON.stringify(f) });
      setMsg('✓ Loja atualizada.'); mutate();
    } catch (e: any) { setMsg(`Erro: ${e.message}`); } finally { setBusy(false); }
  }

  if (!data) return <p className="text-sm text-ink-400">A carregar …</p>;
  return (
    <section className="card max-w-md space-y-4">
      <Field label="Número da loja" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} disabled={!canEdit} />
      <Field label="Nome da loja (aparece no cabeçalho)" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} disabled={!canEdit} />
      {canEdit ? (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'A guardar …' : 'Guardar'}</button>
          {msg && <span className="text-sm text-ink-500">{msg}</span>}
        </div>
      ) : (
        <p className="text-xs text-ink-400">Só o Diretor de Loja pode alterar a loja.</p>
      )}
    </section>
  );
}

// ---- Page ----------------------------------------------------------------
export default function ConfiguracoesPage() {
  const { data: me } = useSWR<{ role: Role }>('/api/auth/me', api);
  const [tab, setTab] = useState<'utilizadores' | 'loja'>('utilizadores');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-400">Utilizadores, perfis e dados da loja.</p>
      </header>

      <div className="flex gap-2 border-b border-ink-100">
        {(['utilizadores', 'loja'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? 'border-[color:var(--accent)] font-medium text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
          >
            {t === 'utilizadores' ? 'Utilizadores' : 'Loja'}
          </button>
        ))}
      </div>

      {tab === 'utilizadores' ? <UtilizadoresTab /> : <LojaTab actingRole={me?.role} />}
    </div>
  );
}

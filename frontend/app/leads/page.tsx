'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '../../lib/api';

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  nif: string | null;
  produto: string | null;
  consultor_id: string | null;
  consultor_nome: string | null;
  status: string;
  ultima_acao: string | null;
  created_at: string;
};

export default function LeadsPage() {
  const { data, mutate } = useSWR<{ leads: Lead[] }>('/api/leads/list', api);
  const { data: cons } = useSWR<{ consultores: string[] }>('/api/leads/consultores', api);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', nif: '', produto: 'credito_habitacao', consultor_id: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setMsg(null);
    try {
      await api('/api/leads/create', { method: 'POST', body: JSON.stringify(form) });
      setMsg(
        `✓ Lead "${form.nome}" criada. Em modo demo: RGPD + checklist documental registados como agendados — o envio real por e-mail ao cliente acontece quando integrarmos a API do CRM + email service. Pode acompanhar o estado abaixo.`
      );
      setForm({ nome: '', telefone: '', email: '', nif: '', produto: 'credito_habitacao', consultor_id: '' });
      mutate();
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    }
  }

  const dormentes = (data?.leads || []).filter((l) => {
    if (!l.ultima_acao || l.status === 'convertido' || l.status === 'perdido') return false;
    const diff = (Date.now() - new Date(l.ultima_acao).getTime()) / 86400000;
    return diff > 30;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Leads</h1>
        <p className="text-ink-400 mt-1">
          Captura de novos contactos + reativação de leads dormentes. Ao criar uma lead, a plataforma
          dispara automaticamente o RGPD e a lista de documentação necessária.
        </p>
      </div>

      <div className="card grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 mb-3">Nova lead</h2>
          <div className="space-y-3">
            {(['nome','telefone','email','nif'] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs text-ink-400 capitalize">{f}</label>
                <input
                  value={(form as any)[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-ink-400">Produto</label>
              <select
                value={form.produto}
                onChange={(e) => setForm({ ...form, produto: e.target.value })}
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm"
              >
                <option value="credito_habitacao">Crédito habitação</option>
                <option value="credito_pessoal">Crédito pessoal</option>
                <option value="credito_auto">Crédito auto</option>
                <option value="seguro_auto">Seguro auto</option>
                <option value="seguro_vida">Seguro vida</option>
                <option value="seguro_habitacao">Seguro habitação</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-400">Consultor</label>
              <select
                value={form.consultor_id}
                onChange={(e) => setForm({ ...form, consultor_id: e.target.value })}
                className="w-full rounded-xl border border-ink-100 px-3 py-2 text-sm"
              >
                <option value="">— Por atribuir —</option>
                {(cons?.consultores || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary" disabled={!form.nome} onClick={create}>
              Criar lead + disparar RGPD
            </button>
            {msg && <p className="text-sm text-ink-700 mt-2">{msg}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink-900 mb-3">
            Leads dormentes (&gt; 30 dias) <span className="chip chip-alert ml-2">{dormentes.length}</span>
          </h2>
          {dormentes.length === 0 ? (
            <p className="text-ink-400 text-sm">Nenhuma lead dormente — bom trabalho.</p>
          ) : (
            <ul className="text-sm divide-y divide-ink-100">
              {dormentes.map((l) => (
                <li key={l.id} className="py-2">
                  <div className="text-ink-900">{l.nome}</div>
                  <div className="text-ink-400 text-xs">
                    {l.produto} · última acção: {l.ultima_acao ? new Date(l.ultima_acao).toLocaleDateString('pt-PT') : '—'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-ink-900 mb-3">Todas as leads</h3>
        {!data?.leads?.length ? (
          <p className="text-ink-400 text-sm">Sem leads ainda.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 border-b border-ink-100">
                <th className="py-2">Nome</th>
                <th className="py-2">Produto</th>
                <th className="py-2">Consultor</th>
                <th className="py-2">Status</th>
                <th className="py-2">Última acção</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((l) => (
                <tr key={l.id} className="border-b border-ink-100/60 last:border-0">
                  <td className="py-2 text-ink-900">{l.nome}</td>
                  <td className="py-2 text-ink-700">{l.produto}</td>
                  <td className="py-2 text-ink-700">{l.consultor_nome || <span className="text-ink-300">— por atribuir —</span>}</td>
                  <td className="py-2"><span className="chip">{l.status}</span></td>
                  <td className="py-2 text-ink-400 text-xs">
                    {l.ultima_acao ? new Date(l.ultima_acao).toLocaleDateString('pt-PT') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../lib/api';

type DataSource = 'live' | 'live_approx' | 'pending_integration' | 'mock';
type Card = {
  key: string;
  label: string;
  value: number;
  intent: string;
  data_source?: DataSource;
  note?: string;
};
type CrmLive = {
  total_clientes: number;
  total_processos?: number;
  total_leads?: number;
  last_sync_clientes_at?: string | null;
  last_sync_clientes_rows?: number | null;
  last_sync_processos_at?: string | null;
  last_sync_processos_rows?: number | null;
  last_sync_leads_at?: string | null;
  last_sync_leads_rows?: number | null;
  source?: string;
};
type KPIs = {
  loja: string;
  as_of: string;
  cards: Card[];
  totais: Record<string, number>;
  crm_live?: CrmLive;
};

const TRIGGER_FOR_CARD: Record<string, string> = {
  aniversarios_7d: 'aniversario',
  escritura_3m: 'escritura_3m',
  escritura_6m: 'escritura_6m',
  escritura_12m: 'escritura_12m',
  apolices_60d: 'apolice_60d',
  taxa_fixa_90d: 'taxa_fixa_90d',
  docs_atraso: 'doc_atraso',
  leads_dormentes: 'lead_dormente',
};

const INTENT_STYLES: Record<string, string> = {
  comemorativo: 'text-rose-600',
  celebracao: 'text-amber-600',
  acompanhamento: 'text-sky-700',
  comercial: 'text-emerald-700',
  alerta: 'text-ds-600',
};

const SOURCE_BADGE: Record<DataSource, { label: string; classes: string }> = {
  live: { label: 'CRM em direto', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  live_approx: { label: 'CRM (aproximação)', classes: 'bg-sky-100 text-sky-800 border-sky-200' },
  pending_integration: { label: 'Aguarda integração', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  mock: { label: 'Demo', classes: 'bg-ink-100 text-ink-700 border-ink-200' },
};

// Per-activity colour for the selected chip (matches card intent colours), so
// the focus colour reflects which activity is active.
const CHIP_ACTIVE: Record<string, string> = {
  aniversario: '!bg-rose-600',
  escritura_3m: '!bg-amber-600',
  escritura_6m: '!bg-amber-600',
  escritura_12m: '!bg-amber-600',
  apolice_60d: '!bg-sky-600',
  taxa_fixa_90d: '!bg-indigo-600',
  doc_atraso: '!bg-ds-600',
  lead_dormente: '!bg-emerald-600',
};

const SEARCH_ACTIVITIES: { key: string; label: string }[] = [
  { key: 'aniversario', label: 'Aniversários' },
  { key: 'escritura_3m', label: 'Escritura 3m' },
  { key: 'escritura_6m', label: 'Escritura 6m' },
  { key: 'escritura_12m', label: 'Escritura 1 ano' },
  { key: 'apolice_60d', label: 'Apólices' },
  { key: 'taxa_fixa_90d', label: 'Taxa fixa' },
  { key: 'doc_atraso', label: 'Docs em atraso' },
  { key: 'lead_dormente', label: 'Reativações' },
];

export default function Dashboard() {
  const { data, error, isLoading } = useSWR<KPIs>('/api/dashboard/kpis', api);
  const router = useRouter();
  const [selAct, setSelAct] = useState<string>('aniversario');
  const [dFrom, setDFrom] = useState('');
  const [dTo, setDTo] = useState('');

  function runSearch() {
    const qp = new URLSearchParams({ type: selAct });
    if (dFrom && dTo) {
      qp.set('from', dFrom);
      qp.set('to', dTo);
    }
    router.push(`/triggers?${qp.toString()}`);
  }

  if (error) return <p className="text-ds-700">Erro a carregar KPIs: {String(error.message)}</p>;
  if (isLoading || !data) return <p className="text-ink-400">A carregar dashboard …</p>;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-ink-400 mt-1">
          Bom dia, equipa · {data.loja} · dados de {new Date(data.as_of).toLocaleDateString('pt-PT')}
        </p>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-ink-900">Pesquisar por datas e atividade</h2>
          <span className="text-xs text-ink-400">
            Escolha uma atividade e, se quiser, um intervalo — sem intervalo usa a janela padrão.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEARCH_ACTIVITIES.map((a) => (
            <button
              key={a.key}
              onClick={() => setSelAct(a.key)}
              className={`chip ${selAct === a.key ? `${CHIP_ACTIVE[a.key] ?? '!bg-ink-900'} !text-white !font-semibold` : ''}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink-400">
            De
            <input type="date" value={dFrom} onChange={(e) => setDFrom(e.target.value)}
              className="block mt-1 rounded-md border border-ink-200 px-2 py-1.5 text-sm text-ink-900" />
          </label>
          <label className="text-xs text-ink-400">
            Até
            <input type="date" value={dTo} onChange={(e) => setDTo(e.target.value)}
              className="block mt-1 rounded-md border border-ink-200 px-2 py-1.5 text-sm text-ink-900" />
          </label>
          <button className="btn-primary" onClick={runSearch}>Pesquisar →</button>
        </div>
      </section>

      {data.crm_live && data.crm_live.total_clientes > 0 && (
        <Link
          href="/clientes-live"
          className="block rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-4 hover:bg-emerald-100 hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-900">Ligação ao CRM em direto</span>
              </div>
              <div className="mt-1 text-xs text-emerald-800">
                {data.crm_live.source ?? 'CrediDesk'} · clientes sincronizados{' '}
                {data.crm_live.last_sync_clientes_at
                  ? new Date(data.crm_live.last_sync_clientes_at).toLocaleString('pt-PT')
                  : '—'}
                {data.crm_live.total_processos != null && (
                  <>
                    {' · processos sincronizados '}
                    {data.crm_live.last_sync_processos_at
                      ? new Date(data.crm_live.last_sync_processos_at).toLocaleString('pt-PT')
                      : '—'}
                  </>
                )}
              </div>
              <div className="mt-2 text-xs text-emerald-700 font-medium">Clique para ver a lista completa →</div>
            </div>
            <div className="text-right flex gap-6">
              <div>
                <div className="text-3xl font-semibold text-emerald-900">
                  {data.crm_live.total_clientes.toLocaleString('pt-PT')}
                </div>
                <div className="text-xs text-emerald-800">clientes</div>
              </div>
              {data.crm_live.total_processos != null && (
                <div>
                  <div className="text-3xl font-semibold text-emerald-900">
                    {data.crm_live.total_processos.toLocaleString('pt-PT')}
                  </div>
                  <div className="text-xs text-emerald-800">processos</div>
                </div>
              )}
              {data.crm_live.total_leads != null && (
                <div>
                  <div className="text-3xl font-semibold text-emerald-900">
                    {data.crm_live.total_leads.toLocaleString('pt-PT')}
                  </div>
                  <div className="text-xs text-emerald-800">leads</div>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.cards.map((c) => {
          const trigger = TRIGGER_FOR_CARD[c.key];
          const source = c.data_source ?? 'mock';
          const badge = SOURCE_BADGE[source];
          const isPending = source === 'pending_integration';
          const inner = (
            <div
              className={`card hover:shadow-lg transition-shadow cursor-pointer h-full ${
                isPending ? 'opacity-70' : ''
              }`}
              title={c.note ?? ''}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-ink-400">{c.label}</div>
                <span
                  className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${badge.classes}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className={`mt-3 text-3xl font-semibold ${INTENT_STYLES[c.intent] ?? 'text-ink-900'}`}>
                {c.value}
              </div>
              {trigger && !isPending && (
                <div className="mt-3 text-xs text-ink-400">Clique para abrir os contactos →</div>
              )}
              {isPending && c.note && (
                <div className="mt-3 text-[11px] text-amber-700 italic">{c.note}</div>
              )}
            </div>
          );
          return trigger && !isPending ? (
            <Link key={c.key} href={`/triggers?type=${trigger}`}>{inner}</Link>
          ) : (
            <div key={c.key}>{inner}</div>
          );
        })}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.totais).map(([k, v]) => (
          <div key={k} className="card">
            <div className="text-sm text-ink-400 capitalize">{k.replaceAll('_', ' ')}</div>
            <div className="mt-2 text-xl font-semibold text-ink-900">{v}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-ink-900">Próximos passos sugeridos</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          <li>· Disparar parabéns aos {data.cards.find(c=>c.key==='aniversarios_7d')?.value ?? 0} clientes que fazem anos esta semana.</li>
          <li>· Acompanhar {data.cards.find(c=>c.key==='escritura_3m')?.value ?? 0} clientes que celebram 3 meses de escritura.</li>
          <li>· Antecipar renovação de {data.cards.find(c=>c.key==='apolices_60d')?.value ?? 0} apólices nos próximos 60 dias.</li>
          <li>· Rever condições com {data.cards.find(c=>c.key==='taxa_fixa_90d')?.value ?? 0} clientes cujo período de taxa fixa termina em 90 dias.</li>
          <li>· Resolver {data.cards.find(c=>c.key==='docs_atraso')?.value ?? 0} processos com documentação pendente há mais de 7 dias.</li>
          <li>· Reactivar {data.cards.find(c=>c.key==='leads_dormentes')?.value ?? 0} leads pendentes há mais de 30 dias.</li>
        </ul>
      </section>
    </div>
  );
}

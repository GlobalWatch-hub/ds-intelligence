'use client';
import { useState } from 'react';
import { api } from '../lib/api';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGESTOES = [
  'Quem faz anos esta semana?',
  'Quais apólices vencem nos próximos 60 dias?',
  'Que leads estão paradas há mais de 30 dias?',
  'Quantos processos têm documentos em falta?',
];

export default function ChatDock() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function ask(text: string) {
    if (!text.trim()) return;
    const newHist: Msg[] = [...history, { role: 'user', content: text }];
    setHistory(newHist);
    setInput('');
    setPending(true);
    try {
      const r = await api<{ reply: string }>('/api/chat/ask', {
        method: 'POST',
        body: JSON.stringify({ message: text, history: newHist }),
      });
      setHistory([...newHist, { role: 'assistant', content: r.reply }]);
    } catch (e: any) {
      setHistory([...newHist, { role: 'assistant', content: `Erro: ${e.message}` }]);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        className="fixed bottom-6 right-6 btn-primary shadow-lg z-40"
        onClick={() => setOpen(true)}
      >
        Pergunte à Ana
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] max-w-[92vw] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col z-40 border border-ink-100">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <div>
          <div className="font-semibold text-ink-900">Ana</div>
          <div className="text-xs text-ink-400">Assistente DS Matrix</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ds-600">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {history.length === 0 && (
          <div className="space-y-3">
            <p className="text-ink-700">
              Olá! Pode perguntar-me em linguagem natural sobre os seus clientes, processos e apólices.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => ask(s)} className="chip text-left">{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user'
              ? 'ml-8 bg-ds-50 text-ink-900 rounded-2xl px-3 py-2'
              : 'mr-8 bg-ink-50 text-ink-900 rounded-2xl px-3 py-2 whitespace-pre-wrap'}
          >
            {m.content}
          </div>
        ))}
        {pending && <div className="text-ink-400 text-xs">A pensar …</div>}
      </div>

      <div className="border-t border-ink-100 p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(input); }}
          placeholder="Pergunte alguma coisa …"
          className="flex-1 rounded-xl border border-ink-100 px-3 py-2 text-sm"
        />
        <button className="btn-primary" onClick={() => ask(input)} disabled={pending}>
          Enviar
        </button>
      </div>
    </div>
  );
}

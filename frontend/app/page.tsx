'use client';
import Link from 'next/link';

const QUICK: { href: string; title: string; desc: string }[] = [
  { href: '/contactos', title: 'Contactos', desc: 'Lista e gestão de contactos' },
  { href: '/leads', title: 'Leads', desc: 'Captação e reativação' },
  { href: '/newsletter', title: 'Newsletter', desc: 'Comunicação aos clientes' },
  { href: '/recap', title: 'Recap semanal', desc: 'Resumo para coordenadores' },
];

export default function Welcome() {
  return (
    <div className="min-h-[68vh] flex flex-col items-center justify-center text-center py-10">
      <div className="flex items-center justify-center mb-8">
        <img src="/ds-logo.svg" alt="DS Crédito" className="h-16 w-16" />
      </div>

      <h1 className="text-3xl md:text-4xl font-semibold text-ink-900">
        Bem-vindo à DS Intelligence
      </h1>
      <p className="mt-4 max-w-2xl text-ink-500 text-lg leading-relaxed">
        A plataforma de inteligência comercial da{' '}
        <strong className="text-ink-700">DS Crédito</strong> — clientes, processos, gatilhos do
        ciclo de vida e newsletters, tudo num só sítio.
      </p>

      <div className="mt-8 flex items-center gap-3 flex-wrap justify-center">
        <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
          Entrar no Dashboard →
        </Link>
        <Link href="/clientes-live" className="btn-ghost text-base px-6 py-3 inline-flex items-center">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
          CRM em direto
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="card hover:shadow-lg transition-shadow text-left"
          >
            <div className="text-sm font-medium text-ink-900">{q.title}</div>
            <div className="text-xs text-ink-400 mt-1">{q.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';

type Card = { href: string; title: string; desc: string; color: string; icon: React.ReactNode };

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-9 w-9" aria-hidden="true">
      {children}
    </svg>
  );
}

const CARDS: Card[] = [
  {
    href: '/contactos',
    title: 'Contactos',
    desc: 'Lista e gestão de contactos',
    color: '#7c3aed',
    icon: (
      <Svg>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </Svg>
    ),
  },
  {
    href: '/leads',
    title: 'Leads',
    desc: 'Captação e reativação',
    color: '#3b6cf0',
    icon: (
      <Svg>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
      </Svg>
    ),
  },
  {
    href: '/newsletter',
    title: 'Newsletter',
    desc: 'Comunicação aos clientes',
    color: '#14b8a6',
    icon: (
      <Svg>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </Svg>
    ),
  },
  {
    href: '/recap',
    title: 'Recap semanal',
    desc: 'Resumo para coordenadores',
    color: '#6366f1',
    icon: (
      <Svg>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </Svg>
    ),
  },
];

export default function Welcome() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center py-8">
      <h1 className="text-3xl md:text-4xl font-semibold text-ink-900">
        Bem-vindo à DS Intelligence
      </h1>

      <div className="mt-8 flex justify-center">
        <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
          Entrar no Dashboard →
        </Link>
      </div>

      {/* Quick-access cards — brand "Nossas Soluções" style */}
      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-6xl mx-auto">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group block text-left rounded-2xl shadow-card bg-white/40 backdrop-blur-sm p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:bg-white/60"
          >
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: `${c.color}1f`, color: c.color }}
            >
              {c.icon}
            </div>
            <div className="text-xl font-semibold text-ink-900">{c.title}</div>
            <div className="text-sm text-ink-400 mt-2">{c.desc}</div>
            <div
              className="mt-6 inline-flex items-center text-sm font-medium transition-transform group-hover:translate-x-1"
              style={{ color: c.color }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';

const QUICK: { href: string; title: string; desc: string }[] = [
  { href: '/contactos', title: 'Contactos', desc: 'Lista e gestão de contactos' },
  { href: '/leads', title: 'Leads', desc: 'Captação e reativação' },
  { href: '/newsletter', title: 'Newsletter', desc: 'Comunicação aos clientes' },
  { href: '/recap', title: 'Recap semanal', desc: 'Resumo para coordenadores' },
];

const SPIN_SECONDS = 28;
const RADIUS = 150; // px from the centre of the ring to each card

export default function Welcome() {
  // The ring spins until a card is clicked; it also pauses while hovered so a
  // card can be read and clicked.
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const running = !stopped && !hovered;
  const playState = running ? 'running' : 'paused';

  return (
    <div className="py-6 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold text-ink-900">
        Bem-vindo à DS Intelligence
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-ink-500 text-lg leading-relaxed">
        A plataforma de inteligência comercial da{' '}
        <strong className="text-ink-700">DS Crédito</strong> — clientes, processos, gatilhos do
        ciclo de vida e newsletters, tudo num só sítio.
      </p>

      <div className="mt-6 flex justify-center">
        <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
          Entrar no Dashboard →
        </Link>
      </div>

      {/* Orbiting quick-access cards */}
      <div
        className="relative mx-auto mt-8 h-[460px] w-[500px] max-w-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="absolute inset-0"
          style={{ animation: `orbit ${SPIN_SECONDS}s linear infinite`, animationPlayState: playState }}
        >
          {QUICK.map((q, i) => {
            const angle = (360 / QUICK.length) * i;
            return (
              <div
                key={q.href}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}px) rotate(${-angle}deg)` }}
              >
                <Link
                  href={q.href}
                  onClick={() => setStopped(true)}
                  className="card block w-48 text-left transition-transform duration-200 hover:scale-105 hover:shadow-xl"
                  style={{ animation: `orbit-rev ${SPIN_SECONDS}s linear infinite`, animationPlayState: playState }}
                >
                  <div className="text-base font-semibold text-ink-900">{q.title}</div>
                  <div className="text-sm text-ink-400 mt-1">{q.desc}</div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* DS mark at the centre of the ring */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img src="/ds-logo.svg" alt="DS Crédito" className="h-16 w-16 opacity-90" />
        </div>
      </div>
    </div>
  );
}

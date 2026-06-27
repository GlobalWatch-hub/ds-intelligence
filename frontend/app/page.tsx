import Link from 'next/link';
import {
  BrandCard,
  IconContacts,
  IconDashboard,
  IconLeads,
  IconNewsletter,
  IconReport,
} from '@globalwatch-hub/synertia-ui';

const CARDS = [
  {
    href: '/contactos',
    title: 'Contactos dos consultores',
    desc: 'Centralize e gira as carteiras de contactos da equipa. Permite automatizar réguas de comunicação e mensagens de acompanhamento regulares em nome de cada consultor.',
    color: '#7c3aed',
    icon: <IconContacts className="h-9 w-9" />,
  },
  {
    href: '/dashboard',
    title: 'Dashboard',
    desc: 'Monitorize a atividade global da agência em tempo real. Acompanhe a sincronização com o CRM, pesquise datas-chave e consulte alertas urgentes de prazos e aniversários.',
    color: '#a91b60',
    icon: <IconDashboard className="h-9 w-9" />,
  },
  {
    href: '/leads',
    title: 'Leads',
    desc: 'Faça a gestão de novas oportunidades e recupere leads dormentes. O sistema automatiza o envio do consentimento de RGPD e faz o pedido inicial da documentação necessária.',
    color: '#3b6cf0',
    icon: <IconLeads className="h-9 w-9" />,
  },
  {
    href: '/newsletter',
    title: 'Newsletter',
    desc: 'Gere conteúdos de literacia financeira com o apoio de Inteligência Artificial. Escolha um tema de mercado ou faça o upload de um ficheiro para envio rápido via WhatsApp.',
    color: '#14b8a6',
    icon: <IconNewsletter className="h-9 w-9" />,
  },
  {
    href: '/recap',
    title: 'Recap semanal — coordenadores',
    desc: 'Análise de desempenho e métricas financeiras da semana. Monitorize os contratos celebrados, os novos processos criados e o volume total do pipeline distribuído por fases.',
    color: '#6366f1',
    icon: <IconReport className="h-9 w-9" />,
  },
];

export default function Welcome() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center py-8">
      <img src="/ds-logo.svg" alt="DS Crédito" className="h-20 w-20 mb-6" />
      <h1 className="text-3xl md:text-4xl font-semibold text-ink-900">
        Bem-vindo à DS Matrix
      </h1>

      <div className="mt-8 flex justify-center">
        <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
          Entrar no Dashboard →
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {CARDS.map((c) => (
          <BrandCard key={c.href} href={c.href} title={c.title} desc={c.desc} color={c.color} icon={c.icon} />
        ))}
      </div>
    </div>
  );
}

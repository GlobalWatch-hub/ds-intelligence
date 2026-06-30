'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  SynertiaShell,
  type SynertiaConfig,
  IconContacts,
  IconDashboard,
  IconLeads,
  IconNewsletter,
  IconReport,
  VERSION as UI_VERSION,
} from '@globalwatch-hub/synertia-ui';
import ChatDock from './ChatDock';
import UserFooter from './UserFooter';

// Versão: [plataforma].[pacote UI] build [git]. A plataforma está na v1; o git
// sha é injetado no build (NEXT_PUBLIC_BUILD_SHA, ver deploy.sh).
const BUILD_SHA = (process.env.NEXT_PUBLIC_BUILD_SHA ?? '').slice(0, 7);
const VERSION_LABEL = `1.${UI_VERSION}${BUILD_SHA ? ` build ${BUILD_SHA}` : ''}`;

// DS Matrix client tokens for the shared Synertia chrome. Only these change per
// platform; the navy chrome (responsive drawer + collapsible rail) lives in
// @globalwatch-hub/synertia-ui (>= 0.2.0).
const config: SynertiaConfig = {
  brandLogoSrc: '/logo-synertia.png',
  brandMarkSrc: '/logo-synertia-icon.png',
  clientLogoSrc: '/ds-logo.svg',
  productName: 'DS Matrix',
  clientName: 'DS Crédito Ramada',
  accent: '#a91b60',
  nav: [
    { href: '/contactos', label: 'Contactos', icon: <IconContacts /> },
    { href: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    { href: '/leads', label: 'Leads', icon: <IconLeads /> },
    { href: '/newsletter', label: 'Newsletter', icon: <IconNewsletter /> },
    { href: '/recap', label: 'Recap semanal', icon: <IconReport /> },
  ],
  liveLink: { href: '/clientes-live', label: 'CRM em direto' },
  fullWidthRoutes: ['/dashboard'],
};

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Nome da loja (configurável na tab Loja) escreve no cabeçalho; cai no default
  // do config enquanto não carrega.
  const [lojaNome, setLojaNome] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/settings/loja')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.nome) setLojaNome(d.nome); })
      .catch(() => {});
  }, []);
  const cfg: SynertiaConfig = { ...config, clientName: lojaNome ?? config.clientName };
  return (
    <>
      <SynertiaShell
        config={cfg}
        brandSlot={
          <span className="inline-block rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-white/70 shadow-sm">
            {VERSION_LABEL}
          </span>
        }
        userSlot={<UserFooter />}
      >
        {children}
      </SynertiaShell>
      {pathname !== '/login' && <ChatDock />}
    </>
  );
}

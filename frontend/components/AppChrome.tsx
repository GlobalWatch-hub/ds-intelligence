'use client';
import { usePathname } from 'next/navigation';
import {
  type SynertiaConfig,
  IconContacts,
  IconDashboard,
  IconLeads,
  IconNewsletter,
  IconReport,
} from '@globalwatch-hub/synertia-ui';
import { SynertiaShellResponsive } from './SynertiaShellResponsive';
import ChatDock from './ChatDock';
import LogoutButton from './LogoutButton';

// DS Matrix client tokens for the shared Synertia chrome. Only these change per
// platform; the navy chrome itself lives in @globalwatch-hub/synertia-ui.
const config: SynertiaConfig = {
  brandLogoSrc: '/logo-synertia.png',
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
};

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <SynertiaShellResponsive
        config={config}
        brandMarkSrc="/logo-synertia-icon.png"
        userSlot={<LogoutButton />}
      >
        {children}
      </SynertiaShellResponsive>
      {pathname !== '/login' && <ChatDock />}
    </>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChatDock from './ChatDock';
import LogoutButton from './LogoutButton';

// Primary navigation shown in the vertical Synertia sidebar.
const NAV = [
  { href: '/contactos', label: 'Contactos' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/recap', label: 'Recap semanal' },
];

// Synertia brand navy.
const SYNERTIA_NAVY = '#0d132a';

// The login screen is shown bare (no nav, no chat dock); every other page gets
// the full chrome.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>;
  }

  // The dashboard spans the full content width; every other page keeps the
  // centred 7xl column.
  const fullWidth = pathname === '/dashboard';

  return (
    <>
      {/* Vertical Synertia sidebar: brand logo on top, nav stacked, user at the
          bottom. The Synertia logo's navy background blends into the bar. */}
      <aside
        className="fixed inset-y-0 left-0 w-60 z-30 flex flex-col text-white"
        style={{ backgroundColor: SYNERTIA_NAVY }}
      >
        <div className="px-5 py-5">
          <Link href="/" aria-label="Synertia" className="inline-flex">
            <img src="/logo-synertia.png" alt="Synertia" className="h-8 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/clientes-live"
            className="mt-2 rounded-lg px-3 py-2 inline-flex items-center font-medium text-emerald-300 hover:text-emerald-200 hover:bg-white/10"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
            CRM em direto
          </Link>
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <LogoutButton />
        </div>
      </aside>

      {/* Content area, offset by the sidebar. Top header carries the centred DS
          logo. */}
      <div className="ml-60">
        <header className="sticky top-0 z-20 bg-white border-b border-ink-100">
          <div className="h-16 flex items-center justify-center px-6">
            <Link href="/" aria-label="DS Crédito" className="inline-flex">
              <img src="/ds-logo.svg" alt="DS Crédito" className="h-10 w-10" />
            </Link>
          </div>
        </header>
        <main className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-6 py-8`}>{children}</main>
      </div>

      <ChatDock />
    </>
  );
}

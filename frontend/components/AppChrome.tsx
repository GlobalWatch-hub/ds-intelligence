'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChatDock from './ChatDock';
import LogoutButton from './LogoutButton';

// Primary navigation shown in the Synertia top bar.
const NAV = [
  { href: '/contactos', label: 'Contactos' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/recap', label: 'Recap semanal' },
];

// Synertia brand navy — matches the footer for a cohesive chrome.
const SYNERTIA_NAVY = '#0d132a';

// The login screen is shown bare (no nav, no chat dock); every other page gets
// the full chrome.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>;
  }

  // The dashboard spans the full screen width; every other page keeps the
  // centred 7xl column.
  const fullWidth = pathname === '/dashboard';

  return (
    <>
      {/* Synertia-branded top bar: brand logo + nav on the left, DS logo dead
          centre, live-CRM + user on the right. */}
      <header
        className="sticky top-0 z-30 text-white shadow-sm"
        style={{ backgroundColor: SYNERTIA_NAVY }}
      >
        <div className="relative px-6 h-16 flex items-center">
          {/* left: Synertia logo + primary nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex items-center shrink-0" aria-label="Synertia">
              <img src="/logo-synertia.png" alt="Synertia" className="h-7 w-auto" />
            </Link>
            <nav className="hidden lg:flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      active
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* centre: DS logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center"
            aria-label="DS Crédito"
          >
            <img src="/ds-logo.svg" alt="DS Crédito" className="h-10 w-10" />
          </Link>

          {/* right: live CRM + user */}
          <div className="ml-auto flex items-center gap-4 text-sm shrink-0">
            <Link
              href="/clientes-live"
              className="hidden md:inline-flex items-center text-emerald-300 hover:text-emerald-200 font-medium"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              CRM em direto
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-6 py-8`}>{children}</main>
      <ChatDock />
    </>
  );
}

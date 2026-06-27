'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ChatDock from './ChatDock';
import LogoutButton from './LogoutButton';

// Synertia brand navy.
const SYNERTIA_NAVY = '#0d132a';

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  contactos: (
    <Svg>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </Svg>
  ),
  dashboard: (
    <Svg>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </Svg>
  ),
  leads: (
    <Svg>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </Svg>
  ),
  newsletter: (
    <Svg>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </Svg>
  ),
  recap: (
    <Svg>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </Svg>
  ),
};

const NAV = [
  { href: '/contactos', label: 'Contactos', icon: 'contactos' },
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/leads', label: 'Leads', icon: 'leads' },
  { href: '/newsletter', label: 'Newsletter', icon: 'newsletter' },
  { href: '/recap', label: 'Recap semanal', icon: 'recap' },
];

// The login screen is shown bare (no nav, no chat dock); every other page gets
// the full chrome.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>;
  }

  // The dashboard spans the full content width; every other page keeps the
  // centred 7xl column.
  const fullWidth = pathname === '/dashboard';

  return (
    <>
      {/* Vertical Synertia sidebar (Fasto-style): brand logo on top, icon+label
          nav, user at the bottom. The Synertia logo's navy blends into the bar. */}
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {ICONS[item.icon]}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/clientes-live"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-emerald-300 hover:text-emerald-200 hover:bg-white/10"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span>CRM em direto</span>
          </Link>
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <LogoutButton />
        </div>
      </aside>

      {/* Content area, offset by the sidebar. Top header carries only the
          centred DS logo — pure chrome, never duplicates page content. */}
      <div className="ml-60">
        <header className="sticky top-0 z-20 bg-white border-b border-ink-100">
          <div className="relative h-16 flex items-center justify-center px-6">
            {pathname !== '/' && (
              <button
                onClick={() => router.back()}
                aria-label="Voltar"
                className="absolute left-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-500 hover:text-ds-600 hover:bg-ink-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Voltar
              </button>
            )}
            <Link href="/" aria-label="DS Intelligence" className="flex items-center gap-3">
              <img src="/ds-logo.svg" alt="DS Crédito" className="h-10 w-10" />
              <span className="font-semibold text-ink-900">
                DS Intelligence
                <span className="ml-2 text-ink-400 font-normal">· DS Crédito Ramada</span>
              </span>
            </Link>
          </div>
        </header>
        <main className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-6 py-8`}>{children}</main>
      </div>

      <ChatDock />
    </>
  );
}

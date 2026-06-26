'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChatDock from './ChatDock';
import LogoutButton from './LogoutButton';

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
      <header className="bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/ds-logo.png" alt="DS Intermediários de Crédito" className="h-10 w-10" />
            <span className="font-semibold text-ink-900">
              DS Intelligence
              <span className="ml-2 text-ink-400 font-normal">· DS Crédito Ramada</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/contactos" className="text-ink-700 hover:text-ds-600">Contactos</Link>
            <Link href="/dashboard" className="text-ink-700 hover:text-ds-600">Dashboard</Link>
            <Link href="/leads" className="text-ink-700 hover:text-ds-600">Leads</Link>
            <Link href="/newsletter" className="text-ink-700 hover:text-ds-600">Newsletter</Link>
            <Link href="/recap" className="text-ink-700 hover:text-ds-600">Recap semanal</Link>
            <Link href="/clientes-live" className="text-emerald-700 hover:text-emerald-900 font-medium">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              CRM em direto
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-6 py-8 pb-28`}>{children}</main>
      {/* Footer is fixed to the viewport bottom so it stays in the same place on
          every page (never reflows with the content). */}
      <footer
        className="fixed bottom-0 inset-x-0 z-30 py-6 flex items-center justify-center gap-2 text-sm text-white/60"
        style={{ backgroundColor: '#0d132a' }}
      >
        <span>Powered by</span>
        <img src="/logo-synertia.png" alt="Synertia" className="h-5 w-auto" />
      </footer>
      <ChatDock />
    </>
  );
}

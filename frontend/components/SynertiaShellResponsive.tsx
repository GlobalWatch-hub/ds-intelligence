'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { IconChevronLeft, type SynertiaConfig } from '@globalwatch-hub/synertia-ui';

const NAVY = '#0d132a';

// Estado do rail recolhido, exposto aos filhos do shell (ex.: o userSlot, que é
// passado como prop mas renderiza dentro do provider). Aplica-se sempre com gate
// `lg:` — abaixo disso a sidebar é um drawer e mostra tudo.
const SidebarCollapseContext = createContext(false);
/** True quando a sidebar está recolhida (rail). Usar com classes `lg:`. */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapseContext);
}

/**
 * Versão responsiva e recolhível do Synertia chrome para o DS Matrix.
 * Fork local (UI-only) do `SynertiaShell` do pacote, com:
 *  - drawer em mobile/tablet (hambúrguer no header, backdrop, fecha ao navegar);
 *  - rail recolhível em desktop (só ícones, "S" centrado), persistido;
 *  - clicar no conteúdo (desktop) recolhe a sidebar.
 * Mantém a API e o visual do pacote (mesma config/ícones).
 */
export function SynertiaShellResponsive({
  config,
  userSlot,
  brandMarkSrc,
  children,
}: {
  config: SynertiaConfig;
  userSlot?: ReactNode;
  /** Marca compacta "S" mostrada no rail (fallback para o logo completo). */
  brandMarkSrc?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const home = config.homeHref ?? '/';
  const bare = config.bareRoutes ?? ['/login'];

  // Drawer mobile.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Rail recolhido (só desktop). Persistido; arranca expandido para evitar
  // mismatch de hidratação (lê-se o valor real no efeito, já no cliente).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('synertia-sidebar-collapsed') === '1');
    } catch {}
  }, []);
  const setCollapsedPersisted = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem('synertia-sidebar-collapsed', next ? '1' : '0');
    } catch {}
  };
  const toggleCollapsed = () => setCollapsedPersisted(!collapsed);
  // Clicar no conteúdo (desktop) recolhe a sidebar expandida.
  const collapseOnContentClick = () => {
    if (collapsed) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsedPersisted(true);
    }
  };

  if (bare.includes(pathname)) {
    return <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>;
  }

  const fullWidth = pathname === '/dashboard';
  const rootStyle = { ['--accent' as any]: config.accent } as CSSProperties;

  return (
    <SidebarCollapseContext.Provider value={collapsed}>
      <div style={rootStyle}>
        {/* Backdrop do drawer mobile. */}
        {mobileOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 w-60 z-40 flex flex-col text-white transition-all duration-200 lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } ${collapsed ? 'lg:w-16' : 'lg:w-60'}`}
          style={{ backgroundColor: NAVY }}
        >
          <div
            className={`flex items-center gap-2 px-5 py-5 ${
              collapsed ? 'lg:flex-col lg:gap-3 lg:px-0' : ''
            }`}
          >
            <Link
              href={home}
              aria-label="Synertia"
              className={`inline-flex ${collapsed ? 'lg:justify-center' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.brandLogoSrc}
                alt="Synertia"
                className={`h-8 w-auto ${collapsed ? 'lg:hidden' : ''}`}
              />
              {collapsed && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandMarkSrc ?? config.brandLogoSrc}
                  alt="Synertia"
                  className="hidden h-8 w-8 object-contain lg:block"
                />
              )}
            </Link>
            {/* Botão recolher/expandir — só desktop. */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className={`hidden lg:inline-flex items-center justify-center rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 ${
                collapsed ? 'lg:ml-0' : 'ml-auto'
              }`}
            >
              <span className={`inline-flex transition-transform ${collapsed ? 'rotate-180' : ''}`}>
                <IconChevronLeft />
              </span>
            </button>
          </div>

          <nav className="flex-1 px-3 py-2 flex flex-col gap-1 text-sm">
            {config.nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    collapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    active
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span className={collapsed ? 'lg:hidden' : undefined}>{item.label}</span>
                </Link>
              );
            })}
            {config.liveLink && (
              <Link
                href={config.liveLink.href}
                title={collapsed ? config.liveLink.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-emerald-300 hover:text-emerald-200 hover:bg-white/10 ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center shrink-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <span className={collapsed ? 'lg:hidden' : undefined}>{config.liveLink.label}</span>
              </Link>
            )}
          </nav>

          {userSlot && (
            <div
              className={`px-3 py-3 border-t border-white/10 ${
                collapsed ? 'lg:overflow-hidden lg:px-1.5' : ''
              }`}
            >
              {userSlot}
            </div>
          )}
        </aside>

        <div className={`transition-all duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <header className="sticky top-0 z-20 bg-white border-b border-ink-100">
            <div className="relative h-16 flex items-center justify-center gap-2 px-4 sm:px-6">
              <div className="absolute left-2 sm:left-4 flex items-center gap-1">
                {/* Hambúrguer — só mobile/tablet. */}
                <button
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label="Abrir menu"
                  aria-expanded={mobileOpen}
                  className="inline-flex items-center justify-center rounded-lg border border-ink-100 bg-white p-2 text-ink-900 shadow-sm hover:bg-ink-50 lg:hidden"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                {pathname !== home && (
                  <button
                    onClick={() => router.back()}
                    aria-label="Voltar"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-500 hover:bg-ink-50"
                  >
                    <IconChevronLeft />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                )}
              </div>
              <Link href={home} aria-label={config.productName} className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.clientLogoSrc} alt={config.clientName} className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0" />
                <span className="text-lg sm:text-2xl font-semibold text-ink-900 truncate">
                  {config.productName}
                  <span className="ml-2 text-base text-ink-400 font-normal">· {config.clientName}</span>
                </span>
              </Link>
            </div>
          </header>
          <main
            onClick={collapseOnContentClick}
            className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-4 py-6 sm:px-6 sm:py-8`}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapseContext.Provider>
  );
}

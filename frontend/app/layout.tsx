import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import AppChrome from '../components/AppChrome';

// Synertia brand typeface.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DS Matrix — DS Crédito Ramada',
  description: 'Plataforma de Inteligência Comercial para DS Crédito + DS Seguros',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={montserrat.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

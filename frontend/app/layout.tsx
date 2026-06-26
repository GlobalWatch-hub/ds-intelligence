import './globals.css';
import type { Metadata } from 'next';
import AppChrome from '../components/AppChrome';

export const metadata: Metadata = {
  title: 'DS Intelligence — DS Crédito Ramada',
  description: 'Plataforma de Inteligência Comercial para DS Crédito + DS Seguros',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen font-sans antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

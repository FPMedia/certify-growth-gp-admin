import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';
import { getWebUrl } from '@/lib/web-url';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Growth Predictor Admin',
  description: 'Platform administration console',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn('min-h-screen font-sans', inter.variable)}>
        <AuthProvider>
          <AdminShell webUrl={getWebUrl()}>{children}</AdminShell>
        </AuthProvider>
      </body>
    </html>
  );
}

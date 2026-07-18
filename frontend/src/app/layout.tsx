import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'FITO6 ERP — Gym Management',
  description: 'Gym management, accounts, and cashbook for FITO6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-[14px]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

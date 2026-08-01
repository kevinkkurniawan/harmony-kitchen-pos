import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Harmony Kitchenware POS',
  description: 'Sistem POS Web-Based Harmony Kitchenware',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}

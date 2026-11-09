import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Harmony Kitchenware POS',
  description: 'Sistem POS Web-Based Harmony Kitchenware',
  manifest: '/manifest.json',
  // Chrome's auto-translate rewrote the cashier screen and printed receipts in English
  other: { google: 'notranslate' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" translate="no" className="notranslate">
      <body className="antialiased bg-slate-950 text-slate-100">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js?v=2').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-slate-950 text-white flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-md">
          <h2 className="text-lg font-bold text-rose-400 mb-2">Terjadi Kesalahan Sistem</h2>
          <p className="text-xs text-slate-400 mb-4">{error.message || 'Sistem POS membutuhkan muat ulang.'}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all"
          >
            Muat Ulang POS
          </button>
        </div>
      </body>
    </html>
  );
}

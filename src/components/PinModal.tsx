'use client';

import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  isDark: boolean;
  title: string;
  onClose: () => void;
  /** Called with the PIN once the server accepts it */
  onSuccess: (pin: string) => void;
}

// Shared PIN prompt (legacy POS passcode) for Override Grosir 1 and manual discounts
export default function PinModal({ isOpen, isDark, title, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setPin('');
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!pin.trim() || isChecking) return;
    setIsChecking(true);
    setError('');
    try {
      const res = await fetch('/api/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const accepted = pin;
        setPin('');
        onSuccess(accepted);
      } else {
        setError(res.status === 401 ? 'Sesi kasir berakhir, silakan login kembali.' : 'PIN salah.');
      }
    } catch {
      setError('Gagal memeriksa PIN, periksa koneksi.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <button onClick={close} className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">PIN Otorisasi</label>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={20}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); }}
            placeholder="Masukkan PIN"
            className={`w-full p-3 rounded-xl font-mono text-center tracking-widest text-lg border outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus:border-amber-500`}
          />
          {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
        </div>
        <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          <button onClick={close} className="cursor-pointer px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-200/60">Batal</button>
          <button
            onClick={submit}
            disabled={!pin.trim() || isChecking}
            className="cursor-pointer px-5 py-2 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
          >
            {isChecking ? 'Memeriksa...' : 'Buka'}
          </button>
        </div>
      </div>
    </div>
  );
}

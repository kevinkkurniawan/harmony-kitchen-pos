'use client';

import React, { useState } from 'react';
import { X, Trash2, ShieldAlert, KeyRound } from 'lucide-react';
import { CartItem } from '@/types/pos';

interface VoidReasonModalProps {
  isOpen: boolean;
  isDark: boolean;
  item: CartItem | null;
  onClose: () => void;
  onConfirmVoid: (item: CartItem, reason: string) => void;
}

const VOID_REASONS = [
  'Salah Input Kasir',
  'Pelanggan Batal Pesan',
  'Stok Kosong / Habis',
  'Kualitas Produk / Komplain',
  'Ganti Menu Lain',
  'Lain-lain',
];

export default function VoidReasonModal({
  isOpen,
  isDark,
  item,
  onClose,
  onConfirmVoid,
}: VoidReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState(VOID_REASONS[0]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    if (pin.trim().length < 4) {
      setError('Masukkan 4 digit PIN Otorisasi Supervisor!');
      return;
    }

    setError('');
    onConfirmVoid(item, selectedReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-500">Otorisasi Pembatalan (Void Item)</h2>
              <p className="text-xs text-slate-400">{item.product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`cursor-pointer p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Alasan Pembatalan (Void Reason)
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className={`cursor-pointer w-full p-3 rounded-xl font-medium border outline-none text-sm transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-rose-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500'
              }`}
            >
              {VOID_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rose-400" /> PIN Otorisasi Supervisor
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN (Default: 1234)"
              className={`w-full p-3 rounded-xl font-mono text-center tracking-widest text-lg border outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-rose-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500'
              }`}
            />
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-end gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={onClose}
            className={`cursor-pointer px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="cursor-pointer px-5 py-2 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-500 transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Batalkan Item (Void)
          </button>
        </div>
      </div>
    </div>
  );
}

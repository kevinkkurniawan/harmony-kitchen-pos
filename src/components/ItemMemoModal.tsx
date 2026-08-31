'use client';

import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { CartItem } from '@/types/pos';

interface ItemMemoModalProps {
  isOpen: boolean;
  isDark: boolean;
  item: CartItem | null;
  onClose: () => void;
  onSaveMemo: (item: CartItem, memo: string) => void;
}

const PRESET_MEMOS = [
  'Ambil di Gudang',
  'Garansi Toko 1 Tahun',
  'Warna Custom',
  'Karton / Box Utuh',
  'Cek Fisik / Mulus',
  'Bubble Wrap Extra',
  'Pengiriman Terpisah',
  'Barang Sample / Display',
];

export default function ItemMemoModal({
  isOpen,
  isDark,
  item,
  onClose,
  onSaveMemo,
}: ItemMemoModalProps) {
  const [memo, setMemo] = useState(item?.memo || '');

  if (!isOpen || !item) return null;

  const handleSave = () => {
    onSaveMemo(item, memo);
    onClose();
  };

  const handleAddPreset = (preset: string) => {
    if (!memo) {
      setMemo(preset);
    } else if (!memo.includes(preset)) {
      setMemo(`${memo}, ${preset}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Catatan Produk / Memo Item</h2>
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
              Catatan Khusus Produk (Product Note)
            </label>
            <textarea
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Contoh: Garansi toko 1 tahun, warna hitam, barang display..."
              className={`w-full p-3 rounded-xl text-sm border outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Pilihan Cepat
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_MEMOS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAddPreset(preset)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-600'
                  }`}
                >
                  + {preset}
                </button>
              ))}
            </div>
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
            onClick={handleSave}
            className="cursor-pointer px-5 py-2 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Simpan Catatan
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { CartItem } from '@/types/pos';

interface ItemDiscountModalProps {
  isDark: boolean;
  item: CartItem;
  onClose: () => void;
  /** Per-pcs potongan in Rupiah, 0 removes it */
  onSave: (discount: number) => void;
}

// Per-item "Potongan" like the legacy POS cart column: Rupiah off each pcs of one line
export default function ItemDiscountModal({ isDark, item, onClose, onSave }: ItemDiscountModalProps) {
  const [value, setValue] = useState(item.discount ? String(item.discount) : '');
  const discount = Math.round(Number(value) || 0);
  const isValid = discount >= 0 && discount <= item.selectedPrice;

  const save = () => {
    if (isValid) onSave(discount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold">Potongan per Barang</h2>
              <p className="text-xs text-slate-400 truncate">{item.product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Harga @pcs</span>
            <span className="font-bold tabular-nums">{item.selectedPrice.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Potongan per pcs (Rp)</label>
            <input
              type="number"
              min={0}
              max={item.selectedPrice}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
              placeholder="0"
              className={`w-full p-3 rounded-xl font-bold text-right text-lg tabular-nums border outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus:border-amber-500`}
            />
            {!isValid && <p className="text-xs text-rose-500 mt-1.5 font-medium">Potongan tidak boleh lebih dari harga barang.</p>}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Jadi @pcs × {item.quantity}</span>
            <span className="font-bold tabular-nums">
              {Math.max(0, item.selectedPrice - discount).toLocaleString('id-ID')} × {item.quantity} = {(Math.max(0, item.selectedPrice - discount) * item.quantity).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
        <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          <button onClick={onClose} className="cursor-pointer px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-200/60">Batal</button>
          <button onClick={save} disabled={!isValid} className="cursor-pointer px-5 py-2 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

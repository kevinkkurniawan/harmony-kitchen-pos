'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { CartItem } from '@/types/pos';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cashierName: string;
  cashPaid: number;
  invoiceNo: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  cart,
  cashierName,
  cashPaid,
  invoiceNo,
}: ReceiptModalProps) {
  if (!isOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalKinds = cart.length;
  const grandTotal = cart.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0);
  const change = Math.max(0, cashPaid - grandTotal);

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('id-ID', {
    month: 'short',
    year: 'numeric',
  });
  const timeStr = currentDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Preview Nota Pembelian</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Receipt View (Matches Thermal Receipt Print Layout) */}
        <div className="p-6 overflow-y-auto font-mono text-sm leading-tight select-none bg-slate-50 flex-1 border-b border-slate-200">
          <div className="bg-white p-6 shadow-xs rounded-xl border border-slate-200 max-w-[320px] mx-auto receipt-paper">
            {/* Header Nota */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-bold text-base tracking-wide uppercase text-slate-900">
                HARMONY KITCHENWARE
              </h2>
              <p className="text-xs text-slate-600 mt-1">Jalan Panglima Sudirman 65</p>
              <p className="text-xs text-slate-600">WA: 0851 7238 4707</p>
            </div>

            {/* Sub Header Nota */}
            <div className="py-2 border-b border-dashed border-slate-400 text-xs flex justify-between text-slate-700">
              <span>{dateStr}</span>
              <span>{timeStr}</span>
              <span>Ksr: {cashierName}</span>
            </div>

            {/* Items Header */}
            <div className="py-2 border-b border-dashed border-slate-400 text-xs font-bold flex justify-between text-slate-800">
              <span>Barang</span>
              <span>Sub Total</span>
            </div>

            {/* Items List */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-2 text-xs">
              {cart.length === 0 ? (
                <div className="text-center py-4 text-slate-400 italic font-sans">
                  (Belum ada item dipilih)
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex justify-between items-start font-medium text-slate-900">
                      <span className="flex-1 pr-2 break-words">
                        {item.quantity} {item.product.name}
                      </span>
                      <span className="whitespace-nowrap font-bold">
                        {(item.selectedPrice * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] pl-4">
                      @ {item.selectedPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary Details */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>{totalKinds} Jenis</span>
                <div className="flex gap-4">
                  <span className="font-bold text-slate-700">Total :</span>
                  <span className="font-bold text-slate-900">
                    {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span></span>
                <div className="flex gap-4">
                  <span className="text-slate-600">Jumlah Bayar :</span>
                  <span className="font-bold text-slate-900">
                    {cashPaid.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span></span>
                <div className="flex gap-4">
                  <span className="text-slate-600">Kembali :</span>
                  <span className="font-bold text-slate-900">
                    {change.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Nota */}
            <div className="pt-4 text-center text-[10px] text-slate-600 space-y-1 font-sans">
              <p className="font-semibold uppercase tracking-wider text-slate-800">
                BARANG YANG SUDAH DIBELI
                <br />
                TIDAK DAPAT DIKEMBALIKAN / DITUKARKAN
              </p>
              <p className="pt-2 text-slate-500 font-mono">
                TERIMA KASIH ATAS KUNJUNGAN ANDA
              </p>
              <p className="text-[9px] text-emerald-600 font-mono">
                linktr.ee/harmonykitchenware
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white flex gap-3 justify-end no-print border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak Nota
          </button>
        </div>
      </div>
    </div>
  );
}

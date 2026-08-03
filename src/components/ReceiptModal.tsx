'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cashierName: string;
  cashPaid: number;
  invoiceNo: string;
  orderType?: string;
  customer?: Customer | null;
  paymentMethod?: string;
  discountAmount?: number;
  notes?: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  cart,
  cashierName,
  cashPaid,
  invoiceNo,
  customer,
  paymentMethod = 'Tunai',
  discountAmount = 0,
}: ReceiptModalProps) {
  if (!isOpen) return null;

  const validCart = cart.filter((item) => !item.isVoided);
  const totalKinds = validCart.length;
  const rawSubtotal = validCart.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0);
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);
  const change = Math.max(0, cashPaid - grandTotal);

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('id-ID', {
    day: '2-digit',
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
            <h3 className="font-semibold text-lg">Preview Nota Pembelian POS</h3>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Thermal Receipt View */}
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
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>No: {invoiceNo || 'INV-LOCAL'}</span>
                <span>{dateStr} {timeStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir: {cashierName}</span>
                <span>Metode: <strong className="uppercase">{paymentMethod}</strong></span>
              </div>
              {customer && (
                <div className="text-blue-600 font-bold">
                  Pelanggan: {customer.name} ({customer.customerType})
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="py-2 border-b border-dashed border-slate-400 text-xs font-bold flex justify-between text-slate-800">
              <span>Barang</span>
              <span>Sub Total</span>
            </div>

            {/* Items List */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-2 text-xs">
              {validCart.length === 0 ? (
                <div className="text-center py-4 text-slate-400 italic font-sans">
                  (Belum ada item)
                </div>
              ) : (
                validCart.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex justify-between items-start font-medium text-slate-900">
                      <span className="flex-1 pr-2 break-words">
                        {item.quantity} {item.product.name}
                      </span>
                      <span className="whitespace-nowrap font-bold">
                        {(item.selectedPrice * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px] pl-4">
                      <span>@ {item.selectedPrice.toLocaleString('id-ID')} ({item.product.uom})</span>
                      <span className="text-[10px] uppercase font-bold text-amber-600">
                        [{item.priceType}]
                      </span>
                    </div>
                    {item.memo && (
                      <div className="text-[11px] text-slate-600 font-sans italic pl-4">
                        * Catatan: {item.memo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Summary Details */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>{totalKinds} Jenis Item</span>
                <div className="flex gap-4">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    {rawSubtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span></span>
                  <div className="flex gap-4">
                    <span>Diskon:</span>
                    <span className="font-bold">
                      - {discountAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span>Total :</span>
                <span className="font-bold text-slate-900 text-sm">
                  {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between">
                <span></span>
                <div className="flex gap-4 text-slate-600">
                  <span>Jumlah Bayar :</span>
                  <span className="font-bold text-slate-900">
                    {cashPaid.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <span></span>
                <div className="flex gap-4 text-slate-600">
                  <span>Kembali :</span>
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
            className="cursor-pointer px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors active:scale-95"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="cursor-pointer px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak Nota Struk
          </button>
        </div>
      </div>
    </div>
  );
}

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
  isConnected?: boolean;
  onPrintText?: (text: string) => void;
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
  isConnected = false,
  onPrintText,
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
    if (isConnected && onPrintText) {
      // Build ESC/POS string
      const ESC = '\x1B';
      const GS = '\x1D';
      const INIT = ESC + '@';
      const BOLD_ON = ESC + 'E' + '\x01';
      const BOLD_OFF = ESC + 'E' + '\x00';
      const CENTER = ESC + 'a' + '\x01';
      const LEFT = ESC + 'a' + '\x00';
      const RIGHT = ESC + 'a' + '\x02';
      const CUT = GS + 'V' + '\x41' + '\x00';
      const KICK_DRAWER = ESC + 'p' + '\x00' + '\x32' + '\x32';
      
      let str = INIT + CENTER + BOLD_ON + 'HARMONY KITCHENWARE\n' + BOLD_OFF;
      str += 'Jalan Panglima Sudirman 65\nWA : 0851 7238 4707\n';
      str += '--------------------------------\n' + LEFT;
      str += `${dateStr} ${timeStr}\nKsr: ${cashierName}\n`;
      str += '--------------------------------\n';
      
      validCart.forEach(item => {
        const lineTotal = Math.round(item.selectedPrice * item.quantity).toLocaleString('en-US');
        str += `${item.product.name}\n`;
        str += `${item.quantity} x ${Math.round(item.selectedPrice).toLocaleString('en-US')}`;
        // Add spaces to right align total
        const leftPart = `${item.quantity} x ${Math.round(item.selectedPrice).toLocaleString('en-US')}`;
        const spaces = Math.max(1, 32 - leftPart.length - lineTotal.length);
        str += ' '.repeat(spaces) + lineTotal + '\n';
        if (item.memo) {
          str += ` * ${item.memo}\n`;
        }
      });
      
      str += '--------------------------------\n';
      str += `Total Jenis : ${totalKinds}\n`;
      
      const totalStr = Math.round(grandTotal).toLocaleString('en-US');
      str += 'Total       : ' + ' '.repeat(Math.max(1, 18 - totalStr.length)) + totalStr + '\n';
      
      if (discountAmount > 0) {
        const discStr = Math.round(discountAmount).toLocaleString('en-US');
        str += 'Diskon      :-' + ' '.repeat(Math.max(1, 18 - discStr.length)) + discStr + '\n';
      }
      
      const bayarStr = Math.round(cashPaid).toLocaleString('en-US');
      str += 'Jumlah Bayar: ' + ' '.repeat(Math.max(1, 18 - bayarStr.length)) + bayarStr + '\n';
      
      const kembaliStr = Math.round(change).toLocaleString('en-US');
      str += 'Kembali     : ' + ' '.repeat(Math.max(1, 18 - kembaliStr.length)) + kembaliStr + '\n';
      
      str += '\n' + CENTER;
      str += 'BARANG YANG SUDAH DIBELI\nTIDAK DAPAT DIKEMBALIKAN /\nDITUKARKAN\n\n';
      str += 'TERIMA KASIH ATAS KUNJUNGAN ANDA\nlinktr.ee/harmonykitchenware\n';
      str += '\n\n' + CUT + KICK_DRAWER;
      
      onPrintText(str);
    } else {
      window.print();
    }
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
            className="cursor-pointer p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Thermal Receipt View */}
        <div className="p-6 overflow-y-auto font-mono text-sm leading-tight select-none bg-slate-100 flex-1 border-b border-slate-200">
          <div className="bg-white p-5 shadow-lg rounded-none border border-slate-300 max-w-[300px] mx-auto receipt-paper text-[#1e40af] font-mono text-xs leading-snug tracking-tight">
            {/* Header Nota */}
            <div className="text-center pb-2 border-b-2 border-[#1e40af]">
              <h2 className="font-bold text-sm tracking-wide uppercase text-[#1e40af]">
                HARMONY KITCHENWARE
              </h2>
              <p className="text-xs text-[#1e40af] mt-0.5">Jalan Panglima Sudirman 65</p>
              <p className="text-xs text-[#1e40af]">WA : 0851 7238 4707</p>
            </div>

            {/* Sub Header Nota */}
            <div className="pt-2 text-xs flex justify-between text-[#1e40af]">
              <span>{dateStr}</span>
              <span>{timeStr}</span>
              <span>Ksr : {cashierName}</span>
            </div>

            {/* Items Header */}
            <div className="pt-2 pb-1 text-xs font-bold flex text-[#1e40af]">
              <span className="w-5 text-left shrink-0">#</span>
              <span className="flex-1 text-left">Barang</span>
              <span className="text-right shrink-0">Sub Total</span>
            </div>

            {/* Items List */}
            <div className="space-y-1.5 text-xs text-[#1e40af]">
              {validCart.length === 0 ? (
                <div className="text-center py-4 text-[#1e40af]/60 italic font-sans">
                  (Belum ada item)
                </div>
              ) : (
                validCart.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex items-start font-medium text-[#1e40af]">
                      <span className="w-5 text-left shrink-0 font-mono">{item.quantity}</span>
                      <span className="flex-1 pr-1 break-words text-left">
                        {item.product.name}
                      </span>
                      <span className="whitespace-nowrap font-bold text-right shrink-0">
                        {Math.round(item.selectedPrice * item.quantity).toLocaleString('en-US')}
                      </span>
                    </div>
                    {item.quantity > 1 && (
                      <div className="pl-5 text-[#1e40af] text-[11px]">
                        @ {Math.round(item.selectedPrice).toLocaleString('en-US')}
                      </div>
                    )}
                    {item.memo && (
                      <div className="pl-5 text-[11px] text-[#1e40af] font-sans italic">
                        * Catatan: {item.memo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Summary Details */}
            <div className="mt-3 pt-2 border-t-2 border-[#1e40af] space-y-1 text-xs text-[#1e40af]">
              <div className="flex justify-between items-center">
                <span>{totalKinds} Jenis</span>
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Total :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(grandTotal).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-end">
                  <div className="flex justify-between w-48 text-rose-600 font-bold">
                    <span className="flex-1 text-right pr-2 font-mono">Diskon :</span>
                    <span className="text-right shrink-0 min-w-[70px] font-mono">
                      - {Math.round(discountAmount).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Jumlah Bayar :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(cashPaid).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Kembali :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(change).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Nota */}
            <div className="pt-5 text-center text-xs text-[#1e40af] space-y-2 font-mono">
              <p className="font-bold uppercase leading-tight">
                BARANG YANG SUDAH DIBELI
                <br />
                TIDAK DAPAT DIKEMBALIKAN /
                <br />
                DITUKARKAN
              </p>
              <p className="pt-1 font-bold uppercase">
                TERIMA KASIH ATAS KUNJUNGAN ANDA
              </p>
              <p className="text-[11px] font-mono text-[#1e40af]">
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

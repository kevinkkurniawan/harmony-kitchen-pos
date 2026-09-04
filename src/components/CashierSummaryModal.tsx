'use client';

import React from 'react';
import { X, Printer, TrendingUp, DollarSign, CreditCard, QrCode, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { ShiftSummary } from '@/types/pos';
import { POSUser } from '@/types/user';

interface CashierSummaryModalProps {
  isOpen: boolean;
  isDark: boolean;
  currentUser: POSUser | null;
  summary: ShiftSummary;
  onClose: () => void;
  isConnected?: boolean;
  onPrintText?: (text: string) => void;
}

export default function CashierSummaryModal({
  isOpen,
  isDark,
  currentUser,
  summary,
  onClose,
  isConnected = false,
  onPrintText,
}: CashierSummaryModalProps) {
  if (!isOpen) return null;

  const formatMoney = (val: number) => Math.round(val).toLocaleString('id-ID');
  
  const currentDate = new Date();
  const dateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const handlePrintReport = () => {
    if (isConnected && onPrintText) {
      const ESC = '\x1B';
      const GS = '\x1D';
      const INIT = ESC + '@';
      const BOLD_ON = ESC + 'E' + '\x01';
      const BOLD_OFF = ESC + 'E' + '\x00';
      const CENTER = ESC + 'a' + '\x01';
      const LEFT = ESC + 'a' + '\x00';
      const CUT = GS + 'V' + '\x41' + '\x00';
      
      const cashierName = currentUser?.name || summary.cashierName || 'KASIR';
      let str = INIT + CENTER + BOLD_ON + 'X-REPORT (REKAP KASIR)\n' + BOLD_OFF;
      str += `Kasir: ${cashierName}\nTanggal: ${dateStr}\n`;
      str += '--------------------------------\n' + LEFT;
      
      const formatLine = (label: string, val: string) => {
        return label + ' '.repeat(Math.max(1, 32 - label.length - val.length)) + val + '\n';
      };
      
      str += BOLD_ON + formatLine('TOTAL OMSET', formatMoney(summary.netSales)) + BOLD_OFF;
      str += '--------------------------------\n';
      
      str += BOLD_ON + 'DEBIT\n' + BOLD_OFF;
      if (summary.paymentBreakdown.edc > 0) str += formatLine(' EDC BCA', formatMoney(summary.paymentBreakdown.edc));
      if (summary.paymentBreakdown.transfer > 0) str += formatLine(' TRANSFER', formatMoney(summary.paymentBreakdown.transfer));
      
      str += BOLD_ON + 'KREDIT\n' + BOLD_OFF;
      if (summary.paymentBreakdown.shopee > 0) str += formatLine(' SHOPEE', formatMoney(summary.paymentBreakdown.shopee));
      if (summary.paymentBreakdown.tokopedia > 0) str += formatLine(' TOKOPEDIA', formatMoney(summary.paymentBreakdown.tokopedia));
      
      if (summary.paymentBreakdown.qris > 0) str += BOLD_ON + formatLine('QRIS', formatMoney(summary.paymentBreakdown.qris)) + BOLD_OFF;
      if (summary.paymentBreakdown.cash > 0) str += BOLD_ON + formatLine('CASH', formatMoney(summary.paymentBreakdown.cash)) + BOLD_OFF;
      if (summary.expenses > 0) str += BOLD_ON + formatLine('PENGELUARAN', formatMoney(summary.expenses)) + BOLD_OFF;
      
      str += '--------------------------------\n';
      str += BOLD_ON + formatLine('SETOR', formatMoney(summary.cashToDeposit)) + BOLD_OFF;
      
      str += '\n\n' + CUT;
      onPrintText(str);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header (No print) */}
        <div className={`px-6 py-4 border-b flex items-center justify-between no-print ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ringkasan Rekap Kasir (X-Report)</h2>
              <p className="text-xs text-slate-400">Semua data terhitung otomatis dari transaksi sistem</p>
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

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Printable Thermal Receipt Box */}
          <div className="bg-white text-blue-900 p-5 rounded-none border-2 border-blue-600 max-w-[320px] mx-auto receipt-paper font-mono text-xs leading-relaxed shadow-sm select-none space-y-2">
            {/* Top Header */}
            <div className="pb-2 border-b border-dashed border-blue-400">
              <div className="flex justify-between uppercase font-bold text-blue-900">
                <span>{currentUser?.name || summary.cashierName || 'KASIR'}</span>
                <span>Tgl: {dateStr}</span>
              </div>
              <div className="flex justify-between font-extrabold uppercase text-blue-900 text-sm mt-1">
                <span>TOTAL OMSET</span>
                <span>{formatMoney(summary.netSales)}</span>
              </div>
            </div>

            {/* Section: DEBIT */}
            <div className="pb-2 border-b border-dashed border-blue-400 space-y-1">
              <div className="font-bold uppercase text-blue-900">DEBIT</div>
              <div className="flex justify-between pl-2 text-blue-900">
                <span>EDC BCA</span>
                <span className="font-bold">{summary.paymentBreakdown.edc > 0 ? formatMoney(summary.paymentBreakdown.edc) : ''}</span>
              </div>
              <div className="flex justify-between pl-2 text-blue-900">
                <span>EDC Mandiri</span>
                <span className="font-bold"></span>
              </div>
              <div className="flex justify-between pl-2 text-blue-900">
                <span>TF</span>
                <span className="font-bold">{summary.paymentBreakdown.transfer > 0 ? formatMoney(summary.paymentBreakdown.transfer) : ''}</span>
              </div>
            </div>

            {/* Section: KREDIT */}
            <div className="pb-2 border-b border-dashed border-blue-400 space-y-1">
              <div className="font-bold uppercase text-blue-900">KREDIT</div>
              <div className="flex justify-between pl-2 text-blue-900">
                <span>SHOPEE</span>
                <span className="font-bold">{summary.paymentBreakdown.shopee > 0 ? formatMoney(summary.paymentBreakdown.shopee) : ''}</span>
              </div>
              <div className="flex justify-between pl-2 text-blue-900">
                <span>TOKPED</span>
                <span className="font-bold">{summary.paymentBreakdown.tokopedia > 0 ? formatMoney(summary.paymentBreakdown.tokopedia) : ''}</span>
              </div>
            </div>

            {/* Section: QRIS */}
            <div className="pb-2 border-b border-dashed border-blue-400">
              <div className="flex justify-between font-bold uppercase text-blue-900">
                <span>QRIS</span>
                <span>{summary.paymentBreakdown.qris > 0 ? formatMoney(summary.paymentBreakdown.qris) : ''}</span>
              </div>
            </div>

            {/* Section: CASH & PENGELUARAN */}
            <div className="pb-2 border-b border-dashed border-blue-400 space-y-1">
              <div className="flex justify-between font-bold uppercase text-blue-900">
                <span>CASH</span>
                <span>{summary.paymentBreakdown.cash > 0 ? formatMoney(summary.paymentBreakdown.cash) : ''}</span>
              </div>
              <div className="flex justify-between font-bold uppercase text-blue-900">
                <span>PENGELUARAN</span>
                <span>{summary.expenses > 0 ? formatMoney(summary.expenses) : ''}</span>
              </div>
            </div>

            {/* Section: SETOR */}
            <div className="pt-1">
              <div className="flex justify-between font-extrabold text-sm uppercase text-blue-900">
                <span>SETOR</span>
                <span>{formatMoney(summary.cashToDeposit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (No print) */}
        <div className={`p-4 border-t flex items-center justify-between no-print ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={onClose}
            className={`cursor-pointer px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tutup
          </button>
          <button
            onClick={handlePrintReport}
            className="cursor-pointer px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Struk Rekap Kasir
          </button>
        </div>
      </div>
    </div>
  );
}

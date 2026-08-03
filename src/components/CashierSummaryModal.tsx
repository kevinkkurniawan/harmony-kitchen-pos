'use client';

import React from 'react';
import { X, Printer, TrendingUp, DollarSign, CreditCard, QrCode, AlertCircle, FileText } from 'lucide-react';
import { ShiftSummary } from '@/types/pos';
import { POSUser } from '@/types/user';

interface CashierSummaryModalProps {
  isOpen: boolean;
  isDark: boolean;
  currentUser: POSUser | null;
  summary: ShiftSummary;
  onClose: () => void;
}

export default function CashierSummaryModal({
  isOpen,
  isDark,
  currentUser,
  summary,
  onClose,
}: CashierSummaryModalProps) {
  if (!isOpen) return null;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ringkasan Shift Kasir (X-Report)</h2>
              <p className="text-xs text-slate-400">Laporan Penjualan Harian Kasir • {currentUser?.name || 'Kasir'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-xs text-slate-400 font-medium">Total Omzet Bersih</span>
              <p className="text-xl font-black text-amber-500 mt-1">Rp {summary.netSales.toLocaleString('id-ID')}</p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">{summary.totalTransactions} Transaksi Selesai</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-xs text-slate-400 font-medium">Uang Tunai di Laci (Drawer)</span>
              <p className="text-xl font-black text-emerald-500 mt-1">Rp {summary.cashInDrawer.toLocaleString('id-ID')}</p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Modal + Penerimaan Tunai</span>
            </div>
          </div>

          {/* Breakdown by Payment Channel */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Rincian Metode Pembayaran
            </h3>
            <div className="space-y-2">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Tunai (Cash)
                </span>
                <span className="font-bold text-sm">Rp {summary.paymentBreakdown.cash.toLocaleString('id-ID')}</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <QrCode className="w-4 h-4 text-purple-500" /> QRIS / E-Wallet
                </span>
                <span className="font-bold text-sm">Rp {summary.paymentBreakdown.qris.toLocaleString('id-ID')}</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="w-4 h-4 text-blue-500" /> Kartu Debit / Kredit
                </span>
                <span className="font-bold text-sm">Rp {summary.paymentBreakdown.card.toLocaleString('id-ID')}</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-amber-500" /> Bon / Piutang
                </span>
                <span className="font-bold text-sm">Rp {summary.paymentBreakdown.bon.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Void & Discount Summary */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <span className="text-xs font-semibold text-slate-400">Total Void Item</span>
              <p className="text-sm font-bold text-rose-400 mt-0.5">{summary.voidCount} Item Dibatalkan (Rp {summary.voidTotalAmount.toLocaleString('id-ID')})</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">Total Diskon</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">Rp {summary.totalDiscount.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-medium text-sm ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tutup
          </button>
          <button
            onClick={handlePrintReport}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan (Shift Report)
          </button>
        </div>
      </div>
    </div>
  );
}

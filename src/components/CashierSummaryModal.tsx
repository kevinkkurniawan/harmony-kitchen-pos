'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Printer,
  TrendingUp,
  Calendar,
  User,
  Users,
  RefreshCw,
  AlertCircle,
  CreditCard,
  QrCode,
  DollarSign,
  Layers,
  Lock,
} from 'lucide-react';
import { POSUser } from '@/types/user';

interface CashierSummaryModalProps {
  isOpen: boolean;
  isDark: boolean;
  currentUser: POSUser | null;
  onClose: () => void;
  isConnected?: boolean;
  onPrintText?: (text: string) => void;
}

export default function CashierSummaryModal({
  isOpen,
  isDark,
  currentUser,
  onClose,
  isConnected = false,
  onPrintText,
}: CashierSummaryModalProps) {
  const getTodayJakarta = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayJakarta());
  const [selectedScope, setSelectedScope] = useState<'own' | 'all'>('own');
  const [recapData, setRecapData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatMoney = (val: number) => Math.round(val || 0).toLocaleString('id-ID');

  const fetchRecap = useCallback(async (date: string, scope: 'own' | 'all') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }

      const res = await fetch(`/api/reports/daily-recap?date=${encodeURIComponent(date)}&scope=${scope}`, {
        headers,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.error || 'Gagal memuat data rekap harian');
        setRecapData(null);
        return;
      }

      setRecapData(json.data);
    } catch (err: any) {
      console.error('Failed to fetch daily recap:', err);
      setErrorMessage('Terjadi kesalahan koneksi saat memuat rekap harian');
      setRecapData(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchRecap(selectedDate, selectedScope);
    }
  }, [isOpen, selectedDate, selectedScope, fetchRecap]);

  if (!isOpen) return null;

  const handlePrintReport = () => {
    if (!recapData) return;

    if (isConnected && onPrintText) {
      const ESC = '\x1B';
      const GS = '\x1D';
      const INIT = ESC + '@';
      const BOLD_ON = ESC + 'E' + '\x01';
      const BOLD_OFF = ESC + 'E' + '\x00';
      const CENTER = ESC + 'a' + '\x01';
      const LEFT = ESC + 'a' + '\x00';
      const CUT = GS + 'V' + '\x41' + '\x00';

      let str = INIT + CENTER + BOLD_ON + 'REKAP PENJUALAN HARIAN\n' + BOLD_OFF;
      str += 'HARMONY KITCHENWARE\n';
      str += 'Jl. Panglima Sudirman No. 65\n';
      str += '--------------------------------\n' + LEFT;
      str += `Tanggal : ${recapData.date} (${recapData.timezone})\n`;
      str += `Cakupan : ${recapData.scopeLabel}\n`;
      str += `Dicetak : ${new Date().toLocaleTimeString('id-ID')}\n`;
      str += '--------------------------------\n';

      const formatLine = (label: string, val: string) => {
        return label + ' '.repeat(Math.max(1, 32 - label.length - val.length)) + val + '\n';
      };

      str += formatLine('Total Transaksi', `${recapData.transactionCount} Transaksi`);
      str += formatLine('Penjualan Kotor', `Rp ${formatMoney(recapData.grossSales)}`);
      if (recapData.totalDiscount > 0) {
        str += formatLine('Diskon', `-Rp ${formatMoney(recapData.totalDiscount)}`);
      }
      str += BOLD_ON + formatLine('PENJUALAN BERSIH', `Rp ${formatMoney(recapData.netSales)}`) + BOLD_OFF;
      str += '--------------------------------\n';

      str += BOLD_ON + 'RINCIAN PEMBAYARAN:\n' + BOLD_OFF;
      const pb = recapData.paymentBreakdown || {};
      if (pb.cash > 0) str += formatLine(' Tunai / Cash', `Rp ${formatMoney(pb.cash)}`);
      if (pb.edc > 0) str += formatLine(' EDC / Debit', `Rp ${formatMoney(pb.edc)}`);
      if (pb.transfer > 0) str += formatLine(' Transfer Bank', `Rp ${formatMoney(pb.transfer)}`);
      if (pb.qris > 0) str += formatLine(' QRIS', `Rp ${formatMoney(pb.qris)}`);
      if (pb.shopee > 0) str += formatLine(' Shopee', `Rp ${formatMoney(pb.shopee)}`);
      if (pb.tokopedia > 0) str += formatLine(' Tokopedia', `Rp ${formatMoney(pb.tokopedia)}`);
      if (pb.unknown > 0) str += formatLine(' Unknown (Legacy)', `Rp ${formatMoney(pb.unknown)}`);

      str += '--------------------------------\n';
      str += BOLD_ON + formatLine('TOTAL TERKUMPUL', `Rp ${formatMoney(recapData.reconciledSum)}`) + BOLD_OFF;

      if (recapData.legacyCount > 0) {
        str += `\n* ${recapData.legacyCount} nota data lama\n`;
      }

      str += '\n\n' + CUT;
      onPrintText(str);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between no-print ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Rekap Penjualan Harian</h2>
              <p className="text-xs text-slate-400">
                Waktu Bisnis: Asia/Jakarta (WIB) • F10 Shortcut
              </p>
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

        {/* Toolbar & Filters (No Print) */}
        <div
          className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 no-print ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/60 bg-slate-100/50'
          }`}
        >
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Cashier Scope Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-900">
              <button
                type="button"
                onClick={() => setSelectedScope('own')}
                className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedScope === 'own'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Kasir Saya
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentUser?.canViewAllCashiers) {
                    setSelectedScope('all');
                  }
                }}
                disabled={!currentUser?.canViewAllCashiers}
                className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedScope === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : !currentUser?.canViewAllCashiers
                    ? 'text-slate-600 cursor-not-allowed opacity-60'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={!currentUser?.canViewAllCashiers ? 'Memerlukan izin reports.viewAllCashiers' : 'Lihat semua kasir'}
              >
                {!currentUser?.canViewAllCashiers ? (
                  <Lock className="w-3 h-3 text-slate-500" />
                ) : (
                  <Users className="w-3 h-3" />
                )}
                <span>Semua Kasir</span>
              </button>
            </div>

            <button
              onClick={() => fetchRecap(selectedDate, selectedScope)}
              disabled={isLoading}
              className={`cursor-pointer p-1.5 rounded-lg border transition-all active:scale-95 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Perbarui Rekap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Memuat Rekap Penjualan Harian...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => fetchRecap(selectedDate, selectedScope)}
                className="cursor-pointer px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : recapData ? (
            <>
              {/* Scope & Date Meta Bar */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-400">Cakupan:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold">
                    {recapData.scopeLabel}
                  </span>
                </div>
                <div className="text-slate-400 font-mono">
                  {recapData.date} ({recapData.timezone})
                </div>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Transaksi
                  </span>
                  <span className="text-lg font-extrabold text-amber-500 mt-1 block">
                    {recapData.transactionCount}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Penjualan Kotor
                  </span>
                  <span className="text-sm font-extrabold text-slate-200 mt-1 block">
                    Rp {formatMoney(recapData.grossSales)}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Diskon
                  </span>
                  <span className="text-sm font-extrabold text-rose-400 mt-1 block">
                    -Rp {formatMoney(recapData.totalDiscount)}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
                    Penjualan Bersih
                  </span>
                  <span className="text-sm font-black text-emerald-400 mt-1 block">
                    Rp {formatMoney(recapData.netSales)}
                  </span>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Rincian Penerimaan Pembayaran
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Tunai (Cash):</span>
                    <span className="font-bold text-amber-400">Rp {formatMoney(recapData.paymentBreakdown.cash)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">EDC / Debit:</span>
                    <span className="font-bold">Rp {formatMoney(recapData.paymentBreakdown.edc)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Transfer:</span>
                    <span className="font-bold">Rp {formatMoney(recapData.paymentBreakdown.transfer)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">QRIS:</span>
                    <span className="font-bold text-sky-400">Rp {formatMoney(recapData.paymentBreakdown.qris)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Shopee:</span>
                    <span className="font-bold text-orange-400">Rp {formatMoney(recapData.paymentBreakdown.shopee)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-medium">Tokopedia:</span>
                    <span className="font-bold text-emerald-400">Rp {formatMoney(recapData.paymentBreakdown.tokopedia)}</span>
                  </div>
                  {recapData.paymentBreakdown.unknown > 0 && (
                    <div className="flex justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-800/40 col-span-2">
                      <span className="text-amber-400 font-medium">Unknown (Data Lama):</span>
                      <span className="font-bold text-amber-400">Rp {formatMoney(recapData.paymentBreakdown.unknown)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions Count Notice */}
              {recapData.transactionCount === 0 && (
                <div className="p-4 rounded-xl text-center text-xs text-slate-500 italic">
                  Tidak ada transaksi selesai pada tanggal {selectedDate}.
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer (No print) */}
        <div
          className={`p-4 border-t flex items-center justify-between no-print ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
          }`}
        >
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
            disabled={!recapData || recapData.transactionCount === 0}
            className="cursor-pointer px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Rekap Harian
          </button>
        </div>
      </div>
    </div>
  );
}


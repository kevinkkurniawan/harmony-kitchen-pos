import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Banknote, HelpCircle, Save } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onSubmit: (cashPaid: number, paymentMethod: string) => void;
  isDark: boolean;
}

type PaymentMethod = 'CASH' | 'DEBIT' | 'ACCOUNT';
type ViewState = 'INPUT' | 'CONFIRM' | 'SUCCESS';

export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onSubmit,
  isDark
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashInputValue, setCashInputValue] = useState<string>('');
  const [cardNo, setCardNo] = useState<string>('');
  const [viewState, setViewState] = useState<ViewState>('INPUT');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMethod('CASH');
      setCashInputValue('');
      setCardNo('');
      setViewState('INPUT');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bgModal = isDark ? 'bg-[#1e1e1e] border-slate-700' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderLight = isDark ? 'border-slate-700' : 'border-slate-200';
  const bgInput = isDark ? 'bg-[#2a2a2a] text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300';

  const numCash = Number(cashInputValue) || 0;
  const changeDue = Math.max(0, numCash - totalAmount);

  const handleSubmit = () => {
    if (method === 'CASH' && numCash < totalAmount) {
      alert('Nominal cash kurang dari total tagihan.');
      return;
    }
    setViewState('CONFIRM');
  };

  const confirmPayment = () => {
    setViewState('SUCCESS');
  };

  const handleFinish = () => {
    onSubmit(method === 'CASH' ? numCash : totalAmount, method);
  };

  const renderInputView = () => (
    <>
      <div className={`p-4 border-b flex justify-between items-center ${borderLight}`}>
        <h2 className={`text-xl font-bold ${textPrimary}`}>Pembayaran</h2>
        <button onClick={onClose} className={`hover:bg-slate-200 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : ''}`}>
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-emerald-50'} border-2 ${isDark ? 'border-slate-700' : 'border-emerald-200'}`}>
          <div className={`text-sm font-semibold mb-1 ${textSecondary}`}>TOTAL TAGIHAN</div>
          <div className="text-4xl font-black text-emerald-500">
            Rp {totalAmount.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setMethod('CASH')}
            className={`py-3 rounded-lg border-2 font-bold flex flex-col items-center gap-2 transition-all ${
              method === 'CASH' 
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                : `${borderLight} ${textSecondary} hover:border-slate-400`
            }`}
          >
            <Banknote className="w-6 h-6" />
            CASH
          </button>
          <button
            onClick={() => setMethod('DEBIT')}
            className={`py-3 rounded-lg border-2 font-bold flex flex-col items-center gap-2 transition-all ${
              method === 'DEBIT' 
                ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                : `${borderLight} ${textSecondary} hover:border-slate-400`
            }`}
          >
            <CreditCard className="w-6 h-6" />
            DEBIT
          </button>
          <button
            onClick={() => setMethod('ACCOUNT')}
            className={`py-3 rounded-lg border-2 font-bold flex flex-col items-center gap-2 transition-all ${
              method === 'ACCOUNT' 
                ? 'border-purple-500 bg-purple-500/10 text-purple-500' 
                : `${borderLight} ${textSecondary} hover:border-slate-400`
            }`}
          >
            <HelpCircle className="w-6 h-6" />
            ACCOUNT
          </button>
        </div>

        {method === 'CASH' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Nominal Diterima (Rp)</label>
              <input 
                type="number"
                value={cashInputValue}
                onChange={(e) => setCashInputValue(e.target.value)}
                className={`w-full p-4 rounded-lg border text-2xl font-bold font-mono focus:ring-2 focus:ring-emerald-500 outline-none ${bgInput}`}
                placeholder="0"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setCashInputValue(totalAmount.toString())}
                className={`py-2 rounded font-semibold border ${borderLight} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                Uang Pas
              </button>
              <button 
                onClick={() => setCashInputValue('50000')}
                className={`py-2 rounded font-semibold border ${borderLight} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                50.000
              </button>
              <button 
                onClick={() => setCashInputValue('100000')}
                className={`py-2 rounded font-semibold border ${borderLight} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                100.000
              </button>
            </div>
          </div>
        )}

        {(method === 'DEBIT' || method === 'ACCOUNT') && (
          <div className="flex flex-col gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                {method === 'DEBIT' ? 'Nomor Kartu Debit' : 'Referensi Account'}
              </label>
              <input 
                type="text"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                className={`w-full p-4 rounded-lg border text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none ${bgInput}`}
                placeholder={method === 'DEBIT' ? 'XXXX-XXXX-XXXX-XXXX' : 'Referensi'}
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 border-t flex justify-end gap-3 ${borderLight}`}>
        <button 
          onClick={onClose}
          className={`px-6 py-3 rounded-lg font-bold border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          className={`px-8 py-3 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${
            (method === 'CASH' && numCash < totalAmount)
              ? 'bg-emerald-300 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
          disabled={method === 'CASH' && numCash < totalAmount}
        >
          <Save className="w-5 h-5" />
          Submit
        </button>
      </div>
    </>
  );

  const renderConfirmView = () => (
    <div className="p-8 flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
        <HelpCircle className="w-10 h-10" />
      </div>
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Confirmation Payment</h2>
        <p className={`${textSecondary}`}>Apakah Anda yakin ingin memproses pembayaran ini?</p>
      </div>
      
      <div className={`w-full p-4 rounded-lg border text-left mt-2 ${borderLight}`}>
        <div className="flex justify-between mb-1">
          <span className={textSecondary}>Total Tagihan:</span>
          <span className={`font-bold ${textPrimary}`}>Rp {totalAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className={textSecondary}>Metode:</span>
          <span className={`font-bold ${textPrimary}`}>{method}</span>
        </div>
        {method === 'CASH' && (
          <div className="flex justify-between">
            <span className={textSecondary}>Bayar (Cash):</span>
            <span className={`font-bold ${textPrimary}`}>Rp {numCash.toLocaleString('id-ID')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 w-full mt-4">
        <button 
          onClick={() => setViewState('INPUT')}
          className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
        >
          No
        </button>
        <button 
          onClick={confirmPayment}
          className="flex-1 py-3 rounded-lg font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Yes, Submit
        </button>
      </div>
    </div>
  );

  const renderSuccessView = () => (
    <div className="p-8 flex flex-col items-center text-center gap-6">
      <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mb-2">
        <CheckCircle className="w-12 h-12" />
      </div>
      
      <div>
        <h2 className={`text-3xl font-black mb-2 ${textPrimary}`}>Payment Berhasil!</h2>
        <p className={`${textSecondary}`}>Transaksi telah sukses diproses.</p>
      </div>

      {method === 'CASH' && (
        <div className={`w-full p-6 mt-4 rounded-xl border-2 text-center bg-emerald-50 border-emerald-200 ${isDark ? 'bg-slate-800 border-emerald-500/30' : ''}`}>
          <div className={`text-sm font-bold mb-1 ${textSecondary}`}>UANG KEMBALI (CHANGE)</div>
          <div className="text-5xl font-black text-emerald-500">
            Rp {changeDue.toLocaleString('id-ID')}
          </div>
        </div>
      )}

      <button 
        onClick={handleFinish}
        className="w-full mt-6 py-4 rounded-xl font-bold text-lg text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg"
      >
        Finish & Cetak Struk
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden ${bgModal}`}>
        {viewState === 'INPUT' && renderInputView()}
        {viewState === 'CONFIRM' && renderConfirmView()}
        {viewState === 'SUCCESS' && renderSuccessView()}
      </div>
    </div>
  );
}

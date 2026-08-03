'use client';

import React, { useState } from 'react';
import { X, UserCheck, Search, Check, UserPlus } from 'lucide-react';
import { Customer } from '@/types/pos';
import { MOCK_CUSTOMERS } from '@/data/mockProducts';

interface MemberValidationModalProps {
  isOpen: boolean;
  isDark: boolean;
  selectedCustomer: Customer | null;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
}

export default function MemberValidationModal({
  isOpen,
  isDark,
  selectedCustomer,
  onClose,
  onSelectCustomer,
}: MemberValidationModalProps) {
  const [query, setQuery] = useState('');
  const [customers] = useState<Customer[]>(MOCK_CUSTOMERS);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.customerNo.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
  );

  const handleSelect = (cust: Customer) => {
    onSelectCustomer(cust);
    onClose();
  };

  const handleClear = () => {
    onSelectCustomer(null);
    onClose();
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
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Validasi Member / Pelanggan</h2>
              <p className="text-xs text-slate-400">Pilih pelanggan untuk diskon khusus / transaksi grosir</p>
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

        {/* Search */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Nama, No. Member, HP..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelect(cust)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{cust.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          cust.customerType === 'Wholesale'
                            ? 'bg-amber-500/20 text-amber-400'
                            : cust.customerType === 'Vip'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {cust.customerType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cust.customerNo} • {cust.phone} • Diskon {cust.discountPercent}%
                    </p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={handleClear}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              isDark ? 'text-rose-400 hover:bg-rose-950/30' : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            Lepas Pelanggan
          </button>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl font-bold text-sm ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

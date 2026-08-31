'use client';

import React, { useState } from 'react';
import { X, Settings, Printer, Percent, Building2, Save, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
  settings: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    receiptFooter: string;
    taxPercent: number;
    servicePercent: number;
    printerCashier: string;
    printerKitchen: string;
    printerBar: string;
    printerPantry: string;
  };
  onSaveSettings: (newSettings: SettingsModalProps['settings']) => void;
}

export default function SettingsModal({
  isOpen,
  isDark,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [formData, setFormData] = useState(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
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
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pengaturan POS & Printer (Frm_ChangeSetting)</h2>
              <p className="text-xs text-slate-400">Konfigurasi Printer Struk, Dot Matrix, Pajak & Toko</p>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Pengaturan Berhasil Disimpan!
            </div>
          )}

          {/* Section 1: Store Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Informasi Toko & Nota Struk
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Nama Toko</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">No. HP / WA</label>
                <input
                  type="text"
                  value={formData.storePhone}
                  onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Alamat Toko</label>
                <input
                  type="text"
                  value={formData.storeAddress}
                  onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Service Charge */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-400" /> Tarif Pajak & Service Charge
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Pajak PPN (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.taxPercent}
                  onChange={(e) => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Biaya Layanan / Service (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.servicePercent}
                  onChange={(e) => setFormData({ ...formData, servicePercent: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Printer Routing */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-sky-400" /> Routing Printer Kasir & Nota
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Printer Kasir Utama (Thermal)</label>
                <input
                  type="text"
                  value={formData.printerCashier}
                  onChange={(e) => setFormData({ ...formData, printerCashier: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Printer Nota Grosir (Continuous)</label>
                <input
                  type="text"
                  value={formData.printerKitchen}
                  onChange={(e) => setFormData({ ...formData, printerKitchen: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Printer Surat Jalan (LX-300)</label>
                <input
                  type="text"
                  value={formData.printerBar}
                  onChange={(e) => setFormData({ ...formData, printerBar: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Printer Backup / Admin</label>
                <input
                  type="text"
                  value={formData.printerPantry}
                  onChange={(e) => setFormData({ ...formData, printerPantry: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              className="cursor-pointer px-5 py-2 rounded-xl font-bold text-xs bg-sky-500 text-slate-950 hover:bg-sky-400 transition-all active:scale-95 shadow-lg shadow-sky-500/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

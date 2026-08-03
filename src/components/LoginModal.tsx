'use client';

import React, { useState } from 'react';
import { Store, Lock, User as UserIcon, LogIn, AlertCircle, X } from 'lucide-react';
import { MOCK_POS_USERS, POSUser } from '@/types/user';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectUser?: (user: POSUser) => void;
  onLoginSuccess?: (user: POSUser) => void;
  currentUsername?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSelectUser,
  onLoginSuccess,
}: LoginModalProps) {
  const [username, setUsername] = useState('lia');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const foundUser = MOCK_POS_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!foundUser) {
      setError('Username kasir tidak ditemukan');
      return;
    }

    if (onSelectUser) onSelectUser(foundUser);
    if (onLoginSuccess) onLoginSuccess(foundUser);
    if (onClose) onClose();
  };

  const handleQuickSelect = (user: POSUser) => {
    if (onSelectUser) onSelectUser(user);
    if (onLoginSuccess) onLoginSuccess(user);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Close button if onClose is passed */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <Store className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h2 className="font-extrabold text-lg text-white">Login / Ganti Kasir POS</h2>
          <p className="text-xs text-slate-400 mt-1">Masukan Akun Kasir Harmony Kitchenware</p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
          <span className="text-slate-400 block mb-2 font-medium">Pilih Akun Kasir Langsung:</span>
          <div className="grid grid-cols-3 gap-2">
            {MOCK_POS_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleQuickSelect(user)}
                className="px-2 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-center font-bold hover:bg-emerald-500/30 transition-all text-xs"
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              Username Kasir
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username kasir..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              PIN / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
          >
            <LogIn className="w-4 h-4" />
            Masuk Kasir POS
          </button>
        </form>
      </div>
    </div>
  );
}

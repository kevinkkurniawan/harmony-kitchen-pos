'use client';

import React, { useState } from 'react';
import { Store, Lock, User as UserIcon, LogIn, AlertCircle, X, LogOut, CheckCircle2 } from 'lucide-react';
import { MOCK_POS_USERS, POSUser } from '@/types/user';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectUser?: (user: POSUser) => void;
  onLoginSuccess?: (user: POSUser) => void;
  currentUser?: POSUser | null;
  onLogout?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSelectUser,
  onLoginSuccess,
  currentUser,
  onLogout,
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();

      if (!json.success || !json.data) {
        setError(json.error || 'Username kasir tidak ditemukan di database.');
        return;
      }

      const dbUser: POSUser = {
        id: json.data.id,
        username: json.data.username,
        name: json.data.name,
        role: json.data.role,
      };

      if (onSelectUser) onSelectUser(dbUser);
      if (onLoginSuccess) onLoginSuccess(dbUser);
      if (onClose) onClose();
    } catch (err) {
      console.error('Login database error:', err);
      setError('Gagal menghubungkan ke database kasir.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Close button if onClose is passed */}
        {onClose && (
          <button
            onClick={onClose}
            className="cursor-pointer absolute right-4 top-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <Store className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h2 className="font-extrabold text-lg text-white">
            {currentUser ? 'Informasi Kasir Aktif' : 'Login Sistem Kasir'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser
              ? 'Anda saat ini sedang ter-login di sesi kasir toko.'
              : 'Masukkan Akun Kasir Harmony Kitchenware'}
          </p>
        </div>

        {/* CONDITION 1: LOGGED IN STATE */}
        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sesi Login Aktif</span>
                </div>
                <h3 className="font-extrabold text-base text-white leading-tight">
                  {currentUser.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Username: @{currentUser.username} • Role: {currentUser.role || 'Kasir'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setUsername('');
                    setPassword('');
                  }}
                  className="cursor-pointer w-full py-3 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout / Keluar Akun</span>
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all active:scale-95"
                >
                  Tutup / Kembali ke Transaksi
                </button>
              )}
            </div>
          </div>
        ) : (
          /* CONDITION 2: NOT LOGGED IN FORM */
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
                placeholder="Masukkan username kasir"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Password
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
              className="cursor-pointer w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
            >
              <LogIn className="w-4 h-4" />
              Masuk Sistem Kasir
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

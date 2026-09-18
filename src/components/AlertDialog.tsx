import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDark?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Perhatian',
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  isDark = false,
}: AlertDialogProps) {
  if (!isOpen) return null;

  const bgModal = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const buttonBg = 'bg-emerald-500 hover:bg-emerald-600';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${bgModal}`}>
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>{title}</h2>
            <p className={`text-sm ${textSecondary}`}>{message}</p>
          </div>

          {onConfirm ? (
            <div className="flex gap-3 w-full mt-2">
              <button 
                onClick={onClose}
                className={`cursor-pointer flex-1 py-3 rounded-xl font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                {cancelText}
              </button>
              <button 
                onClick={onConfirm}
                className={`cursor-pointer flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg`}
              >
                {confirmText}
              </button>
            </div>
          ) : (
            <button 
              onClick={onClose}
              className={`cursor-pointer w-full mt-2 py-3 rounded-xl font-bold text-white ${buttonBg} transition-colors shadow-lg`}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

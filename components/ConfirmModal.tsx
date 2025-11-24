import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  isDangerous = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDangerous ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-500'}`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                isDangerous 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

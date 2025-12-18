
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { COLORS } from '../constants';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-subtle-lg max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-subtle">
              <AlertTriangle size={28} />
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight uppercase tracking-widest">{title}</h3>
          <p className="text-sm font-medium text-gray-500 leading-relaxed">{message}</p>
        </div>
        
        <div className="bg-gray-50/50 p-6 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all active:scale-95"
          >
            Voltar
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 h-12 rounded-xl text-white font-black uppercase tracking-widest text-[10px] shadow-subtle hover:brightness-105 transition-all active:scale-95"
            style={{ backgroundColor: COLORS.orange }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

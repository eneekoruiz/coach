import React from 'react';
import { Plus } from 'lucide-react';

type FloatingChatButtonProps = {
  onClick: () => void;
  isOpen?: boolean;
  hasLoggedToday?: boolean;
};

export default function FloatingChatButton({ onClick, isOpen, hasLoggedToday }: FloatingChatButtonProps) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      aria-label="Abrir chat"
      onClick={onClick}
      className={`fixed bottom-8 right-8 z-[100] flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all ${
        !hasLoggedToday ? 'ring-4 ring-cyan-500/40 animate-pulse' : ''
      }`}
    >
      <Plus className="w-5 h-5" />
      <span className="font-semibold text-sm">Registrar</span>
    </button>
  );
}

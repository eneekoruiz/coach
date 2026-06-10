import React from 'react';
import { MessageCircle } from 'lucide-react';

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
      aria-label="Hablar con el Coach"
      onClick={onClick}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-8 right-8 z-60 flex items-center gap-2 rounded-full bg-slate-900 px-6 py-4 text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${
        !hasLoggedToday ? 'ring-4 ring-cyan-500/40 animate-pulse' : ''
      }`}
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-sm font-semibold">Hablar con el Coach</span>
    </button>
  );
}

import React from 'react';

type FloatingChatButtonProps = {
  onClick: () => void;
  isOpen?: boolean;
};

export default function FloatingChatButton({ onClick, isOpen }: FloatingChatButtonProps) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      aria-label="Abrir chat"
      onClick={onClick}
      className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100] flex w-16 h-16 md:w-20 md:h-20 items-center justify-center rounded-full bg-cyan-500 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 animate-bounce ring-4 ring-cyan-500/30 ring-offset-2 ring-offset-slate-900"
      style={{ animationDuration: '3s' }}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-8 h-8 md:w-10 md:h-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}

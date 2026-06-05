'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import ChatFeedbackPanel from '@/components/ChatFeedbackPanel';
import SelectedImagePreview from '@/components/SelectedImagePreview';
import ChatForm from '@/components/ChatForm';
import CloseDayModal from '@/components/CloseDayModal';

type ChatInputProps = {
  onUpdate?: () => void | Promise<void>;
  momentum?: number;
  onClose?: () => void;
};

export default function ChatInput({ onUpdate, momentum, onClose }: ChatInputProps) {
  const {
    inputText,
    setInputText,
    isLoading,
    isListening,
    feedback,
    closeDayFeedback,
    selectedImage,
    textareaRef,
    fileInputRef,
    isCloseDayCommand,
    toggleListening,
    handleImageButtonClick,
    handleImageSelect,
    clearSelectedImage,
    handleSubmit,
    handleCloseDayModalClose,
    submitLabel,
    evaluationText,
    history,
    chatSessions,
    activeSessionId,
    createNewSession,
    switchSession,
    retroactiveDate,
    setRetroactiveDate,
  } = useChat(onUpdate, momentum);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  // Close session menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsSessionMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSession = chatSessions.find((s) => s.id === activeSessionId);

  const handlePrevDay = () => {
    const current = new Date(retroactiveDate + 'T12:00:00');
    current.setDate(current.getDate() - 1);
    setRetroactiveDate(current.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const current = new Date(retroactiveDate + 'T12:00:00');
    const todayStr = new Date().toISOString().slice(0, 10);
    if (retroactiveDate !== todayStr) {
      current.setDate(current.getDate() + 1);
      setRetroactiveDate(current.toISOString().slice(0, 10));
    }
  };

  const isDateToday = retroactiveDate === new Date().toISOString().slice(0, 10);

  const getFriendlyDateLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dateStr === todayStr) return 'Hoy';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (dateStr === yesterdayStr) return 'Ayer';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <CloseDayModal closeDayFeedback={closeDayFeedback} onClose={handleCloseDayModalClose} />

      <div className="flex h-[550px] w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/82 shadow-[0_18px_70px_rgba(15,23,42,0.2)] backdrop-blur-2xl sm:rounded-[1.75rem]">
        
        {/* ── Header bar ── */}
        <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-4 flex items-center justify-between shrink-0 gap-2">
          
          {/* Session selector */}
          <div className="relative flex-1 min-w-0" ref={menuRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsSessionMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 max-w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors duration-150 truncate"
              aria-label="Seleccionar conversación"
              aria-expanded={isSessionMenuOpen}
            >
              <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="truncate">
                {activeSession?.title ?? 'Registro de hábitos'}
              </span>
              <svg className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isSessionMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {isSessionMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                >
                  {/* Nueva conversación */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { createNewSession(); setIsSessionMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors border-b border-slate-100"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nueva conversación
                  </motion.button>

                  {/* List of sessions */}
                  <div className="max-h-48 overflow-y-auto">
                    {chatSessions.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400">No hay conversaciones aún.</p>
                    ) : (
                      chatSessions.map((session) => (
                        <motion.button
                          key={session.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { switchSession(session.id); setIsSessionMenuOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                            session.id === activeSessionId
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="truncate">{session.title}</span>
                        </motion.button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* New session shortcut icon */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => createNewSession()}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </motion.button>

            {/* Close button */}
            {onClose && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Cerrar chat"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Time-Travel Widget ── */}
        <div className="bg-slate-50/90 border-b border-slate-200/60 px-4 py-2 flex items-center justify-between text-xs shrink-0 select-none">
          <span className="font-semibold text-slate-500 flex items-center gap-1">
            <span>📅</span> Fecha del registro:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 rounded-full hover:bg-slate-200/80 text-slate-600 active:scale-90 transition duration-150"
              title="Día anterior"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm min-w-[70px] text-center">
              {getFriendlyDateLabel(retroactiveDate)}
            </span>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={isDateToday}
              className="p-1 rounded-full hover:bg-slate-200/80 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent active:scale-90 transition duration-150"
              title="Día siguiente"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 space-y-4 min-h-0">
          {history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400">
              <span className="text-3xl mb-2">🐶</span>
              <p className="text-sm font-medium">¡Hola! Soy tu Coach Bio-Avatar.</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Escribe sobre tus comidas, agua o hábitos de hoy para registrar tu progreso.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((msg, index) => (
                <div
                  key={index}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-sm leading-6 shadow-sm border ${
                      msg.role === 'user'
                        ? 'bg-slate-900 border-slate-800 text-white rounded-br-none'
                        : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 block mb-1">
                        Coach
                      </span>
                    )}
                    <p className="whitespace-pre-line text-xs sm:text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedback ? (
            <div className="pt-2">
              <ChatFeedbackPanel feedback={feedback} evaluationText={evaluationText} onUpdate={onUpdate} />
            </div>
          ) : null}

          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="rounded-[1.25rem] px-4 py-3 bg-white border border-slate-200 text-slate-400 rounded-bl-none flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"></span>
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-slate-100 bg-white/50 p-3 sm:p-4 shrink-0 space-y-3">
          {selectedImage ? (
            <SelectedImagePreview selectedImage={selectedImage} onClear={clearSelectedImage} />
          ) : null}

          <ChatForm
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            hasSelectedImage={Boolean(selectedImage)}
            inputText={inputText}
            setInputText={setInputText}
            isLoading={isLoading}
            isListening={isListening}
            isCloseDayCommand={isCloseDayCommand}
            toggleListening={toggleListening}
            handleImageButtonClick={handleImageButtonClick}
            handleImageSelect={handleImageSelect}
            handleSubmit={handleSubmit}
            submitLabel={submitLabel}
          />
        </div>
      </div>
    </>
  );
}

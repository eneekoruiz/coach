'use client';

import React from 'react';
import { useChat } from '@/hooks/useChat';
import ChatFeedbackPanel from '@/components/ChatFeedbackPanel';
import SelectedImagePreview from '@/components/SelectedImagePreview';
import ChatForm from '@/components/ChatForm';
import CloseDayModal from '@/components/CloseDayModal';

type ChatInputProps = { onUpdate?: () => void | Promise<void> };

export default function ChatInput({ onUpdate }: ChatInputProps) {
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
  } = useChat(onUpdate);

  return (
    <>
      <CloseDayModal closeDayFeedback={closeDayFeedback} onClose={handleCloseDayModalClose} />

      <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/82 shadow-[0_18px_70px_rgba(15,23,42,0.2)] backdrop-blur-2xl sm:rounded-[1.75rem]">
        <div className="border-b border-slate-200/80 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="text-sm font-semibold">Registro de hábitos</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
          {feedback ? (
            <ChatFeedbackPanel feedback={feedback} evaluationText={evaluationText} />
          ) : null}

          {selectedImage ? (
            <SelectedImagePreview selectedImage={selectedImage} onClear={clearSelectedImage} />
          ) : null}

          <ChatForm
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
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

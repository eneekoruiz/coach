/*
  Clean, SRP-focused hook. Delegates session + request handling to `chatService`.
  Keeps only UI state, refs and small helpers. All heavy logic moved to services.
*/

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from '@/lib/toast';
import { type DailyLog } from '@/lib/schema';
import { triggerVibration } from '@/lib/haptics';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useImageSelection } from './useImageSelection';
import { computeEvaluationText, computeSubmitLabel } from './useChatHelpers';
import { createHandleCloseDayModalClose } from './useChatActionsHelpers';
import { getSessionToken, sendChat, SessionExpiredError, ForbiddenError, PayloadTooLargeError, BadRequestError } from '@/services/chatService';
import { CLOSE_DAY_COMMAND, LOGIN_ROUTE, ERROR_MESSAGES } from '@/constants/config';

type SelectedImage = {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: DailyLog;
};

type CloseDayFeedback = {
  puntuacion_global: number;
  aciertos: string[];
  error_clave: string;
  accion_manana: string;
  prompt_imagen: string;
  imageUrl: string;
};

export function useChat(onUpdate?: () => void | Promise<void>) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'analyze' | 'close-day' | null>(null);
  const [feedback, setFeedback] = useState<ChatFeedback | null>(null);
  const [closeDayFeedback, setCloseDayFeedback] = useState<CloseDayFeedback | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { selectedImage, fileInputRef, handleImageButtonClick, handleImageSelect, clearSelectedImage } =
    useImageSelection();

  const { recognitionRef, isListening, toggleListening, stop } = useSpeechRecognition((transcript) => {
    setInputText((current) => {
      const sep = current.trim().length > 0 ? ' ' : '';
      return `${current}${sep}${transcript}`.trimStart();
    });
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [inputText]);

  const evaluationText = useMemo(() => computeEvaluationText(feedback), [feedback]);

  const isCloseDayCommand = inputText.toLowerCase().trim() === CLOSE_DAY_COMMAND;

  function resetUiAfterSuccess() {
    setInputText('');
    clearSelectedImage();
    stop();
    textareaRef.current?.focus();
  }

  function handleServiceError(err: unknown) {
    if (err instanceof SessionExpiredError) {
      toast.error(ERROR_MESSAGES.sessionExpired);
      window.location.href = LOGIN_ROUTE;
      return;
    }
    if (err instanceof PayloadTooLargeError) {
      toast.error(ERROR_MESSAGES.imageTooLarge);
      return;
    }
    if (err instanceof ForbiddenError) {
      toast.error('No tienes permisos para esta operación.');
      return;
    }
    if (err instanceof BadRequestError) {
      toast.error('Revisa el contenido enviado e inténtalo de nuevo.');
      return;
    }
    const message = err instanceof Error ? err.message : ERROR_MESSAGES.generic;
    toast.error(message);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = inputText.trim();
    const hasImage = Boolean(selectedImage);
    if ((!trimmed && !hasImage) || isLoading) return;

    const mode: 'analyze' | 'close-day' = trimmed.toLowerCase() === CLOSE_DAY_COMMAND ? 'close-day' : 'analyze';

    setIsLoading(true);
    setSubmitMode(mode);

    try {
      const token = await getSessionToken();

      const { mode: resultMode, payload } = await sendChat({
        text: trimmed,
        base64Image: selectedImage?.base64 ?? null,
        accessToken: token,
        mode,
      });

      if (resultMode === 'close-day') {
        setFeedback(null);
        setCloseDayFeedback(payload as CloseDayFeedback);
      } else {
        setFeedback(payload as ChatFeedback);
        triggerVibration('success');
        setCloseDayFeedback(null);
      }

      resetUiAfterSuccess();

      if (onUpdate) await onUpdate();
    } catch (err) {
      handleServiceError(err);
      setFeedback(null);
    } finally {
      setIsLoading(false);
      setSubmitMode(null);
    }
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, [recognitionRef]);

  const handleCloseDayModalClose = createHandleCloseDayModalClose(setCloseDayFeedback);

  const submitLabel = useMemo(() => computeSubmitLabel({ isLoading, submitMode, selectedImage }), [
    isLoading,
    submitMode,
    selectedImage,
  ]);

  return {
    inputText,
    setInputText,
    isLoading,
    submitMode,
    isListening,
    feedback,
    closeDayFeedback,
    selectedImage,
    textareaRef,
    fileInputRef,
    recognitionRef,
    evaluationText,
    isCloseDayCommand,
    handleImageButtonClick,
    handleImageSelect,
    clearSelectedImage,
    toggleListening,
    handleSubmit,
    handleCloseDayModalClose,
    submitLabel,
  };
}

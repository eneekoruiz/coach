import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { triggerVibration } from '@/lib/haptics';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useImageSelection } from './useImageSelection';
import { analyzeRequest, closeDayRequest, performChatRequest } from './useChatApi';
import { computeEvaluationText, computeSubmitLabel } from './useChatHelpers';
import { createHandleCloseDayModalClose } from './useChatActionsHelpers';

type SelectedImage = {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: any;
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

  const {
    selectedImage,
    fileInputRef,
    handleImageButtonClick,
    handleImageSelect,
    clearSelectedImage,
  } = useImageSelection();
  const { recognitionRef, isListening, toggleListening, stop } = useSpeechRecognition(
    (transcript) => {
      setInputText((currentText) => {
        const separator = currentText.trim().length > 0 ? ' ' : '';
        return `${currentText}${separator}${transcript}`.trimStart();
      });
    }
  );

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [inputText]);

  const evaluationText = useMemo(() => computeEvaluationText(feedback), [feedback]);

  const isCloseDayCommand = inputText.toLowerCase().trim() === 'cierra el día';

  // image selection and speech actions are provided by `useImageSelection` and `useSpeechRecognition`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = inputText.trim();
    const hasImage = Boolean(selectedImage);
    if ((!trimmedText && !hasImage) || isLoading) return;

    const requestMode: 'analyze' | 'close-day' =
      trimmedText.toLowerCase() === 'cierra el día' ? 'close-day' : 'analyze';

    setIsLoading(true);
    setSubmitMode(requestMode);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const result = await performChatRequest({
        text: trimmedText,
        base64Image: selectedImage?.base64 ?? null,
        accessToken,
        mode: requestMode,
      });

      if (!result.ok) throw new Error(result.payload.error ?? 'Error en la API.');

      if (result.mode === 'close-day') {
        setFeedback(null);
        setCloseDayFeedback(result.payload.data);
      } else {
        setFeedback(result.payload.data);
        triggerVibration('success');
        setCloseDayFeedback(null);
      }

      setInputText('');
      clearSelectedImage();
      stop();
      textareaRef.current?.focus();

      if (onUpdate) await onUpdate();
    } catch {
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
  }, []);

  const handleCloseDayModalClose = createHandleCloseDayModalClose(setCloseDayFeedback);

  const submitLabel = useMemo(
    () => computeSubmitLabel({ isLoading, submitMode, selectedImage }),
    [isLoading, submitMode, selectedImage]
  );

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

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { triggerVibration } from '@/lib/haptics';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useImageSelection } from './useImageSelection';
import { analyzeRequest, closeDayRequest, performChatRequest } from './useChatApi';

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

  const evaluationText = useMemo(() => {
    if (!feedback) return null;
    const delta = feedback.ai_data.metricas.variacion_inercia;
    if (delta > 0) return 'La lectura sugiere una mejora neta en la inercia fisiológica.';
    if (delta < 0) return 'La lectura detecta fricción fisiológica y recomienda corregir hábitos.';
    return 'La lectura se mantiene estable sin cambios relevantes de inercia.';
  }, [feedback]);

  const isCloseDayCommand = inputText.toLowerCase().trim() === 'cierra el día';

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  function stripDataUrlPrefix(value: string) {
    const commaIndex = value.indexOf(',');
    return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImageTypes.includes(file.type)) {
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setSelectedImage({
        previewUrl: result,
        base64: stripDataUrlPrefix(result),
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  }

  function clearSelectedImage() {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function toggleListening() {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      window.alert('Tu navegador no soporta dictado por voz. Prueba en Chrome o Edge.');
      return;
    }

    if (isListening) {
      stop();
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = navigator.language || 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const normalizedTranscript = transcript.trim();
      if (!normalizedTranscript) return;
      setInputText((currentText) => {
        const separator = currentText.trim().length > 0 ? ' ' : '';
        return `${currentText}${separator}${normalizedTranscript}`.trimStart();
      });
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

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

  function handleCloseDayModalClose() {
    setCloseDayFeedback(null);
  }

  const submitLabel =
    isLoading && submitMode === 'close-day'
      ? 'Generando tu Bio-Avatar...'
      : isLoading && selectedImage
        ? 'Analizando imagen...'
        : isLoading
          ? 'Analizando'
          : 'Enviar';

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

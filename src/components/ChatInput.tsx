'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  Mic,
  MessageSquareText,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { triggerVibration } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: {
    comidas: Array<{
      hora: string;
      descripcion: string;
      calidad_nutricional: 'buena' | 'regular' | 'mala';
    }>;
    hidratacion_ml: number;
    toxinas: string[];
    bio_avatar: {
      estado_fisiologico: string;
      energia_fisica: number;
      claridad_mental: number;
    };
    metricas: {
      variacion_inercia: number;
      aciertos: string[];
      error_clave: string;
      accion_manana: string;
    };
  };
};

type CloseDayFeedback = {
  puntuacion_global: number;
  aciertos: string[];
  error_clave: string;
  accion_manana: string;
  prompt_imagen: string;
  imageUrl: string;
};

type SelectedImage = {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

type ChatInputProps = {
  onUpdate?: () => void | Promise<void>;
};

const energyIcons = [1, 2, 3, 4, 5];
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function renderPips(level: number) {
  return energyIcons.map((slot) => (
    <span
      key={slot}
      className={`inline-block h-2.5 w-2.5 rounded-[3px] ${slot <= level ? 'bg-emerald-400' : 'bg-slate-300'}`}
    />
  ));
}

function stripDataUrlPrefix(value: string) {
  const commaIndex = value.indexOf(',');
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

export default function ChatInput({ onUpdate }: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'analyze' | 'close-day' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<ChatFeedback | null>(null);
  const [closeDayFeedback, setCloseDayFeedback] = useState<CloseDayFeedback | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [inputText]);

  const evaluationText = useMemo(() => {
    if (!feedback) {
      return null;
    }

    const delta = feedback.ai_data.metricas.variacion_inercia;

    if (delta > 0) {
      return 'La lectura sugiere una mejora neta en la inercia fisiológica.';
    }

    if (delta < 0) {
      return 'La lectura detecta fricción fisiológica y recomienda corregir hábitos.';
    }

    return 'La lectura se mantiene estable sin cambios relevantes de inercia.';
  }, [feedback]);

  const isCloseDayCommand = inputText.toLowerCase().trim() === 'cierra el día';

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';

      if (!result) {
        return;
      }

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function toggleListening() {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      window.alert('Tu navegador no soporta dictado por voz. Prueba en Chrome o Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = navigator.language || 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      const normalizedTranscript = transcript.trim();

      if (!normalizedTranscript) {
        return;
      }

      setInputText((currentText) => {
        const separator = currentText.trim().length > 0 ? ' ' : '';
        return `${currentText}${separator}${normalizedTranscript}`.trimStart();
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

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

    if ((!trimmedText && !hasImage) || isLoading) {
      return;
    }

    const requestMode: 'analyze' | 'close-day' =
      trimmedText.toLowerCase() === 'cierra el día' ? 'close-day' : 'analyze';

    setIsLoading(true);
    setSubmitMode(requestMode);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (requestMode === 'close-day') {
        const response = await fetch('/api/close-day', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({}),
        });

        const payload = (await response.json()) as { data?: CloseDayFeedback; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? 'No fue posible cerrar el día.');
        }

        if (!payload.data) {
          throw new Error('La API de cierre del día no devolvió datos estructurados.');
        }

        setFeedback(null);
        setCloseDayFeedback(payload.data);
        setInputText('');
        clearSelectedImage();
        recognitionRef.current?.stop();
        textareaRef.current?.focus();

        if (onUpdate) {
          await onUpdate();
        }

        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          text: trimmedText,
          image: selectedImage?.base64 ?? null,
        }),
      });

      const payload = (await response.json()) as { data?: ChatFeedback; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'No fue posible analizar el texto o la imagen.');
      }

      if (!payload.data) {
        throw new Error('La API no devolvió datos estructurados.');
      }

      setFeedback(payload.data);
      triggerVibration('success');
      setCloseDayFeedback(null);
      setInputText('');
      clearSelectedImage();
      recognitionRef.current?.stop();
      textareaRef.current?.focus();

      if (onUpdate) {
        await onUpdate();
      }
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

  return (
    <>
      <AnimatePresence>
        {closeDayFeedback ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 px-2 py-2 backdrop-blur-md sm:items-center sm:px-4 sm:py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[1.5rem] bg-white p-3 shadow-[0_28px_90px_rgba(15,23,42,0.32)] sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-[2rem] sm:p-4"
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 14, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <div className="flex items-start justify-between gap-3 px-1 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    Cierre del día
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
                    Tu Bio-Avatar final
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDayModalClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  aria-label="Cerrar cierre del día"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 overflow-y-auto pr-1 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
                  <div className="relative aspect-square bg-slate-900/5">
                    <img
                      src={closeDayFeedback.imageUrl}
                      alt="Bio-Avatar final generado con IA"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 py-4 text-white">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">
                        Prompt visual
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/90">
                        {closeDayFeedback.prompt_imagen}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-white p-4">
                  <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">
                      Puntuación global
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <p className="text-5xl font-semibold leading-none">
                        {closeDayFeedback.puntuacion_global}
                      </p>
                      <p className="text-sm text-white/75">/ 100</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Aciertos
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {closeDayFeedback.aciertos.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                        Error clave
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-800">
                        {closeDayFeedback.error_clave}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-700">
                        Acción mañana
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-emerald-950">
                        {closeDayFeedback.accion_manana}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/82 shadow-[0_18px_70px_rgba(15,23,42,0.2)] backdrop-blur-2xl sm:rounded-[1.75rem]">
        <div className="border-b border-slate-200/80 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-slate-900">
            <MessageSquareText className="h-4 w-4" />
            <span className="text-sm font-semibold">Registro de hábitos</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
          {feedback ? (
            <div className="space-y-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Evaluación
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{evaluationText}</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-700">Acción</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-emerald-950">
                    {feedback.ai_data.metricas.accion_manana}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Bio-Avatar
                  </p>
                  <div className="mt-2 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg text-white">
                      🐶
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {feedback.ai_data.bio_avatar.estado_fisiologico}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Descripción corta del estado fisiológico del día.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Energía y claridad
                  </p>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Energía</span>
                        <span>{feedback.ai_data.bio_avatar.energia_fisica}/5</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {renderPips(feedback.ai_data.bio_avatar.energia_fisica)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Claridad</span>
                        <span>{feedback.ai_data.bio_avatar.claridad_mental}/5</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {renderPips(feedback.ai_data.bio_avatar.claridad_mental)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Aciertos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {feedback.ai_data.metricas.aciertos.length > 0 ? (
                    feedback.ai_data.metricas.aciertos.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">Sin aciertos registrados.</span>
                  )}
                </div>
                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Error clave: </span>
                  {feedback.ai_data.metricas.error_clave}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Inercia</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {feedback.health_momentum}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cambio aplicado: {feedback.ai_data.metricas.variacion_inercia >= 0 ? '+' : ''}
                    {feedback.ai_data.metricas.variacion_inercia}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Hidratación
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {feedback.ai_data.hidratacion_ml} ml
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Dato estructurado desde la IA.</p>
                </div>
              </div>
            </div>
          ) : null}

          {selectedImage ? (
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/85 p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={selectedImage.previewUrl}
                      alt={selectedImage.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Imagen seleccionada
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedImage.fileName}
                    </p>
                    <p className="text-xs text-slate-500">Se enviará junto al texto al backend.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                  aria-label="Eliminar imagen seleccionada"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="mt-auto rounded-[1.5rem] border border-slate-200/80 bg-white px-3 py-3 shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />

            <label className="sr-only" htmlFor="habit-input">
              Describe tus hábitos del día
            </label>
            <textarea
              id="habit-input"
              ref={textareaRef}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              disabled={isLoading}
              rows={1}
              placeholder={
                isCloseDayCommand
                  ? 'Cierra el día'
                  : 'Describe comidas, hidratación, toxinas, descanso y sensaciones del día...'
              }
              className="max-h-[220px] w-full resize-none rounded-[1.1rem] border border-transparent bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-200 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                {isCloseDayCommand
                  ? 'Preparado para generar el cierre completo del día.'
                  : 'El backend validará la estructura y actualizará el estado en vivo.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isListening
                      ? 'border-red-200 bg-red-50 text-red-600 shadow-[0_0_0_4px_rgba(239,68,68,0.12)] animate-pulse'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-label={isListening ? 'Detener dictado' : 'Activar dictado por voz'}
                >
                  {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  disabled={isLoading}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Subir imagen de comida"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!inputText.trim() && !selectedImage)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  <span>{submitLabel}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

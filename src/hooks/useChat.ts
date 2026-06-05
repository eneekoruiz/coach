/*
  Clean, SRP-focused hook. Delegates session + request handling to `chatService`.
  Keeps only UI state, refs and small helpers. All heavy logic moved to services.
*/

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from '@/lib/toast';
import { type DailyLog } from '@/lib/schema';
import { triggerVibration } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useImageSelection } from './useImageSelection';
import { computeEvaluationText, computeSubmitLabel } from './useChatHelpers';
import { createHandleCloseDayModalClose } from './useChatActionsHelpers';
import { getSessionToken, sendChat, SessionExpiredError, ForbiddenError, PayloadTooLargeError, BadRequestError, RateLimitError } from '@/services/chatService';
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

export function useChat(onUpdate?: () => void | Promise<void>, momentum?: number) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'analyze' | 'close-day' | null>(null);
  const [feedback, setFeedback] = useState<ChatFeedback | null>(null);
  const [closeDayFeedback, setCloseDayFeedback] = useState<CloseDayFeedback | null>(null);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title: string }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const createNewSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title: `Conversación ${new Date().toLocaleDateString()}` })
        .select('id, title')
        .single();

      if (error) throw error;

      if (data) {
        setChatSessions((prev) => [data, ...prev]);
        setActiveSessionId(data.id);
        setHistory([]);
      }
    } catch (err) {
      console.error('Error creating new session:', err);
    }
  }, []);

  const loadSessions = useCallback(async (selectFirst = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setChatSessions(data);
        if (data.length > 0) {
          if (selectFirst || !activeSessionId) {
            setActiveSessionId(data[0].id);
          }
        } else {
          await createNewSession();
        }
      }
    } catch (err) {
      console.error('Error loading chat sessions:', err);
    }
  }, [activeSessionId, createNewSession]);

  const switchSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setHistory(data as any);
      }
    } catch (err) {
      console.error('Error loading session history:', err);
    }
  }, []);

  useEffect(() => {
    loadSessions(true);
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      switchSession(activeSessionId);
    }
  }, [activeSessionId, switchSession]);

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
      toast.error(err.message);
      return;
    }
    if (err instanceof RateLimitError) {
      toast.error(err.message);
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

    // Normalización de texto para las comprobaciones del interceptor local
    const normalizedText = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (tildes)
      .replace(/[¿?¡!.,;:#$%&()*+\-\/\\<=>@\[\]^_\`{|}~]/g, '') // Eliminar signos de puntuación y símbolos
      .trim();

    let localResponse: string | null = null;

    if (!hasImage && mode === 'analyze') {
      const words = normalizedText.split(/\s+/).filter(Boolean);

      // 1) Heurística para palabras sin sentido (gibberish)
      const hasGibberish = words.some((word) => {
        if (word.length >= 3) {
          // No contiene vocales (típico de sss, sdfg, qwer, etc.)
          const hasVowels = /[aeiouy]/i.test(word);
          if (!hasVowels) return true;

          // Combinaciones conocidas de teclado
          const keyboardMashes = ['asdf', 'qwerty', 'zxcv', 'dfgh', 'hjkl', 'lkjh', 'qwer', 'mnbvc', 'asd'];
          if (keyboardMashes.some((pattern) => word.includes(pattern))) return true;

          // Letra repetida 3 o más veces consecutivas (ej: jjjj, aaaa)
          if (/(.)\1{2,}/.test(word)) return true;
        }
        return false;
      });

      // 2) Interceptor local de configuración de agua diaria y tamaño de vaso
      const waterTargetMatch = trimmed.match(/(?:cambi|pon|ajust|configur)(?:a|ar)?\s*(?:mi\s*)?(?:meta|objetivo)(?:\s+de)?\s+agua(?:\s+diaria)?\s*(?:a|en|de)?\s*(\d+(?:[\.,]\d+)?)\s*(l|ml|litros|litro)?/i);
      const glassSizeMatch = trimmed.match(/(?:cambi|pon|ajust|configur)(?:a|ar)?\s*(?:mi\s*)?(?:vaso|taza)(?:\s+de\s+agua)?(?:\s+(?:a|en|de|es|sea|de\s*de))?\s*(\d+(?:[\.,]\d+)?)\s*(l|ml|litros|litro)?/i);

      if (waterTargetMatch || glassSizeMatch) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user session found.');

          const currentMeta = user.user_metadata || {};
          let newTarget = Number(currentMeta.daily_water_target_ml ?? 2000);
          let newGlass = Number(currentMeta.default_glass_size_ml ?? 250);
          let responseMsg = '';

          if (waterTargetMatch) {
            let val = parseFloat(waterTargetMatch[1].replace(',', '.'));
            const unit = (waterTargetMatch[2] || '').toLowerCase();
            if (unit.startsWith('l')) {
              val = val * 1000;
            }
            if (val >= 500 && val <= 10000) {
              newTarget = Math.round(val);
              responseMsg += `¡Entendido! He cambiado tu meta diaria de agua a **${newTarget} ml** (o ${(newTarget/1000).toFixed(1)} litros). `;
            } else {
              responseMsg += 'La meta de agua debe estar entre 500 ml y 10000 ml. ';
            }
          }

          if (glassSizeMatch) {
            let val = parseFloat(glassSizeMatch[1].replace(',', '.'));
            const unit = (glassSizeMatch[2] || '').toLowerCase();
            if (unit.startsWith('l')) {
              val = val * 1000;
            }
            if (val >= 50 && val <= 2000) {
              newGlass = Math.round(val);
              responseMsg += `He configurado tu tamaño de vaso predeterminado a **${newGlass} ml**. `;
            } else {
              responseMsg += 'El tamaño del vaso debe estar entre 50 ml y 2000 ml. ';
            }
          }

          if (responseMsg && !responseMsg.includes('debe estar')) {
            const { error: updateErr } = await supabase.auth.updateUser({
              data: {
                daily_water_target_ml: newTarget,
                default_glass_size_ml: newGlass,
              }
            });
            if (updateErr) throw updateErr;

            const currentMomentum = momentum ?? 100;
            setFeedback({
              previous_health_momentum: currentMomentum,
              health_momentum: currentMomentum,
              ai_data: {
                comidas: [],
                hidratacion_ml: 0,
                water_ml: 0,
                total_kcal: 0,
                protein_g: 0,
                carbs_g: 0,
                fats_g: 0,
                habits_count: {},
                toxinas: [],
                bio_avatar: {
                  estado_fisiologico: 'estable',
                  energia_fisica: 3,
                  claridad_mental: 3,
                },
                metricas: {
                  variacion_inercia: 0,
                  aciertos: [],
                  error_clave: 'fuera_de_tema',
                  accion_manana: responseMsg + '\n\nConfiguración aplicada con éxito y sincronizada con el dashboard. 💧',
                },
              },
            });

            triggerVibration('success');
            setCloseDayFeedback(null);
            resetUiAfterSuccess();
            if (onUpdate) await onUpdate();
            return;
          } else {
            localResponse = responseMsg || 'No he podido procesar ese cambio. Inténtalo indicando un valor numérico claro (ej. "meta de agua 3000ml").';
          }
        } catch (err) {
          console.error(err);
          localResponse = 'Hubo un error de conexión al actualizar tus ajustes. Inténtalo de nuevo.';
        }
      }

      // 3) Heurística para textos extremadamente cortos que no son respuestas válidas
      const isTooShort = normalizedText.length > 0 && normalizedText.length <= 2 &&
        !['ok', 'si', 'no', 'ya', 'he', 'go', 'up'].includes(normalizedText);

      if (hasGibberish) {
        localResponse = '¡Ups! Parece que eso ha sido un error de teclado o una palabra sin sentido. Cuéntame con palabras claras si has registrado algún hábito hoy, como \'beber agua\' o \'comida sana\'.';
      } else if (isTooShort) {
        localResponse = 'Ese mensaje es demasiado corto. Intenta escribir una frase sobre tus hábitos de hoy, por ejemplo: \'he tomado 2 vasos de agua\'.';
      } else {
        // 4) Diccionario local de saludos y comandos conversacionales comunes
        const greetings = [
          'hola', 'buenas', 'buenos dias', 'buenas noches', 'buen dia', 'buenas tardes',
          'hey', 'hello', 'hi', 'alo', 'saludos', 'que hay', 'que tal'
        ];
        const help = [
          'ayuda', 'help', 'que puedes hacer', 'como funciona esto', 'como funciona',
          'comandos', 'guia', 'instrucciones', 'explicame'
        ];
        const identity = [
          'quien eres', 'que eres', 'como te llamas', 'tu nombre', 'quien sos', 'que eres tu'
        ];
        const smallTalk = [
          'como estas', 'como va', 'como te va', 'todo bien', 'que haces'
        ];
        const thanks = [
          'gracias', 'thank you', 'ok', 'vale', 'perfecto', 'de nada', 'gracias coach', 'bien'
        ];

        if (greetings.includes(normalizedText)) {
          localResponse = '¡Hola! 😊 Estoy listo para ayudarte a registrar tus hábitos, comidas, hidratación o ejercicio de hoy. ¿Qué te gustaría añadir?';
        } else if (help.includes(normalizedText)) {
          localResponse = 'Puedo ayudarte a registrar tus hábitos en tiempo real. Escribe cosas como \'he bebido 3 vasos de agua\', \'he almorzado ensalada de pollo\' o \'no he fumado nada hoy\'. Al final del día, escribe \'cerrar dia\' para generar un informe completo.';
        } else if (identity.includes(normalizedText)) {
          localResponse = 'Soy tu Coach Bio-Avatar, un asistente inteligente diseñado para registrar tus rutinas de salud diarias y mantener a tu mascota digital feliz y activa.';
        } else if (smallTalk.includes(normalizedText)) {
          localResponse = '¡Todo va estupendamente por aquí, listo para registrar tus avances! ¿Qué tal va tu hidratación y alimentación hoy?';
        } else if (thanks.includes(normalizedText)) {
          localResponse = '¡De nada! Aquí estaré cuando quieras registrar algo más. ¡A seguir mejorando ese momentum! 💪';
        }
      }
    }

    if (localResponse) {
      // Interceptado localmente. No consume llamadas a Supabase/Gemini.
      const currentMomentum = momentum ?? 100;
      
      const userMsg = { role: 'user' as const, content: trimmed };
      const assistantMsg = { role: 'assistant' as const, content: localResponse };
      setHistory((prev) => [...prev, userMsg, assistantMsg]);

      // Guardar en Supabase para persistencia
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: trimmed, session_id: activeSessionId },
            { user_id: user.id, role: 'assistant', content: localResponse, session_id: activeSessionId }
          ]).then(({ error }) => {
            if (error) console.error('Error saving local response to chat_history:', error);
          });
        }
      });

      setFeedback({
        previous_health_momentum: currentMomentum,
        health_momentum: currentMomentum,
        ai_data: {
          comidas: [],
          hidratacion_ml: 0,
          water_ml: 0,
          total_kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 0,
          habits_count: {},
          toxinas: [],
          bio_avatar: {
            estado_fisiologico: 'estable',
            energia_fisica: 3,
            claridad_mental: 3,
          },
          metricas: {
            variacion_inercia: 0,
            aciertos: [],
            error_clave: 'fuera_de_tema', // Fuerza el renderizado del mensaje simple en el ChatFeedbackPanel
            accion_manana: localResponse,
          },
        },
      });

      triggerVibration('success');
      setCloseDayFeedback(null);
      resetUiAfterSuccess();
      return;
    }

    setIsLoading(true);
    setSubmitMode(mode);

    const userMsg = { role: 'user' as const, content: trimmed };
    setHistory((prev) => [...prev, userMsg]);

    try {
      const token = await getSessionToken();

      const { mode: resultMode, payload } = await sendChat({
        text: trimmed,
        base64Image: selectedImage?.base64 ?? null,
        accessToken: token,
        mode,
        history: [...history, userMsg],
        session_id: activeSessionId,
      });

      if (resultMode === 'close-day') {
        setFeedback(null);
        setCloseDayFeedback(payload as CloseDayFeedback);
      } else {
        const chatFeed = payload as ChatFeedback;
        setFeedback(chatFeed);
        triggerVibration('success');
        setCloseDayFeedback(null);

        const assistantText = chatFeed.ai_data?.metricas?.accion_manana;
        if (assistantText) {
          setHistory((prev) => [...prev, { role: 'assistant', content: assistantText }]);
        }
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
    history,
    setHistory,
    chatSessions,
    activeSessionId,
    createNewSession,
    switchSession,
  };
}

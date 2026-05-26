import { useRef, useState } from 'react';

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<any | null>(null);
  const [isListening, setIsListening] = useState(false);

  function toggleListening() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const normalizedTranscript = transcript.trim();
      if (!normalizedTranscript) return;
      onTranscript(normalizedTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { recognitionRef, isListening, toggleListening, stop };
}

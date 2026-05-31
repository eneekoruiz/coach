import React from 'react';
const Mic = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M12 1v11" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <path d="M5 19h14" />
  </svg>
);

const ImagePlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M8 14l2-2 3 3 4-4 3 3" />
    <path d="M15 8v6" />
  </svg>
);

const LoaderCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 50 50" className="animate-spin" aria-hidden="true" {...props}>
    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="31.4 31.4" />
  </svg>
);

const Square = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
  </svg>
);

interface ChatFormProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  hasSelectedImage: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  isListening: boolean;
  isCloseDayCommand: boolean;
  toggleListening: () => void;
  handleImageButtonClick: () => void;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}

export default function ChatForm({
  textareaRef,
  fileInputRef,
  hasSelectedImage,
  inputText,
  setInputText,
  isLoading,
  isListening,
  isCloseDayCommand,
  toggleListening,
  handleImageButtonClick,
  handleImageSelect,
  handleSubmit,
  submitLabel,
}: ChatFormProps) {
  return (
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
        onChange={(e) => setInputText(e.target.value)}
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
          <span className="h-3.5 w-3.5 inline-block">✨</span>
          {isCloseDayCommand
            ? 'Preparado para generar el cierre completo del día.'
            : 'El backend validará la estructura y actualizará el estado en vivo.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${isListening ? 'border-red-200 bg-red-50 text-red-600 shadow-[0_0_0_4px_rgba(239,68,68,0.12)] animate-pulse' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
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
            disabled={isLoading || (!inputText.trim() && !hasSelectedImage)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <span>{submitLabel}</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

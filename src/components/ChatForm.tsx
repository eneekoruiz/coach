import React from 'react';
import { Mic, ImagePlus, LoaderCircle, Square } from 'lucide-react';

export default function ChatForm({
  textareaRef,
  fileInputRef,
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
}: any) {
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
            disabled={isLoading || (!inputText.trim() && !fileInputRef?.current?.files?.length)}
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

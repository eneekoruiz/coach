'use client';

import React, { useMemo, useState } from 'react';
import { Camera, FileImage, Loader2, ScanSearch, Sparkles } from 'lucide-react';

import { scanDietPhotoWithAi } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

type DietScannerProps = {
  onImported: () => Promise<void> | void;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer la imagen.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export default function DietScanner({ onImported }: DietScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Sube una foto de la dieta en formato imagen.');
      return;
    }
    setSelectedFile(file);
  };

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error('Primero sube una foto de la dieta.');
      return;
    }

    setIsScanning(true);
    toast.success('Leyendo la dieta con IA...');

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await scanDietPhotoWithAi(base64, selectedFile.type, notes);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'La IA no pudo importar la dieta.');
      }

      await onImported();
      setSelectedFile(null);
      setNotes('');
      toast.success('Dieta digitalizada y guardada.', {
        description: `${result.data.recipes_created} recetas · ${result.data.templates_created} días base`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo digitalizar la dieta.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
          <ScanSearch className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Magic Importer
          </p>
          <h4 className="mt-1 text-base font-black tracking-tight text-slate-950">
            Sube una dieta en papel
          </h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            La IA la convierte en recetas, días base y una semana lista para editar.
          </p>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`mt-4 rounded-3xl border-2 border-dashed p-4 text-center transition-all duration-200 ease-in-out ${
          dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
        }`}
      >
        <input
          id="diet-scanner-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
        <label htmlFor="diet-scanner-input" className="block cursor-pointer">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Previsualización de la dieta"
              className="mx-auto h-36 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                <FileImage className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Arrastra la foto o tócala para abrir la cámara</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  JPG, PNG o captura directa desde móvil.
                </p>
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="mt-4">
        <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Contexto opcional
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Ej. Paciente deportista, 2500 kcal, sin lactosa..."
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-slate-300"
        />
      </div>

      <button
        type="button"
        onClick={handleScan}
        disabled={isScanning || !selectedFile}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition-all duration-200 ease-in-out hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        <span>{isScanning ? 'Digitalizando dieta' : 'Digitalizar con IA'}</span>
      </button>

      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
        <Camera className="h-3.5 w-3.5" />
        <span>Funciona mejor si la foto muestra el plan completo y con buena luz.</span>
      </div>
    </div>
  );
}

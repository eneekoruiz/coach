import React from 'react';

interface SelectedImage {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

export default function SelectedImagePreview({
  selectedImage,
  onClear,
}: {
  selectedImage: SelectedImage;
  onClear: () => void;
}) {
  if (!selectedImage) return null;

  return (
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
            <p className="mt-1 text-sm font-medium text-slate-900">{selectedImage.fileName}</p>
            <p className="text-xs text-slate-500">Se enviará junto al texto al backend.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          aria-label="Eliminar imagen seleccionada"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

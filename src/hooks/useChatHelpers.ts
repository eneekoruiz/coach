import type { DailyLog } from '@/lib/schema';

type FeedbackSnapshot = {
  ai_data?: Pick<DailyLog, 'metricas'> | null;
} | null;

type SelectedImagePreview = {
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

export function computeEvaluationText(feedback: FeedbackSnapshot) {
  if (!feedback) return null;
  const delta = feedback.ai_data?.metricas?.variacion_inercia ?? 0;
  if (delta > 0) return 'La lectura sugiere una mejora neta en la inercia fisiológica.';
  if (delta < 0) return 'La lectura detecta fricción fisiológica y recomienda corregir hábitos.';
  return 'La lectura se mantiene estable sin cambios relevantes de inercia.';
}

export function computeSubmitLabel({
  isLoading,
  submitMode,
  selectedImage,
}: {
  isLoading: boolean;
  submitMode: string | null;
  selectedImage: SelectedImagePreview | null;
}) {
  if (isLoading && submitMode === 'close-day') return 'Generando tu Bio-Avatar...';
  if (isLoading && selectedImage) return 'Analizando imagen...';
  if (isLoading) return 'Analizando';
  return 'Enviar';
}

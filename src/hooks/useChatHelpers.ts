export function computeEvaluationText(feedback: any) {
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
  selectedImage: any;
}) {
  if (isLoading && submitMode === 'close-day') return 'Generando tu Bio-Avatar...';
  if (isLoading && selectedImage) return 'Analizando imagen...';
  if (isLoading) return 'Analizando';
  return 'Enviar';
}

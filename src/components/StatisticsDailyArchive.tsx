'use client';

import React from 'react';

import type { DailyLog } from '@/lib/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

type MoodHistoryEntry = {
  id: string;
  date: string;
  mood_score: number | null;
  valence_score: number | null;
  is_daily_summary: boolean | null;
  impact_factors: string[] | null;
  impact_tags: string[] | null;
};

function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export default function StatisticsDailyArchive({
  logs,
  moodEntries,
}: {
  logs: HistoryLog[];
  moodEntries: MoodHistoryEntry[];
}) {
  const [openValue, setOpenValue] = React.useState<string | undefined>(logs[0]?.date);

  const moodByDate = React.useMemo(
    () =>
      moodEntries.reduce<Record<string, MoodHistoryEntry>>((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = entry;
        }
        return acc;
      }, {}),
    [moodEntries]
  );

  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        Aún no hay días archivados.
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={openValue}
      onValueChange={setOpenValue}
      className="space-y-3"
    >
      {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => {
        const mood = moodByDate[log.date];
        const water = log.ai_data?.water_ml ?? log.ai_data?.hidratacion_ml ?? 0;
        const meals = log.ai_data?.comidas ?? [];
        const achievements = log.ai_data?.metricas?.aciertos ?? [];

        return (
          <AccordionItem
            key={log.date}
            value={log.date}
            className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <AccordionTrigger className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left">
              <div className="min-w-0">
                <p className="text-sm font-black capitalize tracking-tight text-slate-950">
                  {formatDateLabel(log.date)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                  <span>{log.health_momentum}% inercia</span>
                  <span>{log.ai_data?.total_kcal ?? 0} kcal</span>
                  <span>{water} ml</span>
                  {mood && <span>ánimo {Number(mood.valence_score ?? mood.mood_score ?? 3).toFixed(1)}</span>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Resumen del día</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    {log.ai_data?.metricas?.error_clave
                      ? `Punto delicado: ${log.ai_data.metricas.error_clave}.`
                      : 'Sin incidencias clave registradas.'}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Siguiente enfoque: {log.ai_data?.metricas?.accion_manana || 'Sin acción sugerida.'}
                  </p>
                  {achievements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {achievements.map((item) => (
                        <span
                          key={`${log.date}-${item}`}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Comidas registradas</p>
                  <div className="mt-3 space-y-2">
                    {meals.length > 0 ? (
                      meals.map((meal, index) => (
                        <div key={`${log.date}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-black text-slate-800">{meal.hora} · {meal.descripcion}</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            Calidad {meal.calidad_nutricional}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-slate-500">Sin comidas estructuradas ese día.</p>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

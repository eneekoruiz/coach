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

        const d = new Date(`${log.date}T12:00:00`);
        const dayNum = d.getDate();
        const monthStr = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
        const weekdayStr = d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3).toUpperCase();

        return (
          <AccordionItem
            key={log.date}
            value={log.date}
            className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-slate-300"
          >
            <AccordionTrigger className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left p-0 hover:no-underline">
              <div className="flex items-center gap-4 min-w-0 w-full">
                {/* Date Card (Apple Style) */}
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm shrink-0">
                  <span className="text-[8px] font-black tracking-wider text-rose-500 leading-none mb-0.5">{weekdayStr}</span>
                  <span className="text-base font-black text-slate-900 leading-none">{dayNum}</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">{monthStr}</span>
                </div>

                {/* Info and Badges */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black capitalize tracking-tight text-slate-900 leading-snug">
                    {formatDateLabel(log.date)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-700 font-extrabold">{log.health_momentum}% inercia</span>
                    {log.ai_data?.total_kcal ? (
                      <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-orange-700">{log.ai_data.total_kcal} kcal</span>
                    ) : null}
                    {water ? (
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-700">{water} ml</span>
                    ) : null}
                    {mood ? (
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700">Ánimo {Number(mood.valence_score ?? mood.mood_score ?? 3).toFixed(1)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 border-t border-slate-100 mt-3">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] pt-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Resumen y Enfoque</p>
                  <p className="mt-2.5 text-xs font-bold leading-relaxed text-slate-700">
                    {log.ai_data?.metricas?.error_clave
                      ? `⚠️ Punto delicado: ${log.ai_data.metricas.error_clave}.`
                      : '✅ Sin incidencias clave registradas.'}
                  </p>
                  <p className="mt-2.5 text-xs font-bold leading-relaxed text-slate-700">
                    🎯 Siguiente enfoque: {log.ai_data?.metricas?.accion_manana || 'Sin acción sugerida.'}
                  </p>
                  {achievements.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200/50">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mb-2">Aciertos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {achievements.map((item) => (
                          <span
                            key={`${log.date}-${item}`}
                            className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200 shadow-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Comidas registradas</p>
                  <div className="mt-3 space-y-2">
                    {meals.length > 0 ? (
                      meals.map((meal, index) => (
                        <div key={`${log.date}-${index}`} className="rounded-xl border border-slate-150 bg-slate-50/50 px-3 py-2 flex flex-col justify-between">
                          <p className="text-xs font-black text-slate-800">{meal.hora} · {meal.descripcion}</p>
                          <p className="mt-1 text-[9px] font-black text-emerald-700 bg-emerald-50 self-start px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Calidad {meal.calidad_nutricional}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 italic">Sin comidas estructuradas ese día.</p>
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

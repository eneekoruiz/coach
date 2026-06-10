'use client';

import React, { Suspense, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import {
  Activity,
  CalendarHeart,
  Download,
  Droplets,
  FileSpreadsheet,
  FileUp,
  Flame,
  HeartPulse,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

import { type DailyLog, type MoodEntry } from '@/lib/schema';
import { type HabitRow } from '@/types/habits';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { importDailyLogsBulk } from '@/app/nutrition/actions';
import HistoryCard from '@/components/HistoryCard';
import HistoryDetailPanel from '@/components/HistoryDetailPanel';

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

type ImportPreviewEntry = {
  date: string;
  meals: Array<{ hora: string; descripcion: string; calidad_nutricional: 'buena' | 'regular' | 'mala' }>;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_ml: number;
};

interface HistoryClientContainerProps {
  logs: HistoryLog[];
  moodEntries: MoodHistoryEntry[];
  habits: HabitRow[];
}

const TrendChart = dynamic(() => import('@/components/TrendChart'), { ssr: false });

function MetricBlock({
  icon,
  eyebrow,
  title,
  value,
  detail,
  tint,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  tint: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">{eyebrow}</p>
          <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{title}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint}`}>{icon}</div>
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

export default function HistoryClientContainer({ logs, moodEntries, habits }: HistoryClientContainerProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'daily'>('stats');
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    daysCount: number;
    rowsCount: number;
    entries: ImportPreviewEntry[];
  } | null>(null);

  const summary = useMemo(() => {
    const orderedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const latest = orderedLogs.at(-1);
    const previous = orderedLogs.at(-2);
    const momentumDelta = latest && previous ? latest.health_momentum - previous.health_momentum : 0;
    const avgKcal =
      orderedLogs.length > 0
        ? Math.round(orderedLogs.reduce((sum, log) => sum + (log.ai_data?.total_kcal ?? 0), 0) / orderedLogs.length)
        : 0;
    const avgWater =
      orderedLogs.length > 0
        ? Math.round(
            orderedLogs.reduce(
              (sum, log) => sum + (log.ai_data?.water_ml ?? log.ai_data?.hidratacion_ml ?? 0),
              0
            ) / orderedLogs.length
          )
        : 0;

    const positiveHabits = habits.filter((habit) => habit.type === 'positive');
    const negativeHabits = habits.filter((habit) => habit.type === 'negative');
    const bestPositive = positiveHabits.reduce((best, habit) => {
      if (!best) return habit;
      return habit.current_streak > best.current_streak ? habit : best;
    }, null as HabitRow | null);
    const bestNegative = negativeHabits.reduce((best, habit) => {
      if (!best) return habit;
      return habit.current_streak > best.current_streak ? habit : best;
    }, null as HabitRow | null);

    const dailySummaries = moodEntries.filter((entry) => entry.is_daily_summary);
    const moodSource = dailySummaries.length > 0 ? dailySummaries : moodEntries;
    const moodAverage =
      moodSource.length > 0
        ? (
            moodSource.reduce((sum, entry) => sum + Number(entry.valence_score ?? entry.mood_score ?? 3), 0) /
            moodSource.length
          ).toFixed(1)
        : '0.0';
    const topMoodFactor = Object.entries(
      moodSource.reduce<Record<string, number>>((acc, entry) => {
        const tags = entry.impact_tags ?? entry.impact_factors ?? [];
        tags.forEach((tag) => {
          acc[tag] = (acc[tag] ?? 0) + 1;
        });
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      momentumDelta,
      avgKcal,
      avgWater,
      bestPositive,
      bestNegative,
      moodAverage,
      topMoodFactor: topMoodFactor ?? 'Sin patrón',
      loggedDays: orderedLogs.length,
    };
  }, [habits, logs, moodEntries]);

  const handleExport = async () => {
    setIsExporting(true);
    toast.success('Iniciando exportación de datos nutricionales...');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión para exportar datos.');
        return;
      }

      const [{ data: logsData, error: logsError }, { data: templatesData, error: templatesError }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('diet_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ]);

      if (logsError) throw logsError;
      if (templatesError) throw templatesError;

      const downloadCSV = (csvContent: string, filename: string) => {
        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const escapeCSV = (cell: string) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      };

      const logsHeaders = [
        'Fecha',
        'Calorias_Kcal',
        'Proteina_g',
        'Carbohidratos_g',
        'Grasas_g',
        'Agua_ml',
        'Momentum',
        'Comidas',
      ];
      const logsRows = (logsData ?? []).map((row) => {
        const ai = (row.ai_data ?? {}) as Partial<DailyLog>;
        const meals = Array.isArray(ai.comidas)
          ? ai.comidas
              .map((meal) => `[${meal.hora || '12:00'}] ${meal.descripcion} (${meal.calidad_nutricional || 'buena'})`)
              .join('; ')
          : '';
        return [
          row.date || '',
          String(ai.total_kcal ?? 0),
          String(ai.protein_g ?? 0),
          String(ai.carbs_g ?? 0),
          String(ai.fats_g ?? 0),
          String(ai.water_ml ?? ai.hidratacion_ml ?? 0),
          String(row.health_momentum ?? 50),
          meals,
        ];
      });

      const templatesHeaders = [
        'Nombre_Plantilla',
        'Calorias_Objetivo_Kcal',
        'Proteina_Objetivo_g',
        'Carbohidratos_Objetivo_g',
        'Grasas_Objetivo_g',
        'Comidas_Planificadas',
      ];
      const templatesRows = (templatesData ?? []).map((row) => {
        const meals = Array.isArray(row.meals)
          ? row.meals
              .map(
                (meal: { name?: string; text?: string; target_kcal?: number }) =>
                  `${meal.name ?? 'Comida'}: ${meal.text ?? ''} (${meal.target_kcal ?? 0} kcal)`
              )
              .join('; ')
          : '';
        return [
          row.name || '',
          String(row.target_kcal ?? 2000),
          String(row.target_protein ?? 150),
          String(row.target_carbs ?? 200),
          String(row.target_fats ?? 70),
          meals,
        ];
      });

      downloadCSV(
        [logsHeaders.join(','), ...logsRows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(','))].join('\n'),
        'historial_nutricion.csv'
      );

      setTimeout(() => {
        downloadCSV(
          [
            templatesHeaders.join(','),
            ...templatesRows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(',')),
          ].join('\n'),
          'plantillas_dieta.csv'
        );
        toast.success('¡Exportación completada con éxito!');
        setIsExporting(false);
      }, 600);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Error al exportar datos: ${message}`);
      setIsExporting(false);
    }
  };

  const handleImportCSV = (file: File) => {
    setIsImporting(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsImporting(false);
        const rows = results.data;
        if (!rows.length) {
          toast.error('El archivo CSV está vacío.');
          return;
        }

        const headers = Object.keys(rows[0] ?? {});
        const dateKey = headers.find((header) => ['fecha', 'date'].includes(header.toLowerCase().trim()));
        const foodKey = headers.find((header) =>
          ['alimento', 'food', 'descripcion', 'description'].includes(header.toLowerCase().trim())
        );
        const kcalKey = headers.find((header) => ['kcal', 'calories', 'calorias'].includes(header.toLowerCase().trim()));

        if (!dateKey || !foodKey || !kcalKey) {
          toast.error('Formato inválido. Las columnas Fecha, Alimento y Kcal son obligatorias.');
          return;
        }

        const protKey = headers.find((header) =>
          ['proteina', 'proteina_g', 'protein', 'proteins'].includes(header.toLowerCase().trim())
        );
        const carbKey = headers.find((header) =>
          ['carbohidratos', 'carbohidratos_g', 'carbs', 'carbohydrates'].includes(header.toLowerCase().trim())
        );
        const fatKey = headers.find((header) => ['grasas', 'grasas_g', 'fat', 'fats'].includes(header.toLowerCase().trim()));
        const waterKey = headers.find((header) => ['agua', 'agua_ml', 'water', 'hydration'].includes(header.toLowerCase().trim()));

        const groupedByDate: Record<string, ImportPreviewEntry> = {};

        try {
          rows.forEach((row, index) => {
            const dateVal = row[dateKey]?.trim() ?? '';
            const foodVal = row[foodKey]?.trim() ?? '';
            const kcalVal = Number(row[kcalKey] ?? 0);
            if (!dateVal || !foodVal) {
              throw new Error(`Fila ${index + 1}: Fecha y Alimento no pueden estar vacíos.`);
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
              throw new Error(`Fila ${index + 1}: Formato de fecha inválido (${dateVal}). Use AAAA-MM-DD.`);
            }

            if (!groupedByDate[dateVal]) {
              groupedByDate[dateVal] = {
                date: dateVal,
                meals: [],
                total_kcal: 0,
                protein_g: 0,
                carbs_g: 0,
                fats_g: 0,
                water_ml: 0,
              };
            }

            groupedByDate[dateVal].meals.push({
              hora: '12:00',
              descripcion: foodVal,
              calidad_nutricional: 'buena',
            });
            groupedByDate[dateVal].total_kcal += Number.isFinite(kcalVal) ? Math.round(kcalVal) : 0;
            groupedByDate[dateVal].protein_g += Number.isFinite(Number(row[protKey ?? ''])) ? Math.round(Number(row[protKey ?? ''])) : 0;
            groupedByDate[dateVal].carbs_g += Number.isFinite(Number(row[carbKey ?? ''])) ? Math.round(Number(row[carbKey ?? ''])) : 0;
            groupedByDate[dateVal].fats_g += Number.isFinite(Number(row[fatKey ?? ''])) ? Math.round(Number(row[fatKey ?? ''])) : 0;
            groupedByDate[dateVal].water_ml += Number.isFinite(Number(row[waterKey ?? ''])) ? Math.round(Number(row[waterKey ?? ''])) : 0;
          });

          const entries = Object.values(groupedByDate).sort((a, b) => a.date.localeCompare(b.date));
          setImportPreview({ daysCount: entries.length, rowsCount: rows.length, entries });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo CSV.');
        }
      },
      error: (error) => {
        setIsImporting(false);
        toast.error(`Error al parsear el archivo CSV: ${error.message}`);
      },
    });
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    toast.success('Guardando datos importados en Supabase...');
    try {
      const result = await importDailyLogsBulk(importPreview.entries);
      if (result.success) {
        toast.success(`¡Se han importado con éxito ${result.count} días de registros nutricionales!`);
        setImportPreview(null);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(result.error || 'Error al guardar los datos importados.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Error en la importación: ${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (selectedLog) {
    return <HistoryDetailPanel log={selectedLog} onBack={() => setSelectedLog(null)} />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricBlock
          icon={<CalendarHeart className="h-5 w-5 text-emerald-600" />}
          eyebrow="Semana"
          title="Tendencia"
          value={`${summary.momentumDelta >= 0 ? '+' : ''}${summary.momentumDelta}`}
          detail={`${summary.loggedDays} días trazados en memoria fisiológica.`}
          tint="bg-emerald-50"
        />
        <MetricBlock
          icon={<Activity className="h-5 w-5 text-orange-500" />}
          eyebrow="Nutrición"
          title="Calorías medias"
          value={`${summary.avgKcal}`}
          detail={`Agua media ${summary.avgWater}ml · lectura rápida del periodo actual.`}
          tint="bg-orange-50"
        />
        <MetricBlock
          icon={<Flame className="h-5 w-5 text-indigo-600" />}
          eyebrow="Hábitos"
          title={summary.bestPositive?.name ?? 'Sin hábito líder'}
          value={`${summary.bestPositive?.current_streak ?? 0}d`}
          detail={`Positivos en foco · Sobriedad líder ${summary.bestNegative?.current_streak ?? 0}d.`}
          tint="bg-indigo-50"
        />
        <MetricBlock
          icon={<HeartPulse className="h-5 w-5 text-rose-500" />}
          eyebrow="Ánimo"
          title="Balance emocional"
          value={summary.moodAverage}
          detail={`Factor dominante: ${summary.topMoodFactor}.`}
          tint="bg-rose-50"
        />
      </section>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Portabilidad</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Caja de herramientas</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Importa o exporta tu historial sin perder la lectura principal.</p>
          </div>
          <button
            onClick={() => setShowImporter((current) => !current)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white"
          >
            <FileUp className="h-4 w-4" />
            {showImporter ? 'Ocultar herramientas' : 'Mostrar herramientas'}
          </button>
        </div>

        {showImporter && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Download className="h-4 w-4 text-cyan-600" />
                Exportar nutrición
              </h4>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Descarga registros diarios y plantillas de dieta en CSV listos para Excel o Google Sheets.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-black text-white transition-all duration-200 ease-in-out disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar CSV
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <UploadCloud className="h-4 w-4 text-cyan-600" />
                Importar historial
              </h4>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) handleImportCSV(file);
                }}
                className={`mt-3 rounded-2xl border-2 border-dashed p-5 text-center transition ${
                  dragOver ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  id="history-import"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImportCSV(file);
                  }}
                />
                <label htmlFor="history-import" className="cursor-pointer">
                  <p className="text-xs font-black text-slate-700">Suelta tu CSV aquí o toca para subir</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Fecha, Alimento y Kcal son obligatorias.</p>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {importPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">Confirmar importación</h3>
                <p className="text-xs font-semibold text-slate-500">Se sobrescribirá la nutrición de esos días.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
              <div className="flex justify-between"><span>Filas parseadas</span><span>{importPreview.rowsCount}</span></div>
              <div className="flex justify-between"><span>Días detectados</span><span>{importPreview.daysCount}</span></div>
              <div className="flex justify-between"><span>Rango</span><span>{importPreview.entries[0]?.date} → {importPreview.entries.at(-1)?.date}</span></div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="min-h-[44px] flex-1 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="min-h-[44px] flex-[1.4] rounded-2xl bg-slate-950 text-xs font-black text-white transition-all duration-200 ease-in-out disabled:opacity-60"
              >
                {isImporting ? 'Importando...' : 'Confirmar e importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-full px-5 py-2 text-xs font-black transition-all duration-200 ease-in-out ${
              activeTab === 'stats' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`rounded-full px-5 py-2 text-xs font-black transition-all duration-200 ease-in-out ${
              activeTab === 'daily' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Registro diario
          </button>
        </div>
      </div>

      <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-[2rem] bg-slate-100" />}>
        {activeTab === 'stats' ? (
          <div className="space-y-5">
            <TrendChart logs={logs} />

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Nutrición</p>
                <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">Lectura de adherencia</h4>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-orange-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Media kcal</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{summary.avgKcal}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Media agua</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{summary.avgWater}ml</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Hábitos Positivos</p>
                <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {summary.bestPositive?.name ?? 'Sin hábito protagonista'}
                </h4>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                  {summary.bestPositive?.current_streak ?? 0}
                  <span className="ml-2 text-sm font-black uppercase tracking-widest text-slate-400">días</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Récord global {summary.bestPositive?.longest_streak ?? 0} días.
                </p>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Hábitos Negativos</p>
                <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {summary.bestNegative?.name ?? 'Sin reloj activo'}
                </h4>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                  {summary.bestNegative?.current_streak ?? 0}
                  <span className="ml-2 text-sm font-black uppercase tracking-widest text-slate-400">días limpios</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Diseñado para sostener continuidad, no para castigar un tropiezo aislado.
                </p>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Ánimo</p>
                <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">Balance emocional</h4>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{summary.moodAverage}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Factor más repetido: {summary.topMoodFactor}.
                </p>
              </article>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {logs.length === 0 ? (
              <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                Aún no hay datos históricos suficientes.
              </div>
            ) : (
              [...logs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((log, index) => (
                  <HistoryCard key={`${log.date}-${index}`} log={log} onOpen={() => setSelectedLog(log)} />
                ))
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
}

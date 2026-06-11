'use client';

import React, { useMemo, useState } from 'react';
import { Activity, CalendarHeart, Flame, HeartPulse } from 'lucide-react';

import { type BodyMetric, type DailyLog, type Workout } from '@/lib/schema';
import { type HabitRow } from '@/types/habits';
import TrendChart from '@/components/TrendChart';
import StatisticsDailyArchive from '@/components/StatisticsDailyArchive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface HistoryClientContainerProps {
  logs: HistoryLog[];
  moodEntries: MoodHistoryEntry[];
  habits: HabitRow[];
  bodyMetrics: BodyMetric[];
  workouts: Workout[];
}

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

export default function HistoryClientContainer({
  logs,
  moodEntries,
  habits,
  bodyMetrics,
  workouts,
}: HistoryClientContainerProps) {
  const [activeTab, setActiveTab] = useState('trends');
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

    const latestWeight = bodyMetrics.at(-1)?.weight;
    const workoutMinutes = workouts.reduce((sum, workout) => sum + workout.duration_minutes, 0);

    return {
      momentumDelta,
      avgKcal,
      avgWater,
      bestPositive,
      bestNegative,
      moodAverage,
      topMoodFactor: topMoodFactor ?? 'Sin patrón',
      loggedDays: orderedLogs.length,
      latestWeight: latestWeight ? `${latestWeight.toFixed(1)} kg` : 'Sin peso',
      workoutMinutes,
    };
  }, [bodyMetrics, habits, logs, moodEntries, workouts]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-1 gap-1 rounded-[1.5rem] border border-slate-200 bg-white p-1 shadow-sm sm:grid-cols-2">
          {[
            ['trends', 'Tendencias'],
            ['archive', 'Archivo'],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-h-[44px] rounded-[1.15rem] px-3 text-xs font-black transition-all duration-200 ease-in-out active:scale-95"
              activeClassName="bg-slate-950 text-white shadow-sm"
              inactiveClassName="text-slate-500 hover:bg-slate-50"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
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
              detail={`Agua media ${summary.avgWater}ml · peso ${summary.latestWeight}.`}
              tint="bg-orange-50"
            />
            <MetricBlock
              icon={<Flame className="h-5 w-5 text-indigo-600" />}
              eyebrow="Hábitos"
              title={summary.bestPositive?.name ?? 'Sin hábito líder'}
              value={`${summary.bestPositive?.current_streak ?? 0}d`}
              detail={`Sobriedad líder ${summary.bestNegative?.current_streak ?? 0}d · actividad ${summary.workoutMinutes} min.`}
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

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Tendencias y Gráficas</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Lectura del patrón</h2>
            </div>
            <TrendChart logs={logs} />
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Archivo Diario</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Cada día, desplegado con calma</h2>
          </div>
          <StatisticsDailyArchive logs={logs} moodEntries={moodEntries} />
        </TabsContent>


      </Tabs>
    </div>
  );
}

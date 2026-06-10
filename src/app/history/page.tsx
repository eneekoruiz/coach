import { createServerClient } from '@supabase/ssr';
// Use lightweight inline SVGs for icons to avoid SSR bundling issues
const CalendarHeart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <path d="M16 2v4"></path>
    <path d="M8 2v4"></path>
    <path d="M3 10h18"></path>
    <path d="M12 17c1.656-2 4-3 4-4.5A2.5 2.5 0 0 0 13.5 10 2.5 2.5 0 0 0 12 11.5 2.5 2.5 0 0 0 10.5 10 2.5 2.5 0 0 0 9 12.5C9 14 11 15 12 17z"></path>
  </svg>
);

const ChevronLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import HistoryClientContainer from '@/components/HistoryClientContainer';
import { dailyLogSchema, type BodyMetric, type DailyLog, type Workout } from '@/lib/schema';
import type { HabitRow } from '@/types/habits';

type HistoryRow = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: unknown;
};

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

type LegacyDailyLog = Partial<DailyLog> & {
  aciertos?: string[];
  error_clave?: string;
  accion_manana?: string;
};

type HistoryPageProps = {
  searchParams: Promise<{
    page?: string;
    period?: '7D' | '1M' | '6M';
  }>;
};

const PAGE_SIZE = 6;

import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 scrollbar-hide">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
            <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
              Timeline histórico
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Modo local sin Supabase
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              La vista histórica necesita las credenciales reales para leer los registros.
            </p>
            <div className="mt-4">
              <Link
                 href="/"
                 className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.01]"
              >
                Volver al Dashboard
              </Link>
            </div>
          </header>
        </div>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const period = resolvedSearchParams.period || '7D';

  const endDate = new Date().toISOString().slice(0, 10);
  let days = 7;
  if (period === '1M') days = 30;
  if (period === '6M') days = 180;

  const startDateTime = new Date();
  startDateTime.setDate(startDateTime.getDate() - days);
  const startDate = startDateTime.toISOString().slice(0, 10);

  const { createServerClient } = await import('@supabase/ssr');
  const cookieStore = await cookies();
  const supabaseReal = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabaseReal.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data }, { data: moodData }, { data: habitsData }, { data: bodyMetricsData }, { data: workoutsData }] = await Promise.all([
    supabaseReal
      .from('daily_logs')
      .select('date, health_momentum, avatar_image_url, ai_data')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(180),
    supabaseReal
      .from('mood_logs')
      .select('id, date, mood_score, valence_score, is_daily_summary, impact_factors, impact_tags')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(180),
    supabaseReal
      .from('user_habits')
      .select('*')
      .eq('user_id', user.id),
    supabaseReal
      .from('body_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(180),
    supabaseReal
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(180),
  ]);

  const rows = (data ?? []) as HistoryRow[];
  const logs: HistoryLog[] = rows.map((row) => {
    let parsedAiData: DailyLog | null = null;
    if (row.ai_data) {
      const result = dailyLogSchema.safeParse(row.ai_data);
      if (result.success) {
        parsedAiData = result.data;
      } else {
        const raw = row.ai_data as LegacyDailyLog;
        parsedAiData = {
          date: raw.date ?? row.date,
          comidas: raw.comidas ?? [],
          hidratacion_ml: raw.hidratacion_ml ?? raw.water_ml ?? 0,
          toxinas: raw.toxinas ?? [],
          bio_avatar: {
            estado_fisiologico: raw.bio_avatar?.estado_fisiologico ?? 'Estable',
            energia_fisica: raw.bio_avatar?.energia_fisica ?? 3,
            claridad_mental: raw.bio_avatar?.claridad_mental ?? 3,
          },
          metricas: {
            variacion_inercia: raw.metricas?.variacion_inercia ?? 0,
            aciertos: raw.metricas?.aciertos ?? raw.aciertos ?? [],
            error_clave: raw.metricas?.error_clave ?? raw.error_clave ?? 'ninguno',
            accion_manana: raw.metricas?.accion_manana ?? raw.accion_manana ?? 'Ninguna',
          },
          water_ml: raw.water_ml ?? raw.hidratacion_ml ?? 0,
          total_kcal: raw.total_kcal ?? 0,
          protein_g: raw.protein_g ?? 0,
          carbs_g: raw.carbs_g ?? 0,
          fats_g: raw.fats_g ?? 0,
          habits_count: raw.habits_count ?? {},
        };
      }
    }
    return {
      date: row.date,
      health_momentum: row.health_momentum,
      avatar_image_url: row.avatar_image_url,
      ai_data: parsedAiData,
    };
  });

  const hasLogs = logs.length > 0;

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 scrollbar-hide">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
                Memoria Fisiológica
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Tendencias
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Explora el impacto visual de tus hábitos en el tiempo a través del análisis inteligente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Link>
            </div>
          </div>
        </header>

        {hasLogs ? (
          <HistoryClientContainer
            logs={logs}
            moodEntries={(moodData ?? []) as MoodHistoryEntry[]}
            habits={(habitsData ?? []) as HabitRow[]}
            bodyMetrics={((bodyMetricsData ?? []) as BodyMetric[]).map((metric) => ({
              ...metric,
              weight: Number(metric.weight),
              body_fat_percentage:
                metric.body_fat_percentage === null || metric.body_fat_percentage === undefined
                  ? null
                  : Number(metric.body_fat_percentage),
              muscle_mass:
                metric.muscle_mass === null || metric.muscle_mass === undefined
                  ? null
                  : Number(metric.muscle_mass),
            }))}
            workouts={((workoutsData ?? []) as Workout[]).map((workout) => ({
              ...workout,
              duration_minutes: Number(workout.duration_minutes),
              kcal_burned: Number(workout.kcal_burned),
            }))}
          />
        ) : (
          <section className="flex min-h-[50vh] items-center justify-center px-2">
            <div className="max-w-xl rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">
                <CalendarHeart className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">
                Tu Bio-Avatar acaba de nacer
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Cierra tu primer día para ver tu historial aquí y construir la memoria visual de tu
                evolución.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:scale-[1.01]"
                >
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

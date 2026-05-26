import { createServerClient } from '@supabase/ssr';
import { CalendarHeart, ChevronLeft } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import HistoryCard from '@/components/HistoryCard';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';

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

type HistoryPageProps = {
  searchParams?: {
    page?: string;
  };
};

const PAGE_SIZE = 6;

function formatSpanishDate(dateValue: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function formatShortHeader(dateValue: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(dateValue));
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
            <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
              Timeline histórico
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Modo local sin Supabase
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              La vista histórica necesita las credenciales reales para leer los registros. La
              interfaz principal sí está disponible en local.
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
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = searchParams ?? {};
  const currentPage = Math.max(1, Number(resolvedSearchParams.page ?? '1') || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error, count } = await supabase
    .from('daily_logs')
    .select('date, health_momentum, avatar_image_url, ai_data', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const logs: HistoryLog[] = (data ?? []).map((item: HistoryRow) => ({
    date: item.date,
    health_momentum: item.health_momentum,
    avatar_image_url: item.avatar_image_url,
    ai_data: dailyLogSchema.safeParse(item.ai_data).success
      ? dailyLogSchema.parse(item.ai_data)
      : null,
  }));

  const hasLogs = logs.length > 0;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
                Timeline histórico
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Memoria Fisiológica
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Recorre la evolución de tu Bio-Avatar día a día y conserva el impacto visual de cada
                cierre.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </header>

        {hasLogs ? (
          <>
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {logs.map((log) => {
                const summary = log.ai_data?.metricas ?? null;

                return (
                  <details
                    key={`${log.date}-${log.health_momentum}`}
                    className="overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/80 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5"
                  >
                    <summary className="cursor-pointer list-none p-3 focus:outline-none">
                      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
                        <div className="relative">
                          <div className="aspect-[4/5] w-full bg-gradient-to-b from-slate-100 to-slate-200">
                            {log.avatar_image_url ? (
                              <img
                                src={log.avatar_image_url}
                                alt={`Bio-Avatar del ${formatSpanishDate(log.date)}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(226,232,240,0.92))]">
                                <Sparkles className="h-10 w-10 text-slate-400" />
                              </div>
                            )}
                          </div>

                          <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
                              {formatShortHeader(log.date)}
                            </div>
                            <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                              {log.health_momentum}%
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                              Día
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-950">
                              {formatSpanishDate(log.date)}
                            </h2>
                          </div>

                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                            <span className="text-xs uppercase tracking-[0.3em] text-white/70">
                              Inercia fisiológica
                            </span>
                            <span className="text-base font-semibold">{log.health_momentum}</span>
                          </div>

                          <p className="text-sm leading-6 text-slate-600">
                            Haz clic para ver el resumen del día.
                          </p>
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-slate-200 bg-slate-50/90 p-4">
                      {summary ? (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                              Acción de mañana
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-800">
                              {summary.accion_manana}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                              Aciertos
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {summary.aciertos.length > 0 ? (
                                summary.aciertos.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                                  >
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">
                                  Sin aciertos registrados.
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                              Error clave
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-800">
                              {summary.error_clave}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-slate-600">
                          El resumen estructurado de este día no pudo validarse, pero la imagen
                          histórica sigue disponible.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </section>

            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/75 px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Página {currentPage} de {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/history?page=${currentPage - 1}`}
                  aria-disabled={!hasPreviousPage}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    hasPreviousPage
                      ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      : 'pointer-events-none border-slate-100 bg-slate-100 text-slate-400'
                  }`}
                >
                  Anterior
                </Link>
                <Link
                  href={`/history?page=${currentPage + 1}`}
                  aria-disabled={!hasNextPage}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    hasNextPage
                      ? 'bg-slate-950 text-white hover:scale-[1.01]'
                      : 'pointer-events-none bg-slate-200 text-slate-400'
                  }`}
                >
                  Siguiente
                </Link>
              </div>
            </div>
          </>
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
    </main>
  );
}

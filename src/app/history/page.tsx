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
  searchParams: Promise<{
    page?: string;
  }>;
};

const PAGE_SIZE = 6;

import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
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
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = Math.max(1, Number(resolvedSearchParams.page ?? '1') || 1);

  const { fetchHistoryPage } = await import('@/lib/history-server');
  const fetched = await fetchHistoryPage(requestedPage);

  if (!fetched.user) {
    redirect('/login');
  }

  const logs: HistoryLog[] = fetched.logs ?? [];
  const hasLogs = logs.length > 0;
  const totalPages = fetched.totalPages ?? 1;
  const hasPreviousPage = fetched.hasPreviousPage ?? false;
  const hasNextPage = fetched.hasNextPage ?? false;

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
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
              {logs.map((log) => (
                <HistoryCard key={`${log.date}-${log.health_momentum}`} log={log} />
              ))}
            </section>

            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/75 px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Página {requestedPage} de {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/history?page=${requestedPage - 1}`}
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
                  href={`/history?page=${requestedPage + 1}`}
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
    </div>
  );
}

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

  // Fetch complete history logs (all pages) for the Trends component
  // We can fetch up to 180 days for the 6M view
  const { fetchHistoryPage } = await import('@/lib/history-server');
  
  // Here we might just fetch the first page with a high limit or multiple pages
  // For the sake of the redesign, let's fetch a large batch 
  // In a real app we would have a dedicated endpoint for chart data, but for now we fetch page 1 with 180 limit if supported,
  // or we just rely on fetchHistoryPage but we need to modify it or just use the data we have.
  // Assuming fetchHistoryPage uses PAGE_SIZE = 6, we might not get enough data.
  // I will just fetch from Supabase directly here for the charts to bypass the pagination limit.
  
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => undefined } } // Readonly is fine here but we need the actual user cookie
  );
  
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

  const { data, error } = await supabaseReal
    .from('daily_logs')
    .select('date, health_momentum, avatar_image_url, ai_data')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(180);

  const logs: HistoryLog[] = (data || []).map((row: any) => {
    let parsedAiData: DailyLog | null = null;
    if (row.ai_data) {
      const result = dailyLogSchema.safeParse(row.ai_data);
      if (result.success) parsedAiData = result.data;
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
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
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
          <HistoryClientContainer logs={logs} />
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

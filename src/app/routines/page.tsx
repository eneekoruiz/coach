import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DailyChecklist from '@/components/DailyChecklist';

const CheckSquare = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const ChevronLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default async function RoutinesPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Modo local sin Supabase
            </h1>
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

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
                Rutinas de Cuidado
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Tareas Diarias
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Mantén tus hábitos diarios bajo control con recordatorios optimizados y seguimiento instantáneo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Link>
            </div>
          </div>
        </header>

        <section className="w-full">
          {/* Main daily routines checklist container */}
          <DailyChecklist isDedicatedPage={true} />
        </section>
      </div>
    </div>
  );
}

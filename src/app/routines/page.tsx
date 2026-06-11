import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DailyChecklist from '@/components/DailyChecklist';
import ScreenGuideButton from '@/components/ScreenGuideButton';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { isE2EMockMode } from '@/lib/e2e';

export const metadata = {
  title: 'Tareas | BioAvatar',
};

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ListChecksIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M11 6h10" />
    <path d="M11 12h10" />
    <path d="M11 18h10" />
    <path d="M3 6l1.5 1.5L8 4" />
    <path d="M3 12l1.5 1.5L8 10" />
    <path d="M3 18l1.5 1.5L8 16" />
  </svg>
);

export default async function RoutinesPage() {
  if (isE2EMockMode()) {
    return (
      <main className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 text-slate-950">
        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-4 sm:px-6 md:pb-8 lg:px-8 scrollbar-hide">
          <div className="mx-auto w-full max-w-4xl">
            <GlobalErrorBoundary>
              <DailyChecklist isDedicatedPage={true} />
            </GlobalErrorBoundary>
          </div>
        </section>
      </main>
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="flex h-[100dvh] flex-1 items-center justify-center overflow-hidden bg-slate-50 p-6 text-slate-950">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Daily Task Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Modo local sin Supabase</h1>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-all duration-200 ease-in-out active:scale-95"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
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

  const {
    data: { user },
  } = await supabaseReal.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 text-slate-950">
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-4 sm:px-6 md:pb-8 lg:px-8 scrollbar-hide">
        <div className="mx-auto w-full max-w-4xl">
          <GlobalErrorBoundary>
            <DailyChecklist isDedicatedPage={true} />
          </GlobalErrorBoundary>
        </div>
      </section>
    </main>
  );
}

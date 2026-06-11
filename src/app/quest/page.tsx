import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import QuestZone from '@/components/QuestZone';

export const metadata = {
  title: 'Knowledge Quest | BioAvatar',
};

export default async function QuestPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="flex h-[100dvh] flex-1 items-center justify-center overflow-hidden overflow-x-hidden bg-slate-50 p-6 text-slate-950">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Knowledge Quest</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Modo local sin Supabase</h1>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
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

  return <QuestZone />;
}

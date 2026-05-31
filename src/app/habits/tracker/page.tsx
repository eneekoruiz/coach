import Link from 'next/link';

import HabitTracker from '@/components/HabitTracker';

export const metadata = {
  title: 'Habit Tracker - BioAvatar',
  description: 'Registro y seguimiento diario de hábitos (fumar, azúcar, hidratación, etc.)',
};

export default function HabitTrackerPage() {
  return (
    <main className="mx-auto max-w-3xl py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Seguimiento de hábitos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Registra cantidades puntuales (ej. número de cigarrillos) para que el sistema actualice las rachas automáticamente.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          aria-label="Volver al inicio"
        >
          Volver al inicio
        </Link>
      </div>
      <HabitTracker />
    </main>
  );
}

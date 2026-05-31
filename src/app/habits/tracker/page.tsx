import HabitTracker from '@/components/HabitTracker';

export const metadata = {
  title: 'Habit Tracker - BioAvatar',
  description: 'Registro y seguimiento diario de hábitos (fumar, azúcar, hidratación, etc.)',
};

export default function HabitTrackerPage() {
  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Seguimiento de hábitos</h1>
      <p className="text-sm text-slate-500 mb-6">Registra cantidades puntuales (ej. número de cigarrillos) para que el sistema actualice las rachas automáticamente.</p>
      <HabitTracker />
    </main>
  );
}

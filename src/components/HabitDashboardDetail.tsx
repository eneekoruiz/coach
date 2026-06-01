import HabitCalendar from '@/components/HabitCalendar';
import { type HabitRow } from '@/types/habits';

type Entry = { date: string; status: 'perfect' | 'yellow' | 'broken' | 'missed' };

export default function HabitDashboardDetail({ habit, entries }: { habit: HabitRow; entries: Entry[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Detalle activo</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">{habit.name}</h3>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white">
          {habit.type === 'negative' ? 'Racha resiliente' : 'Racha de acción'}
        </div>
      </div>

      <HabitCalendar habitName={habit.name} entries={entries} />
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { type DailyDietOverride, type DietProgram, type DietProgramDay, type DietTemplate, type Recipe, type WeeklyPlan } from '@/lib/schema';
import { getWeeklyPlans, projectWeeklyPlanToCalendar } from '@/app/nutrition/actions';
import DayDetailDrawer from './DayDetailDrawer';
import toast from '@/lib/toast';
import { triggerVibration } from '@/lib/haptics';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Repeat2,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface DietCalendarViewProps {
  templates: DietTemplate[];
  calendar: Array<{ date: string; template_id: string }>;
  recipes: Recipe[];
  overrides: DailyDietOverride[];
  activeProgram: DietProgram | null;
  activeProgramDays: DietProgramDay[];
  onUpdate: () => void;
}

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromIsoDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function getFirstMondayInMonth(date: Date) {
  const candidate = new Date(date.getFullYear(), date.getMonth(), 1);
  while (candidate.getDay() !== 1) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return toIsoDate(candidate);
}

export default function DietCalendarView({
  templates,
  calendar,
  recipes,
  overrides,
  activeProgram,
  activeProgramDays,
  onUpdate,
}: DietCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [weeklyPlansLoading, setWeeklyPlansLoading] = useState(false);
  const [isWeeklyPlanModalOpen, setIsWeeklyPlanModalOpen] = useState(false);
  const [selectedWeeklyPlanId, setSelectedWeeklyPlanId] = useState('');
  const [projectionStartDate, setProjectionStartDate] = useState(() => getFirstMondayInMonth(new Date()));
  const [projectionWeeks, setProjectionWeeks] = useState(4);
  const [projecting, setProjecting] = useState(false);

  const loadWeeklyPlans = async () => {
    setWeeklyPlansLoading(true);
    const plans = await getWeeklyPlans();
    setWeeklyPlans(plans);
    setWeeklyPlansLoading(false);
  };

  useEffect(() => {
    void loadWeeklyPlans();
  }, []);

  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Array<string | null> = [];
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let index = 0; index < startDay; index++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(toIsoDate(new Date(year, month, day)));
    }

    return days;
  }, [currentDate]);

  const mondaysInView = useMemo(
    () => monthGrid.filter((date): date is string => date !== null && fromIsoDate(date).getDay() === 1),
    [monthGrid]
  );

  const selectedWeeklyPlan = weeklyPlans.find((plan) => plan.id === selectedWeeklyPlanId);

  const getTemplateForDate = (dateStr: string) => {
    const override = overrides.find((overrideItem) => overrideItem.date === dateStr);
    if (override) {
      return { template: override.custom_diet, source: 'Ajuste' };
    }

    if (activeProgram && activeProgramDays.length > 0) {
      const start = fromIsoDate(activeProgram.start_date);
      const current = fromIsoDate(dateStr);
      const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const cycleLength = activeProgram.microcycle_length;
      const dayNum = diffDays >= 0
        ? (diffDays % cycleLength) + 1
        : (((diffDays % cycleLength) + cycleLength) % cycleLength) + 1;
      const dayMap = activeProgramDays.find((day) => day.day_number === dayNum);
      const template = dayMap ? templates.find((item) => item.id === dayMap.template_id) : null;
      if (template) {
        return { template, source: `Ciclo ${dayNum}` };
      }
    }

    const entry = calendar.find((item) => item.date === dateStr);
    const template = entry ? templates.find((item) => item.id === entry.template_id) : null;
    return template ? { template, source: 'Manual' } : null;
  };

  const openWeeklyPlanModal = (planId?: string, startDate?: string) => {
    const fallbackPlan = weeklyPlans.find((plan) => plan.is_active) || weeklyPlans[0];
    const nextPlanId = planId || fallbackPlan?.id || '';

    if (!nextPlanId) {
      toast.error('Crea primero un Plan Semanal.');
      return;
    }

    triggerVibration('light');
    setSelectedWeeklyPlanId(nextPlanId);
    setProjectionStartDate(startDate || getFirstMondayInMonth(currentDate));
    setProjectionWeeks(4);
    setIsWeeklyPlanModalOpen(true);
  };

  const handleProjectWeeklyPlan = async () => {
    if (!selectedWeeklyPlanId) {
      toast.error('Selecciona un plan semanal.');
      return;
    }

    if (!projectionStartDate) {
      toast.error('Selecciona un lunes de inicio.');
      return;
    }

    if (fromIsoDate(projectionStartDate).getDay() !== 1) {
      toast.error('Elige un lunes como fecha de inicio.');
      return;
    }

    if (projectionWeeks < 1 || projectionWeeks > 52) {
      toast.error('El número de repeticiones debe estar entre 1 y 52 semanas.');
      return;
    }

    setProjecting(true);
    const result = await projectWeeklyPlanToCalendar(
      selectedWeeklyPlanId,
      projectionStartDate,
      projectionWeeks
    );
    setProjecting(false);

    if (!result.success) {
      toast.error(result.error || 'Error al proyectar el plan semanal');
      return;
    }

    toast.success(`${result.daysProjected} días rellenados en el calendario`);
    setIsWeeklyPlanModalOpen(false);
    await loadWeeklyPlans();
    onUpdate();
  };

  const prevMonth = () => {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Librería
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              Semanas
            </h3>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            7 días
          </span>
        </div>

        <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {weeklyPlansLoading ? (
            <div className="space-y-2">
              <div className="h-24 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
              <div className="h-24 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            </div>
          ) : weeklyPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <CalendarDays className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-500">
                Crea bloques en Planes Semanales.
              </p>
            </div>
          ) : (
            weeklyPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => openWeeklyPlanModal(plan.id)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-slate-700 transition hover:border-emerald-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{plan.name}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                      Clic para aplicar al mes
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                    plan.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'border border-slate-200 bg-white text-slate-500'
                  }`}>
                    {plan.is_active ? 'ACTIVA' : 'SEMANA'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                    <span
                      key={day}
                      className="flex h-6 items-center justify-center rounded-md bg-white text-[9px] font-black text-slate-400"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Lienzo de Trabajo
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openWeeklyPlanModal()}
              disabled={weeklyPlans.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Repeat2 className="h-4 w-4" />
              Rellenar con semana
            </button>
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <div key={day} className="py-1 text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {day}
            </div>
          ))}

          {monthGrid.map((dateStr, index) => {
            if (!dateStr) {
              return <div key={`empty-${index}`} className="min-h-[96px] rounded-xl bg-slate-50/40" />;
            }

            const dateData = getTemplateForDate(dateStr);
            const dayNum = Number(dateStr.split('-')[2]);
            const isToday = dateStr === toIsoDate(new Date());
            const isSelected = selectedDate === dateStr;
            const isMonday = fromIsoDate(dateStr).getDay() === 1;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`flex min-h-[96px] flex-col rounded-xl border p-2 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : isToday
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {dayNum}
                  </span>
                  {isMonday && (
                    <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
                      isSelected ? 'bg-white text-slate-900' : 'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      Lunes
                    </span>
                  )}
                </div>

                {dateData ? (
                  <div className="mt-auto">
                    <div className={`rounded-lg px-2 py-1.5 ${
                      isSelected ? 'bg-white/10' : 'bg-white border border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Sun className={`h-3.5 w-3.5 ${isSelected ? 'text-amber-200' : 'text-amber-500'}`} />
                        <p className={`truncate text-[10px] font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {dateData.template.name}
                        </p>
                      </div>
                      <p className={`mt-1 text-[9px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {dateData.source} · {dateData.template.target_kcal} kcal
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className={`mt-auto text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    Sin asignar
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <DayDetailDrawer
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ''}
        templates={templates}
        calendar={calendar}
        recipes={recipes}
        overrides={overrides}
        activeProgram={activeProgram}
        activeProgramDays={activeProgramDays}
        onUpdate={onUpdate}
      />

      <AnimatePresence>
        {isWeeklyPlanModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWeeklyPlanModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 1 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-[2.5rem] border-t border-slate-200 bg-white p-5 pb-8 shadow-[0_-18px_60px_rgba(15,23,42,0.14)]"
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Relleno masivo
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                    ¿Desde qué lunes quieres aplicar esta semana y cuántas veces la repetimos?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWeeklyPlanModalOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto py-5 pr-1 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Semana
                  </label>
                  <select
                    value={selectedWeeklyPlanId}
                    onChange={(event) => setSelectedWeeklyPlanId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    {weeklyPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}{plan.is_active ? ' · Activa' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Lunes de inicio
                  </label>
                  <input
                    type="date"
                    value={projectionStartDate}
                    onChange={(event) => setProjectionStartDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {mondaysInView.slice(0, 4).map((monday) => (
                      <button
                        key={monday}
                        type="button"
                        onClick={() => setProjectionStartDate(monday)}
                        className={`h-9 rounded-lg border px-2 text-[10px] font-black transition ${
                          projectionStartDate === monday
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        L {Number(monday.split('-')[2])}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Repeticiones
                  </label>
                  <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setProjectionWeeks((current) => Math.max(1, current - 1))}
                      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:bg-slate-50 active:scale-95"
                    >
                      -
                    </button>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center">
                      <p className="text-3xl font-black text-slate-900">{projectionWeeks}</p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {projectionWeeks === 1 ? 'semana' : 'semanas'} · {projectionWeeks * 7} días
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProjectionWeeks((current) => Math.min(52, current + 1))}
                      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:bg-slate-50 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[1, 2, 4, 8].map((weeks) => (
                      <button
                        key={weeks}
                        type="button"
                        onClick={() => setProjectionWeeks(weeks)}
                        className={`h-8 rounded-lg text-[10px] font-black transition ${
                          projectionWeeks === weeks
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {weeks} sem
                      </button>
                    ))}
                  </div>
                </div>

                {selectedWeeklyPlan && projectionStartDate && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Resumen
                    </p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-700">
                      {selectedWeeklyPlan.name} se aplicará desde el lunes {Number(projectionStartDate.split('-')[2])} durante {projectionWeeks} {projectionWeeks === 1 ? 'semana' : 'semanas'}.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsWeeklyPlanModalOpen(false)}
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50 active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProjectWeeklyPlan}
                  disabled={projecting || !selectedWeeklyPlanId}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {projecting ? (
                    <>
                      <Repeat2 className="h-4 w-4 animate-spin" />
                      Aplicando
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Rellenar {projectionWeeks * 7} días
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  deleteWeeklyPlan,
  getActiveWeeklyPlan,
  getDietTemplates,
  getWeeklyPlanDetails,
  getWeeklyPlans,
  saveWeeklyPlan,
} from '@/app/nutrition/actions';
import { type DietTemplate, type WeeklyPlan } from '@/lib/schema';
import toast from '@/lib/toast';
import { triggerVibration } from '@/lib/haptics';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  Plus,
  Save,
  Sun,
  Trash2,
} from 'lucide-react';
import ShareAchievementButton from './ShareAchievementButton';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 7, label: 'Domingo', short: 'D' },
];

function isVariation(template: DietTemplate) {
  return Boolean(template.parent_template_id);
}

export default function WeeklyPlanBuilder() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [planName, setPlanName] = useState('Semana Base');
  const [dayMappings, setDayMappings] = useState<Record<number, string>>({});
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [isDetailActive, setIsDetailActive] = useState(false);

  const assignedCount = useMemo(
    () => DAYS_OF_WEEK.filter((day) => Boolean(dayMappings[day.value])).length,
    [dayMappings]
  );

  const handleExportPlan = () => {
    if (Object.keys(dayMappings).length === 0) {
      toast.error('Primero asigna al menos un Día Base a la semana.');
      return;
    }

    const mealNames = Array.from(
      new Set(
        Object.values(dayMappings)
          .map((templateId) => templates.find((template) => template.id === templateId))
          .flatMap((template) => template?.meals.map((meal) => meal.name) ?? [])
      )
    );

    const rows = mealNames.map((mealName) => {
      const row: Record<string, string> = { Comida: mealName };
      DAYS_OF_WEEK.forEach((day) => {
        const template = templates.find((item) => item.id === dayMappings[day.value]);
        const meal = template?.meals.find((item) => item.name === mealName);
        row[day.label] = meal ? `${meal.text} (${Math.round(meal.target_kcal)} kcal)` : '';
      });
      return row;
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${planName.trim().replace(/\s+/g, '-').toLowerCase() || 'plan-semanal'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Plan exportado a CSV.');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedTemplates, fetchedPlans, activeResult] = await Promise.all([
        getDietTemplates(),
        getWeeklyPlans(),
        getActiveWeeklyPlan(),
      ]);

      setTemplates(fetchedTemplates);
      setWeeklyPlans(fetchedPlans);

      if (activeResult.plan) {
        hydratePlan(activeResult.plan, activeResult.days);
      } else if (fetchedPlans.length > 0 && fetchedPlans[0].id) {
        await handleSelectPlan(fetchedPlans[0].id, fetchedPlans, false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar planes semanales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const hydratePlan = (
    plan: WeeklyPlan,
    days: Array<{ day_of_week: number; template_id: string }>
  ) => {
    setPlanId(plan.id);
    setPlanName(plan.name);
    setIsActive(plan.is_active);
    setSelectedPlanId(plan.id || null);

    const mappings: Record<number, string> = {};
    days.forEach((day) => {
      mappings[day.day_of_week] = day.template_id;
    });
    setDayMappings(mappings);
  };

  const handleSelectPlan = async (id: string, planSource = weeklyPlans, isUserClick = false) => {
    triggerVibration('light');
    setSelectedPlanId(id);

    const plan = planSource.find((item) => item.id === id);
    if (plan) {
      setPlanId(plan.id);
      setPlanName(plan.name);
      setIsActive(plan.is_active);
    }

    const details = await getWeeklyPlanDetails(id);
    if (details.plan) {
      hydratePlan(details.plan, details.days);
    }

    if (isUserClick) {
      setIsDetailActive(true);
    }
  };

  const handleCreateNew = () => {
    triggerVibration('light');
    setPlanId(undefined);
    setPlanName('Semana Base');
    setDayMappings({});
    setIsActive(true);
    setSelectedPlanId(null);
    setIsDetailActive(true);
  };

  const handleSave = async () => {
    triggerVibration('light');

    const daysData: Array<{ day_of_week: number; template_id: string }> = [];
    for (const day of DAYS_OF_WEEK) {
      const templateId = dayMappings[day.value];
      if (!templateId) {
        toast.error(`Asigna un Día Base al ${day.label}.`);
        return;
      }
      daysData.push({ day_of_week: day.value, template_id: templateId });
    }

    const result = await saveWeeklyPlan(
      {
        id: planId,
        name: planName.trim() || 'Semana Base',
        is_active: isActive,
      },
      daysData
    );

    if (!result.success || !result.data) {
      toast.error(result.error || 'Error al guardar el plan semanal');
      return;
    }

    toast.success('Plan semanal guardado');
    setPlanId(result.data.id);
    setSelectedPlanId(result.data.id);
    setIsDetailActive(false);
    const fetchedPlans = await getWeeklyPlans();
    setWeeklyPlans(fetchedPlans);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este plan semanal?')) return;

    triggerVibration('light');
    const result = await deleteWeeklyPlan(id);
    if (!result.success) {
      toast.error(result.error || 'Error al eliminar');
      return;
    }

    toast.success('Plan semanal eliminado');
    handleCreateNew();
    setIsDetailActive(false);
    const fetchedPlans = await getWeeklyPlans();
    setWeeklyPlans(fetchedPlans);
  };

  return (
    <div className="h-[72dvh] min-h-0 overflow-y-auto pr-1 md:overflow-hidden md:pr-0 select-none">
      {!isDetailActive ? (
        /* Library View */
        <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Librería
                </p>
                <h3 className="text-base font-black text-slate-900">
                  Planes Semanales
                </h3>
              </div>
            </div>
          </div>

          {/* Prominent Action Button */}
          <button
            type="button"
            onClick={handleCreateNew}
            className="mt-4 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-black text-white hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all shadow-md shrink-0"
          >
            <Plus className="h-5 w-5" />
            + Nuevo Plan Semanal
          </button>

          <div className="mt-6 border-t border-slate-100 pt-4 shrink-0 flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Mis Planes Guardados
            </h4>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {weeklyPlans.length} planes
            </span>
          </div>

          {/* List of plans */}
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
            {loading ? (
              <div className="space-y-3">
                <div className="h-20 rounded-2xl border border-slate-100 bg-slate-50 animate-pulse" />
                <div className="h-20 rounded-2xl border border-slate-100 bg-slate-50 animate-pulse" />
              </div>
            ) : weeklyPlans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-350" />
                <p className="mt-3 text-xs font-bold text-slate-500">Sin planes semanales guardados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weeklyPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => plan.id && handleSelectPlan(plan.id, weeklyPlans, true)}
                      className="group w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left transition hover:border-slate-350 hover:bg-white hover:shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-black text-slate-950">{plan.name}</span>
                          {plan.is_active && (
                            <span className="shrink-0 rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[8px] font-black border border-emerald-100 uppercase tracking-wider">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-slate-500">
                          Bloque de 7 días
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Editor View */
        <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm max-w-6xl mx-auto overflow-y-auto custom-scrollbar animate-fade-in">
          <button
            type="button"
            onClick={() => setIsDetailActive(false)}
            className="self-start mb-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-black uppercase text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la Biblioteca
          </button>

          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Lienzo de Trabajo
              </p>
              <input
                type="text"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                className="mt-1 w-full rounded-none border-b border-transparent bg-transparent pb-1 text-xl font-black text-slate-900 outline-none transition focus:border-slate-300"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Asigna un Día Base a cada día de la semana. Las variaciones se mantienen vinculadas a su día original.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareAchievementButton
                payload={{
                  title: planName.trim() || 'Plan semanal',
                  subtitle: 'Semana estructurada en BioAvatar',
                  primaryValue: `${assignedCount}/7`,
                  primaryLabel: 'días asignados',
                  secondaryValue: isActive
                    ? 'Semana activa lista para proyectarse al calendario.'
                    : 'Semana guardada como bloque reusable de 7 días.',
                  footer: 'Planificación clínica con fricción cero.',
                  accentFrom: '#38bdf8',
                  accentTo: '#818cf8',
                  badge: 'Weekly Plan',
                  avatarLabel: 'W',
                  filename: `weekly-plan-${(planName.trim() || 'semana').toLowerCase().replace(/\s+/g, '-')}.png`,
                }}
                className="border-slate-200 bg-slate-950 text-white min-h-[40px]"
              />
              <button
                type="button"
                onClick={handleExportPlan}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-95 min-h-[40px]"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              {planId && (
                <button
                  type="button"
                  onClick={() => handleDelete(planId)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 active:scale-95 min-h-[40px]"
                  title="Eliminar plan semanal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95 min-h-[40px]"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {DAYS_OF_WEEK.map((day) => {
              const assignedTemplateId = dayMappings[day.value];
              const assignedTemplate = templates.find((template) => template.id === assignedTemplateId);

              return (
                <div
                  key={day.value}
                  className={`flex min-h-[180px] flex-col rounded-xl border p-3 transition ${
                    assignedTemplate
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${
                      assignedTemplate ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                    }`}>
                      {day.short}
                    </span>
                    {assignedTemplate && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {day.label}
                  </p>

                  <select
                    value={assignedTemplateId || ''}
                    onChange={(event) =>
                      setDayMappings((current) => ({ ...current, [day.value]: event.target.value }))
                    }
                    className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Sin Día Base</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {isVariation(template) ? 'V2 · ' : ''}{template.name} ({template.target_kcal} kcal)
                      </option>
                    ))}
                  </select>

                  {assignedTemplate ? (
                    <div className="mt-auto pt-3">
                      <div className="rounded-lg border border-white/70 bg-white px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          <p className="truncate text-[10px] font-black text-slate-800">
                            {assignedTemplate.name}
                          </p>
                        </div>
                        <p className="mt-1 text-[9px] font-bold text-slate-400">
                          {assignedTemplate.target_kcal} kcal · {assignedTemplate.meals.length} comidas
                        </p>
                        {isVariation(assignedTemplate) && (
                          <span className="mt-2 inline-flex rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black text-amber-700">
                            V2 · Modificado
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center">
                      <p className="text-[10px] font-bold text-slate-400">Esperando Día Base</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <span
                  key={day.value}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black ${
                    dayMappings[day.value] ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  {day.short}
                </span>
              ))}
              <span className="ml-2 text-xs font-bold text-slate-500">
                {assignedCount}/7 días listos
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsActive((current) => !current)}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-[10px] font-black transition active:scale-95 ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {isActive ? 'Semana activa' : 'Marcar como activa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

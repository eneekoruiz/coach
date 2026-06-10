'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DietCalendarView from './DietCalendarView';
import RecipeLibrary from './RecipeLibrary';
import DailyTemplateBuilder from './DailyTemplateBuilder';
import WeeklyPlanBuilder from './WeeklyPlanBuilder';
import TodayNutritionView from './TodayNutritionView';
import ScreenGuideButton from './ScreenGuideButton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNutritionPlan, type NutritionTab } from '@/hooks/useNutritionPlan';
import { BookOpen, Calendar, ClipboardList, LayoutGrid, Sun } from 'lucide-react';

const nutritionTabs: Array<{
  id: NutritionTab;
  step: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'recipes', step: '1', label: 'Recetario', caption: 'Platos', icon: BookOpen },
  { id: 'days', step: '2', label: 'Días Base', caption: 'Plantillas', icon: Sun },
  { id: 'programs', step: '3', label: 'Planes Semanales', caption: '7 días', icon: ClipboardList },
  { id: 'calendar', step: '4', label: 'Calendario (Paciente)', caption: 'Mes', icon: Calendar },
];

export default function NutritionContainer({ initialTab }: { initialTab?: NutritionTab }) {
  const [isPlannerOpen, setIsPlannerOpen] = useState(Boolean(initialTab && initialTab !== 'calendar'));
  const [mobileAccordionValue, setMobileAccordionValue] = useState<string | undefined>(
    initialTab === 'recipes' || initialTab === 'days' ? initialTab : undefined
  );
  const {
    activeTab,
    setActiveTab,
    loading,
    authRequired,
    templates,
    calendar,
    recipes,
    overrides,
    activeProgram,
    activeProgramDays,
    realLog,
    isGeneratingAi,
    todayWorkoutCalories,
    todayWorkoutMinutes,
    todayTemplate,
    loadData,
    handleAiGenerate,
    handleMarkMealAsEaten,
  } = useNutritionPlan(initialTab);

  const currentGuide = !isPlannerOpen
    ? {
        title: 'Nutrición · Hoy',
        description: 'Aquí ves el menú de hoy, sus macros y el registro rápido de cada comida.',
        goal: 'Sirve para resolver el día actual con cero fricción y dejar el trabajo más técnico dentro del Planificador PRO.',
        bullets: [
          'Genera un menú con IA si hoy todavía no tienes día asignado.',
          'Marca cada comida con un toque cuando ya te la has tomado.',
          'Abre Planificador PRO solo cuando quieras construir recetas, días o semanas.',
        ],
      }
    : activeTab === 'recipes'
      ? {
          title: 'Recetario',
          description: 'Esta vista convierte cada plato en una receta reutilizable con ingredientes, instrucciones y macros.',
          goal: 'Te ayuda a construir una base limpia para después reutilizarla dentro de Días Base y Planes Semanales.',
          bullets: [
            'Empieza por el nombre o deja que la IA desglosse la receta.',
            'El total superior siempre sale de la suma real de ingredientes.',
            'Cuando guardas, la receta queda lista para arrastrarla a otras vistas.',
          ],
        }
      : activeTab === 'days'
        ? {
            title: 'Días Base',
            description: 'Aquí montas un día completo combinando recetas para desayuno, comida, cena y extras.',
            goal: 'Sirve para crear plantillas reutilizables y luego generar variaciones sin rehacer el día entero.',
            bullets: [
              'Cada bloque acepta una receta ya creada.',
              'Crear variación duplica la plantilla y protege la original.',
              'Guarda el Día Base antes de reutilizarlo dentro de una semana.',
            ],
          }
        : activeTab === 'programs'
          ? {
              title: 'Planes Semanales',
              description: 'Aquí encadenas siete Días Base y montas una semana lista para repetirse.',
              goal: 'Te permite llenar un mes entero con muy pocas decisiones y exportarlo si hace falta.',
              bullets: [
                'Asigna un Día Base a cada día.',
                'Usa exportar para sacar el plan en CSV.',
                'Después aplícalo al calendario desde un lunes.',
              ],
            }
          : {
              title: 'Calendario',
              description: 'Aquí ves el mes del paciente y aterrizas las plantillas en fechas reales.',
              goal: 'Sirve para proyectar semanas completas, revisar ajustes manuales y abrir el detalle clínico de cada día.',
              bullets: [
                'Rellenar con semana proyecta bloques completos.',
                'Los ajustes manuales pisan la asignación automática.',
                'Toca un día para abrir su detalle desde abajo.',
              ],
            };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 animate-pulse" aria-hidden="true">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-48 rounded-full bg-slate-100" />
        </div>
        <div className="grid h-full w-full flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" />
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" />
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <h3 className="text-lg font-bold text-rose-800">Inicia sesión</h3>
        <p className="text-sm text-rose-700 mt-2">
          Debes iniciar sesión para configurar tu plan de dieta.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-slate-950 px-6 py-2 text-sm font-semibold text-white"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-3 overflow-hidden">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Nutrition Hub
            </div>
            <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Menú de hoy primero
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              El usuario ve qué toca comer ahora; el builder profesional queda a un toque.
            </p>
          </div>
          <div className="flex gap-2">
            <ScreenGuideButton
              title={currentGuide.title}
              description={currentGuide.description}
              goal={currentGuide.goal}
              bullets={currentGuide.bullets}
              compact
            />
            <button
              type="button"
              onClick={() => {
                setActiveTab('calendar');
                setIsPlannerOpen(false);
              }}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-all duration-200 ease-in-out active:scale-95 ${
                !isPlannerOpen
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-4 w-4" />
              Hoy
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95"
            >
              Inicio
            </Link>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsPlannerOpen((current) => !current)}
            className="inline-flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Planificador PRO
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              {isPlannerOpen ? 'Ocultar' : 'Recetario · Días · Semanas'}
            </span>
          </button>
        </div>

        {isPlannerOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {nutritionTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[68px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                } min-h-[54px]`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isActive ? 'bg-white text-slate-900' : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {tab.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {tab.caption}
                  </span>
                </span>
              </button>
            );
          })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        {!isPlannerOpen && (
          <TodayNutritionView
            todayTemplate={todayTemplate}
            realLog={realLog}
            isGeneratingAi={isGeneratingAi}
            todayWorkoutCalories={todayWorkoutCalories}
            todayWorkoutMinutes={todayWorkoutMinutes}
            onGenerateToday={handleAiGenerate}
            onMarkMealAsEaten={handleMarkMealAsEaten}
            onOpenPlanner={() => {
              setActiveTab('programs');
              setIsPlannerOpen(true);
            }}
            onImportedDiet={async () => {
              setActiveTab('programs');
              setIsPlannerOpen(true);
              await loadData();
            }}
          />
        )}
        {isPlannerOpen && activeTab === 'recipes' && (
          <>
            <div className="lg:hidden">
              <Accordion type="single" collapsible value={mobileAccordionValue} onValueChange={setMobileAccordionValue} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <AccordionItem value="recipes" className="px-4 py-3">
                  <AccordionTrigger className="flex min-h-[48px] w-full items-center justify-between text-left text-sm font-black text-slate-900">
                    Recetario
                  </AccordionTrigger>
                  <AccordionContent className="pt-3">
                    <RecipeLibrary />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="hidden lg:block">
              <RecipeLibrary />
            </div>
          </>
        )}
        {isPlannerOpen && activeTab === 'days' && (
          <>
            <div className="lg:hidden">
              <Accordion type="single" collapsible value={mobileAccordionValue} onValueChange={setMobileAccordionValue} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <AccordionItem value="days" className="px-4 py-3">
                  <AccordionTrigger className="flex min-h-[48px] w-full items-center justify-between text-left text-sm font-black text-slate-900">
                    Días Base
                  </AccordionTrigger>
                  <AccordionContent className="pt-3">
                    <DailyTemplateBuilder />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="hidden lg:block">
              <DailyTemplateBuilder />
            </div>
          </>
        )}
        {isPlannerOpen && activeTab === 'programs' && <WeeklyPlanBuilder />}
        {isPlannerOpen && activeTab === 'calendar' && (
          <DietCalendarView
            templates={templates}
            calendar={calendar}
            recipes={recipes}
            overrides={overrides}
            activeProgram={activeProgram}
            activeProgramDays={activeProgramDays}
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  );
}

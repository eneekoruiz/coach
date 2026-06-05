'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { type DietTemplate, type Recipe, type DietProgram, type DietProgramDay, type DailyDietOverride } from '@/lib/schema';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, X, RefreshCw, Layers, Sparkles, Sliders, CalendarDays, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import TemplateEditorModal from './TemplateEditorModal';
import TemplateAssignModal from './TemplateAssignModal';
import DayDetailDrawer from './DayDetailDrawer';
import { deleteDietTemplate, assignTemplateToDates, saveDietTemplate, saveDietProgram, deleteDietProgram } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

interface DietCalendarViewProps {
  templates: DietTemplate[];
  calendar: Array<{ date: string; template_id: string }>;
  recipes: Recipe[];
  overrides: DailyDietOverride[];
  activeProgram: DietProgram | null;
  activeProgramDays: DietProgramDay[];
  onUpdate: () => void;
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
  
  const [editingTemplate, setEditingTemplate] = useState<DietTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState<DietTemplate | null>(null);

  // Microcycle configuration states
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleName, setCycleName] = useState('Mi Ciclo Nutricional');
  const [cycleLength, setCycleLength] = useState<number>(7);
  const [cycleStartDate, setCycleStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cycleDaysMapping, setCycleDaysMapping] = useState<Record<number, string>>({});
  const [savingCycle, setSavingCycle] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize cycle mapping when program is loaded
  useEffect(() => {
    if (activeProgram) {
      setCycleName(activeProgram.name);
      setCycleLength(activeProgram.microcycle_length);
      setCycleStartDate(activeProgram.start_date);
      
      const mapping: Record<number, string> = {};
      activeProgramDays.forEach(d => {
        mapping[d.day_number] = d.template_id;
      });
      setCycleDaysMapping(mapping);
    } else {
      setCycleName('Mi Ciclo Nutricional');
      setCycleLength(7);
      setCycleStartDate(new Date().toISOString().split('T')[0]);
      setCycleDaysMapping({});
    }
  }, [activeProgram, activeProgramDays]);

  // Generar grid del mes actual
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Rellenar días anteriores
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lunes como primer día
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Rellenar días del mes
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(isoDate);
    }
    
    return days;
  }, [currentDate]);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Resolve diet template or custom override for a given date
  const getTemplateForDate = (dateStr: string) => {
    // 1. Check daily override
    const override = overrides.find(o => o.date === dateStr);
    if (override) {
      return { template: override.custom_diet, isOverride: true };
    }

    // 2. Check active microcycle program projection
    if (activeProgram && activeProgramDays.length > 0) {
      const start = new Date(activeProgram.start_date + 'T00:00:00');
      const current = new Date(dateStr + 'T00:00:00');
      const diffTime = current.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let dayNum = 1;
      const len = activeProgram.microcycle_length;
      if (diffDays >= 0) {
        dayNum = (diffDays % len) + 1;
      } else {
        dayNum = (((diffDays % len) + len) % len) + 1;
      }
      
      const dayMap = activeProgramDays.find(d => d.day_number === dayNum);
      if (dayMap) {
        const template = templates.find(t => t.id === dayMap.template_id);
        if (template) return { template, isOverride: false, isCycle: true, cycleDayNum: dayNum };
      }
    }

    // 3. Check manual calendar assignment
    const entry = calendar.find(c => c.date === dateStr);
    if (entry) {
      const template = templates.find(t => t.id === entry.template_id);
      if (template) return { template, isOverride: false, isManual: true };
    }

    return null;
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta plantilla? Esto quitará la asignación de todos los días que la usen.')) return;
    
    const res = await deleteDietTemplate(id);
    if (res.success) {
      toast.success('Plantilla eliminada');
      onUpdate();
    } else {
      toast.error(res.error || 'Error al eliminar');
    }
  };

  // Drag and drop templates on calendar
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData('text/plain', templateId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDraggedOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDraggedOverDate(null);
    const templateId = e.dataTransfer.getData('text/plain');
    if (!templateId) return;

    try {
      const res = await assignTemplateToDates(templateId, [dateStr]);
      if (res.success) {
        toast.success(`Plantilla asignada correctamente`);
        onUpdate();
      } else {
        toast.error(res.error || 'Error al asignar plantilla');
      }
    } catch (err) {
      toast.error('Error inesperado al asignar');
    }
  };

  // Save/Create microcycle program
  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) {
      toast.error('Introduce un nombre para el ciclo.');
      return;
    }

    const mappedDays = Object.entries(cycleDaysMapping).map(([dayNumStr, templateId]) => ({
      day_number: parseInt(dayNumStr, 10),
      template_id: templateId,
    }));

    if (mappedDays.length === 0) {
      toast.error('Debes asignar al menos una plantilla a un día del ciclo.');
      return;
    }

    setSavingCycle(true);
    const programData: DietProgram = {
      id: activeProgram?.id,
      name: cycleName,
      start_date: cycleStartDate,
      microcycle_length: cycleLength,
      is_active: true,
    };

    const res = await saveDietProgram(programData, mappedDays);
    setSavingCycle(false);
    if (res.success) {
      toast.success('Ciclo nutricional configurado y activado');
      setIsCycleModalOpen(false);
      onUpdate();
    } else {
      toast.error(res.error || 'Error al guardar el ciclo');
    }
  };

  const handleDeactivateCycle = async () => {
    if (!confirm('¿Seguro que quieres desactivar este ciclo? Volverá al calendario tradicional.')) return;
    setSavingCycle(true);
    if (activeProgram?.id) {
      const res = await deleteDietProgram(activeProgram.id);
      setSavingCycle(false);
      if (res.success) {
        toast.success('Ciclo desactivado');
        setIsCycleModalOpen(false);
        onUpdate();
      } else {
        toast.error(res.error || 'Error al desactivar');
      }
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start w-full relative xl:max-h-[calc(100vh-280px)] xl:overflow-hidden pb-4">
      {/* Columna Izquierda: Calendario */}
      <div className="w-full xl:w-2/3 space-y-4 xl:max-h-[calc(100vh-280px)] xl:overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-5 shadow-[0_12px_35px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
              <Calendar className="w-5.5 h-5.5 text-emerald-500" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              {activeProgram && (
                <span className="ml-2 text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                  Ciclo Activo
                </span>
              )}
            </h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsCycleModalOpen(true)}
                className="flex-1 sm:flex-initial text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all min-h-[38px]"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configurar Ciclo
              </button>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 active:scale-90 transition">
                  ←
                </button>
                <button onClick={nextMonth} className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 active:scale-90 transition">
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 py-1 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((dateStr, idx) => {
              if (!dateStr) return <div key={`empty-${idx}`} className="h-16" />;
              
              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const data = getTemplateForDate(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              const isOver = draggedOverDate === dateStr;

              const templateName = data?.template.name;
              const isOverride = data?.isOverride;
              const isCycle = data?.isCycle;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  className={`relative flex flex-col items-center justify-center h-16 p-1 rounded-xl transition-all border-2 select-none min-h-[64px]
                    ${isSelected ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' : 'border-slate-100 bg-slate-50/20 hover:bg-slate-50'}
                    ${isToday && !isSelected ? 'ring-2 ring-slate-800/10' : ''}
                    ${isOver ? 'ring-4 ring-emerald-300 bg-emerald-50 scale-[1.03] border-emerald-300 z-10' : ''}
                    ${isOverride ? 'bg-amber-50/30 border-amber-200' : ''}
                  `}
                >
                  <span className={`text-xs font-black ${isSelected ? 'text-emerald-700' : isToday ? 'text-slate-900 font-extrabold' : 'text-slate-500'}`}>
                    {dayNum}
                  </span>
                  
                  {templateName && (
                    <div className="w-full mt-1 flex flex-col items-center gap-0.5">
                      <div className={`mx-auto px-1 py-0.5 rounded text-[8px] font-bold truncate max-w-full text-center
                        ${isOverride 
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-250/20' 
                          : isCycle 
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                        }
                      `}>
                        {isOverride ? `★ ${templateName}` : templateName}
                      </div>
                      
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-rose-400" />
                        <span className="w-1 h-1 rounded-full bg-sky-400" />
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Plantillas */}
      <div className="w-full xl:w-1/3 space-y-4 xl:max-h-[calc(100vh-280px)] xl:overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center justify-between bg-slate-800 text-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            Plantillas Dietéticas
          </h3>
          <button 
            onClick={() => setIsCreatingTemplate(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-xl active:scale-95 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Crear Nueva Plantilla"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-200 border-dashed">
            <div className="text-slate-400 mb-2 font-bold text-xs">Aún no tienes plantillas</div>
            <button 
              onClick={() => setIsCreatingTemplate(true)}
              className="text-emerald-650 font-bold text-xs hover:underline min-h-[36px]"
            >
              Crear mi primera plantilla
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => (
              <div 
                key={template.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, template.id!)}
                className="bg-white border border-slate-200/80 rounded-[1.5rem] p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-40 group-hover:opacity-85 transition-opacity">
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full" />
                </div>
 
                <div className="absolute top-3 right-3 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 z-10 bg-white rounded-lg p-0.5 shadow-sm border border-slate-100">
                  <button 
                    onClick={() => setEditingTemplate(template)}
                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pl-4 pr-12">
                  <h4 className="font-black text-slate-800 text-sm mb-0.5 truncate">{template.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mb-2">
                    {template.target_kcal} kcal • {template.meals.length} comidas
                  </p>

                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 mb-2">
                    <span className="bg-rose-50 text-rose-600 px-1 py-0.5 rounded border border-rose-100">P: {template.target_protein}g</span>
                    <span className="bg-sky-50 text-sky-600 px-1 py-0.5 rounded border border-sky-100">C: {template.target_carbs}g</span>
                    <span className="bg-amber-50 text-amber-600 px-1 py-0.5 rounded border border-amber-100">G: {template.target_fats}g</span>
                  </div>

                  <button 
                    onClick={() => setAssigningTemplate(template)}
                    className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-650 hover:text-emerald-700 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 border border-slate-100 hover:border-emerald-100 min-h-[32px] rounded-xl"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DayDetailDrawer (Pilar 1 HIG Zero-Scroll Vaul) */}
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

      {/* Modales - RENDERED IN PORTALS TO PREVENT STACKING CONTEXT BUGS */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(isCreatingTemplate || editingTemplate) && (
            <TemplateEditorModal 
              template={editingTemplate}
              onClose={() => {
                setIsCreatingTemplate(false);
                setEditingTemplate(null);
              }}
              onSave={() => {
                setIsCreatingTemplate(false);
                setEditingTemplate(null);
                onUpdate();
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {assigningTemplate && (
            <TemplateAssignModal 
              template={assigningTemplate}
              onClose={() => setAssigningTemplate(null)}
              onAssign={() => {
                setAssigningTemplate(null);
                onUpdate();
              }}
              preselectedDate={selectedDate}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Cycle Builder Modal */}
      <AnimatePresence>
        {isCycleModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCycleModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  Configurar Ciclo Nutricional (Microciclo)
                </h3>
                <button
                  onClick={() => setIsCycleModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCycle} className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    Nombre del Ciclo / Programa
                  </label>
                  <input
                    type="text"
                    required
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Duración del Ciclo (días)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={cycleLength}
                      onChange={(e) => {
                        const newLen = Math.max(1, parseInt(e.target.value, 10) || 7);
                        setCycleLength(newLen);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      required
                      value={cycleStartDate}
                      onChange={(e) => setCycleStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Day template selector grid */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Distribución Diaria del Ciclo
                  </h4>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl p-3 bg-slate-50/40">
                    {Array.from({ length: cycleLength }).map((_, idx) => {
                      const dayNum = idx + 1;
                      return (
                        <div key={dayNum} className="flex justify-between items-center gap-4 text-xs font-bold text-slate-600 bg-white border border-slate-200/60 p-2.5 rounded-xl">
                          <span>Día {dayNum} del Ciclo</span>
                          <select
                            required
                            value={cycleDaysMapping[dayNum] || ''}
                            onChange={(e) => {
                              setCycleDaysMapping({
                                ...cycleDaysMapping,
                                [dayNum]: e.target.value,
                              });
                            }}
                            className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none w-48"
                          >
                            <option value="" disabled>Seleccionar Plantilla</option>
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.target_kcal} kcal)</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeProgram && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-[11px] text-amber-700 font-semibold leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Ya tienes un ciclo activo. Guardar este nuevo ciclo reemplazará el anterior. Puedes desactivarlo para volver al calendario manual.
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                  {activeProgram && (
                    <button
                      type="button"
                      disabled={savingCycle}
                      onClick={handleDeactivateCycle}
                      className="w-1/3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition active:scale-95"
                    >
                      Desactivar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingCycle}
                    className={`py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-1.5
                      ${activeProgram ? 'w-2/3' : 'w-full'}
                    `}
                  >
                    {savingCycle ? 'Guardando...' : 'Guardar y Activar Ciclo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { type DietTemplate } from '@/lib/schema';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TemplateEditorModal from './TemplateEditorModal';
import TemplateAssignModal from './TemplateAssignModal';
import { deleteDietTemplate, assignTemplateToDates } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

interface DietCalendarViewProps {
  templates: DietTemplate[];
  calendar: Array<{ date: string; template_id: string }>;
  onUpdate: () => void;
}

export default function DietCalendarView({ templates, calendar, onUpdate }: DietCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [editingTemplate, setEditingTemplate] = useState<DietTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState<DietTemplate | null>(null);

  // Track the day cell currently dragged over
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);

  // Disable body scroll when date is selected (Drawer/Bottom Sheet open)
  useEffect(() => {
    if (selectedDate) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedDate]);

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

  const getTemplateForDate = (dateStr: string) => {
    const entry = calendar.find(c => c.date === dateStr);
    if (!entry) return null;
    return templates.find(t => t.id === entry.template_id) || null;
  };

  const selectedTemplate = selectedDate ? getTemplateForDate(selectedDate) : null;

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

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start w-full relative">
      {/* Columna Izquierda: Calendario */}
      <div className="w-full xl:w-2/3 space-y-6">
        <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[2.5rem] p-6 shadow-[0_15px_45px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-500" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white active:scale-90 transition">
                ←
              </button>
              <button onClick={nextMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white active:scale-90 transition">
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 py-2 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((dateStr, idx) => {
              if (!dateStr) return <div key={`empty-${idx}`} className="h-16 sm:h-24" />;
              
              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const template = getTemplateForDate(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              const isOver = draggedOverDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  className={`relative flex flex-col items-center justify-between h-16 sm:h-24 p-2 rounded-2xl transition-all border-2 select-none min-h-[44px]
                    ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm dark:bg-emerald-950/20' : 'border-slate-100 dark:border-white/5 bg-slate-50/30 hover:bg-slate-50 dark:hover:bg-white/5'}
                    ${isToday && !isSelected ? 'ring-2 ring-slate-900/10 dark:ring-white/10' : ''}
                    ${isOver ? 'ring-4 ring-emerald-400 bg-emerald-100/50 scale-[1.03] border-emerald-400 z-10' : ''}
                  `}
                >
                  <span className={`text-xs sm:text-sm font-black ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : isToday ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-500'}`}>
                    {dayNum}
                  </span>
                  
                  {template ? (
                    <div className="w-full mt-1 flex flex-col items-center">
                      <div className="mx-auto px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[8px] sm:text-[9px] font-bold truncate max-w-full text-center shadow-xs">
                        {template.name}
                      </div>
                      
                      {/* Macro compliance indicators (mini-metrics) in cells */}
                      <div className="hidden sm:flex items-center justify-center gap-1 mt-1 text-[8px] font-extrabold text-slate-500">
                        <span className="text-rose-500" title="Proteína">P:{template.target_protein}g</span>
                        <span className="text-sky-500" title="Carbs">C:{template.target_carbs}g</span>
                        <span className="text-amber-500" title="Grasas">G:{template.target_fats}g</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[8px] text-slate-300 font-medium hidden sm:block">Arrastra una plantilla</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Plantillas */}
      <div className="w-full xl:w-1/3 space-y-4">
        <div className="flex items-center justify-between bg-slate-900 dark:bg-white/10 text-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-sm sm:text-base">Tus Plantillas</h3>
          <button 
            onClick={() => setIsCreatingTemplate(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-xl active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Crear Nueva Plantilla"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 text-center border border-slate-200 dark:border-white/10 border-dashed">
            <div className="text-slate-400 mb-2 font-bold text-sm">Aún no tienes plantillas</div>
            <button 
              onClick={() => setIsCreatingTemplate(true)}
              className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline min-h-[44px]"
            >
              Crear mi primera dieta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => (
              <div 
                key={template.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, template.id!)}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                {/* Drag Handle Indicator */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                </div>
 
                <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 z-10 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm border border-slate-100 dark:border-white/10">
                  <button 
                    onClick={() => setEditingTemplate(template)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pl-4 pr-16">
                  <h4 className="font-black text-slate-900 dark:text-white text-base mb-0.5 truncate">{template.name}</h4>
                  <p className="text-[11px] text-slate-500 font-bold mb-3">
                    {template.target_kcal} kcal • {template.meals.length} comidas
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold mb-3">
                    <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">P: {template.target_protein}g</span>
                    <span className="bg-sky-50 dark:bg-sky-950/20 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100 dark:border-sky-900/30">C: {template.target_carbs}g</span>
                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">G: {template.target_fats}g</span>
                  </div>

                  <button 
                    onClick={() => setAssigningTemplate(template)}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-950/20 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-100 hover:border-emerald-200 dark:border-white/10 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Asignar al Calendario
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Panel Superpuesto de Dieta (Pilar 2 HIG) */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            {/* Drawer container (sliding from right) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              {/* Close button top right */}
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/10 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <h4 className="text-xl font-black text-slate-950 dark:text-white tracking-tight mb-6 mt-6">
                  Día: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h4>
                
                {selectedTemplate ? (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 p-5 rounded-3xl">
                      <h5 className="font-black text-xl text-emerald-700 dark:text-emerald-400">{selectedTemplate.name}</h5>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold mt-1 leading-relaxed">
                        Objetivo: {selectedTemplate.target_kcal} kcal • P: {selectedTemplate.target_protein}g • C: {selectedTemplate.target_carbs}g • G: {selectedTemplate.target_fats}g
                      </p>
                    </div>

                    <div className="space-y-4">
                      {selectedTemplate.meals.map(meal => (
                        <div key={meal.id} className="bg-slate-50 dark:bg-white/5 rounded-3xl p-5 border border-slate-100 dark:border-white/5 shadow-xs">
                          <div className="font-black text-slate-800 dark:text-slate-200 text-xs sm:text-sm uppercase tracking-wide mb-2 flex items-center justify-between">
                            <span>{meal.name}</span>
                            {meal.target_kcal > 0 && (
                              <span className="text-[10px] text-slate-400 font-bold bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/5 px-2 py-0.5 rounded-full">{meal.target_kcal} kcal</span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{meal.text || 'Sin descripción registrada.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                    <div className="text-slate-400 mb-2 text-3xl">🥣</div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay dieta asignada</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">Arrastra una plantilla desde el panel lateral al calendario, o pulsa "Asignar al Calendario" para programarla.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modales */}
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
    </div>
  );
}

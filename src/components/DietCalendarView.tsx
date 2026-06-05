'use client';

import React, { useState, useMemo } from 'react';
import { type DietTemplate } from '@/lib/schema';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import TemplateEditorModal from './TemplateEditorModal';
import TemplateAssignModal from './TemplateAssignModal';
import { deleteDietTemplate } from '@/app/nutrition/actions';
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
      const d = new Date(year, month, i);
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

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* Columna Izquierda: Calendario */}
      <div className="w-full xl:w-2/3 space-y-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-500" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                ←
              </button>
              <button onClick={nextMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((dateStr, idx) => {
              if (!dateStr) return <div key={`empty-${idx}`} className="h-14 sm:h-20" />;
              
              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const template = getTemplateForDate(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().slice(0, 10);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex flex-col items-center justify-start h-14 sm:h-20 p-2 rounded-2xl transition-all border-2
                    ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-transparent hover:bg-slate-50'}
                    ${isToday && !isSelected ? 'border-slate-200' : ''}
                  `}
                >
                  <span className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-emerald-700' : isToday ? 'text-slate-900' : 'text-slate-600'}`}>
                    {dayNum}
                  </span>
                  
                  {template && (
                    <div className="mt-auto w-full">
                      <div className="mx-auto w-6 h-6 sm:w-auto sm:h-auto sm:px-2 sm:py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold truncate flex items-center justify-center shadow-sm">
                        <span className="sm:hidden">{template.name.charAt(0).toUpperCase()}</span>
                        <span className="hidden sm:inline">{template.name}</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Inferior: Detalle del día seleccionado */}
        {selectedDate && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              Día Seleccionado: {selectedDate}
            </h4>
            
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xl text-emerald-600">{selectedTemplate.name}</h5>
                    <p className="text-sm text-slate-500 font-medium">
                      {selectedTemplate.target_kcal} kcal • P: {selectedTemplate.target_protein}g • C: {selectedTemplate.target_carbs}g • G: {selectedTemplate.target_fats}g
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                  {selectedTemplate.meals.map(meal => (
                    <div key={meal.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="font-bold text-slate-800 mb-1">{meal.name}</div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{meal.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-400 mb-2">No hay dieta asignada a este día</div>
                <p className="text-sm text-slate-500">Selecciona una plantilla del panel lateral para asignarla.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Columna Derecha: Plantillas */}
      <div className="w-full xl:w-1/3 space-y-4">
        <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold">Tus Plantillas</h3>
          <button 
            onClick={() => setIsCreatingTemplate(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-200 border-dashed">
            <div className="text-slate-400 mb-2">Aún no tienes plantillas</div>
            <button 
              onClick={() => setIsCreatingTemplate(true)}
              className="text-emerald-600 font-bold text-sm hover:underline"
            >
              Crear mi primera dieta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => (
              <div key={template.id} className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button 
                    onClick={() => setEditingTemplate(template)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-slate-900 text-lg mb-1 pr-16">{template.name}</h4>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  {template.target_kcal} kcal • {template.meals.length} comidas
                </p>

                <button 
                  onClick={() => setAssigningTemplate(template)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Asignar al Calendario
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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

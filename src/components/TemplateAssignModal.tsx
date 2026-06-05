'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { type DietTemplate } from '@/lib/schema';
import { assignTemplateToDates } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

type TemplateAssignModalProps = {
  template: DietTemplate;
  onClose: () => void;
  onAssign: () => void;
  preselectedDate?: string | null;
};

export default function TemplateAssignModal({ template, onClose, onAssign, preselectedDate }: TemplateAssignModalProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [mode, setMode] = useState<'single' | 'week' | 'recurring'>('single');
  
  const [singleDate, setSingleDate] = useState(preselectedDate || new Date().toISOString().slice(0, 10));
  
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);

  const toggleRecurringDay = (day: number) => {
    setRecurringDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      let datesToAssign: string[] = [];
      const today = new Date();

      if (mode === 'single') {
        datesToAssign = [singleDate];
      } else if (mode === 'week') {
        // Encontrar el lunes de esta semana
        const day = today.getDay() || 7; 
        const monday = new Date(today);
        monday.setDate(today.getDate() - day + 1);
        
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          datesToAssign.push(d.toISOString().slice(0, 10));
        }
      } else if (mode === 'recurring') {
        if (recurringDays.length === 0) {
          toast.error('Selecciona al menos un día de la semana.');
          setIsAssigning(false);
          return;
        }
        
        // Iterar las próximas N semanas y elegir los días seleccionados
        for (let w = 0; w < recurringWeeks; w++) {
          for (let d = 0; d < 7; d++) {
            const dateObj = new Date(today);
            dateObj.setDate(today.getDate() + (w * 7) + d);
            const jsDay = dateObj.getDay(); // 0 = Domingo, 1 = Lunes
            const adjustedDay = jsDay === 0 ? 7 : jsDay; // 1 = Lunes, 7 = Domingo
            
            if (recurringDays.includes(adjustedDay)) {
              datesToAssign.push(dateObj.toISOString().slice(0, 10));
            }
          }
        }
      }

      if (!template.id) {
        toast.error('Error: La plantilla no tiene ID válido.');
        return;
      }

      const res = await assignTemplateToDates(template.id, datesToAssign);
      if (res.success) {
        toast.success(`Plantilla asignada a ${datesToAssign.length} día(s).`);
        onAssign();
      } else {
        toast.error(res.error || 'Error al asignar la plantilla.');
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado al asignar.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-emerald-50/50 shrink-0">
          <div>
            <h3 className="text-xl font-black text-emerald-900">Asignar Dieta</h3>
            <p className="text-sm font-bold text-emerald-700 mt-1">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-200/50 text-emerald-800 hover:bg-emerald-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('single')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Un Día
            </button>
            <button
              onClick={() => setMode('week')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Toda la Semana
            </button>
            <button
              onClick={() => setMode('recurring')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'recurring' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Recurrente
            </button>
          </div>

          {mode === 'single' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Selecciona la Fecha</label>
              <input 
                type="date" 
                value={singleDate} 
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          {mode === 'week' && (
            <div className="animate-in fade-in slide-in-from-left-4 text-center p-4 border border-slate-200 rounded-xl bg-slate-50">
              <p className="text-sm font-medium text-slate-600">
                Se asignará la plantilla <b>{template.name}</b> a los 7 días de la semana actual (Lunes a Domingo).
              </p>
            </div>
          )}

          {mode === 'recurring' && (
            <div className="animate-in fade-in slide-in-from-left-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Días de la semana</label>
                <div className="flex gap-2 justify-between">
                  {[
                    { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
                    { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 7, label: 'D' }
                  ].map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleRecurringDay(day.id)}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                        recurringDays.includes(day.id) 
                          ? 'bg-emerald-500 text-white shadow-md scale-110' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Durante cuantas semanas</label>
                <select 
                  value={recurringWeeks} 
                  onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors bg-white"
                >
                  <option value={1}>1 semana</option>
                  <option value={2}>2 semanas</option>
                  <option value={4}>4 semanas (1 mes)</option>
                  <option value={8}>8 semanas (2 meses)</option>
                  <option value={12}>12 semanas (3 meses)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-semibold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={isAssigning}
            className="px-6 py-2.5 rounded-full font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm disabled:opacity-50"
          >
            {isAssigning ? 'Asignando...' : 'Aplicar al Calendario'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

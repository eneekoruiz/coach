'use client';

import React, { useState, useEffect } from 'react';
import { getDietTemplates, getActiveDietProgram, saveDietProgram } from '@/app/nutrition/actions';
import { type DietTemplate, type DietProgram } from '@/lib/schema';
import toast from '@/lib/toast';
import { Save, Calendar, Play, Settings } from 'lucide-react';
import { triggerVibration } from '@/lib/haptics';

export default function ProgramBuilder() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [name, setName] = useState('Mi Ciclo Nutricional');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [length, setLength] = useState(7);
  const [dayMappings, setDayMappings] = useState<Record<number, string>>({});
  const [programId, setProgramId] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fetchedTemplates = await getDietTemplates();
        setTemplates(fetchedTemplates);

        const fetchedProgram = await getActiveDietProgram();
        if (fetchedProgram && fetchedProgram.program) {
          const p = fetchedProgram.program;
          setProgramId(p.id);
          setName(p.name);
          setStartDate(p.start_date);
          setLength(p.microcycle_length);
          setIsActive(p.is_active);

          // Populate day mappings
          const mappings: Record<number, string> = {};
          fetchedProgram.days.forEach((day: any) => {
            mappings[day.day_number] = day.template_id;
          });
          setDayMappings(mappings);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos del programa.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    triggerVibration('light');
    
    // Check if all days have templates assigned
    const daysData: Array<{ day_number: number; template_id: string }> = [];
    for (let i = 1; i <= length; i++) {
      const tId = dayMappings[i];
      if (!tId) {
        toast.error(`Asigna una plantilla diaria para el Día ${i}`);
        return;
      }
      daysData.push({ day_number: i, template_id: tId });
    }

    const programObj: DietProgram = {
      id: programId,
      name,
      start_date: startDate,
      microcycle_length: length,
      is_active: isActive,
    };

    const res = await saveDietProgram(programObj, daysData);
    if (res.success && res.data) {
      toast.success('Programa nutricional guardado y activado');
      setProgramId(res.data.id);
    } else {
      toast.error(res.error || 'Error al guardar el programa');
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-6 max-w-4xl mx-auto select-none">
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-emerald-500" /> Planificador de Ciclos
          </h3>
          <p className="text-xs text-slate-450 mt-1 font-semibold">Configura un patrón repetitivo asignando plantillas diarias a cada día del ciclo.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-full flex items-center gap-2 transition active:scale-95 shadow-sm self-start min-h-[44px]"
        >
          <Save className="w-4 h-4" /> Guardar y Activar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Nombre del Programa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Fecha de Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Duración (Días del Microciclo)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={length}
            onChange={(e) => setLength(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-50 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 min-h-[44px]"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-1">Asignación de Plantillas</h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {Array.from({ length }).map((_, idx) => {
            const dayNum = idx + 1;
            return (
              <div key={dayNum} className="p-3 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Día {dayNum}</span>
                <select
                  value={dayMappings[dayNum] || ''}
                  onChange={(e) => setDayMappings({ ...dayMappings, [dayNum]: e.target.value })}
                  className="bg-white px-2 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 min-h-[36px]"
                >
                  <option value="">Selecciona...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.target_kcal} kcal)
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

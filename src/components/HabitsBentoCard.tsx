import React, { useState, useEffect } from 'react';
import HabitDisplayCard from './HabitDisplayCard';
import HabitAddCard from './HabitAddCard';
import toast from '@/lib/toast';

type HabitsBentoCardProps = {
  habitsCount: Record<string, number>;
  variacionInercia: number;
};

export default function HabitsBentoCard({ habitsCount, variacionInercia }: HabitsBentoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localHabits, setLocalHabits] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalHabits(habitsCount || {});
  }, [habitsCount]);

  const handleIncrement = (key: string) => {
    if (isEditing) return;
    
    // Actualización optimista para UX ultra rápida (0 lag)
    setLocalHabits((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
    
    // TODO: Emitir evento o llamar a función para persistencia en Supabase
    // fetch('/api/habits/increment', { method: 'POST', body: JSON.stringify({ key }) })
  };

  const handleDelete = (key: string) => {
    // Actualización optimista de eliminación
    setLocalHabits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    
    toast.success(`Hábito eliminado`);
    // TODO: Llamar a la API para borrar en BD
  };

  const handleAddNew = () => {
    // Aquí podrías abrir un Modal nativo para añadir un hábito nuevo
    toast.success('Abriendo selector de hábitos...');
  };

  const hasHabits = Object.keys(localHabits).length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabecera con Botón de Edición (Apple Health Style) */}
      <div className="flex justify-between items-center mb-2 sm:mb-4 flex-shrink-0">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-slate-400 font-extrabold">
          Hábitos
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] sm:text-xs font-bold text-cyan-500 hover:text-cyan-600 transition-colors active:scale-95"
        >
          {isEditing ? 'Listo' : 'Editar'}
        </button>
      </div>

      {/* Grid de Hábitos Minimalista */}
      <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
        {!hasHabits && !isEditing ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm font-medium italic border-2 border-dashed border-slate-100 rounded-xl sm:rounded-2xl p-2 sm:p-4">
            Sin hábitos hoy
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pb-2">
            {Object.entries(localHabits).map(([key, val]) => (
              <HabitDisplayCard
                key={key}
                name={key.replace(/_/g, ' ')}
                count={val}
                isEditing={isEditing}
                onIncrement={() => handleIncrement(key)}
                onDelete={() => handleDelete(key)}
              />
            ))}
            
            {/* Tarjeta de Añadir (visible siempre en modo edición) */}
            {isEditing && (
              <HabitAddCard onAdd={handleAddNew} />
            )}
          </div>
        )}
      </div>

      {/* Footer de métrica */}
      <div className="border-t border-slate-100 pt-2 sm:pt-4 flex justify-between items-end mt-2 flex-shrink-0">
        <div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
            Inercia Ganada
          </p>
          <p className="text-lg sm:text-xl font-black text-lime-500 leading-none">
            {variacionInercia >= 0 ? '+' : ''}{variacionInercia}
          </p>
        </div>
      </div>
    </div>
  );
}

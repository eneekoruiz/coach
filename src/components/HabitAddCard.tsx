import React from 'react';

type HabitAddCardProps = {
  onAdd: () => void;
};

export default function HabitAddCard({ onAdd }: HabitAddCardProps) {
  return (
    <div
      onClick={onAdd}
      className="relative bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-3 sm:p-4 flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-slate-300 font-black text-xl sm:text-2xl shadow-sm mb-2">
        +
      </div>
      <span className="font-bold text-slate-400 text-[10px] sm:text-xs text-center">Añadir</span>
    </div>
  );
}

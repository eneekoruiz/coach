import React from 'react';
import { motion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';

type HabitDisplayCardProps = {
  name: string;
  count: number;
  isEditing: boolean;
  onIncrement: () => void;
  onDelete: () => void;
};

export default function HabitDisplayCard({ name, count, isEditing, onIncrement, onDelete }: HabitDisplayCardProps) {
  const haptic = useHaptic();

  const handleTap = () => {
    if (!isEditing) {
      haptic.success();
      onIncrement();
    }
  };

  return (
    <motion.div
      whileTap={!isEditing ? { scale: 0.95 } : {}}
      onClick={handleTap}
      className="relative bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex flex-col justify-between aspect-square shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-visible"
    >
      {isEditing && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            haptic.light();
            onDelete(); 
          }}
          className="absolute -top-2 -left-2 bg-red-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-lg shadow-md z-10 hover:bg-red-600 transition-colors"
          aria-label="Eliminar hábito"
        >
          -
        </button>
      )}
      
      <div className="flex justify-between items-start w-full">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cyan-50/80 flex items-center justify-center text-cyan-500 text-xs sm:text-sm shadow-inner">
          ✨
        </div>
        <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">{count}</span>
      </div>
      
      <span className="font-bold text-slate-600 text-[10px] sm:text-xs capitalize leading-tight mt-2 line-clamp-2">
        {name}
      </span>
    </motion.div>
  );
}

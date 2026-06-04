'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type WeeklyDietSchedule, type DailyDietTarget } from '@/lib/schema';
import DietPlanModal from './DietPlanModal';

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type WeeklyPlannerProps = {
  weeklySchedule: WeeklyDietSchedule;
  onPlanUpdate: () => void;
};

export default function WeeklyPlanner({ weeklySchedule, onPlanUpdate }: WeeklyPlannerProps) {
  const [selectedDay, setSelectedDay] = useState<string>('lunes');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const selectedData: DailyDietTarget = weeklySchedule[selectedDay as keyof WeeklyDietSchedule] || weeklySchedule.lunes;

  return (
    <div className="space-y-6">
      {/* Selector Semanal */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-4 shadow-sm flex items-center justify-between">
        <div className="flex gap-2 w-full max-w-sm mx-auto justify-between">
          {DAYS.map((day, idx) => {
            const isActive = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex flex-col items-center justify-center w-10 h-12 rounded-2xl transition-all ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-day-pill"
                    className="absolute inset-0 bg-slate-900 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-[10px] font-bold uppercase mt-0.5">{DAY_LABELS[idx]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle del Día */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 capitalize">{selectedDay}</h3>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-full hover:bg-cyan-100 transition-colors"
            >
              Editar Día
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">Calorías</p>
              <p className="text-2xl font-black text-violet-900">{selectedData.target_kcal}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Proteína</p>
              <p className="text-2xl font-black text-emerald-900">{selectedData.target_protein}g</p>
            </div>
            <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Carbos</p>
              <p className="text-2xl font-black text-sky-900">{selectedData.target_carbs}g</p>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Grasas</p>
              <p className="text-2xl font-black text-amber-900">{selectedData.target_fats}g</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/80 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Desayuno 🥞</h4>
              <p className="text-sm font-medium text-slate-700">{selectedData.meals.breakfast || 'Sin planificar'}</p>
            </div>
            <div className="bg-white/80 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comida 🍗</h4>
              <p className="text-sm font-medium text-slate-700">{selectedData.meals.lunch || 'Sin planificar'}</p>
            </div>
            <div className="bg-white/80 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cena 🐟</h4>
              <p className="text-sm font-medium text-slate-700">{selectedData.meals.dinner || 'Sin planificar'}</p>
            </div>
            {selectedData.meals.snacks && (
              <div className="bg-white/80 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Snacks 🍎</h4>
                <p className="text-sm font-medium text-slate-700">{selectedData.meals.snacks}</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {isEditModalOpen && (
        <DietPlanModal
          day={selectedDay}
          currentData={selectedData}
          fullSchedule={weeklySchedule}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={() => {
            setIsEditModalOpen(false);
            onPlanUpdate();
          }}
        />
      )}
    </div>
  );
}

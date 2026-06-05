'use client';

import { useState, useTransition, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Check, Activity, Target, Award, ArrowLeft } from 'lucide-react';
import { saveOnboardingData } from '@/app/onboarding/actions';
import toast from '@/lib/toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    label: 'Sedentario',
    factor: 1.2,
    icon: '💻',
    desc: 'Trabajo de oficina, poco o ningún ejercicio diario.',
  },
  {
    id: 'light',
    label: 'Actividad Ligera',
    factor: 1.375,
    icon: '🚶‍♂️',
    desc: 'Ejercicio ligero o caminatas 1-3 días a la semana.',
  },
  {
    id: 'moderate',
    label: 'Actividad Moderada',
    factor: 1.55,
    icon: '🏃‍♂️',
    desc: 'Ejercicio físico moderado o deporte 3-5 días a la semana.',
  },
  {
    id: 'intense',
    label: 'Actividad Intensa',
    factor: 1.725,
    icon: '🏋️‍♂️',
    desc: 'Entrenamientos intensos o deportes de fuerza 6-7 días a la semana.',
  },
];

const OBJECTIVES = [
  {
    id: 'lose',
    label: 'Perder Grasa',
    adjustment: -500,
    icon: '🔥',
    desc: 'Déficit calórico moderado para perder peso de forma saludable.',
  },
  {
    id: 'maintain',
    label: 'Mantener Peso',
    adjustment: 0,
    icon: '⚖️',
    desc: 'Alimentación neutra para mantener tu composición corporal.',
  },
  {
    id: 'gain',
    label: 'Ganar Músculo',
    adjustment: 300,
    icon: '💪',
    desc: 'Superávit calórico controlado para favorecer la hipertrofia.',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form state
  const [gender, setGender] = useState<'masculino' | 'femenino' | 'otro' | null>(null);
  const [age, setAge] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [activity, setActivity] = useState<string | null>(null);
  const [objective, setObjective] = useState<string | null>(null);

  // ─── Calculations (Mifflin-St Jeor) ────────────────────────────────────────

  const results = useMemo(() => {
    if (!gender || !age || !weight || !height || !activity || !objective) return null;

    const weightNum = Number(weight);
    const heightNum = Number(height);
    const ageNum = Number(age);

    // BMR Base
    let bmr = 0;
    if (gender === 'masculino') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else if (gender === 'femenino') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    } else {
      // Gender neutral midpoint
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 78;
    }

    // TDEE according to activity
    const activityFactor = ACTIVITY_LEVELS.find((a) => a.id === activity)?.factor ?? 1.2;
    const tdee = bmr * activityFactor;

    // Adjusted kcal for objective
    const objAdjustment = OBJECTIVES.find((o) => o.id === objective)?.adjustment ?? 0;
    const targetKcal = Math.round(tdee + objAdjustment);

    // Macros:
    // Protein: 2g per kg of bodyweight
    const proteinG = Math.round(weightNum * 2);
    const proteinKcal = proteinG * 4;

    // Fats: 25% of final target kcal
    const fatsG = Math.round((targetKcal * 0.25) / 9);
    const fatsKcal = fatsG * 9;

    // Carbs: Remainder of kcal
    const carbsKcal = Math.max(0, targetKcal - (proteinKcal + fatsKcal));
    const carbsG = Math.round(carbsKcal / 4);

    // Water: 35ml per kg of bodyweight, rounded to nearest 100ml
    const waterMl = Math.round((weightNum * 35) / 100) * 100;

    return {
      kcal: Math.max(1200, targetKcal), // safe floor limit
      protein: Math.max(40, proteinG),
      fats: Math.max(30, fatsG),
      carbs: Math.max(55, carbsG),
      water: Math.max(1000, waterMl),
    };
  }, [gender, age, weight, height, activity, objective]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const nextStep = () => {
    if (step < 5) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const isStepValid = () => {
    if (step === 1) return gender !== null && typeof age === 'number' && age > 0;
    if (step === 2) return typeof weight === 'number' && weight > 0 && typeof height === 'number' && height > 0;
    if (step === 3) return activity !== null;
    if (step === 4) return objective !== null;
    return true;
  };

  const handleFinish = () => {
    if (!results) return;
    startTransition(async () => {
      const res = await saveOnboardingData(results);
      if (res.success) {
        toast.success('¡Bio-Avatar configurado con éxito!');
        router.push('/');
      } else {
        toast.error(res.error || 'Ocurrió un error inesperado.');
      }
    });
  };

  // ─── Render Steps ──────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto min-h-[500px] flex flex-col justify-between p-6 sm:p-10 rounded-[3rem] border border-white/80 bg-white/60 backdrop-blur-2xl shadow-[0_24px_70px_rgba(15,23,42,0.06)] relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-100/40 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-100/30 rounded-full filter blur-3xl pointer-events-none" />

      {/* ── Header / Progress Indicator ─────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        {step > 1 && step < 5 ? (
          <button
            onClick={prevStep}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Atrás
          </button>
        ) : (
          <div className="w-12 h-1" />
        )}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={[
                'h-1.5 rounded-full transition-all duration-300',
                s === step ? 'w-6 bg-slate-900' : 'w-2 bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>
        <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Paso {step} de 5
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center my-4 overflow-hidden min-h-[300px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
            className="w-full flex flex-col gap-6"
          >
            {/* STEP 1: Gender and Age */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ¿Cuál es tu género y edad?
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Esto nos permite estimar tu metabolismo basal preciso.
                  </p>
                </div>

                {/* Gender Selector Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {(['masculino', 'femenino', 'otro'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={[
                        'flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-semibold capitalize transition-all duration-200',
                        gender === g
                          ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700',
                      ].join(' ')}
                    >
                      <span className="text-2xl mb-2">
                        {g === 'masculino' ? '👨' : g === 'femenino' ? '👩' : '👤'}
                      </span>
                      {g}
                    </button>
                  ))}
                </div>

                {/* Age Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="age" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Edad (años)
                  </label>
                  <input
                    id="age"
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 28"
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white text-lg font-medium"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Weight and Height */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Composición Corporal
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Utilizaremos estos valores en la fórmula de Mifflin-St Jeor.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Weight Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="weight" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Peso actual (kg)
                    </label>
                    <input
                      id="weight"
                      type="number"
                      min={10}
                      max={300}
                      step={0.1}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 72.5"
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white text-lg font-medium"
                    />
                  </div>

                  {/* Height Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="height" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Altura (cm)
                    </label>
                    <input
                      id="height"
                      type="number"
                      min={50}
                      max={250}
                      value={height}
                      onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 175"
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white text-lg font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Activity Level */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Nivel de Actividad
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    ¿Cuál es tu gasto físico diario general?
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {ACTIVITY_LEVELS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActivity(item.id)}
                      className={[
                        'flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200',
                        activity === item.id
                          ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700',
                      ].join(' ')}
                    >
                      <span className="text-3xl p-2 bg-slate-100/10 rounded-xl">
                        {item.icon}
                      </span>
                      <div>
                        <p className={`font-bold text-sm ${activity === item.id ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${activity === item.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Objective */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Define tu Objetivo
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Esto determinará tu balance energético final.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {OBJECTIVES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setObjective(item.id)}
                      className={[
                        'flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200',
                        objective === item.id
                          ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700',
                      ].join(' ')}
                    >
                      <span className="text-3xl p-2 bg-slate-100/10 rounded-xl">
                        {item.icon}
                      </span>
                      <div>
                        <p className={`font-bold text-sm ${objective === item.id ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${objective === item.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: Success Results */}
            {step === 5 && results && (
              <div className="flex flex-col gap-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ¡Tu Bio-Avatar está listo!
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Metas calculadas utilizando la fórmula Mifflin-St Jeor.
                  </p>
                </div>

                {/* Apple Health HIG Bento Info Grid */}
                <div className="grid grid-cols-3 gap-3 text-left">
                  {/* Kcal Box */}
                  <div className="col-span-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Objetivo de Calorías
                      </span>
                      <span className="text-3xl font-black text-slate-900 mt-0.5 block">
                        {results.kcal} <span className="text-base font-bold text-slate-400">kcal/día</span>
                      </span>
                    </div>
                    <span className="text-2xl p-2 bg-white rounded-xl shadow-sm border border-slate-100/80">⚡</span>
                  </div>

                  {/* Macros Box */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Proteína
                    </span>
                    <span className="text-base font-black text-slate-800 block mt-0.5">
                      {results.protein}g
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Carbos
                    </span>
                    <span className="text-base font-black text-slate-800 block mt-0.5">
                      {results.carbs}g
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Grasas
                    </span>
                    <span className="text-base font-black text-slate-800 block mt-0.5">
                      {results.fats}g
                    </span>
                  </div>

                  {/* Hydration Box */}
                  <div className="col-span-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Meta de Hidratación
                      </span>
                      <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                        {(results.water / 1000).toFixed(1)} <span className="text-sm font-bold text-slate-400">Litros/día</span>
                      </span>
                    </div>
                    <span className="text-2xl p-2 bg-white rounded-xl shadow-sm border border-slate-100/80">💧</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Button Actions ──────────────────────────────────────────────── */}
      <div className="relative z-10 mt-8">
        {step < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isStepValid()}
            className="w-full py-4.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Siguiente
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            className="w-full py-4.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando metas...
              </>
            ) : (
              <>
                Comenzar con Bio-Avatar
                <Award className="h-5 w-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

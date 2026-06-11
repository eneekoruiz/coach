'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Check, Plus, Trash2, BookOpen, Award, Sparkles, 
  AlertCircle, ArrowLeft, Loader2, ChevronRight, HelpCircle, RefreshCw
} from 'lucide-react';

import { 
  getKnowledgeItems, 
  createKnowledgeItem, 
  recordReviewOutcome, 
  deleteKnowledgeItem, 
  type KnowledgeItem 
} from '@/app/actions/knowledge';
import BottomSheet from '@/components/BottomSheet';
import { triggerVibration } from '@/lib/haptics';
import { triggerStreakConfetti, triggerMicroCelebrate } from '@/utils/rewards';
import toast from '@/lib/toast';

// Fixed map definition of 10 levels
interface MapLevel {
  number: number;
  name: string;
  requiredMastered: number;
  x: number; // grid position x (percent of width)
  y: number; // grid position y (percent of height)
}

const SAGA_LEVELS: MapLevel[] = [
  { number: 1, name: 'Primeros Pasos', requiredMastered: 0, x: 50, y: 92 },
  { number: 2, name: 'Camino del Héroe', requiredMastered: 1, x: 25, y: 83 },
  { number: 3, name: 'Valle de la Claridad', requiredMastered: 2, x: 65, y: 74 },
  { number: 4, name: 'Templo de la Memoria', requiredMastered: 4, x: 30, y: 65 },
  { number: 5, name: 'Cumbre de Enfoque', requiredMastered: 6, x: 70, y: 56 },
  { number: 6, name: 'Bóveda Criptográfica', requiredMastered: 8, x: 25, y: 47 },
  { number: 7, name: 'Río de la Razón', requiredMastered: 10, x: 60, y: 38 },
  { number: 8, name: 'Santuario del Avatar', requiredMastered: 12, x: 30, y: 29 },
  { number: 9, name: 'Desfiladero Estelar', requiredMastered: 15, x: 70, y: 20 },
  { number: 10, name: 'Maestría Absoluta', requiredMastered: 20, x: 50, y: 8 },
];

const SEEDED_CONCEPTS: Record<number, string[]> = {
  1: [
    "La deshidratación leve disminuye el rendimiento cognitivo y físico.",
    "El agua es el principal componente del cuerpo humano, representando el 60%.",
    "Tomar un vaso de agua al despertar activa el metabolismo matutino."
  ],
  2: [
    "La luz azul de pantallas inhibe la secreción de melatonina por la noche.",
    "Mantener un horario constante de sueño alinea nuestro ritmo circadiano.",
    "La temperatura ideal para dormir es de aproximadamente 18 grados Celsius."
  ],
  3: [
    "Un hábito se consolida al asociar una señal, una rutina y una recompensa.",
    "Comenzar con hábitos minúsculos reduce la fricción de la fuerza de voluntad.",
    "Hacer seguimiento diario visual refuerza la identidad del hábito."
  ],
  4: [
    "Las proteínas son esenciales para reparar tejidos y mantener masa muscular.",
    "Los carbohidratos complejos liberan energía de forma sostenida y gradual.",
    "Las grasas saludables son vitales para la producción de hormonas reguladoras."
  ],
  5: [
    "La respiración profunda activa el sistema nervioso parasimpático.",
    "El cortisol elevado de forma crónica debilita el sistema inmunológico.",
    "La meditación regular incrementa la materia gris en áreas de enfoque."
  ],
  6: [
    "El ejercicio cardiovascular mejora la densidad capilar y oxigenación cerebral.",
    "El entrenamiento de fuerza previene la pérdida de masa ósea y sarcopenia.",
    "Caminar 10,000 pasos al día reduce el riesgo cardiovascular a la mitad."
  ],
  7: [
    "Comer despacio permite que la señal de saciedad llegue al cerebro a tiempo.",
    "La fibra soluble alimenta la microbiota intestinal mejorando la digestión.",
    "El azúcar refinado produce picos y caídas abruptas de energía y ánimo."
  ],
  8: [
    "Las notificaciones constantes fragmentan la atención y aumentan la fatiga.",
    "Tomar descansos activos de 5 minutos cada hora evita la fatiga ocular.",
    "La luz solar directa por la mañana ayuda a dormir mejor por la noche."
  ],
  9: [
    "Los ritmos ultradianos determinan picos de enfoque mental de 90 minutos.",
    "El café tardío (después de las 2 PM) reduce la calidad del sueño profundo.",
    "El ayuno intermitente puede favorecer la autofagia y reparación celular."
  ],
  10: [
    "El balance calórico neto determina la pérdida o ganancia de peso corporal.",
    "El VO2 Max es uno de los mayores predictores de longevidad y salud cardiovascular.",
    "La consistencia supera a la intensidad cuando buscamos adaptaciones a largo plazo."
  ],
};

interface AIQuestion {
  id: string;
  concept_id: string;
  type: 'mcq' | 'blank' | 'short';
  question: string;
  options?: string[];
  correctAnswer: string;
  keywords?: string[];
  explanation: string;
}

export default function QuestZone() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [newConcept, setNewConcept] = useState('');
  
  // Quiz states
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [quizResults, setQuizResults] = useState<{ conceptId: string; success: boolean }[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMutating, startTransition] = useTransition();

  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
  const [playingLevelNumber, setPlayingLevelNumber] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('maxUnlockedLevel');
    if (saved) {
      setMaxUnlockedLevel(parseInt(saved, 10));
    }
  }, []);

  // Load knowledge items
  const loadData = async () => {
    setIsLoading(true);
    const data = await getKnowledgeItems();
    setItems(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats
  const masteredCount = items.filter(item => item.status === 'mastered').length;
  const learningCount = items.filter(item => item.status === 'learning' || item.status === 'inbox').length;

  // Determine current active level
  const activeLevelNumber = Math.max(
    SAGA_LEVELS.reduce((active, level) => {
      if (masteredCount >= level.requiredMastered) {
        return level.number;
      }
      return active;
    }, 1),
    maxUnlockedLevel
  );

  const activeLevelInfo = SAGA_LEVELS.find(l => l.number === activeLevelNumber) || SAGA_LEVELS[0];

  // Determine which concepts are due for review (or in inbox)
  const dueItems = items
    .filter(item => item.status !== 'mastered' || new Date(item.next_review_at) <= new Date())
    .slice(0, 3); // Take up to 3 for a focused quick session

  // Add concept
  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim()) return;

    startTransition(async () => {
      const res = await createKnowledgeItem(newConcept);
      if (res.success && res.data) {
        setItems(prev => [res.data!, ...prev]);
        setNewConcept('');
        toast.success('Concepto añadido al buzón cognitivo.');
        setIsMailboxOpen(false);
      } else {
        toast.error(res.error || 'Error al guardar el concepto.');
      }
    });
  };

  // Delete concept
  const handleDeleteConcept = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que quieres eliminar este concepto?')) return;

    const res = await deleteKnowledgeItem(id);
    if (res.success) {
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Concepto eliminado.');
    } else {
      toast.error(res.error || 'Error al eliminar.');
    }
  };

  // Start Level Quiz using themed seeded concepts
  const handleStartLevel = async (levelNumber: number) => {
    if (levelNumber > activeLevelNumber) {
      toast.error('Este nivel está bloqueado.');
      return;
    }

    const levelConcepts = SEEDED_CONCEPTS[levelNumber] || [];
    const conceptsToUse = levelConcepts.map((concept, index) => ({
      id: `seeded-level-${levelNumber}-${index}`,
      raw_concept: concept,
    }));

    setPlayingLevelNumber(levelNumber);
    triggerVibration('light');
    setIsQuizOpen(true);
    setQuizLoading(true);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setQuizResults([]);
    setHasValidated(false);
    setUserAnswer('');
    setShowExplanation(false);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concepts: conceptsToUse,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate quiz');

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        toast.error('El motor de IA no pudo estructurar preguntas.');
        setIsQuizOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al invocar al motor de quizzes de IA.');
      setIsQuizOpen(false);
    } finally {
      setQuizLoading(false);
    }
  };

  // Start Custom Quiz using actual user pending concepts
  const handleStartCustomQuiz = async () => {
    if (dueItems.length === 0) {
      toast.error('No tienes conceptos pendientes de estudiar.');
      return;
    }

    setPlayingLevelNumber(null);
    triggerVibration('light');
    setIsQuizOpen(true);
    setQuizLoading(true);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setQuizResults([]);
    setHasValidated(false);
    setUserAnswer('');
    setShowExplanation(false);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concepts: dueItems.map(item => ({
            id: item.id,
            raw_concept: item.raw_concept,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate quiz');

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        toast.error('El motor de IA no pudo estructurar preguntas.');
        setIsQuizOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al generar quiz de IA.');
      setIsQuizOpen(false);
    } finally {
      setQuizLoading(false);
    }
  };

  // Validate answer
  const handleValidateAnswer = () => {
    if (hasValidated) return;
    const currentQ = questions[currentQuestionIdx];
    let correct = false;

    if (currentQ.type === 'mcq') {
      correct = userAnswer.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    } else if (currentQ.type === 'blank') {
      correct = userAnswer.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    } else if (currentQ.type === 'short') {
      // Free short response: validate based on keywords
      const ansLower = userAnswer.toLowerCase();
      const keywords = currentQ.keywords || [];
      if (keywords.length > 0) {
        correct = keywords.every(kw => ansLower.includes(kw.toLowerCase()));
      } else {
        // Fallback exact match / length check
        correct = ansLower.length > 5;
      }
    }

    setIsAnswerCorrect(correct);
    setHasValidated(true);
    setShowExplanation(true);
    setQuizResults(prev => [...prev, { conceptId: currentQ.concept_id, success: correct }]);

    if (correct) {
      triggerVibration('success');
      triggerMicroCelebrate();
    } else {
      triggerVibration('light');
    }
  };

  // Go to next question or end quiz
  const handleNextQuestion = async () => {
    if (currentQuestionIdx + 1 < questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setUserAnswer('');
      setHasValidated(false);
      setShowExplanation(false);
    } else {
      // End of Quiz! Sync results to DB if not seeded
      setQuizLoading(true);
      let successCount = 0;

      for (const res of quizResults) {
        try {
          if (!res.conceptId.startsWith('seeded-')) {
            await recordReviewOutcome(res.conceptId, res.success);
          }
          if (res.success) successCount++;
        } catch (e) {
          console.error('Error syncing review outcome:', e);
        }
      }

      setQuizLoading(false);
      setIsQuizOpen(false);

      if (playingLevelNumber !== null) {
        const passed = successCount >= Math.ceil(quizResults.length * 0.7);
        if (passed && quizResults.length > 0) {
          const nextLevel = Math.min(10, playingLevelNumber + 1);
          if (nextLevel > maxUnlockedLevel) {
            setMaxUnlockedLevel(nextLevel);
            localStorage.setItem('maxUnlockedLevel', String(nextLevel));
          }
          triggerStreakConfetti();
          toast.success(`¡Nivel ${playingLevelNumber} completado con éxito! Siguiente nivel desbloqueado.`);
        } else {
          toast.error(`Nivel no superado. Acertaste ${successCount}/${quizResults.length}. Necesitas al menos el 70% para avanzar.`);
        }
      } else {
        if (successCount === quizResults.length && successCount > 0) {
          triggerStreakConfetti();
          toast.success('¡Repaso completado perfectamente! Dopamina al máximo.');
        } else {
          toast.success(`Repaso finalizado: ${successCount}/${quizResults.length} correctas.`);
        }
      }
      
      // Reload items to update map
      loadData();
    }
  };

  const pathData = SAGA_LEVELS.map((level, idx) => {
    const prefix = idx === 0 ? 'M' : 'L';
    return `${prefix} ${level.x} ${level.y}`;
  }).join(' ');

  const completedLevels = SAGA_LEVELS.filter(l => l.number <= activeLevelNumber);
  const activePathData = completedLevels.map((level, idx) => {
    const prefix = idx === 0 ? 'M' : 'L';
    return `${prefix} ${level.x} ${level.y}`;
  }).join(' ');

  return (
    <main className="min-h-[100dvh] bg-slate-950 pb-28 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-900 bg-slate-950/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black tracking-tight uppercase text-indigo-400">Knowledge Quest</h1>
          <button 
            onClick={() => setIsMailboxOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            Buzón
          </button>
        </div>
      </header>

      {/* Info Widget */}
      <section className="mx-auto mt-4 max-w-md px-4">
        <div className="rounded-3xl border border-slate-900 bg-slate-900/50 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Progreso Cognitivo</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{masteredCount}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sabidurías Dominadas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-950 border border-amber-800 text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{learningCount}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">En Aprendizaje</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Nivel actual: {activeLevelInfo.number} - {activeLevelInfo.name}</span>
              <span>Siguiente nivel: {masteredCount} / {SAGA_LEVELS[Math.min(activeLevelInfo.number, SAGA_LEVELS.length - 1)].requiredMastered}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (masteredCount / Math.max(1, SAGA_LEVELS[Math.min(activeLevelInfo.number, SAGA_LEVELS.length - 1)].requiredMastered)) * 100)}%` }} 
              />
            </div>
            {dueItems.length > 0 && (
              <button
                onClick={handleStartCustomQuiz}
                className="mt-4 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 text-xs font-black uppercase tracking-wider text-indigo-300 transition hover:bg-indigo-900 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Repasar mis conceptos pendientes ({dueItems.length})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SAGA PROGRESSION MAP */}
      <section className="relative mx-auto mt-8 max-w-md px-4 py-6 bg-slate-950">
        <h3 className="text-center text-xs font-black uppercase tracking-[0.25em] text-slate-500 mb-6">Mapa del Saber</h3>
        <div className="relative w-full h-[800px] bg-slate-900/30 rounded-3xl border border-slate-900 overflow-hidden">
          
          {/* Curved SVG line path connecting levels */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={pathData}
              fill="none"
              stroke="#1e1b4b"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
            {activePathData && (
              <path
                d={activePathData}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                className="animate-pulse"
              />
            )}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Saga levels nodes */}
          {SAGA_LEVELS.map((level) => {
            const isCompleted = level.number < activeLevelNumber;
            const isActive = level.number === activeLevelNumber;
            const isLocked = level.number > activeLevelNumber;

            return (
              <div 
                key={level.number} 
                className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${level.x}%`,
                  top: `${level.y}%`,
                }}
              >
                <div className="absolute -top-7 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-900/60">
                  {level.name}
                </div>
                
                {isActive ? (
                  /* Pulsing Active Node */
                  <button
                    onClick={() => handleStartLevel(level.number)}
                    className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-xl shadow-indigo-600/40"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-indigo-500 border-2 border-indigo-400"
                    />
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 border-2 border-indigo-400 text-white font-black text-lg"
                    >
                      <Sparkles className="h-5 w-5 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
                    </motion.div>
                  </button>
                ) : isCompleted ? (
                  /* Completed Node */
                  <button
                    onClick={() => handleStartLevel(level.number)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 border border-emerald-400 text-white shadow-lg shadow-emerald-900/20"
                  >
                    <Check className="h-5 w-5 font-black" />
                  </button>
                ) : (
                  /* Locked Node */
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-600">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                
                <span className="mt-2 text-xs font-black text-slate-400">Nivel {level.number}</span>
              </div>
            );
          })}

        </div>
      </section>

      {/* COGNITIVE MAILBOX DRAWER */}
      <BottomSheet 
        isOpen={isMailboxOpen} 
        onClose={() => setIsMailboxOpen(false)} 
        title="Buzón Cognitivo"
      >
        <div className="flex flex-col gap-6 text-slate-900">
          <p className="text-xs text-slate-500">
            Añade hechos, reglas o conceptos clave que deseas memorizar. El motor de IA creará trivias automáticas espaciadas para ti.
          </p>

          {/* Add Concept Form */}
          <form onSubmit={handleAddConcept} className="flex gap-2">
            <input
              type="text"
              required
              disabled={isMutating}
              value={newConcept}
              onChange={(e) => setNewConcept(e.target.value)}
              placeholder="Ej: El agua hierve a 100 grados Celsius..."
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isMutating}
              className="flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 font-bold text-white transition hover:bg-indigo-500"
            >
              {isMutating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Añadir'}
            </button>
          </form>

          {/* Lists */}
          <div className="flex flex-col gap-5">
            {/* Learning concepts */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Pendientes de aprender ({learningCount})</h4>
              {items.filter(i => i.status !== 'mastered').length === 0 ? (
                <p className="text-xs text-slate-400 italic">Buzón vacío. ¡Comienza a añadir conceptos!</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {items.filter(i => i.status !== 'mastered').map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-semibold text-slate-800">{item.raw_concept}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-bold uppercase bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-600">{item.status}</span>
                          <span>Racha: {item.streak}/5 🔥</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteConcept(item.id, e)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wisdom vault (Mastered) */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Bóveda de Sabiduría ({masteredCount})</h4>
              {items.filter(i => i.status === 'mastered').length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aún no has dominado ningún concepto.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {items.filter(i => i.status === 'mastered').map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-semibold text-slate-800">{item.raw_concept}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-emerald-600">
                          <span className="font-bold uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Dominado</span>
                          <span>Próximo repaso en 7 días 📅</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteConcept(item.id, e)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* QUIZ ENGINE DRAWER FULLSCREEN */}
      <AnimatePresence>
        {isQuizOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-4 md:p-6 text-white overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Nivel {activeLevelInfo.number} · IA Quiz</p>
                <h3 className="text-base font-black">Evaluación de Conceptos</h3>
              </div>
              <button 
                onClick={() => {
                  if (confirm('¿Quieres salir del quiz? Perderás el progreso de esta ronda.')) {
                    setIsQuizOpen(false);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-400 transition hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Quiz Content */}
            <div className="flex-1 flex flex-col justify-center items-center py-6 overflow-y-auto w-full max-w-lg mx-auto">
              {quizLoading ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center text-center gap-4 py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                  <p className="text-sm font-semibold text-slate-400">El motor de IA está consultando tus conceptos y forjando tu quiz dinámico...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-red-400 font-bold">No se pudieron recuperar las preguntas.</p>
                </div>
              ) : (
                /* Active Question Rendering */
                <div className="w-full flex flex-col gap-6">
                  {/* Progress bar */}
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2">
                      <span>Pregunta {currentQuestionIdx + 1} de {questions.length}</span>
                      <span>{Math.round(((currentQuestionIdx) / questions.length) * 100)}% Completado</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300" 
                        style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="rounded-3xl border border-slate-900 bg-slate-900/30 p-5">
                    <div className="inline-block rounded-full bg-indigo-950/80 px-3 py-1 text-[10px] font-black uppercase text-indigo-400 border border-indigo-900/60 mb-3">
                      {questions[currentQuestionIdx].type === 'mcq' ? 'Opción Múltiple' : 
                       questions[currentQuestionIdx].type === 'blank' ? 'Rellenar Hueco' : 'Respuesta Libre Corta'}
                    </div>
                    <p className="text-lg font-bold leading-relaxed">{questions[currentQuestionIdx].question}</p>
                  </div>

                  {/* DYNAMIC INPUT ACCORDING TO TYPE */}
                  <div className="flex-1 flex flex-col justify-center">
                    {/* MCQ Options */}
                    {questions[currentQuestionIdx].type === 'mcq' && (
                      <div className="grid grid-cols-1 gap-2.5 w-full">
                        {questions[currentQuestionIdx].options?.map((opt, i) => {
                          const isSelected = userAnswer === opt;
                          let btnStyle = "border-slate-800 bg-slate-900/30 text-slate-100 hover:bg-slate-900/60";
                          
                          if (hasValidated) {
                            if (opt.toLowerCase() === questions[currentQuestionIdx].correctAnswer.toLowerCase()) {
                              btnStyle = "border-emerald-500 bg-emerald-950/50 text-emerald-300";
                            } else if (isSelected) {
                              btnStyle = "border-red-500 bg-red-950/50 text-red-300";
                            } else {
                              btnStyle = "border-slate-900 bg-slate-900/10 text-slate-500 opacity-60";
                            }
                          } else if (isSelected) {
                            btnStyle = "border-indigo-500 bg-indigo-950/50 text-indigo-300";
                          }

                          return (
                            <button
                              key={i}
                              disabled={hasValidated}
                              onClick={() => setUserAnswer(opt)}
                              className={`flex min-h-[50px] items-center rounded-2xl border p-4 text-sm font-bold transition-all text-left ${btnStyle}`}
                            >
                              <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-black text-slate-300 uppercase">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill-in-the-blank input */}
                    {questions[currentQuestionIdx].type === 'blank' && (
                      <div className="w-full flex flex-col gap-2">
                        <input
                          type="text"
                          required
                          disabled={hasValidated}
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Introduce la palabra o palabras faltantes..."
                          className={`h-14 w-full rounded-2xl border bg-slate-900/30 px-4 text-center font-bold text-white transition focus:outline-none ${
                            hasValidated ? 
                              isAnswerCorrect ? 'border-emerald-500 bg-emerald-950/20' : 'border-red-500 bg-red-950/20'
                              : 'border-slate-800 focus:border-indigo-500'
                          }`}
                        />
                        {hasValidated && !isAnswerCorrect && (
                          <p className="text-xs text-red-400 mt-1 font-semibold text-center">
                            Respuesta correcta: <span className="underline font-bold">{questions[currentQuestionIdx].correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Short response textarea */}
                    {questions[currentQuestionIdx].type === 'short' && (
                      <div className="w-full flex flex-col gap-2">
                        <textarea
                          required
                          disabled={hasValidated}
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          rows={3}
                          placeholder="Escribe tu respuesta libre de manera clara y concisa..."
                          className={`w-full rounded-2xl border bg-slate-900/30 p-4 text-sm font-bold leading-relaxed text-white transition focus:outline-none ${
                            hasValidated ? 
                              isAnswerCorrect ? 'border-emerald-500 bg-emerald-950/20' : 'border-red-500 bg-red-950/20'
                              : 'border-slate-800 focus:border-indigo-500'
                          }`}
                        />
                        {hasValidated && (
                          <div className="mt-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-3 text-xs text-slate-300">
                            <p className="font-bold text-indigo-400 mb-1">Respuesta sugerida:</p>
                            <p>{questions[currentQuestionIdx].correctAnswer}</p>
                            {questions[currentQuestionIdx].keywords && (
                              <p className="mt-1 text-slate-500 font-medium">Palabras clave requeridas: {questions[currentQuestionIdx].keywords.join(', ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feedback Message */}
                  <AnimatePresence>
                    {hasValidated && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 text-sm ${
                          isAnswerCorrect ? 'border-emerald-800 bg-emerald-950/45 text-emerald-300' : 'border-red-800 bg-red-950/45 text-red-300'
                        }`}
                      >
                        <div className="flex gap-2">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="font-black leading-tight mb-1">{isAnswerCorrect ? '¡Excelente Trabajo!' : 'Incorrecto'}</p>
                            <p className="text-xs leading-relaxed text-slate-300">{questions[currentQuestionIdx].explanation}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Control Button */}
                  <div className="mt-auto shrink-0 w-full pt-4">
                    {!hasValidated ? (
                      <button
                        onClick={handleValidateAnswer}
                        disabled={!userAnswer.trim()}
                        className="h-12 w-full rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-40"
                      >
                        Validar Respuesta
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="h-12 w-full rounded-2xl bg-slate-100 font-bold text-slate-950 hover:bg-slate-200 transition"
                      >
                        {currentQuestionIdx + 1 < questions.length ? 'Siguiente Pregunta' : 'Finalizar Nivel'}
                      </button>
                    )}
                  </div>

                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}

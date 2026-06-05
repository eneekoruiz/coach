import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWeeklyReport } from '@/app/actions/weeklyReport';

interface WeeklyReportScreen {
  title: string;
  metric: string;
  description: string;
  gradient: string;
  icon: string;
}

interface WeeklyReport {
  titulo: string;
  puntuacion_semanal: number;
  resumen: string;
  screens: WeeklyReportScreen[];
}

export default function WeeklyReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getMondayDateStr = () => {
    const d = new Date();
    const day = d.getDay();
    // 0 = Sunday, 1 = Monday, etc.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const today = new Date();
    const isMonday = today.getDay() === 1;
    const mondayStr = getMondayDateStr();
    const viewedKey = `weekly_report_viewed_${mondayStr}`;
    const alreadyViewed = localStorage.getItem(viewedKey) === 'true';

    // Show if it is Monday and has not been viewed yet
    if (isMonday && !alreadyViewed) {
      setIsOpen(true);
      void loadReport();
    }
  }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const res = await generateWeeklyReport();
      if (res.report) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Failed to load weekly report', err);
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    const mondayStr = getMondayDateStr();
    const viewedKey = `weekly_report_viewed_${mondayStr}`;
    localStorage.setItem(viewedKey, 'true');
    setIsOpen(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const scrollLeft = containerRef.current.scrollLeft;
    const index = Math.round(scrollLeft / width);
    setActiveSlide(index);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black">
        {loading ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-white">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="h-12 w-12 rounded-full border-4 border-t-transparent border-indigo-400"
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500 animate-pulse">
              Compilando Reporte Semanal
            </p>
          </div>
        ) : (
          report && (
            <div className="relative h-full w-full overflow-hidden select-none">
              {/* Horizontal Snap Scroll container */}
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Intro Slide */}
                <div className="w-full h-full shrink-0 snap-start flex flex-col justify-between p-8 bg-gradient-to-b from-indigo-950 via-slate-950 to-black text-white">
                  <div className="mt-12">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">
                      REPORTE SEMANAL
                    </span>
                    <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-7xl">
                      {report.titulo}
                    </h1>
                  </div>

                  <div className="max-w-md my-auto">
                    <p className="text-xl font-light leading-relaxed text-slate-300">
                      {report.resumen}
                    </p>
                  </div>

                  <div className="mb-12 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">SCORE GLOBAL</span>
                      <span className="text-4xl font-extrabold text-indigo-300">{report.puntuacion_semanal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Desliza para explorar</span>
                      <span className="text-xl animate-bounce">→</span>
                    </div>
                  </div>
                </div>

                {/* Gemini Dynamic Screens */}
                {report.screens.map((screen, idx) => (
                  <div
                    key={idx}
                    className={`w-full h-full shrink-0 snap-start flex flex-col justify-between p-8 bg-gradient-to-br ${screen.gradient} text-white`}
                  >
                    <div className="mt-12 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                        {screen.title}
                      </span>
                      <span className="text-4xl">{screen.icon}</span>
                    </div>

                    <div className="my-auto">
                      <span className="text-6xl font-black tracking-tighter block mb-6 sm:text-8xl">
                        {screen.metric}
                      </span>
                      <p className="text-lg font-light leading-relaxed text-slate-200 max-w-lg">
                        {screen.description}
                      </p>
                    </div>

                    <div className="mb-12 flex items-center justify-between">
                      {idx === report.screens.length - 1 ? (
                        <button
                          onClick={handleClose}
                          className="w-full rounded-2xl bg-white px-6 py-4 text-center text-sm font-bold text-black shadow-lg hover:bg-slate-100 active:scale-[0.98] transition"
                        >
                          Entendido, comenzar mi semana
                        </button>
                      ) : (
                        <div className="w-full flex justify-end">
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            Pantalla {idx + 1} de {report.screens.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Indicator Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-50">
                <div className={`h-1.5 w-1.5 rounded-full transition-all ${activeSlide === 0 ? 'bg-white w-4' : 'bg-white/30'}`} />
                {report.screens.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      activeSlide === idx + 1 ? 'bg-white w-4' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </AnimatePresence>
  );
}

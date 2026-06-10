'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { getHealthCorrelationData, generateHealthInsights } from '@/app/nutrition/actions';
import { X, Sparkles, TrendingUp, Heart, Brain, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import toast from '@/lib/toast';

interface HealthInsightsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CorrelationPoint {
  date: string;
  dayLabel: string;
  valence: number;
  kcalPercent: number;
  kcalConsumed: number;
  kcalTarget: number;
}

export default function HealthInsightsDashboard({ isOpen, onClose }: HealthInsightsDashboardProps) {
  const [data, setData] = useState<CorrelationPoint[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadCorrelation = async () => {
      setLoadingData(true);
      setLoadingInsight(true);
      setInsight('');
      setData([]);

      try {
        const res = await getHealthCorrelationData();
        if (res.success && res.data.length > 0) {
          setData(res.data);
          setLoadingData(false);

          // Once data is loaded, fetch the AI insights
          const insightRes = await generateHealthInsights(res.data);
          if (insightRes.success && insightRes.insight) {
            setInsight(insightRes.insight);
          } else {
            setInsight('No he podido conectar con el Coach de IA en este momento. Inténtalo de nuevo más tarde.');
          }
        } else {
          toast.error(res.error || 'Error al cargar datos del historial.');
          setLoadingData(false);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al generar el panel de insights.');
        setLoadingData(false);
      } finally {
        setLoadingInsight(false);
      }
    };

    void loadCorrelation();
  }, [isOpen]);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        {/* Backdrop Overlay */}
        <Drawer.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[150] transition-opacity" />

        {/* Sliding Panel */}
        <Drawer.Content className="bg-slate-50 border-t border-slate-200 flex flex-col rounded-t-[2.5rem] h-[95vh] fixed bottom-0 left-0 right-0 z-[160] outline-none shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">Insights y correlaciones clínicas</Drawer.Title>
          <Drawer.Description className="sr-only">
            Panel de analítica con correlaciones entre ánimo, nutrición e inercia semanal.
          </Drawer.Description>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 my-4 flex-shrink-0" />

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Correlaciones Clínicas
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                  Insights & Data Storytelling
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-550 border border-slate-200/60 transition shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingData ? (
              <div className="animate-pulse space-y-6">
                <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-64 bg-slate-100 rounded-2xl flex items-end justify-between p-6">
                    <div className="w-8 h-32 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-48 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-20 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-40 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-56 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-16 bg-slate-200/70 rounded-t" />
                    <div className="w-8 h-36 bg-slate-200/70 rounded-t" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-3">
                    <div className="h-3.5 bg-slate-200 rounded w-11/12" />
                    <div className="h-3.5 bg-slate-200 rounded w-full" />
                    <div className="h-3.5 bg-slate-200 rounded w-4/5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Chart Block */}
                <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-xs">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                    Ánimo vs Cumplimiento Nutricional (Últimos 7 días)
                  </h3>

                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        {/* Minimalist Axis */}
                        <XAxis
                          dataKey="dayLabel"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[1, 5]}
                          axisLine={false}
                          tickLine={false}
                          tickCount={5}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#6366f1' }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 120]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#14b8a6' }}
                        />

                        {/* Interactive tooltips */}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                          }}
                          labelClassName="text-slate-800 font-extrabold"
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        />

                        {/* Calories Compliance Bars (Secondary Axis) */}
                        <Bar
                          yAxisId="right"
                          name="% Meta Calórica"
                          dataKey="kcalPercent"
                          fill="#14b8a6"
                          fillOpacity={0.15}
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                        />

                        {/* Mood Valence Line (Primary Axis) */}
                        <Line
                          yAxisId="left"
                          name="Estado de Ánimo (Valence)"
                          type="monotone"
                          dataKey="valence"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* IA Textual insights block */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    Análisis del Fisiocoach IA
                  </h3>

                  {loadingInsight ? (
                    <div className="bg-white/70 border border-slate-100 rounded-3xl p-6 space-y-2.5">
                      <div className="animate-pulse bg-slate-200 h-3.5 w-11/12 rounded-md" />
                      <div className="animate-pulse bg-slate-200 h-3.5 w-full rounded-md" />
                      <div className="animate-pulse bg-slate-200 h-3.5 w-4/5 rounded-md" />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-xs relative overflow-hidden"
                    >
                      <div className="absolute right-4 top-4 text-indigo-500/10">
                        <Sparkles className="w-16 h-16 rotate-12" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed relative z-10 pr-6">
                        {insight}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

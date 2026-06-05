'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { type DailyLog } from '@/lib/schema';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, Droplets, CalendarCheck } from 'lucide-react';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface TrendChartProps {
  logs: HistoryLog[];
}

export default function TrendChart({ logs }: TrendChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPeriod = (searchParams.get('period') as '7D' | '1M' | '6M') || '7D';
  const [period, setPeriod] = useState<'7D' | '1M' | '6M'>(urlPeriod);

  const sortedLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let sliceAmount = 7;
    if (period === '1M') sliceAmount = 30;
    if (period === '6M') sliceAmount = 180;
    
    return sorted.slice(-sliceAmount);
  }, [logs, period]);

  const chartData = useMemo(() => {
    return sortedLogs.map(log => ({
      date: new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      inercia: log.health_momentum,
      kcal: log.ai_data?.total_kcal || 0,
      agua: log.ai_data?.water_ml || log.ai_data?.hidratacion_ml || 0,
    }));
  }, [sortedLogs]);

  const insights = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const current = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    const inerciaDiff = current.inercia - previous.inercia;
    const inerciaTrend = inerciaDiff >= 0 ? 'up' : 'down';
    const inerciaText = inerciaTrend === 'up' ? 'Inercia al alza' : 'Inercia bajando';
    const inerciaColor = inerciaTrend === 'up' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-rose-500 bg-rose-50 border-rose-100';
    const InerciaIcon = inerciaTrend === 'up' ? ArrowUpRight : ArrowDownRight;

    const avgKcal = Math.round(chartData.reduce((acc, curr) => acc + curr.kcal, 0) / chartData.length);
    const avgAgua = Math.round(chartData.reduce((acc, curr) => acc + curr.agua, 0) / chartData.length);

    const totalDays = period === '7D' ? 7 : period === '1M' ? 30 : 180;
    const consistency = Math.min(100, Math.round((logs.length / totalDays) * 100));

    return {
      inercia: { text: inerciaText, diff: inerciaDiff, color: inerciaColor, Icon: InerciaIcon },
      avgKcal,
      avgAgua,
      consistency,
    };
  }, [chartData, logs.length, period]);

  const handlePeriodChange = (newPeriod: '7D' | '1M' | '6M') => {
    setPeriod(newPeriod);
    router.push(`/history?period=${newPeriod}`);
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
        <p>Aún no hay datos históricos suficientes.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white/10 text-xs">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span>{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Pills Selector (iOS Segmented Control) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-slate-200/50 p-1 rounded-full backdrop-blur-xl border border-white/40 shadow-inner">
          {['7D', '1M', '6M'].map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p as any)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                period === p 
                  ? 'bg-white text-slate-900 shadow-sm scale-100' 
                  : 'text-slate-500 hover:text-slate-700 scale-95'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Insights Bento Grid */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-3xl border flex items-center justify-between ${insights.inercia.color}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Momentum</p>
              <p className="text-lg font-black">{insights.inercia.text}</p>
            </div>
            <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm">
              <insights.inercia.Icon className="w-6 h-6" />
            </div>
          </div>
          
          <div className="p-5 rounded-3xl border border-orange-100 bg-orange-50 text-orange-600 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Promedio Calorías</p>
              <p className="text-lg font-black">{insights.avgKcal} kcal</p>
            </div>
            <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-cyan-100 bg-cyan-50 text-cyan-600 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Promedio Agua</p>
              <p className="text-lg font-black">{insights.avgAgua} ml</p>
            </div>
            <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm">
              <Droplets className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-lime-100 bg-lime-50 text-lime-600 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Consistencia</p>
              <p className="text-lg font-black">{insights.consistency}%</p>
            </div>
            <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="space-y-6">
        {/* Gráfica Inercia */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Evolución de Inercia
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInercia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <YAxis hide={true} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="inercia" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorInercia)" name="Inercia" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfica Kcal */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Calorías
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="kcal" stroke="#f97316" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} name="Calorías (kcal)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica Agua */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-500" />
              Hidratación
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAgua" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis hide={true} domain={[0, 'dataMax + 500']} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="agua" stroke="#06b6d4" strokeWidth={4} fillOpacity={1} fill="url(#colorAgua)" name="Agua (ml)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

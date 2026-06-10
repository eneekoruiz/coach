'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';
import { type DailyLog } from '@/lib/schema';
import { ArrowUpRight, ArrowDownRight, Activity, Droplets, CalendarCheck } from 'lucide-react';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface TrendChartProps {
  logs: HistoryLog[];
}

type TrendPeriod = '7D' | '1M' | '6M';
const trendPeriods: TrendPeriod[] = ['7D', '1M', '6M'];

type ChartTooltipEntry = {
  color?: string;
  name?: string | number;
  value?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
};

export default function TrendChart({ logs }: TrendChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPeriod = searchParams.get('period');
  const urlPeriod: TrendPeriod = trendPeriods.includes(requestedPeriod as TrendPeriod)
    ? (requestedPeriod as TrendPeriod)
    : '7D';
  const [period, setPeriod] = useState<TrendPeriod>(urlPeriod);

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

  const handlePeriodChange = (newPeriod: TrendPeriod) => {
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

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white/10 text-xs">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          {payload.map((entry, index: number) => (
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
    <div className="space-y-5">
      {/* Pills Selector (iOS Segmented Control) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-slate-200/50 p-1 rounded-full backdrop-blur-xl border border-white/40 shadow-inner">
          {trendPeriods.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
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

      {insights && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className={`rounded-[2rem] border p-5 ${insights.inercia.color}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Tendencia semanal</p>
              <p className="mt-2 text-6xl font-black tracking-tight">{Math.abs(insights.inercia.diff)}</p>
              <p className="mt-1 text-sm font-black">{insights.inercia.text}</p>
            </div>
            <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur-md">
              <insights.inercia.Icon className="w-6 h-6" />
            </div>
          </div>
          
          <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-orange-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Kcal media</p>
              <p className="mt-2 text-2xl font-black">{insights.avgKcal}</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Agua media</p>
              <p className="mt-2 text-2xl font-black">{insights.avgAgua}ml</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <Droplets className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-lime-100 bg-lime-50 p-4 text-lime-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Consistencia</p>
              <p className="mt-2 text-2xl font-black">{insights.consistency}%</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-100">Inercia</span>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700 ring-1 ring-orange-100">Nutrición</span>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700 ring-1 ring-cyan-100">Agua</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="inercia" radius={[10, 10, 10, 10]} fill="#10b981" name="Inercia" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="kcal" radius={[10, 10, 10, 10]} fill="#f97316" name="Kcal" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="agua" radius={[10, 10, 10, 10]} fill="#06b6d4" name="Agua" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

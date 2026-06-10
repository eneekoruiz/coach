'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type DailyLog } from '@/lib/schema';
import { ArrowDownRight, ArrowUpRight, CalendarCheck, Droplets, Activity } from 'lucide-react';

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
  payload?: { date?: string };
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
};

function ScatterPanel({
  title,
  hint,
  color,
  dataKey,
  data,
}: {
  title: string;
  hint: string;
  color: string;
  dataKey: 'inerciaProgress' | 'kcalProgress' | 'aguaProgress';
  data: Array<{ dayIndex: number; date: string; inerciaProgress: number; kcalProgress: number; aguaProgress: number }>;
}) {
  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      const point = payload[0];
      return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-xs text-white shadow-xl backdrop-blur-md">
          <p className="font-black text-slate-300">{point.payload?.date}</p>
          <p className="mt-1 font-semibold">
            {point.name}: {point.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>
        {title}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dayIndex" type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis dataKey={dataKey} type="number" domain={[0, 130]} tick={{ fontSize: 10 }} stroke="#94a3b8" unit="%" />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4' }} />
            <ReferenceLine y={100} stroke={color} strokeDasharray="4 4" />
            <Scatter data={data} fill={color} name={title} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
    return sortedLogs.map((log, index) => ({
      dayIndex: index + 1,
      date: new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      inercia: log.health_momentum,
      kcal: log.ai_data?.total_kcal || 0,
      agua: log.ai_data?.water_ml || log.ai_data?.hidratacion_ml || 0,
      inerciaProgress: Math.min(130, Math.round((log.health_momentum / 100) * 100)),
      kcalProgress: Math.min(130, Math.round(((log.ai_data?.total_kcal || 0) / 2000) * 100)),
      aguaProgress: Math.min(130, Math.round((((log.ai_data?.water_ml || log.ai_data?.hidratacion_ml) || 0) / 2000) * 100)),
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
      <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-12 text-slate-400">
        <p>Aún no hay datos históricos suficientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/40 bg-slate-200/50 p-1 shadow-inner backdrop-blur-xl">
          {trendPeriods.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ${
                period === p ? 'bg-white text-slate-900 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'
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
              <insights.inercia.Icon className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-orange-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Kcal media</p>
              <p className="mt-2 text-2xl font-black">{insights.avgKcal}</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Agua media</p>
              <p className="mt-2 text-2xl font-black">{insights.avgAgua}ml</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <Droplets className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-3xl border border-lime-100 bg-lime-50 p-4 text-lime-600">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Consistencia</p>
              <p className="mt-2 text-2xl font-black">{insights.consistency}%</p>
            </div>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
              <CalendarCheck className="h-6 w-6" />
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
          <ScatterPanel
            title="Inercia"
            hint="Progreso diario frente a objetivo 100%"
            color="#10b981"
            dataKey="inerciaProgress"
            data={chartData}
          />
          <ScatterPanel
            title="Nutrición"
            hint="Kcal diarias frente a objetivo 2000"
            color="#f97316"
            dataKey="kcalProgress"
            data={chartData}
          />
          <ScatterPanel
            title="Agua"
            hint="Hidratación diaria frente a objetivo 2000ml"
            color="#06b6d4"
            dataKey="aguaProgress"
            data={chartData}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { type DailyLog } from '@/lib/schema';
import HistoryCard from '@/components/HistoryCard';
import HistoryDetailPanel from '@/components/HistoryDetailPanel';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { importDailyLogsBulk } from '@/app/nutrition/actions';
import Papa from 'papaparse';
import { Download, UploadCloud, FileSpreadsheet, Sparkles, RefreshCw, Loader2, FileUp } from 'lucide-react';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface HistoryClientContainerProps {
  logs: HistoryLog[];
}

const TrendChart = dynamic(() => import('@/components/TrendChart'), { ssr: false });

export default function HistoryClientContainer({ logs }: HistoryClientContainerProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'daily'>('stats');
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [importPreview, setImportPreview] = useState<{ daysCount: number; rowsCount: number; entries: any[] } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    toast.success('Iniciando exportación de datos nutricionales...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión para exportar datos.');
        return;
      }

      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      const { data: templatesData, error: templatesError } = await supabase
        .from('diet_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (templatesError) throw templatesError;

      const downloadCSV = (csvContent: string, filename: string) => {
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const logsHeaders = ['Fecha', 'Calorias_Kcal', 'Proteina_g', 'Carbohidratos_g', 'Grasas_g', 'Agua_ml', 'Momentum', 'Comidas'];
      const logsRows = (logsData || []).map(row => {
        const ai = row.ai_data || {};
        const mealsStr = Array.isArray(ai.comidas)
          ? ai.comidas.map((c: any) => `[${c.hora || '12:00'}] ${c.descripcion} (${c.calidad_nutricional || 'buena'})`).join('; ')
          : '';
        return [
          row.date || '',
          String(ai.total_kcal ?? 0),
          String(ai.protein_g ?? 0),
          String(ai.carbs_g ?? 0),
          String(ai.fats_g ?? 0),
          String(ai.water_ml ?? ai.hidratacion_ml ?? 0),
          String(row.health_momentum ?? 50),
          mealsStr
        ];
      });

      const escapeCSV = (cell: string) => {
        const str = cell === null || cell === undefined ? '' : String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const logsCsvContent = [
        logsHeaders.join(','),
        ...logsRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const templatesHeaders = ['Nombre_Plantilla', 'Calorias_Objetivo_Kcal', 'Proteina_Objetivo_g', 'Carbohidratos_Objetivo_g', 'Grasas_Objetivo_g', 'Comidas_Planificadas'];
      const templatesRows = (templatesData || []).map(row => {
        const mealsStr = Array.isArray(row.meals)
          ? row.meals.map((m: any) => `${m.name}: ${m.text || ''} (${m.target_kcal ?? 0} kcal)`).join('; ')
          : '';
        return [
          row.name || '',
          String(row.target_kcal ?? 2000),
          String(row.target_protein ?? 150),
          String(row.target_carbs ?? 200),
          String(row.target_fats ?? 70),
          mealsStr
        ];
      });

      const templatesCsvContent = [
        templatesHeaders.join(','),
        ...templatesRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      downloadCSV(logsCsvContent, 'historial_nutricion.csv');
      
      setTimeout(() => {
        downloadCSV(templatesCsvContent, 'plantillas_dieta.csv');
        toast.success('¡Exportación completada con éxito!');
        setIsExporting(false);
      }, 1000);

    } catch (err: any) {
      console.error('Error al exportar datos:', err);
      toast.error('Error al exportar datos: ' + (err.message || err));
      setIsExporting(false);
    }
  };

  const handleImportCSV = (file: File) => {
    if (!file) return;
    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setIsImporting(false);
        const rows = results.data as any[];

        if (!rows || rows.length === 0) {
          toast.error('El archivo CSV está vacío.');
          return;
        }

        const sample = rows[0];
        const headers = Object.keys(sample);
        
        const dateKey = headers.find(h => ['fecha', 'date'].includes(h.toLowerCase().trim()));
        const foodKey = headers.find(h => ['alimento', 'food', 'descripcion', 'description'].includes(h.toLowerCase().trim()));
        const kcalKey = headers.find(h => ['kcal', 'calories', 'calorias'].includes(h.toLowerCase().trim()));

        if (!dateKey || !foodKey || !kcalKey) {
          toast.error('Formato inválido. Las columnas Fecha, Alimento y Kcal son obligatorias.');
          return;
        }

        const protKey = headers.find(h => ['proteina', 'proteina_g', 'protein', 'proteins'].includes(h.toLowerCase().trim()));
        const carbKey = headers.find(h => ['carbohidratos', 'carbohidratos_g', 'carbs', 'carbohydrates'].includes(h.toLowerCase().trim()));
        const fatKey = headers.find(h => ['grasas', 'grasas_g', 'fat', 'fats'].includes(h.toLowerCase().trim()));
        const waterKey = headers.find(h => ['agua', 'agua_ml', 'water', 'hydration'].includes(h.toLowerCase().trim()));

        const groupedByDate: Record<string, {
          meals: Array<{ hora: string; descripcion: string; calidad_nutricional: 'buena' | 'regular' | 'mala' }>;
          total_kcal: number;
          protein_g: number;
          carbs_g: number;
          fats_g: number;
          water_ml: number;
        }> = {};

        try {
          rows.forEach((row, index) => {
            const dateVal = row[dateKey]?.trim();
            const foodVal = row[foodKey]?.trim();
            const kcalVal = parseFloat(row[kcalKey] || '0');

            if (!dateVal || !foodVal) {
              throw new Error(`Fila ${index + 1}: Fecha y Alimento no pueden estar vacíos.`);
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
              throw new Error(`Fila ${index + 1}: Formato de fecha inválido (${dateVal}). Use AAAA-MM-DD.`);
            }

            const protVal = protKey ? parseFloat(row[protKey] || '0') : 0;
            const carbVal = carbKey ? parseFloat(row[carbKey] || '0') : 0;
            const fatVal = fatKey ? parseFloat(row[fatKey] || '0') : 0;
            const waterVal = waterKey ? parseFloat(row[waterKey] || '0') : 0;

            if (!groupedByDate[dateVal]) {
              groupedByDate[dateVal] = {
                meals: [],
                total_kcal: 0,
                protein_g: 0,
                carbs_g: 0,
                fats_g: 0,
                water_ml: 0
              };
            }

            groupedByDate[dateVal].meals.push({
              hora: '12:00',
              descripcion: foodVal,
              calidad_nutricional: 'buena'
            });

            groupedByDate[dateVal].total_kcal += isNaN(kcalVal) ? 0 : Math.round(kcalVal);
            groupedByDate[dateVal].protein_g += isNaN(protVal) ? 0 : Math.round(protVal);
            groupedByDate[dateVal].carbs_g += isNaN(carbVal) ? 0 : Math.round(carbVal);
            groupedByDate[dateVal].fats_g += isNaN(fatVal) ? 0 : Math.round(fatVal);
            groupedByDate[dateVal].water_ml += isNaN(waterVal) ? 0 : Math.round(waterVal);
          });

          const entries = Object.entries(groupedByDate).map(([date, val]) => ({
            date,
            ...val
          })).sort((a, b) => a.date.localeCompare(b.date));

          setImportPreview({
            daysCount: entries.length,
            rowsCount: rows.length,
            entries
          });

        } catch (err: any) {
          toast.error(err.message || 'Error al procesar el archivo CSV.');
        }
      },
      error: (error) => {
        setIsImporting(false);
        toast.error('Error al parsear el archivo CSV: ' + error.message);
      }
    });
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    toast.success('Guardando datos importados en Supabase...');
    try {
      const res = await importDailyLogsBulk(importPreview.entries);
      if (res.success) {
        toast.success(`¡Se han importado con éxito ${res.count} días de registros nutricionales!`);
        setImportPreview(null);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(res.error || 'Error al guardar los datos importados.');
      }
    } catch (err: any) {
      console.error('Error bulk importing:', err);
      toast.error('Error en la importación: ' + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  if (selectedLog) {
    return (
      <HistoryDetailPanel
        log={selectedLog}
        onBack={() => setSelectedLog(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Portability Toolbox Button */}
      <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-5 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-cyan-600" />
            Portabilidad de Datos Pro-Tier
          </h3>
          <p className="text-xs text-slate-500">Importa o exporta tu historial nutricional en formato CSV.</p>
        </div>
        <button
          onClick={() => setShowImporter(!showImporter)}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
        >
          <FileUp className="h-4 w-4" />
          {showImporter ? 'Ocultar Herramientas' : 'Mostrar Herramientas'}
        </button>
      </div>

      {showImporter && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Section */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Download className="h-4.5 w-4.5 text-cyan-600" />
                  Copia de Seguridad y Exportación
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Descarga todo tu historial de ingestas nutricionales y plantillas de dieta creadas en dos archivos CSV listos para abrir en Excel o Google Sheets.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="mt-4 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar Registros (CSV)
                  </>
                )}
              </button>
            </div>

            {/* Import Section */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <UploadCloud className="h-4.5 w-4.5 text-cyan-600" />
                Importar Historial en Lote
              </h4>
              
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    handleImportCSV(files[0]);
                  }
                }}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition text-center cursor-pointer ${
                  dragOver
                    ? 'border-cyan-500 bg-cyan-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleImportCSV(files[0]);
                    }
                  }}
                  className="hidden"
                  id="csv-bulk-import"
                />
                <label htmlFor="csv-bulk-import" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Suelte su CSV aquí o haga clic para subir</span>
                  <span className="text-[10px] text-slate-400 mt-1">Formatos de importación: Fecha, Alimento, Kcal...</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pre-defined Formats and Tips */}
          <div className="bg-amber-50/40 border border-amber-100/80 rounded-2xl p-4 text-xs text-amber-800 space-y-2">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-amber-600" /> Formato predefinido del CSV para Importación:
            </span>
            <p className="leading-relaxed">
              El archivo CSV debe contener obligatoriamente las columnas <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold text-rose-700">Fecha</code> (AAAA-MM-DD), <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold text-rose-700">Alimento</code> y <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold text-rose-700">Kcal</code>.
              Opcionalmente puede incluir <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Proteina_g</code>, <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Carbohidratos_g</code>, <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Grasas_g</code> y <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Agua_ml</code>.
            </p>
            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-600 overflow-x-auto">
              Fecha,Alimento,Kcal,Proteina_g,Carbohidratos_g,Grasas_g,Agua_ml<br />
              2026-06-01,Tostadas con Huevo y Aguacate,450,22,35,14,250<br />
              2026-06-01,Ensalada de Pollo y Arroz,650,45,60,10,500
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal overlay for bulk import */}
      {importPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] p-6 max-w-md w-full shadow-[0_20px_70px_rgba(0,0,0,0.15)] space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 border border-cyan-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Confirmar Importación Masiva</h3>
                <p className="text-xs text-slate-500">Validador de integridad de Coach Mascota</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Filas parseadas</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.rowsCount} comidas</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Días detectados</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.daysCount} días únicos</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Rango de fechas</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {importPreview.entries[0]?.date} hasta {importPreview.entries[importPreview.entries.length - 1]?.date}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
              ⚠️ <span className="font-bold">Advertencia:</span> Esta acción sobrescribirá la información nutricional (comidas, macros y agua) de los días indicados en el CSV. Los hábitos y el momentum diario de esos días se conservarán de forma segura.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="flex-[2] py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar e Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apple style Segmented Control */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 dark:bg-white/10 p-1 border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              activeTab === 'stats' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              activeTab === 'daily' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Registro Diario
          </button>
        </div>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-white/10 rounded-2xl h-64 w-full" />}>
        {activeTab === 'stats' ? (
          <TrendChart logs={logs} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {logs.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] bg-white dark:bg-black/20">
                <p>Aún no hay datos históricos suficientes.</p>
              </div>
            ) : (
              [...logs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((log, index) => (
                  <HistoryCard
                    key={`${log.date}-${index}`}
                    log={log}
                    onOpen={() => setSelectedLog(log)}
                  />
                ))
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
}

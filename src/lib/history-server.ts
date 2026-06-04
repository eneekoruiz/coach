import { createSupabaseServerClient } from './supabase-server';
import { dailyLogSchema } from './schema';

const PAGE_SIZE = 6;

export async function fetchHistoryPage(pageNumber = 1) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null };

  const currentPage = Math.max(1, Number(pageNumber || 1) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('daily_logs')
    .select('date, health_momentum, avatar_image_url, ai_data', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(from, to);

  // 1. Interceptar el error de la DB ANTES de pasarlo a Zod
  if (error) {
    console.warn(`[Supabase Fetch Warning] Tabla daily_logs: ${error.message}`);
    // 2. Retornar SIEMPRE un Fallback válido según la vista
    return {
      user,
      logs: [],
      currentPage: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  const logs = (data ?? []).map((item) => {
    const record = item as {
      date: string;
      health_momentum: number;
      avatar_image_url: string | null;
      ai_data: unknown;
    };
    
    // 3. Solo si hay datos limpios, usamos Zod con safeParse
    const parsed = dailyLogSchema.safeParse(record.ai_data);
    if (!parsed.success) {
      console.error('[Zod Parse Error]', parsed.error);
    }
    
    return {
      date: record.date,
      health_momentum: record.health_momentum,
      avatar_image_url: record.avatar_image_url,
      ai_data: parsed.success ? parsed.data : null,
    };
  });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return {
    user,
    logs,
    currentPage,
    totalPages,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

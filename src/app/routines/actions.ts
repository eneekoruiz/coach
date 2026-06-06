'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface RoutineTemplate {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  created_at: string;
  time_of_day: 'morning' | 'afternoon' | 'night';
  linked_habit_id: number | null;
  habit_increment_amount: number;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  user_id: string;
  completed_date: string;
  created_at: string;
}

/**
 * Fetch all routine templates for the logged-in user
 */
export async function getRoutineTemplates(): Promise<RoutineTemplate[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getRoutineTemplates] Supabase error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getRoutineTemplates] Unexpected error:', err);
    return [];
  }
}

/**
 * Fetch today's completed routine logs
 */
export async function getTodayRoutineLogs(): Promise<RoutineLog[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed_date', today);

    if (error) {
      console.error('[getTodayRoutineLogs] Supabase error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getTodayRoutineLogs] Unexpected error:', err);
    return [];
  }
}

/**
 * Add a new routine template
 */
export async function createRoutineTemplate(
  title: string,
  icon: string | null,
  time_of_day: 'morning' | 'afternoon' | 'night' = 'morning',
  linked_habit_id: number | null = null,
  habit_increment_amount: number = 1
): Promise<{ success: boolean; data?: RoutineTemplate; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const { data, error } = await supabase
      .from('routine_templates')
      .insert({
        user_id: user.id,
        title,
        icon,
        time_of_day,
        linked_habit_id,
        habit_increment_amount,
      })
      .select()
      .single();

    if (error) {
      console.error('[createRoutineTemplate] Supabase error:', error.message);
      return { success: false, error: 'Error al crear la plantilla.' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[createRoutineTemplate] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Delete a routine template (and by cascade delete, its logs)
 */
export async function deleteRoutineTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[deleteRoutineTemplate] Supabase error:', error.message);
      return { success: false, error: 'Error al borrar la plantilla.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteRoutineTemplate] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Mark a routine as completed for today
 */
export async function markRoutineComplete(
  routineId: string
): Promise<{ success: boolean; data?: RoutineLog; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = new Date().toISOString().split('T')[0];

    // Fetch the template details first to check if there is a linked habit
    const { data: template, error: templateError } = await supabase
      .from('routine_templates')
      .select('linked_habit_id, habit_increment_amount')
      .eq('id', routineId)
      .eq('user_id', user.id)
      .single();

    if (templateError) {
      console.error('[markRoutineComplete] Error fetching template details:', templateError.message);
    }

    const { data, error } = await supabase
      .from('routine_logs')
      .insert({
        routine_id: routineId,
        user_id: user.id,
        completed_date: today,
      })
      .select()
      .single();

    if (error) {
      console.error('[markRoutineComplete] Supabase error:', error.message);
      return { success: false, error: 'Error al marcar como completado.' };
    }

    // Cascade habit progress update
    if (template && template.linked_habit_id) {
      try {
        const { updateTodayHabit } = await import('@/services/habitsService');
        await updateTodayHabit({
          supabase,
          userId: user.id,
          habitId: template.linked_habit_id,
          delta: template.habit_increment_amount,
        });
      } catch (habitErr) {
        console.error('[markRoutineComplete] Failed to cascade update to habit:', habitErr);
      }
    }

    return { success: true, data };
  } catch (err) {
    console.error('[markRoutineComplete] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Unmark a routine as completed for today
 */
export async function unmarkRoutineComplete(
  routineId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = new Date().toISOString().split('T')[0];

    // Fetch the template details first to check if there is a linked habit
    const { data: template, error: templateError } = await supabase
      .from('routine_templates')
      .select('linked_habit_id, habit_increment_amount')
      .eq('id', routineId)
      .eq('user_id', user.id)
      .single();

    if (templateError) {
      console.error('[unmarkRoutineComplete] Error fetching template details:', templateError.message);
    }

    const { error } = await supabase
      .from('routine_logs')
      .delete()
      .eq('routine_id', routineId)
      .eq('user_id', user.id)
      .eq('completed_date', today);

    if (error) {
      console.error('[unmarkRoutineComplete] Supabase error:', error.message);
      return { success: false, error: 'Error al desmarcar como completado.' };
    }

    // Cascade habit progress update (decrease)
    if (template && template.linked_habit_id) {
      try {
        const { updateTodayHabit } = await import('@/services/habitsService');
        await updateTodayHabit({
          supabase,
          userId: user.id,
          habitId: template.linked_habit_id,
          delta: -template.habit_increment_amount,
        });
      } catch (habitErr) {
        console.error('[unmarkRoutineComplete] Failed to cascade update to habit:', habitErr);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[unmarkRoutineComplete] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

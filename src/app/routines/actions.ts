'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSafeLocalDate } from '@/lib/date-utils';
import { isE2EMockMode } from '@/lib/e2e';
import { getE2EMockStore } from '@/lib/e2e-mock-store';
import { captureException } from '@/lib/monitoring';

export interface RoutineTemplate {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  created_at: string;
  time_of_day: 'morning' | 'afternoon' | 'night' | 'all_day';
  linked_habit_id: number | null;
  habit_increment_amount: number;
  target_repetitions: number;
  notification_times: string[] | null;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  user_id: string;
  completed_date: string;
  created_at: string;
  progress_count: number;
}

/**
 * Fetch all routine templates for the logged-in user
 */
export async function getRoutineTemplates(): Promise<RoutineTemplate[]> {
  try {
    if (isE2EMockMode()) {
      return getE2EMockStore().routines.templates;
    }

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
    captureException(err, { area: 'routines', action: 'getRoutineTemplates' });
    console.error('[getRoutineTemplates] Unexpected error:', err);
    return [];
  }
}

/**
 * Fetch today's completed routine logs
 */
async function assertLinkedHabitOwnership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  habitId: number | null
) {
  if (!habitId) return true;

  const { data, error } = await supabase
    .from('user_habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function getTodayRoutineLogs(localDate?: string): Promise<RoutineLog[]> {
  try {
    if (isE2EMockMode()) {
      const today = getSafeLocalDate(localDate);
      return getE2EMockStore().routines.logs.filter((log) => log.completed_date === today);
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = getSafeLocalDate(localDate);

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
    captureException(err, { area: 'routines', action: 'getTodayRoutineLogs', extra: { localDate } });
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
  time_of_day: 'morning' | 'afternoon' | 'night' | 'all_day' = 'morning',
  linked_habit_id: number | null = null,
  target_repetitions: number = 1,
  habit_increment_amount: number = 1,
  notification_times: string[] | null = null
): Promise<{ success: boolean; data?: RoutineTemplate; error?: string }> {
  try {
    const sanitizedNotificationTimes = Array.isArray(notification_times)
      ? notification_times
          .filter((time) => /^\d{2}:\d{2}$/.test(time))
          .slice(0, Math.max(1, target_repetitions))
      : null;

    if (isE2EMockMode()) {
      const store = getE2EMockStore();
      const mockTemplate: RoutineTemplate = {
        id: `routine-${Date.now()}`,
        user_id: 'e2e-user',
        title,
        icon,
        created_at: new Date().toISOString(),
        time_of_day,
        linked_habit_id,
        target_repetitions: Math.max(1, target_repetitions),
        habit_increment_amount,
        notification_times: sanitizedNotificationTimes ?? [],
      };
      store.routines.templates.push(mockTemplate);
      return { success: true, data: mockTemplate };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    if (!(await assertLinkedHabitOwnership(supabase, user.id, linked_habit_id))) {
      return { success: false, error: 'El hábito vinculado no pertenece a este usuario.' };
    }

    const { data, error } = await supabase
      .from('routine_templates')
      .insert({
        user_id: user.id,
        title,
        icon,
        time_of_day,
        linked_habit_id,
        target_repetitions: Math.max(1, target_repetitions),
        habit_increment_amount,
        notification_times: sanitizedNotificationTimes ?? [],
      })
      .select()
      .single();

    if (error) {
      console.error('[createRoutineTemplate] Supabase error:', error.message);
      return { success: false, error: 'No se pudo crear la tarea.' };
    }

    return { success: true, data };
  } catch (err) {
    captureException(err, { area: 'routines', action: 'createRoutineTemplate', extra: { title, time_of_day, linked_habit_id } });
    console.error('[createRoutineTemplate] Unexpected error:', err);
    return { success: false, error: 'No se pudo crear la tarea.' };
  }
}

/**
 * Delete a routine template (and by cascade delete, its logs)
 */
export async function deleteRoutineTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isE2EMockMode()) {
      const store = getE2EMockStore();
      store.routines.templates = store.routines.templates.filter((template) => template.id !== id);
      store.routines.logs = store.routines.logs.filter((log) => log.routine_id !== id);
      return { success: true };
    }

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
    captureException(err, { area: 'routines', action: 'deleteRoutineTemplate', extra: { id } });
    console.error('[deleteRoutineTemplate] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Mark a routine as completed for today
 */
export async function markRoutineComplete(
  routineId: string,
  localDate?: string
): Promise<{ success: boolean; data?: RoutineLog; error?: string }> {
  try {
    if (isE2EMockMode()) {
      const today = getSafeLocalDate(localDate);
      const store = getE2EMockStore();
      const template = store.routines.templates.find((item) => item.id === routineId);
      if (!template) {
        return { success: false, error: 'No se pudo actualizar la rutina.' };
      }
      const existing = store.routines.logs.find((log) => log.routine_id === routineId && log.completed_date === today);
      const nextProgress = Math.min(template.target_repetitions, Math.max(0, Number(existing?.progress_count ?? 0)) + 1);
      const nextLog: RoutineLog = {
        id: existing?.id ?? `log-${routineId}-${today}`,
        routine_id: routineId,
        user_id: 'e2e-user',
        completed_date: today,
        created_at: existing?.created_at ?? new Date().toISOString(),
        progress_count: nextProgress,
      };
      store.routines.logs = [
        ...store.routines.logs.filter((log) => !(log.routine_id === routineId && log.completed_date === today)),
        nextLog,
      ];
      return { success: true, data: nextLog };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = getSafeLocalDate(localDate);

    // Fetch the template details first to check if there is a linked habit
    const { data: template, error: templateError } = await supabase
      .from('routine_templates')
      .select('linked_habit_id, habit_increment_amount, target_repetitions')
      .eq('id', routineId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (templateError || !template) {
      console.error(
        '[markRoutineComplete] Error fetching template details:',
        templateError?.message ?? 'Template not found for current user'
      );
      return { success: false, error: 'No se pudo actualizar la rutina.' };
    }

    const { data: existingLog } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('routine_id', routineId)
      .eq('user_id', user.id)
      .eq('completed_date', today)
      .maybeSingle();

    const currentProgress = Math.max(0, Number(existingLog?.progress_count ?? 0));
    const targetRepetitions = Math.max(1, Number(template?.target_repetitions ?? 1));
    const nextProgress = Math.min(targetRepetitions, currentProgress + 1);

    const { data, error } = await supabase
      .from('routine_logs')
      .upsert(
        {
          routine_id: routineId,
          user_id: user.id,
          completed_date: today,
          progress_count: nextProgress,
        },
        { onConflict: 'routine_id,completed_date' }
      )
      .select()
      .single();

    if (error) {
      console.error('[markRoutineComplete] Supabase error:', error.message);
      return { success: false, error: 'No se pudo actualizar la rutina.' };
    }

    // Cascade habit progress update
    if (template && template.linked_habit_id && nextProgress > currentProgress) {
      try {
        const { updateTodayHabit } = await import('@/services/habitsService');
        await updateTodayHabit({
          supabase,
          userId: user.id,
          habitId: template.linked_habit_id,
          delta: Math.max(1, Number(template.habit_increment_amount ?? 1)),
          date: today,
        });
      } catch (habitErr) {
        captureException(habitErr, { area: 'routines', action: 'cascadeHabitProgressFromRoutine', extra: { routineId } });
        console.error('[markRoutineComplete] Failed to cascade update to habit:', habitErr);
        return { success: true, data };
      }
    }

    return { success: true, data };
  } catch (err) {
    captureException(err, { area: 'routines', action: 'markRoutineComplete', extra: { routineId, localDate } });
    console.error('[markRoutineComplete] Unexpected error:', err);
    return { success: false, error: 'No se pudo actualizar la rutina.' };
  }
}

/**
 * Unmark a routine as completed for today
 */
export async function unmarkRoutineComplete(
  routineId: string,
  localDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isE2EMockMode()) {
      const today = getSafeLocalDate(localDate);
      const store = getE2EMockStore();
      store.routines.logs = store.routines.logs.filter((log) => !(log.routine_id === routineId && log.completed_date === today));
      return { success: true };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = getSafeLocalDate(localDate);

    // Fetch the template details first to check if there is a linked habit
    const { data: template, error: templateError } = await supabase
      .from('routine_templates')
      .select('linked_habit_id, habit_increment_amount')
      .eq('id', routineId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (templateError) {
      console.error('[unmarkRoutineComplete] Error fetching template details:', templateError.message);
    }

    const { data: existingLog } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('routine_id', routineId)
      .eq('user_id', user.id)
      .eq('completed_date', today)
      .maybeSingle();

    const existingProgress = Math.max(0, Number(existingLog?.progress_count ?? 0));

    const { error } = await supabase
      .from('routine_logs')
      .delete()
      .eq('routine_id', routineId)
      .eq('user_id', user.id)
      .eq('completed_date', today);

    if (error) {
      console.error('[unmarkRoutineComplete] Supabase error:', error.message);
      return { success: false, error: 'No se pudo actualizar la rutina.' };
    }

    // Cascade habit progress update (decrease)
    if (template && template.linked_habit_id && existingProgress > 0) {
      try {
        const { updateTodayHabit } = await import('@/services/habitsService');
        await updateTodayHabit({
          supabase,
          userId: user.id,
          habitId: template.linked_habit_id,
          delta: -existingProgress * Math.max(1, Number(template.habit_increment_amount ?? 1)),
          date: today,
        });
      } catch (habitErr) {
        captureException(habitErr, { area: 'routines', action: 'rollbackHabitProgressFromRoutine', extra: { routineId } });
        console.error('[unmarkRoutineComplete] Failed to cascade update to habit:', habitErr);
      }
    }

    return { success: true };
  } catch (err) {
    captureException(err, { area: 'routines', action: 'unmarkRoutineComplete', extra: { routineId, localDate } });
    console.error('[unmarkRoutineComplete] Unexpected error:', err);
    return { success: false, error: 'No se pudo actualizar la rutina.' };
  }
}

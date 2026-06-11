'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureException } from '@/lib/monitoring';

export interface KnowledgeItem {
  id: string;
  user_id: string;
  raw_concept: string;
  status: 'inbox' | 'learning' | 'mastered';
  streak: number;
  next_review_at: string;
  created_at: string;
}

/**
 * Fetch all knowledge items for the current user
 */
export async function getKnowledgeItems(): Promise<KnowledgeItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getKnowledgeItems] Supabase error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    captureException(err, { area: 'knowledge', action: 'getKnowledgeItems' });
    console.error('[getKnowledgeItems] Unexpected error:', err);
    return [];
  }
}

/**
 * Add a new knowledge item (Inbox)
 */
export async function createKnowledgeItem(
  rawConcept: string
): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    if (!rawConcept.trim()) {
      return { success: false, error: 'El concepto no puede estar vacío.' };
    }

    const { data, error } = await supabase
      .from('knowledge_items')
      .insert({
        user_id: user.id,
        raw_concept: rawConcept.trim(),
        status: 'inbox',
        streak: 0,
        next_review_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[createKnowledgeItem] Supabase error:', error.message);
      return { success: false, error: 'Error al guardar el concepto.' };
    }

    return { success: true, data };
  } catch (err) {
    captureException(err, { area: 'knowledge', action: 'createKnowledgeItem', extra: { rawConcept } });
    console.error('[createKnowledgeItem] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Record the outcome of a quiz question (Spaced Repetition Logic)
 */
export async function recordReviewOutcome(
  itemId: string,
  success: boolean
): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    // Fetch current state of item
    const { data: item, error: fetchError } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError || !item) {
      return { success: false, error: 'Concepto no encontrado.' };
    }

    let nextStreak = item.streak;
    let nextStatus = item.status;
    let nextReviewAt = new Date();

    if (success) {
      nextStreak += 1;
      if (nextStreak >= 5) {
        nextStreak = 5;
        nextStatus = 'mastered';
        // Review in 7 days
        nextReviewAt.setDate(nextReviewAt.getDate() + 7);
      } else {
        nextStatus = 'learning';
        // Review intervals based on streak:
        // Streak 1: 5 minutes
        // Streak 2: 1 hour
        // Streak 3: 4 hours
        // Streak 4: 24 hours (1 day)
        if (nextStreak === 1) {
          nextReviewAt.setMinutes(nextReviewAt.getMinutes() + 5);
        } else if (nextStreak === 2) {
          nextReviewAt.setHours(nextReviewAt.getHours() + 1);
        } else if (nextStreak === 3) {
          nextReviewAt.setHours(nextReviewAt.getHours() + 4);
        } else if (nextStreak === 4) {
          nextReviewAt.setDate(nextReviewAt.getDate() + 1);
        }
      }
    } else {
      // Fail resets streak to 0
      nextStreak = 0;
      nextStatus = 'learning'; // Downgrade to learning if it was mastered/inbox
      // Retry in 1 minute
      nextReviewAt.setMinutes(nextReviewAt.getMinutes() + 1);
    }

    const { data, error } = await supabase
      .from('knowledge_items')
      .update({
        streak: nextStreak,
        status: nextStatus,
        next_review_at: nextReviewAt.toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[recordReviewOutcome] Supabase error:', error.message);
      return { success: false, error: 'Error al actualizar el progreso.' };
    }

    return { success: true, data };
  } catch (err) {
    captureException(err, { area: 'knowledge', action: 'recordReviewOutcome', extra: { itemId, success } });
    console.error('[recordReviewOutcome] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Delete a knowledge item
 */
export async function deleteKnowledgeItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const { error } = await supabase
      .from('knowledge_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[deleteKnowledgeItem] Supabase error:', error.message);
      return { success: false, error: 'Error al eliminar el concepto.' };
    }

    return { success: true };
  } catch (err) {
    captureException(err, { area: 'knowledge', action: 'deleteKnowledgeItem', extra: { itemId } });
    console.error('[deleteKnowledgeItem] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface OnboardingDataInput {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
}

export async function saveOnboardingData(input: OnboardingDataInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado.' };
    }

    // Save macronutrient targets in user_diet_plans
    const { error: dietError } = await supabase
      .from('user_diet_plans')
      .upsert(
        {
          user_id: user.id,
          target_kcal: Math.round(input.kcal),
          target_protein: Math.round(input.protein),
          target_carbs: Math.round(input.carbs),
          target_fats: Math.round(input.fats),
          breakfast_plan: 'Plan personalizado de desayuno',
          lunch_plan: 'Plan personalizado de almuerzo',
          dinner_plan: 'Plan personalizado de cena',
        },
        { onConflict: 'user_id' }
      );

    if (dietError) {
      console.error('[saveOnboardingData] Diet plan upsert error:', dietError.message);
      return { success: false, error: 'Error al guardar las metas de nutrición.' };
    }

    // Save water target in auth.users user_metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        daily_water_target_ml: Math.round(input.water),
        default_glass_size_ml: 250,
        onboarding_completed: true,
      },
    });

    if (authError) {
      console.error('[saveOnboardingData] Auth metadata update error:', authError.message);
      return { success: false, error: 'Error al actualizar metas de hidratación.' };
    }

    revalidatePath('/');
    
    return { success: true };
  } catch (err) {
    console.error('[saveOnboardingData] Unexpected error:', err);
    return { success: false, error: 'Ocurrió un error inesperado al guardar tus metas.' };
  }
}

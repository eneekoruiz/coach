import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import LifeOSDashboard from '@/components/LifeOSDashboard';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

export const dynamic = 'force-dynamic';

export default async function LifeOSPage() {
  let initialHabits = [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const metadata = user.user_metadata || {};
      if (!metadata.onboarding_completed) {
        redirect('/onboarding');
      }

      const { data: habits } = await supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', user.id);

      if (habits) {
        initialHabits = habits;
      }
    } else {
      // User is not authenticated, redirect to login
      redirect('/login');
    }
  } catch (err) {
    // If it's a redirect, we must rethrow it (Next.js redirect mechanism)
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    // Check if the error is indeed a redirect (Next.js uses special symbols/errors for redirecting)
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    
    console.warn(
      '[LifeOS] Supabase server client not available or missing environment variables. Running in safe demo mode.',
      err
    );
  }

  return (
    <GlobalErrorBoundary>
      <LifeOSDashboard initialHabits={initialHabits} />
    </GlobalErrorBoundary>
  );
}

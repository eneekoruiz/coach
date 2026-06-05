import { redirect } from 'next/navigation';

import HomeDashboard from '@/components/HomeDashboard';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type HomePageProps = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

function isExpiredConfirmationCallback(searchParams?: {
  error?: string;
  error_code?: string;
  error_description?: string;
}) {
  const error = searchParams?.error;
  const errorCode = searchParams?.error_code;
  const errorDescription = (searchParams?.error_description ?? '').toLowerCase();

  return (
    (error === 'access_denied' && errorCode === 'otp_expired') ||
    errorCode === 'otp_expired' ||
    errorDescription.includes('expired') ||
    errorDescription.includes('invalid')
  );
}

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;

  if (isExpiredConfirmationCallback(resolvedSearchParams)) {
    redirect('/login?error=email_confirmation_link_expired');
  }

  // Automatic onboarding redirection for new users
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const metadata = user.user_metadata || {};
      if (!metadata.onboarding_completed) {
        redirect('/onboarding');
      }
    }
  } catch (err) {
    console.warn('[Page] Supabase server client not available or missing environment variables. Running in safe demo mode.', err);
  }

  return <HomeDashboard />;
}


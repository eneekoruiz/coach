import { redirect } from 'next/navigation';

import HomeDashboard from '@/components/HomeDashboard';

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

  return <HomeDashboard />;
}

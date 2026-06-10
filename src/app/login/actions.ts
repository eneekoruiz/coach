'use server';

import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isE2EMockMode } from '@/lib/e2e';
import { captureException } from '@/lib/monitoring';

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getAppUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitSiteUrl) return explicitSiteUrl.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

function mapAuthErrorToCode(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'invalid_credentials';
  if (lower.includes('invalid email')) return 'invalid_form';
  if (lower.includes('password')) return 'invalid_form';
  if (lower.includes('email not confirmed')) return 'email_not_confirmed';
  if (lower.includes('user not found')) return 'invalid_credentials';
  return 'auth_failed';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function login(formData: FormData) {
  if (isE2EMockMode()) {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || !password || !isValidEmail(email)) {
      redirect('/login?error=invalid_form');
    }
    redirect('/?e2e_auth=login');
  }

  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password || !isValidEmail(email)) {
    redirect('/login?error=invalid_form');
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const code = mapAuthErrorToCode(error.message || '');
      if (code === 'email_not_confirmed') {
        redirect(`/login?error=${code}&email=${encodeURIComponent(email)}`);
      }
      redirect(`/login?error=${code}`);
    }

    redirect('/');
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    captureException(err, { area: 'auth', action: 'login' });
    console.error('[Auth Action] Login unexpected error:', err);
    redirect('/login?error=auth_failed');
  }
}

export async function signup(formData: FormData) {
  if (isE2EMockMode()) {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || !password || !isValidEmail(email) || password.length < 6) {
      redirect('/login?error=invalid_form');
    }
    redirect('/?e2e_auth=signup');
  }

  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password || !isValidEmail(email) || password.length < 6) {
    redirect('/login?error=invalid_form');
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (error) {
      const code = mapAuthErrorToCode(error.message || '');
      if (code === 'email_not_confirmed') {
        redirect(`/login?error=${code}&email=${encodeURIComponent(email)}`);
      }
      redirect(`/login?error=${code}`);
    }

    // Check if user requires email confirmation
    if (data.user && (!data.session || (data.user.identities && data.user.identities.length === 0))) {
      redirect(`/login?success=signup_pending&email=${encodeURIComponent(email)}`);
    }

    redirect('/');
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    captureException(err, { area: 'auth', action: 'signup' });
    console.error('[Auth Action] Signup unexpected error:', err);
    redirect('/login?error=auth_failed');
  }
}

export async function resendConfirmation(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();

  if (!email || !isValidEmail(email)) {
    redirect('/login?error=invalid_form');
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (error) {
      const code = mapAuthErrorToCode(error.message || '');
      redirect(`/login?error=${code}&email=${encodeURIComponent(email)}`);
    }

    redirect(`/login?success=confirmation_resent&email=${encodeURIComponent(email)}`);
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    captureException(err, { area: 'auth', action: 'resendConfirmation' });
    console.error('[Auth Action] Resend unexpected error:', err);
    redirect('/login?error=auth_failed');
  }
}

export async function logout() {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      redirect('/login?error=logout_failed');
    }

    redirect('/login');
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    captureException(err, { area: 'auth', action: 'logout' });
    console.error('[Auth Action] Logout unexpected error:', err);
    redirect('/login?error=logout_failed');
  }
}

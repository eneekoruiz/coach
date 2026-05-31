'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/login?error=invalid_form');
  }

  if (!isValidEmail(email)) {
    redirect('/login?error=invalid_form');
  }

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
}

export async function signup(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password || !isValidEmail(email) || password.length < 6) {
    redirect('/login?error=invalid_form');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/login`,
    },
  });

  if (error) {
    const code = mapAuthErrorToCode(error.message || '');
    if (code === 'email_not_confirmed') {
      redirect(`/login?error=${code}&email=${encodeURIComponent(email)}`);
    }

    redirect(`/login?error=${code}`);
  }

  redirect('/login?success=signup');
}

export async function resendConfirmation(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();

  if (!email || !isValidEmail(email)) {
    redirect('/login?error=invalid_form');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/login`,
    },
  });

  if (error) {
    const code = mapAuthErrorToCode(error.message || '');
    redirect(`/login?error=${code}&email=${encodeURIComponent(email)}`);
  }

  redirect(`/login?success=confirmation_resent&email=${encodeURIComponent(email)}`);
}

export async function logout() {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect('/login?error=logout_failed');
  }

  redirect('/login');
}

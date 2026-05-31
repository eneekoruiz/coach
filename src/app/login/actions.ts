'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function mapAuthErrorToCode(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'invalid_credentials';
  if (lower.includes('email not confirmed')) return 'email_not_confirmed';
  if (lower.includes('user not found')) return 'invalid_credentials';
  return 'auth_failed';
}

export async function login(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect('/login?error=config_missing');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const code = mapAuthErrorToCode(error.message || '');
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    const code = mapAuthErrorToCode(error.message || '');
    redirect(`/login?error=${code}`);
  }

  redirect('/login?success=signup');
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

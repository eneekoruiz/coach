import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function createSupabaseClient(authHeader?: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });
}

export async function resolveAuthenticatedClient(authHeader?: string): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const cookieSupabase = await createSupabaseServerClient();
  const preferredClient = authHeader ? createSupabaseClient(authHeader) : cookieSupabase;

  const preferredResult = await preferredClient.auth.getUser(
    authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined
  );

  if (!authHeader && preferredResult.data.user) {
    return { supabase: preferredClient, user: preferredResult.data.user };
  }

  if (authHeader && preferredResult.data.user && !preferredResult.error) {
    return { supabase: preferredClient, user: preferredResult.data.user };
  }

  if (authHeader) {
    const cookieResult = await cookieSupabase.auth.getUser();
    if (cookieResult.data.user && !cookieResult.error) {
      return { supabase: cookieSupabase, user: cookieResult.data.user };
    }
    if (cookieResult.error) {
      throw cookieResult.error;
    }
  }

  if (preferredResult.error) {
    throw preferredResult.error;
  }

  if (!preferredResult.data.user) {
    throw new Error('User not found');
  }

  return { supabase: preferredClient, user: preferredResult.data.user };
}

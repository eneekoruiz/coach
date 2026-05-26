import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function warnSafeMode() {
  console.warn(
    '[BioAvatar] Supabase env vars are missing. Running in safe demo mode until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.'
  );
}

function createMockBuilder() {
  const builder: any = {
    select() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    eq() {
      return builder;
    },
    range() {
      return Promise.resolve({ data: [], error: null, count: 0 });
    },
    insert() {
      return builder;
    },
    update() {
      return builder;
    },
    maybeSingle() {
      return Promise.resolve({ data: null, error: null });
    },
    single() {
      return Promise.resolve({ data: null, error: null });
    },
  };

  return builder;
}

function createMockSupabaseClient() {
  const queryBuilder = createMockBuilder();

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from() {
      return queryBuilder;
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (warnSafeMode(), createMockSupabaseClient());

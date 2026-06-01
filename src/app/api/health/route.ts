import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SENSITIVE_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

function missingEnv() {
  return SENSITIVE_ENV.filter((k) => !process.env[k]);
}

export async function GET(req: Request) {
  try {
    const missing = missingEnv();
    const info: Record<string, unknown> = { env_ok: missing.length === 0, missing };

    const secret = req.headers.get('x-health-secret') ?? undefined;
    const expected = process.env.DEPLOY_HEALTH_SECRET;

    if (secret && expected && secret === expected) {
      // perform DB connectivity check
      try {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.from('daily_logs').select('id').limit(1);
        if (error) {
          info.db = { ok: false, message: error.message };
          return NextResponse.json({ status: 'unhealthy', info }, { status: 503 });
        }
        info.db = { ok: true };
      } catch (err) {
        info.db = { ok: false, message: err instanceof Error ? err.message : String(err) };
        return NextResponse.json({ status: 'unhealthy', info }, { status: 503 });
      }
    }

    return NextResponse.json({ status: 'ok', info });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

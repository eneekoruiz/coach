import { NextResponse } from 'next/server';
import { penalizeInactiveUsers } from '@/services/cronService';

export const dynamic = 'force-dynamic';

const CRON_HEADER = 'authorization';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get(CRON_HEADER) ?? '';

    if (!process.env.CRON_SECRET) {
      return jsonError(500, 'server_misconfigured', 'CRON_SECRET not configured');
    }

    if (!auth || auth !== process.env.CRON_SECRET) {
      return jsonError(401, 'unauthorized', 'Unauthorized');
    }

    const results = await penalizeInactiveUsers();

    return NextResponse.json({ penalized: results.length, results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(503, 'unexpected_error', message);
  }
}

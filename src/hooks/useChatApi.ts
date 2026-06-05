import { sendAnalyze, sendCloseDay } from '@/lib/chat-api';

export async function analyzeRequest(
  text: string,
  base64Image: string | null,
  accessToken?: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  session_id?: string | null,
  local_date?: string
) {
  return await sendAnalyze(text, base64Image, accessToken, history, session_id, local_date);
}

export async function closeDayRequest(accessToken?: string) {
  return await sendCloseDay(accessToken);
}

export type ChatRequestResult =
  | { ok: boolean; status: number; payload: unknown; mode: 'analyze' }
  | { ok: boolean; status: number; payload: unknown; mode: 'close-day' };

export async function performChatRequest(params: {
  text: string;
  base64Image: string | null;
  accessToken?: string;
  mode: 'analyze' | 'close-day';
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id?: string | null;
  local_date?: string;
}): Promise<ChatRequestResult> {
  if (params.mode === 'close-day') {
    const { ok, status, payload } = await closeDayRequest(params.accessToken);
    return { ok, status, payload, mode: 'close-day' };
  }

  const { ok, status, payload } = await analyzeRequest(
    params.text,
    params.base64Image,
    params.accessToken,
    params.history,
    params.session_id,
    params.local_date
  );
  return { ok, status, payload, mode: 'analyze' };
}

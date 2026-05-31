import { sendAnalyze, sendCloseDay } from '@/lib/chat-api';

export async function analyzeRequest(
  text: string,
  base64Image: string | null,
  accessToken?: string
) {
  return await sendAnalyze(text, base64Image, accessToken);
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
}): Promise<ChatRequestResult> {
  if (params.mode === 'close-day') {
    const { ok, status, payload } = await closeDayRequest(params.accessToken);
    return { ok, status, payload, mode: 'close-day' };
  }

  const { ok, status, payload } = await analyzeRequest(params.text, params.base64Image, params.accessToken);
  return { ok, status, payload, mode: 'analyze' };
}

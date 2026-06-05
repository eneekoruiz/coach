import { supabase } from '@/lib/supabase';
import { performChatRequest } from '@/hooks/useChatApi';

export class SessionExpiredError extends Error {}
export class ForbiddenError extends Error {}
export class PayloadTooLargeError extends Error {}
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export async function getSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new SessionExpiredError('No access token');
  return token;
}

export type ChatMode = 'analyze' | 'close-day';

export type ChatServiceResult<T = unknown> = { mode: ChatMode; payload: T };

export async function sendChat<T = unknown>(params: {
  text: string;
  base64Image: string | null;
  accessToken?: string;
  mode: ChatMode;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id?: string | null;
}): Promise<ChatServiceResult<T>> {
  const { text, base64Image, accessToken, mode, history, session_id } = params;

  const result = await performChatRequest({ text, base64Image, accessToken, mode, history, session_id });

  if (!result.ok) {
    if (result.status === 401) throw new SessionExpiredError('Unauthorized');
    if (result.status === 403) throw new ForbiddenError('Forbidden');
    if (result.status === 413) throw new PayloadTooLargeError('Payload too large');
    if (result.status === 429) {
      const payload = result.payload as { message?: string } | undefined;
      const errMsg = payload?.message || 'El Bio-Avatar está procesando demasiada información. Por favor, espera un minuto.';
      throw new RateLimitError(errMsg);
    }
    if (result.status === 400) {
      const payload = result.payload as { error?: { message?: string } } | undefined;
      const errMsg = payload?.error?.message || 'Revisa el contenido enviado e inténtalo de nuevo.';
      throw new BadRequestError(errMsg);
    }
    throw new Error('Chat service error');
  }

  const parsedPayload = result.payload as { data?: T } | null | undefined;
  return { mode: result.mode, payload: (parsedPayload?.data ?? result.payload) as T };
}

import { supabase } from './supabase';

export async function sendCloseDay(accessToken?: string) {
  const response = await fetch('/api/close-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({}),
  });

  const payload = await response.json();
  return { ok: response.ok, payload };
}

export async function sendAnalyze(text: string, base64Image: string | null, accessToken?: string) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ text, image: base64Image }),
  });

  const payload = await response.json();
  return { ok: response.ok, payload };
}

export async function sendCloseDay(accessToken?: string) {
  const response = await fetch('/api/close-day', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json();
  return { ok: response.ok, status: response.status, payload };
}

export async function sendAnalyze(text: string, base64Image: string | null, accessToken?: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, session_id?: string | null) {
  const local_date = new Date().toLocaleDateString('sv').slice(0, 10);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ text, image: base64Image, local_date, history, session_id }),
  });

  const payload = await response.json();
  return { ok: response.ok, status: response.status, payload };
}

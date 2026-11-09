export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[], apiKey?: string): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, apiKey }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.content || `HTTP error ${res.status}`);
  }

  const data = await res.json();
  return data.content || '';
}

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';

export function useSmartHabitCreator(onCreated?: () => void) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function createSmartHabit() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/parse-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      const parsed = payload.data;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const createRes = await fetch('/api/habits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: parsed.name,
          type: parsed.type,
          target_number: parsed.target_number ?? 1,
          unit: parsed.unit_label ?? parsed.unit ?? null,
          tolerance: parsed.tolerance ?? 0,
          metric_type: parsed.metric_type,
          unit_label: parsed.unit_label ?? parsed.unit ?? null,
          step_value: parsed.step_value,
          metric_config: parsed.metric_config,
        }),
      });

      const createPayload = await createRes.json();
      if (!createRes.ok || createPayload.error) {
        throw new Error(
          typeof createPayload.error === 'string' ? createPayload.error : 'Failed to create habit'
        );
      }

      toast.success('Hábito creado');
      setText('');
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return {
    text,
    setText,
    loading,
    createSmartHabit,
  };
}

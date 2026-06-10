import { useEffect, useState, useCallback, useRef } from 'react';
import toast from '@/lib/toast';

interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
}

type MutationResponse = Record<string, unknown> & {
  offline?: boolean;
};

type ExecuteMutationOptions<TResponse extends MutationResponse> = {
  method?: string;
  optimisticUpdate?: () => void;
  onSuccess?: (data: TResponse) => void;
  onFailure?: (err: unknown) => void;
};

export function useOfflineMutation() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const syncQueue = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const queueStr = localStorage.getItem('offline_mutations_queue');
    if (!queueStr) return;

    const queue: QueuedMutation[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    let token = '';
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? '';
    } catch (e) {
      console.error('Failed to get session token for offline sync', e);
    }

    toast.loading(`Sincronizando ${queue.length} cambios guardados sin conexión...`, { id: 'offline-sync' });

    const remainingQueue: QueuedMutation[] = [];

    for (const mutation of queue) {
      try {
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(mutation.body),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (err) {
        console.error('Failed to sync offline mutation', mutation, err);
        remainingQueue.push(mutation);
      }
    }

    localStorage.setItem('offline_mutations_queue', JSON.stringify(remainingQueue));

    if (remainingQueue.length === 0) {
      toast.success('¡Todos los cambios sin conexión se sincronizaron con éxito!', { id: 'offline-sync' });
    } else {
      toast.error('Algunos cambios sin conexión no pudieron sincronizarse.', { id: 'offline-sync' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      void syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  const executeMutation = useCallback(
    async <TResponse extends MutationResponse = MutationResponse>(
      url: string,
      body: unknown,
      options?: ExecuteMutationOptions<TResponse>
    ) => {
      const method = options?.method || 'POST';
      
      if (typeof window !== 'undefined' && !navigator.onLine) {
        if (options?.optimisticUpdate) {
          options.optimisticUpdate();
        }

        const queueStr = localStorage.getItem('offline_mutations_queue') || '[]';
        const queue: QueuedMutation[] = JSON.parse(queueStr);
        
        queue.push({
          id: Math.random().toString(36).substring(2, 9),
          url,
          method,
          body,
          timestamp: Date.now(),
        });

        localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
        toast.success('Guardado localmente (sin conexión). Se sincronizará al recuperar internet.');
        
        if (options?.onSuccess) {
          options.onSuccess({ offline: true } as TResponse);
        }
        return { offline: true } as TResponse;
      }

      try {
        let token = '';
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? '';
        } catch (e) {
          console.warn('Failed to get token for offline mutation wrapper', e);
        }

        if (options?.optimisticUpdate) {
          options.optimisticUpdate();
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Error en la petición.');
        }

        let data: TResponse = {} as TResponse;
        try {
          data = (await response.json()) as TResponse;
        } catch {}

        if (options?.onSuccess) {
          options.onSuccess(data);
        }
        return data;
      } catch (err: unknown) {
        if (options?.onFailure) {
          options.onFailure(err);
        }
        throw err;
      }
    },
    []
  );

  return { isOnline, executeMutation, syncQueue };
}

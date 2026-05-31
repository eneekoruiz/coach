"use client";
import React, { useEffect, useState } from 'react';

import { TOAST_EVENT_NAME, type ToastDetail } from '@/lib/toast';

export default function ToasterClient() {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const customEvent = event as CustomEvent<ToastDetail>;
      const detail = customEvent.detail;
      if (!detail?.message) return;

      setToasts((prev) => [...prev, detail].slice(-4));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== detail.id));
      }, 3200);
    }

    window.addEventListener(TOAST_EVENT_NAME, onToast as EventListener);
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            toast.type === 'success'
              ? 'border-emerald-300 bg-emerald-50/95 text-emerald-900'
              : 'border-rose-300 bg-rose-50/95 text-rose-900'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import toast from '@/lib/toast';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Utility to convert Base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn("Push notifications disabled: missing VAPID keys");
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      // Check current subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Falta la configuración VAPID pública.');
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permiso de notificaciones denegado.');
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar suscripción en el servidor');
      }

      setIsSubscribed(true);
      toast.success('¡Recordatorios del Bio-Avatar activados!');
    } catch (err: any) {
      console.error('Push Subscription Error:', err);
      toast.error('Error al activar notificaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported || isSubscribed) {
    return null; // Don't show if not supported or already subscribed
  }

  return (
    <div className="bg-slate-800 text-white p-4 rounded-2xl md:rounded-3xl shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in my-4">
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-black text-sm md:text-base">¿Vas a dejar morir a tu Bio-Avatar?</h3>
        <p className="text-xs md:text-sm text-slate-300 mt-1">
          Activa los recordatorios para no perder tu racha. Prometo ser pasivo-agresivo si te olvidas.
        </p>
      </div>
      <button
        onClick={subscribeUser}
        disabled={isLoading || !VAPID_PUBLIC_KEY}
        className="w-full sm:w-auto px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-bold rounded-xl md:rounded-2xl transition-colors text-sm shadow-lg active:scale-95"
      >
        {isLoading ? 'Activando...' : (!VAPID_PUBLIC_KEY ? 'No Disponible' : 'Activar Recordatorios')}
      </button>
    </div>
  );
}

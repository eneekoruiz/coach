'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from '@/lib/toast';
import {
  shareAchievementCard,
  type AchievementCardPayload,
} from '@/lib/share-achievement';

type ShareAchievementButtonProps = {
  payload: AchievementCardPayload;
  className?: string;
  label?: string;
};

export default function ShareAchievementButton({
  payload,
  className = '',
  label = 'Compartir logro',
}: ShareAchievementButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSharing(true);

    try {
      const result = await shareAchievementCard(payload);
      if (result.mode === 'native-share') {
        toast.success('Tarjeta lista para compartir.');
      } else {
        toast.success('No había share nativo; he descargado la tarjeta.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo compartir el logro.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-xs font-black text-white transition-all duration-200 ease-in-out hover:bg-slate-800 active:scale-95 disabled:opacity-60 ${className}`}
    >
      <Share2 className="h-3.5 w-3.5" />
      {isSharing ? 'Preparando...' : label}
    </button>
  );
}

import { motion } from 'framer-motion';
import type { SummaryCardSpec } from '@/types/habits';

interface HabitTrackerSummaryCardsProps {
  cards: SummaryCardSpec[];
}

export default function HabitTrackerSummaryCards({ cards }: HabitTrackerSummaryCardsProps) {
  if (cards.length === 0) return null;

  // Assuming the cards array usually has specific metrics in order.
  // E.g. [0] = Activos, [1] = Mejor Racha, [2] = Escudos, [3] = Consistencia.
  // We'll treat the Best Streak (index 1) or Consistencia as the "Featured" widget if possible.
  // We'll just apply bento box spans based on index for variety.

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {cards.map((card, index) => {
        // Parse the value to determine if it's "positive" or high
        const numVal = parseInt(card.value.replace(/[^0-9]/g, ''), 10);
        const isPercentage = card.value.includes('%');
        
        let colorClass = "text-slate-900";
        if (isPercentage && numVal >= 50) {
          colorClass = "text-emerald-500";
        } else if (!isPercentage && numVal > 0 && card.label.toLowerCase().includes('racha')) {
          colorClass = "text-indigo-500";
        }

        // Bento layout rules:
        // Best Streak (index 1) gets a bigger span if there are enough items.
        const isFeatured = index === 1;

        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between ${
              isFeatured ? 'col-span-2 row-span-2' : 'col-span-1'
            }`}
          >
            <div className={`font-bold uppercase tracking-widest text-slate-400 ${isFeatured ? 'text-xs mb-4' : 'text-[10px] mb-2'}`}>
              {card.label}
            </div>
            
            <div>
              <div className={`font-bold tracking-tight ${colorClass} ${isFeatured ? 'text-6xl mb-2' : 'text-4xl mb-1'}`}>
                {card.value}
              </div>
              <div className={`font-medium text-slate-500 ${isFeatured ? 'text-sm' : 'text-[10px] sm:text-xs leading-snug'}`}>
                {card.detail}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

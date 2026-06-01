import { motion } from 'framer-motion';
import type { SummaryCardSpec } from '@/types/habits';

interface HabitTrackerSummaryCardsProps {
  cards: SummaryCardSpec[];
}

export default function HabitTrackerSummaryCards({ cards }: HabitTrackerSummaryCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {card.label}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {card.value}
          </div>
          <div className="mt-2 text-sm text-slate-500">{card.detail}</div>
        </motion.div>
      ))}
    </div>
  );
}

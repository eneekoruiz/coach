import MoodContainer from '@/components/MoodContainer';

export const metadata = {
  title: 'Estado de Ánimo - Bio-Avatar',
  description: 'Registra y visualiza tu estado emocional diario con un tracker inspirado en Apple Health.',
};

export default function MoodPage() {
  return (
    <div className="mx-auto max-w-2xl w-full py-8 flex-1 overflow-y-auto pb-24 md:pb-8 px-4 custom-scrollbar">
      <MoodContainer />
    </div>
  );
}

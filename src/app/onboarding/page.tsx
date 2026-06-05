import OnboardingWizard from '@/components/OnboardingWizard';

export const metadata = {
  title: 'Configuración de Bio-Avatar',
  description: 'Configura tu Gemelo Fisiológico y calcula tus metas calóricas e hidratación iniciales.',
};

export default function OnboardingPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-10 px-4">
      <OnboardingWizard />
    </div>
  );
}

import SportsHub from '@/components/SportsHub';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

export default function SportsPage() {
  return (
    <GlobalErrorBoundary>
      <SportsHub />
    </GlobalErrorBoundary>
  );
}

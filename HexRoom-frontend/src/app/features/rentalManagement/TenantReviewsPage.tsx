import { TenantReviewDashboard } from '@/app/features/rental-management/components/TenantReviewDashboard';

export function TenantReviewsPage() {
  const handleRefresh = () => {
    // Reload the page or refresh data
    window.location.reload();
  };

  return (
    <div className="w-full">
      <TenantReviewDashboard onRefresh={handleRefresh} />
    </div>
  );
}

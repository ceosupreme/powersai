import { ToastPeerComparisonCard } from './ToastPeerComparisonCard';
import { SalesMixCard } from './SalesMixCard';
import { TopSellersCard } from './TopSellersCard';
import { MenuPerformanceCard } from './MenuPerformanceCard';
import { TopCategoriesCard } from './TopCategoriesCard';
import { useCompetitiveData } from '@/hooks/useVenueData';
import { Skeleton } from '@/components/ui/skeleton';

interface CompetitiveAnalysisProps {
  barId: string;
  weekId: string;
  weekStart: string;
  weekEnd: string;
}

export const CompetitiveAnalysis = ({
  barId,
  weekId,
  weekStart,
  weekEnd,
}: CompetitiveAnalysisProps) => {
  const {
    isLoading,
    hasAnyData,
    benchmark,
    salesMix,
    topItems,
    menuGroups,
    productGroups,
  } = useCompetitiveData(barId, weekId);

  // Don't render if no data is linked
  if (!hasAnyData && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 mb-6">
        <div className="section-header">Competitive Analysis</div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div className="section-header">Competitive Analysis</div>
      <ToastPeerComparisonCard 
        benchmark={benchmark} 
        weekStart={weekStart} 
        weekEnd={weekEnd} 
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SalesMixCard salesMix={salesMix} />
        <TopSellersCard items={topItems} />
        <TopCategoriesCard productGroups={productGroups} />
      </div>
      <MenuPerformanceCard menuGroups={menuGroups} />
    </div>
  );
};

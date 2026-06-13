import { useEffect, useState } from 'react';
import PillarPage from '@/components/pillar/PillarPage';
import { GUEST_METRICS } from '@/config/pillarMetrics';
import { GuestExperienceCharts } from '@/components/charts/GuestExperienceCharts';
import { SecretShopDetailCard } from '@/components/guest-experience/SecretShopDetailCard';
import { SecretShopHistoryCard } from '@/components/guest-experience/SecretShopHistoryCard';
import { OnlineReviewsCard } from '@/components/guest-experience/OnlineReviewsCard';
import {
  fetchSecretShopAudits,
  fetchSecretShopHistory,
  fetchOnlineReviews,
} from '@/services/supabaseData';

const GuestExtraContent = ({ selectedWeek, selectedBar }: { selectedWeek: any; selectedBar: any }) => {
  const [secretShop, setSecretShop] = useState<any>(null);
  const [secretShopHistory, setSecretShopHistory] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!selectedWeek || !selectedBar) return;
      const barId = selectedBar.id;
      const [shopData, reviewsData, shopHistory] = await Promise.all([
        fetchSecretShopAudits(barId, selectedWeek.id),
        fetchOnlineReviews(barId, selectedWeek.id),
        fetchSecretShopHistory(barId, 6),
      ]);
      setSecretShop(shopData[0] || null);
      setReviews(reviewsData);
      setSecretShopHistory(shopHistory);
    };
    load();
  }, [selectedWeek, selectedBar]);

  return (
    <>
      {secretShop && (
        <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <SecretShopDetailCard audit={secretShop} />
        </div>
      )}
      {reviews.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <OnlineReviewsCard reviews={reviews} />
        </div>
      )}
      {secretShopHistory.length > 1 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <SecretShopHistoryCard audits={secretShopHistory} />
        </div>
      )}
    </>
  );
};

const GuestExperience = () => (
  <PillarPage
    pillar="Guest Experience"
    title="Guest Experience"
    metrics={GUEST_METRICS}
    ChartComponent={GuestExperienceCharts}
    extraContent={({ selectedWeek, selectedBar }) => (
      <GuestExtraContent selectedWeek={selectedWeek} selectedBar={selectedBar} />
    )}
  />
);

export default GuestExperience;

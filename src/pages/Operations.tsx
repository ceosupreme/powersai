import PillarPage from '@/components/pillar/PillarPage';
import { OPERATIONS_METRICS } from '@/config/pillarMetrics';
import { OperationsCharts } from '@/components/charts/OperationsCharts';
import { InventoryVarianceCard } from '@/components/operations/InventoryVarianceCard';
import { DrinkMixCard } from '@/components/operations/DrinkMixCard';

const Operations = () => (
  <PillarPage
    pillar="Operations"
    title="Operations"
    metrics={OPERATIONS_METRICS}
    ChartComponent={OperationsCharts}
    extraContent={() => (
      <div className="animate-fade-in-up space-y-4" style={{ animationDelay: '200ms' }}>
        <InventoryVarianceCard />
        <DrinkMixCard />
      </div>
    )}
  />
);

export default Operations;

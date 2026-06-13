import PillarPage from '@/components/pillar/PillarPage';
import { REVENUE_METRICS } from '@/config/pillarMetrics';
import { SalesCharts } from '@/components/charts/SalesCharts';

const Sales = () => (
  <PillarPage
    pillar="Revenue"
    title="Revenue"
    metrics={REVENUE_METRICS}
    ChartComponent={SalesCharts}
  />
);

export default Sales;

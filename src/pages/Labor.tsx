import PillarPage from '@/components/pillar/PillarPage';
import { LABOR_METRICS } from '@/config/pillarMetrics';
import { LaborCharts } from '@/components/charts/LaborCharts';

const Labor = () => (
  <PillarPage
    pillar="Labor"
    title="Labor"
    metrics={LABOR_METRICS}
    ChartComponent={LaborCharts}
  />
);

export default Labor;

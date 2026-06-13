import { BarChart3, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ToastBenchmark } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ToastPeerComparisonCardProps {
  benchmark: ToastBenchmark | null;
  weekStart: string;
  weekEnd: string;
}

interface MetricRow {
  label: string;
  you: number;
  peers: number;
  format: 'currency' | 'number' | 'decimal';
}

const formatValue = (value: number | undefined | null, formatType: 'currency' | 'number' | 'decimal') => {
  if (value === undefined || value === null) return '—';
  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    case 'number':
      return new Intl.NumberFormat('en-US').format(Math.round(value));
    case 'decimal':
      return value.toFixed(1);
  }
};

const getVarianceIndicator = (you: number | undefined | null, peers: number | undefined | null) => {
  if (!peers || !you) return { icon: ArrowRight, color: 'text-muted-foreground', prefix: '' };
  
  const variance = ((you - peers) / peers) * 100;
  
  if (variance > 5) {
    return { icon: CheckCircle, color: 'text-signal-green', prefix: '+' };
  } else if (variance < -5) {
    return { icon: AlertTriangle, color: 'text-destructive', prefix: '' };
  } else {
    return { icon: ArrowRight, color: 'text-muted-foreground', prefix: '' };
  }
};

const formatVariance = (you: number | undefined | null, peers: number | undefined | null) => {
  if (!peers || !you) return '—';
  const variance = ((you - peers) / peers) * 100;
  return `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`;
};

export const ToastPeerComparisonCard = ({ benchmark, weekStart, weekEnd }: ToastPeerComparisonCardProps) => {
  if (!benchmark) {
    return (
      <div className="card-metric p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">vs Local Peers</h3>
        </div>
        <EmptyState 
          message="No peer benchmark data"
          title="No peer benchmark data"
          description="Peer comparison data will appear here once Toast benchmarks sync."
          icon={<BarChart3 className="w-6 h-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const formatDateRange = () => {
    try {
      const start = parseISO(weekStart);
      const end = parseISO(weekEnd);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
    } catch {
      return '';
    }
  };

  const metrics: MetricRow[] = [
    { label: 'Net Sales', you: benchmark.your_net_sales, peers: benchmark.peer_net_sales, format: 'currency' },
    { label: 'Order Count', you: benchmark.your_order_count, peers: benchmark.peer_order_count, format: 'number' },
    { label: 'Quantity Sold', you: benchmark.your_quantity_sold, peers: benchmark.peer_quantity_sold, format: 'number' },
    { label: 'Avg Order Value', you: benchmark.your_avg_order_value, peers: benchmark.peer_avg_order_value, format: 'currency' },
    { label: 'Items/Order', you: benchmark.your_items_per_order, peers: benchmark.peer_items_per_order, format: 'decimal' },
    { label: 'SPLH', you: benchmark.your_splh, peers: benchmark.peer_splh, format: 'currency' },
  ];

  return (
    <div className="card-metric p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">vs Local Peers</h3>
        </div>
        <span className="text-sm text-muted-foreground">{formatDateRange()}</span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground">Metric</TableHead>
            <TableHead className="text-right text-muted-foreground">You</TableHead>
            <TableHead className="text-right text-muted-foreground">Peers</TableHead>
            <TableHead className="text-right text-muted-foreground">vs Peers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map((metric) => {
            const indicator = getVarianceIndicator(metric.you, metric.peers);
            const Icon = indicator.icon;
            
            return (
              <TableRow key={metric.label}>
                <TableCell className="font-medium text-foreground">{metric.label}</TableCell>
                <TableCell className="text-right text-foreground">{formatValue(metric.you, metric.format)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatValue(metric.peers, metric.format)}</TableCell>
                <TableCell className="text-right">
                  <span className={`flex items-center justify-end gap-1 ${indicator.color}`}>
                    <Icon className="h-4 w-4" />
                    <span>{formatVariance(metric.you, metric.peers)}</span>
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

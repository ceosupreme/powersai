import { TopProductGroup } from '@/types/venue';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';

interface TopCategoriesCardProps {
  productGroups: TopProductGroup[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const TopCategoriesCard = ({ productGroups }: TopCategoriesCardProps) => {
  if (!productGroups || productGroups.length === 0) {
    return (
      <div className="card-metric p-6 h-full">
        <h3 className="font-semibold text-foreground mb-4">Top Categories</h3>
        <EmptyState 
          message="No category data"
          title="No category data"
          description="Category performance will appear here once Toast data syncs."
          icon={<BarChart3 className="w-6 h-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const sortedGroups = [...productGroups].sort((a, b) => b.net_sales - a.net_sales).slice(0, 5);
  const maxSales = sortedGroups[0]?.net_sales || 1;

  // Color palette for bars
  const barColors = [
    'bg-primary',
    'bg-blue',
    'bg-signal-green',
    'bg-gold',
    'bg-purple-500',
  ];

  return (
    <div className="card-metric p-6 h-full flex flex-col">
      <h3 className="font-semibold text-foreground mb-4">Top Categories</h3>
      
      <div className="flex-1 space-y-4">
        {sortedGroups.map((group, index) => {
          const widthPercent = (group.net_sales / maxSales) * 100;
          
          return (
            <div key={group.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{group.group_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{formatCurrency(group.net_sales)}</span>
                  <span className="text-xs text-muted-foreground">({group.quantity_sold})</span>
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${barColors[index] || 'bg-primary'} rounded-full transition-all duration-500`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

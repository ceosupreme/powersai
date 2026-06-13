import { WeeklySalesMix, SalesMixCategory } from '@/types/venue';
import { EmptyState } from '@/components/shared/EmptyState';
import { PieChart } from 'lucide-react';

interface SalesMixCardProps {
  salesMix: WeeklySalesMix | null;
}

interface CategoryData {
  category: SalesMixCategory;
  percent: number;
  amount: number;
  color: string;
  bgColor: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

// Parse percentage from various formats to a display percentage (0-100)
const parsePercent = (pct: string | number | undefined): number => {
  if (pct === undefined || pct === null) return 0;
  
  // If it's a string, remove % sign and parse
  if (typeof pct === 'string') {
    const parsed = parseFloat(pct.replace('%', ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // If it's a number, check if it's a decimal (0-1) or already percentage (0-100)
  if (typeof pct === 'number') {
    // If the value is between 0 and 1 (exclusive), it's likely a decimal - multiply by 100
    if (pct > 0 && pct < 1) {
      return pct * 100;
    }
    return pct;
  }
  
  return 0;
};

export const SalesMixCard = ({ salesMix }: SalesMixCardProps) => {
  if (!salesMix) {
    return (
      <div className="card-metric p-6 h-full">
        <h3 className="font-semibold text-foreground mb-4">Sales Mix</h3>
        <EmptyState 
          message="No sales mix data"
          title="No sales mix data"
          description="Sales mix categories will appear here once Toast data syncs for this week."
          icon={<PieChart className="w-6 h-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const categories: CategoryData[] = [
    { category: 'Food', percent: parsePercent(salesMix.food_pct), amount: salesMix.food_sales, color: 'bg-blue', bgColor: 'bg-blue/20' },
    { category: 'Beer', percent: parsePercent(salesMix.beer_pct), amount: salesMix.beer_sales, color: 'bg-amber', bgColor: 'bg-amber/20' },
    { category: 'Liquor', percent: parsePercent(salesMix.liquor_pct), amount: salesMix.liquor_sales, color: 'bg-purple-500', bgColor: 'bg-purple-500/20' },
    { category: 'Wine', percent: parsePercent(salesMix.wine_pct), amount: salesMix.wine_sales, color: 'bg-rose-500', bgColor: 'bg-rose-500/20' },
  ];

  return (
    <div className="card-metric p-6 h-full">
      <h3 className="font-semibold text-foreground mb-4">Sales Mix</h3>
      
      {/* Stacked horizontal bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-6">
        {categories.map((cat) => (
          <div
            key={cat.category}
            className={`${cat.color} transition-all duration-300`}
            style={{ width: `${cat.percent}%` }}
            title={`${cat.category}: ${cat.percent.toFixed(1)}%`}
          />
        ))}
      </div>
      
      {/* Category rows */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.category} className="flex items-center gap-3">
            <span className="text-sm text-foreground w-14">{cat.category}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${cat.color} rounded-full transition-all duration-300`}
                style={{ width: `${cat.percent}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-14 text-right">{cat.percent.toFixed(1)}%</span>
            <span className="text-sm font-medium text-foreground w-20 text-right">{formatCurrency(cat.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
